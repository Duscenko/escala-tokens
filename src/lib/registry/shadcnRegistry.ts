/**
 * Escala's shadcn registry (E11 in design-plans/shadcn-component-skeleton.md).
 *
 *   npx shadcn add https://escalatokens.com/r/button.json?project=<id>
 *
 * installs `components/ui/button.tsx` — the SAME escala-ui component the
 * configurator renders — plus the recipe rules that paint it and the values of
 * every variable those rules read, resolved from the published system. Nothing
 * is re-authored: the source is the generated copy of `components/escala-ui/`,
 * the rules are `recipeCss`, the values are `cssVarValues` over `tokens.json`.
 *
 * Item names are the escala-ui FILE names (shadcn's own convention: `dialog`
 * holds the Dialog, `button` holds the Button). A catalogue
 * key resolves to its file through `registryItemFor`.
 *
 * Imported by `api/registry.ts` (Node ESM): relative imports carry `.js`.
 */
import type { TokenJSON } from '../agentBundle/types.js'
import { COMPONENT_RECIPES } from '../componentRecipes.js'
import { COMPONENTS } from '../componentCatalogue.js'
import { recipeCss, recipeCssVars } from '../recipeStyles.js'
import { shadcnTheme } from '../shadcnGlobals.js'
import { ESCALA_UI_SOURCES } from './escalaUiSources.generated.js'
import type { RegistrySource } from './escalaUiTransform.js'
import { cssVarValues, systemModes } from './systemValues.js'

export const REGISTRY_ITEM_SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json'
export const REGISTRY_SCHEMA = 'https://ui.shadcn.com/schema/registry.json'
/** The theme item: shadcn's variables (E4), no component. */
export const THEME_ITEM = 'theme'

export interface RegistryOptions {
  /** `https://escalatokens.com` — where `/r/<name>.json` is served. */
  origin: string
  project: string
  brand?: string | null
}

type CssRules = Record<string, Record<string, string>>
export interface RegistryItem {
  $schema: string
  name: string
  type: 'registry:ui' | 'registry:theme'
  title: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: { path: string; type: 'registry:ui'; content: string }[]
  cssVars?: { light?: Record<string, string>; dark?: Record<string, string> }
  css?: Record<string, CssRules | Record<string, string>>
  meta?: Record<string, unknown>
}

const sourceOf = (name: string): RegistrySource | undefined => ESCALA_UI_SOURCES.find((s) => s.name === name)

/** Every item the registry serves: one per escala-ui file, then the theme. */
export function registryItemNames(): string[] {
  return [...ESCALA_UI_SOURCES.map((s) => s.name), THEME_ITEM]
}

/** `Dialog` → `dialog`, `Button` → `button`. */
export function registryItemFor(componentKey: string): string | undefined {
  return ESCALA_UI_SOURCES.find((s) => s.recipes.includes(componentKey))?.name
}

function itemUrl(name: string, o: RegistryOptions): string {
  const q = new URLSearchParams({ project: o.project })
  if (o.brand) q.set('brand', o.brand)
  return `${o.origin}/r/${name}.json?${q.toString()}`
}

function titleOf(src: RegistrySource): { title: string; description: string } {
  const defs = src.recipes.map((k) => COMPONENTS.find((c) => c.key === k)).filter((d) => !!d)
  if (!defs.length) {
    return { title: src.name, description: 'Shared helper for Escala components.' }
  }
  return {
    title: defs.map((d) => d.label).join(' · '),
    description: defs[0].description,
  }
}

/**
 * `recipeCss` text → shadcn's `css` object: `{ selector: { prop: value } }`.
 * A recipe repeats a selector (a part's base and its Default state), and an
 * object cannot: merging the two would move the later rule ahead of the rules
 * between them. A repeat gets `:where(*)` per selector — zero specificity, the
 * same elements — so every rule keeps its place in the cascade.
 */
export function cssRulesOf(css: string): CssRules {
  const rules: CssRules = {}
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const parts = m[1].trim().split(/,\s*\n\s*/)
    let selector = parts.join(', ')
    for (let n = 1; selector in rules; n++) selector = parts.map((p) => p + ':where(*)'.repeat(n)).join(', ')
    const decls: Record<string, string> = {}
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':')
      if (i < 0) continue
      const prop = d.slice(0, i).trim()
      const value = d.slice(i + 1).trim()
      if (prop) decls[prop] = value
    }
    rules[selector] = decls
  }
  return rules
}

/** The recipe sheet for these keys, and every variable it (or the file) reads. */
function sheetFor(src: RegistrySource): { css: string; vars: string[] } {
  const css = src.recipes
    .map((k) => COMPONENT_RECIPES[k])
    .filter((r) => !!r)
    .map((r) => recipeCss(r))
    .join('\n')
  const vars = [...new Set([...recipeCssVars(css), ...src.vars])].sort()
  return { css, vars }
}

function header(src: RegistrySource, o: RegistryOptions): string {
  const keys = src.recipes.length ? src.recipes.map((k) => `data-escala="${k}"`).join(', ') : 'no recipe of its own'
  return [
    `// Escala component, installed from ${o.origin} for system ${o.project}.`,
    `// Skeleton: shadcn/ui (MIT). Appearance: the recipe rules for ${keys}`,
    '// in your global CSS, reading the variables Escala exports (variables.css).',
    '',
  ].join('\n')
}

export function buildComponentItem(name: string, json: TokenJSON, o: RegistryOptions): RegistryItem | null {
  const src = sourceOf(name)
  if (!src) return null
  const modes = systemModes(json, o.brand)
  const { css, vars } = sheetFor(src)
  const light = cssVarValues(json, vars, modes.light, 'light')
  // Dark only carries what changes (colours, shadows): a length is one value.
  const darkAll = modes.dark ? cssVarValues(json, vars, modes.dark, 'dark') : {}
  const dark = Object.fromEntries(Object.entries(darkAll).filter(([k, v]) => light[k] !== v))
  const { title, description } = titleOf(src)

  const item: RegistryItem = {
    $schema: REGISTRY_ITEM_SCHEMA,
    name,
    type: 'registry:ui',
    title,
    description,
    files: [{ path: `registry/escala/${src.name}.${src.ext}`, type: 'registry:ui', content: header(src, o) + src.source }],
    meta: { escala: { project: o.project, brand: modes.brand, light: modes.light, dark: modes.dark, recipes: src.recipes } },
  }
  if (src.dependencies.length) item.dependencies = src.dependencies
  const registryDependencies = [
    ...(src.source.includes("'@/lib/utils'") ? ['utils'] : []),
    ...src.internal.map((dep) => itemUrl(dep, o)),
  ]
  if (registryDependencies.length) item.registryDependencies = registryDependencies
  // Values go in `css` as plain `:root` / `.dark` rules, NOT `cssVars`: the CLI
  // mirrors every cssVar into `@theme inline` (`--color-color-action-…`,
  // `--shadow-lg: var(--shadow-lg)`), which would rename Tailwind's own
  // shadow / radius scale onto ours. These names are `variables.css`'s, so a
  // project that already imports that file gets the same values twice.
  const sheet: Record<string, CssRules | Record<string, string>> = {}
  if (Object.keys(light).length) sheet[':root'] = light
  if (Object.keys(dark).length) sheet['.dark'] = dark
  if (css) sheet['@layer components'] = cssRulesOf(css)
  if (Object.keys(sheet).length) item.css = sheet
  return item
}

/** shadcn's own variables (E4), as an installable theme. */
export function buildThemeItem(json: TokenJSON, o: RegistryOptions): RegistryItem {
  const theme = shadcnTheme(json, o.brand)
  return {
    $schema: REGISTRY_ITEM_SCHEMA,
    name: THEME_ITEM,
    type: 'registry:theme',
    title: 'Escala theme',
    description: 'shadcn/ui variables answered by this system\'s Categorical roles (light and dark).',
    cssVars: { light: theme.light, ...(theme.dark ? { dark: theme.dark } : {}) },
    meta: { escala: { project: o.project, brand: theme.brand } },
  }
}

export function buildRegistryItem(name: string, json: TokenJSON, o: RegistryOptions): RegistryItem | null {
  return name === THEME_ITEM ? buildThemeItem(json, o) : buildComponentItem(name, json, o)
}

/** `registry.json`: the index `npx shadcn` lists from. */
export function buildRegistryIndex(o: RegistryOptions) {
  return {
    $schema: REGISTRY_SCHEMA,
    name: 'escala',
    homepage: o.origin,
    items: registryItemNames().map((name) => {
      const src = sourceOf(name)
      const meta = src ? titleOf(src) : { title: 'Escala theme', description: 'shadcn/ui variables answered by Categorical roles.' }
      return {
        name,
        type: src ? 'registry:ui' : 'registry:theme',
        ...meta,
        ...(src ? { files: [{ path: `registry/escala/${src.name}.${src.ext}`, type: 'registry:ui' }] } : {}),
        url: itemUrl(name, o),
      }
    }),
  }
}
