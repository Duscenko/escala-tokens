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
import { COMPONENT_RECIPES, cssVarOf, recipeTokenRefs, splitRef, type ComponentRecipe } from './componentRecipes'
import type { RecipeMotion, SlotMap } from './recipes/helpers'
import { figmaSemanticName } from './agentBundle/names'
import { roleFigmaName } from './roleNames'
import { PRIMITIVE_BEHAVIOUR, ariaIn, primitivesIn, type PrimitiveBehaviour } from './contractBehaviour'

/** v2 (2026-11-20) is additive over v1: bindings, names, motion, behaviour, code.import. */
export const CONTRACT_SCHEMA = 'escala-component-contract/2'
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
  /** File name → parsed JSON, for `src/components/escala-ui/blocks/*.contract.json`. */
  blockContracts?: Record<string, BlockContractFile>
  /** `governance/registry.json`. */
  registry?: Record<string, { kind?: string; stage?: string; story?: string | null; figmaNode?: string | null }>
}

export interface BlockContractFile {
  figma?: { page?: string; pageId?: string }
  blocks: { name: string; figmaSet?: string | null; variants?: number; motion?: unknown[]; nests?: string[] }[]
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
  /** Every token ref above → its CSS variable and its Figma variable or style (null where Figma has none). */
  names: Record<string, { css: string; figma: string | null }>
  /** The recipe parts: which axes each part reads and, per combination (values joined by `|`, `''` when
   *  it reads none), the token each slot paints. Merge every matching part, in order, to resolve a render. */
  bindings: { axes: string[]; values: Record<string, SlotMap> }[]
  /** How it moves: motion roles and choreographies by name (`src/lib/recipes/motion.ts`). null = no decision yet (MOT-002). */
  motion: RecipeMotion | null
  /** What the library it is built on does for keyboard and focus, plus the ARIA its source sets. */
  behaviour: {
    primitives: (PrimitiveBehaviour & { name: string })[]
    roles: string[]
    ariaAttributes: string[]
  }
  usage: string
  accessibility: string
  code: {
    files: string[]
    /** The component's own export and the file it lives in (repo path; `packages/ui` is the target, not built yet). */
    import: { name: string; module: string; exports: string[] } | null
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

/** `color.action.primary.hover` → `Action/primary/hover`; dimension roles by their Figma path; type roles are text styles. */
export function figmaNameOf(ref: string): string | null {
  const [ns, name] = splitRef(ref)
  if (ns === 'color') return figmaSemanticName(name)
  if (ns === 'type') return /^(text|display)-(xs|sm|md|lg|xl|2xl)$/.test(name) ? null : `Type/${name}`
  if (ns === 'icon' || ns === 'selector' || ns === 'size' || ns === 'spacing' || ns === 'radius' || ns === 'stroke') return roleFigmaName(ns, name)
  return null
}

function namesOf(refs: string[]): ComponentContract['names'] {
  return Object.fromEntries(refs.map((ref) => [ref, { css: cssVarOf(ref), figma: figmaNameOf(ref) }]))
}

function bindingsOf(recipe: ComponentRecipe | undefined): ComponentContract['bindings'] {
  return recipe ? recipe.parts.map((p) => ({ axes: p.axes, values: p.values })) : []
}

const EXPORT_RE = /export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9]*)|export\s*\{([^}]*)\}/g

function exportsOf(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(EXPORT_RE)) {
    const names = m[1] ? [m[1]] : m[2].split(',').map((p) => p.trim().split(/\s+as\s+/).pop()!.trim())
    for (const n of names) if (/^[A-Z]/.test(n) && !/^[A-Z0-9_]+$/.test(n) && !n.endsWith('Props') && !out.includes(n)) out.push(n)
  }
  return out
}

function importOf(key: string, files: string[], uiFiles: Record<string, string>): ComponentContract['code']['import'] {
  for (const path of files) {
    const exports = exportsOf(uiFiles[path.replace('src/components/escala-ui/', '')] ?? '')
    if (exports.includes(key)) return { name: key, module: path.replace(/\.tsx?$/, ''), exports }
  }
  const first = files[0]
  if (!first) return null
  const exports = exportsOf(uiFiles[first.replace('src/components/escala-ui/', '')] ?? '')
  return exports.length ? { name: exports[0], module: first.replace(/\.tsx?$/, ''), exports } : null
}

function behaviourOf(files: string[], uiFiles: Record<string, string>): ComponentContract['behaviour'] {
  const srcs = files.map((f) => uiFiles[f.replace('src/components/escala-ui/', '')] ?? '')
  const names = [...new Set(srcs.flatMap(primitivesIn))]
  const roles = new Set<string>()
  const attributes = new Set<string>()
  for (const s of srcs) { const a = ariaIn(s); a.roles.forEach((r) => roles.add(r)); a.attributes.forEach((x) => attributes.add(x)) }
  return {
    primitives: names.filter((n) => PRIMITIVE_BEHAVIOUR[n]).map((name) => ({ name, ...PRIMITIVE_BEHAVIOUR[name] })),
    roles: [...roles].sort(),
    ariaAttributes: [...attributes].sort(),
  }
}

export function buildContract(def: ComponentDef, src: ContractSources): ComponentContract {
  const recipe = COMPONENT_RECIPES[def.key]
  const files = filesDrawing(def.key, src.uiFiles)
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
    names: recipe ? namesOf(recipeTokenRefs(recipe)) : {},
    bindings: bindingsOf(recipe),
    motion: recipe?.motion ?? null,
    behaviour: behaviourOf(files, src.uiFiles),
    usage: def.usage,
    accessibility: def.accessibility,
    code: { files, import: importOf(def.key, files, src.uiFiles), story: findStory(def.key, src.storyFiles) },
    docs: { humanContract: src.designPlans.includes(humanContract) ? `design-plans/${humanContract}` : null },
  }
}

export interface ContractIndexEntry {
  kind: 'component' | 'block'
  key: string
  label: string
  category: string
  /** Black · Gray · White box; null for a block (a composition, not classified). */
  box: ComponentBox | null
  locks: ComponentLock[]
  file: string
  figmaSet: string | null
  /** Figma node id of the set, when the source carries it (blocks today; components in phase 5). */
  figmaNode: string | null
  story: string | null
  tokens: number
  /** `declared` when the contract carries a motion decision, null when it has none yet (MOT-002). */
  motion: 'declared' | null
  /** Governance stage (`governance/registry.json`), null when the piece is not registered yet. */
  stage: string | null
}

export function buildContracts(src: ContractSources): { contracts: ComponentContract[]; index: ContractIndexEntry[] } {
  const contracts = COMPONENTS.map((def) => buildContract(def, src))
  const index: ContractIndexEntry[] = contracts.map((c) => ({
    kind: 'component' as const,
    key: c.key,
    label: c.label,
    category: c.category,
    box: c.box,
    locks: c.locks,
    file: `spec/contracts/${c.key}.json`,
    figmaSet: c.figma.set,
    figmaNode: null,
    story: c.code.story?.id ?? null,
    tokens: Object.values(c.tokens).reduce((n, list) => n + list.length, 0),
    motion: c.motion ? 'declared' as const : null,
    stage: src.registry?.[c.key]?.stage ?? null,
  }))
  for (const [file, bc] of Object.entries(src.blockContracts ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    for (const b of bc.blocks) {
      const reg = src.registry?.[b.name]
      index.push({
        kind: 'block',
        key: b.name,
        label: b.name,
        category: bc.figma?.page ?? 'Blocks',
        box: null,
        locks: [],
        file: `src/components/escala-ui/blocks/${file}`,
        figmaSet: b.name,
        figmaNode: b.figmaSet ?? null,
        story: reg?.story ?? null,
        tokens: 0,
        motion: b.motion?.length ? 'declared' : null,
        stage: reg?.stage ?? null,
      })
    }
  }
  return { contracts, index }
}

export function serializeContract(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

// ── Schema and README (generated next to the contracts) ────────────────────

const str = { type: 'string' }
const strOrNull = { type: ['string', 'null'] }
const strList = { type: 'array', items: str }

/** JSON Schema (draft 2020-12) of one contract — `spec/contracts/schema.json`. */
export function contractSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://www.escalatokens.com/spec/contracts/schema.json',
    title: CONTRACT_SCHEMA,
    description: 'One Escala component: Figma anatomy, code API, the token each slot binds per state, motion, behaviour and where the code and story live. GENERATED by `npm run gen:contracts`.',
    type: 'object',
    required: ['$schema', 'key', 'label', 'category', 'owners', 'figma', 'api', 'anatomy', 'tokens', 'names', 'bindings', 'motion', 'behaviour', 'code', 'docs'],
    properties: {
      $schema: { const: CONTRACT_SCHEMA },
      $comment: str,
      key: { ...str, description: 'PascalCase name, identical in Figma, React and Storybook.' },
      label: str,
      category: str,
      box: { enum: ['black', 'gray', 'white'], description: 'Black: shape, size, hit and motion locked · Gray: size, hit, motion · White: none.' },
      locks: strList,
      description: str,
      owners: {
        type: 'object',
        description: 'Which side wins a disagreement (DEC-2026-11-16-007). Fix the other side.',
        properties: { anatomy: { const: 'figma' }, foundations: { const: 'figma' }, behaviour: { const: 'storybook' } },
      },
      figma: {
        type: 'object',
        properties: {
          file: str, page: strOrNull, pageNodeId: strOrNull, set: strOrNull,
          variants: { type: ['integer', 'null'] },
          axes: { type: ['object', 'null'], additionalProperties: strList },
          properties: { type: ['array', 'null'], items: { type: 'object', properties: { name: str, type: str } } },
          catalogueSets: strList,
          url: strOrNull,
        },
      },
      api: {
        type: 'object',
        properties: {
          axes: { type: 'array', items: { type: 'object', properties: { name: str, values: strList } } },
          defaults: { type: 'object', additionalProperties: str },
          props: { type: 'array', items: { type: 'object', properties: { name: str, type: str, description: str } } },
        },
      },
      anatomy: { type: 'object', properties: { slots: { ...strList, description: 'The first slot is the root (data-escala).' } } },
      tokens: { type: 'object', additionalProperties: strList, description: 'Every token ref the component can consume, by kind.' },
      names: {
        type: 'object',
        description: 'Token ref → CSS custom property and Figma variable / text style.',
        additionalProperties: { type: 'object', properties: { css: str, figma: strOrNull } },
      },
      bindings: {
        type: 'array',
        description: 'Recipe parts. To resolve a render: for each part, join the render\'s values of `axes` with `|` (defaults fill the gaps) and merge that entry\'s slots, in order.',
        items: {
          type: 'object',
          properties: {
            axes: strList,
            values: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'object', additionalProperties: str } } },
          },
        },
      },
      motion: { type: ['object', 'null'], description: 'Motion roles by name per slot and property, choreographies on enter / exit. null = no decision yet (MOT-002).' },
      behaviour: {
        type: 'object',
        properties: {
          primitives: { type: 'array', items: { type: 'object', properties: { name: str, library: str, pattern: strOrNull, keyboard: { type: 'object', additionalProperties: str }, focus: str } } },
          roles: strList,
          ariaAttributes: strList,
        },
      },
      usage: str,
      accessibility: str,
      code: {
        type: 'object',
        properties: {
          files: strList,
          import: { type: ['object', 'null'], properties: { name: str, module: str, exports: strList } },
          story: { type: ['object', 'null'], properties: { file: str, title: str, id: strOrNull, url: strOrNull } },
        },
      },
      docs: { type: 'object', properties: { humanContract: strOrNull } },
    },
  }
}

/** `spec/contracts/README.md`: how an agent uses the contracts, with live counts. */
export function contractReadme(index: ContractIndexEntry[]): string {
  const comps = index.filter((e) => e.kind === 'component')
  const blocks = index.filter((e) => e.kind === 'block')
  const n = (xs: ContractIndexEntry[], f: (e: ContractIndexEntry) => boolean) => xs.filter(f).length
  return `# Escala component contracts

GENERATED by \`npm run gen:contracts\` (\`src/lib/componentContracts.ts\`). Never edit by hand.
Schema: \`${CONTRACT_SCHEMA}\` — [\`schema.json\`](./schema.json).

## How an agent uses them

1. **Find the piece.** Read [\`index.json\`](./index.json). From a Figma frame, match the instance's
   main component set name to \`figmaSet\` (Code Connect is unavailable on the Figma plan; this index
   is the bridge). From a brief, match \`label\` / \`category\`.
2. **Read its contract.** \`file\` points at \`spec/contracts/<Key>.json\` (a component) or at a
   block contract in \`src/components/escala-ui/blocks/\` (a block: a composition of components).
3. **Import it**, never re-draw it: \`code.import\` names the export and the module.
4. **Style nothing by hand.** \`bindings\` already says which token each slot paints in each state;
   \`names\` translates a ref to its CSS variable and its Figma variable. A value no role covers is a
   missing role: report it.
5. **Behave like the library.** \`behaviour\` lists the keys and focus model the component inherits;
   \`motion\` the motion roles it plays (null = no decision yet).
6. **When Figma and the contract disagree**, \`owners\` says which side wins: Figma for anatomy and
   foundations, Storybook for behaviour.

## Coverage (this commit)

| | Components | Blocks |
|---|---|---|
| Contracts | ${comps.length} | ${blocks.length} |
| With a Figma set | ${n(comps, (e) => e.figmaSet != null)} | ${n(blocks, (e) => e.figmaNode != null)} |
| With a Storybook story | ${n(comps, (e) => e.story != null)} | ${n(blocks, (e) => e.story != null)} |
| With a motion decision | ${n(comps, (e) => e.motion != null)} | ${n(blocks, (e) => e.motion != null)} |
| Registered in governance | ${n(comps, (e) => e.stage != null)} | ${n(blocks, (e) => e.stage != null)} |
`
}
