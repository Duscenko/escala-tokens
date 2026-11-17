/**
 * Machine-readable component contracts — one per catalogue component, GENERATED.
 *
 * Each contract joins what four sources already know, so an agent reads ONE file
 * instead of re-deriving it: the catalogue (`componentCatalogue.ts`: usage, API,
 * accessibility), the recipe (`componentRecipes.ts`: anatomy, defaults, every token
 * the component consumes), the Figma snapshot (`spec/figma-components.json`: page,
 * set, axes, properties) and the repo (component file, Storybook story, the human
 * contract in `design-plans/`). Nothing here is authored by hand.
 *
 * Ownership follows DEC-2026-11-16-007: Figma owns anatomy and foundations,
 * Storybook owns behaviour. The contract states it so a reader knows which side
 * to fix when the two disagree.
 *
 * Pure: the caller passes the files it read (`ContractSources`). Written by
 * `scripts/gen-component-contracts.ts` (`npm run gen:contracts`); a test fails
 * when the committed files drift from what this builds.
 */
import { COMPONENTS, type ComponentBox, type ComponentDef, type ComponentLock } from './componentCatalogue'
import { COMPONENT_RECIPES, recipeTokenRefs } from './componentRecipes'

export const CONTRACT_SCHEMA = 'escala-component-contract/1'
export const FIGMA_FILE_KEY = '7j5zukN5HpihGVJMmyjA20'
export const STORYBOOK_URL = 'https://escala-storybook.vercel.app'

export interface FigmaSnapshotSet {
  name: string
  variants?: number
  axes?: Record<string, string>
  props?: string
}
export interface FigmaSnapshotPage { page: string; id: string; sets: FigmaSnapshotSet[] }

export interface ContractSources {
  /** `pages` of `spec/figma-components.json`. */
  figmaPages: FigmaSnapshotPage[]
  /** File name → source, for `src/components/escala-ui/*.tsx`. */
  uiFiles: Record<string, string>
  /** File name → source, for `apps/storybook/stories/*.stories.tsx`. */
  storyFiles: Record<string, string>
  /** File names in `design-plans/`. */
  designPlans: string[]
}

export interface ComponentContract {
  $schema: string
  $comment: string
  key: string
  label: string
  category: string
  box: ComponentBox
  locks: ComponentLock[]
  description: string
  owners: { anatomy: 'figma'; foundations: 'figma'; behaviour: 'storybook' }
  figma: {
    file: string
    page: string | null
    pageNodeId: string | null
    set: string | null
    variants: number | null
    axes: Record<string, string[]> | null
    properties: { name: string; type: string }[] | null
    catalogueSets: string[]
    url: string | null
  }
  api: {
    axes: { name: string; values: string[] }[]
    defaults: Record<string, string>
    props: { name: string; type: string; description: string }[]
  }
  anatomy: { slots: string[] }
  tokens: Record<string, string[]>
  usage: string
  accessibility: string
  code: {
    files: string[]
    story: { file: string; title: string; id: string | null; url: string | null } | null
  }
  docs: { humanContract: string | null }
}

/** Storybook's `sanitize` (lib/csf): lower case, every separator to one hyphen. */
export function storybookSanitize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/** An export name as Storybook ids it (`CalendarDayPlayground` → `calendar-day-playground`). */
export function exportToIdPart(name: string): string {
  return storybookSanitize(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'))
}

function kebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()
}

const NAME_RE = /data-escala(?:=|['"]?\s*:\s*)\s*['"]([A-Za-z][A-Za-z0-9]*)['"]/g

function filesDrawing(key: string, uiFiles: Record<string, string>): string[] {
  const out: string[] = []
  for (const [file, src] of Object.entries(uiFiles)) {
    for (const m of src.matchAll(NAME_RE)) if (m[1] === key) { out.push(`src/components/escala-ui/${file}`); break }
  }
  // A component whose root name is dynamic (`data-escala={recipeKey}`, Button) is found by its file name.
  if (!out.length) {
    const own = Object.keys(uiFiles).find((f) => f.replace(/\.tsx?$/, '') === kebab(key))
    if (own) out.push(`src/components/escala-ui/${own}`)
  }
  return out.sort()
}

function findSet(def: ComponentDef, pages: FigmaSnapshotPage[]): { page: FigmaSnapshotPage; set: FigmaSnapshotSet } | null {
  const names = [def.key, ...def.figmaSets]
  for (const name of names) {
    for (const page of pages) {
      const set = page.sets.find((s) => s.name === name)
      if (set) return { page, set }
    }
  }
  return null
}

function findStory(key: string, storyFiles: Record<string, string>): ComponentContract['code']['story'] {
  const file = `${key}.stories.tsx`
  const src = storyFiles[file]
  if (!src) return null
  const title = /title:\s*['"]([^'"]+)['"]/.exec(src)?.[1]
  if (!title) return null
  const exports = [...src.matchAll(/export const ([A-Za-z0-9_]+)/g)].map((m) => m[1])
  const play = exports.find((e) => e === 'Playground') ?? exports.find((e) => e === `${key}Playground`) ?? exports.find((e) => /Playground$/.test(e)) ?? null
  const id = play ? `${storybookSanitize(title)}--${exportToIdPart(play)}` : null
  return { file: `apps/storybook/stories/${file}`, title, id, url: id ? `${STORYBOOK_URL}/?path=/story/${id}` : null }
}

function groupTokens(refs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const ref of refs) {
    const kind = ref.split('.')[0]
    ;(out[kind] ??= []).push(ref)
  }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].sort()
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

export function buildContract(def: ComponentDef, src: ContractSources): ComponentContract {
  const recipe = COMPONENT_RECIPES[def.key]
  const hit = findSet(def, src.figmaPages)
  const humanContract = `${kebab(def.key)}-contract.md`
  const axes = hit?.set.axes
    ? Object.fromEntries(Object.entries(hit.set.axes).map(([k, v]) => [k, v.split('|')]))
    : null
  const properties = hit?.set.props
    ? hit.set.props.split(',').filter(Boolean).map((p) => { const [name, type] = p.split(':'); return { name, type } })
    : null
  return {
    $schema: CONTRACT_SCHEMA,
    $comment: 'GENERATED by `npm run gen:contracts` from the catalogue, the recipe, spec/figma-components.json and the repo. Never edit by hand.',
    key: def.key,
    label: def.label,
    category: def.category,
    box: def.box,
    locks: def.locks,
    description: def.description,
    owners: { anatomy: 'figma', foundations: 'figma', behaviour: 'storybook' },
    figma: {
      file: FIGMA_FILE_KEY,
      page: hit?.page.page ?? null,
      pageNodeId: hit?.page.id ?? null,
      set: hit?.set.name ?? null,
      variants: hit?.set.variants ?? null,
      axes,
      properties,
      catalogueSets: def.figmaSets,
      url: hit ? `https://www.figma.com/design/${FIGMA_FILE_KEY}/?node-id=${hit.page.id.replace(':', '-')}` : null,
    },
    api: { axes: def.axes, defaults: recipe?.defaults ?? {}, props: def.props },
    anatomy: { slots: recipe?.slots ?? [] },
    tokens: recipe ? groupTokens(recipeTokenRefs(recipe)) : {},
    usage: def.usage,
    accessibility: def.accessibility,
    code: { files: filesDrawing(def.key, src.uiFiles), story: findStory(def.key, src.storyFiles) },
    docs: { humanContract: src.designPlans.includes(humanContract) ? `design-plans/${humanContract}` : null },
  }
}

export interface ContractIndexEntry {
  key: string
  label: string
  category: string
  box: ComponentBox
  locks: ComponentLock[]
  file: string
  figmaSet: string | null
  story: string | null
  tokens: number
}

export function buildContracts(src: ContractSources): { contracts: ComponentContract[]; index: ContractIndexEntry[] } {
  const contracts = COMPONENTS.map((def) => buildContract(def, src))
  const index = contracts.map((c) => ({
    key: c.key,
    label: c.label,
    category: c.category,
    box: c.box,
    locks: c.locks,
    file: `spec/contracts/${c.key}.json`,
    figmaSet: c.figma.set,
    story: c.code.story?.id ?? null,
    tokens: Object.values(c.tokens).reduce((n, list) => n + list.length, 0),
  }))
  return { contracts, index }
}

export function serializeContract(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}
