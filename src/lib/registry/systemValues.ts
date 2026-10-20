/**
 * A PUBLISHED system (`tokens.json`, the Blob `/api/tokens` serves) → the
 * values of the custom properties `variables.css` names.
 *
 * The registry and the shadcn `globals.css` both run on the server against the
 * published payload, where there is no store and no `buildCSS`. So this reads
 * the payload through `resolveToken` and returns values
 * under the SAME names `buildCSS` emits — `cssVarOf` decides both.
 *
 * Scope, deliberately: one brand, its Light and Dark themes, the DESKTOP reading
 * of every length (the tablet / mobile step-down lives in `variables.css`'s
 * media blocks, not in a component install).
 *
 * Imported by `api/registry.ts` (Node ESM): every relative import is `.js`.
 */
import type { TokenJSON } from '../agentBundle/types.js'
import { resolveToken } from '../agentAccess/resolveToken.js'
import { cssVarOf } from '../componentRecipes.js'
import { fontStack } from '../fontStack.js'

export type Appearance = 'light' | 'dark'

/** The two theme columns of one brand. `dark` is null for a Light-only brand. */
export interface SystemModes { brand: string | null; light: string; dark: string | null }

type Json = TokenJSON & {
  colors: TokenJSON['colors'] & {
    themeKinds?: Record<string, string>
    activeTheme?: string
    architecture?: { tokens?: Record<string, Record<string, Record<string, string>>> }
  }
  typography?: TypographyBlock
  foundationsByTheme?: Record<string, { typography?: TypographyBlock }>
}
interface TypographyBlock {
  fontFamily?: string
  headingFontFamily?: string
  sizes?: Record<string, string>
  lineHeights?: Record<string, string>
  letterSpacings?: Record<string, string>
  weights?: Record<string, number | string>
  roles?: Record<string, { desktop?: { family?: string; size?: string; weight?: string } }>
}

const asJson = (json: TokenJSON) => json as Json

function themeOrder(json: Json): string[] {
  const order = json.colors.themeOrder
  if (order?.length) return order
  const first = Object.values(json.colors.architecture?.tokens ?? {})[0]
  const sample = first ? Object.values(first)[0] : undefined
  return sample ? Object.keys(sample) : ['light', 'dark']
}

export function appearanceOf(json: TokenJSON, id: string): Appearance {
  const kind = asJson(json).colors.themeKinds?.[id]
  if (kind === 'dark' || kind === 'light') return kind
  return id === 'dark' || id.endsWith('::dark') || id.endsWith('-dark') ? 'dark' : 'light'
}

/** The library brand a column belongs to: `core::dark` → `core`. */
const brandOf = (id: string) => (id.includes('::') ? id.split('::')[0] : null)

/**
 * Which two columns serve Light and Dark. `brand` (a library theme key) picks
 * the brand; without it, the system's active brand, else its first.
 */
export function systemModes(json: TokenJSON, brand?: string | null): SystemModes {
  const j = asJson(json)
  const order = themeOrder(j)
  const want = brand?.trim() || null
  // A whole-system payload has one column per theme (`light`, `dark`), not
  // `brand::appearance` pairs: there the two appearances are two columns.
  if (!order.some((id) => id.includes('::'))) {
    const light = order.find((id) => appearanceOf(j, id) === 'light') ?? order[0] ?? 'light'
    return { brand: null, light, dark: order.find((id) => appearanceOf(j, id) === 'dark') ?? null }
  }
  const byBrand = (b: string) => order.filter((id) => id === b || brandOf(id) === b)
  let pool = want ? byBrand(want) : []
  // `activeTheme` is a column id in a synced payload (`core::light`).
  const active = j.colors.activeTheme
  if (!pool.length && active) pool = byBrand(brandOf(active) ?? active)
  if (!pool.length) {
    const first = brandOf(order[0] ?? '')
    pool = first ? byBrand(first) : order
  }
  const light = pool.find((id) => appearanceOf(j, id) === 'light')
  const dark = pool.find((id) => appearanceOf(j, id) === 'dark') ?? null
  return { brand: brandOf(light ?? dark ?? '') ?? want, light: light ?? dark ?? order[0] ?? 'light', dark: light ? dark : null }
}

/** A colour role's resolved value in one column (hex, `#rrggbbaa` for alpha). */
export function roleColor(json: TokenJSON, id: string, mode: string): string | undefined {
  const tokens = asJson(json).colors.architecture?.tokens
  const dot = id.indexOf('.')
  const value = tokens?.[id.slice(0, dot)]?.[id.slice(dot + 1)]?.[mode]
  // An unresolved ref (`{accent.9}`, empty ramp) is not a colour.
  return value && !value.startsWith('{') ? value : undefined
}

/** Every Categorical role id the payload carries (`action.primary.default`). */
export function roleIds(json: TokenJSON): string[] {
  const tokens = asJson(json).colors.architecture?.tokens ?? {}
  return Object.entries(tokens).flatMap(([group, roles]) => Object.keys(roles).map((k) => `${group}.${k}`))
}

const DIMENSION_NS = ['size', 'radius', 'spacing', 'stroke', 'shadow', 'selector', 'icon'] as const

function typeFacet(json: Json, role: string, facet: string, mode: string): string | undefined {
  const t = json.foundationsByTheme?.[mode]?.typography ?? json.typography
  const alias = t?.roles?.[role]?.desktop
  if (!t || !alias?.size) return undefined
  switch (facet) {
    case 'font-family': {
      const family = alias.family === 'display' ? t.headingFontFamily ?? t.fontFamily : t.fontFamily
      return family ? fontStack(family) : undefined
    }
    case 'font-size': return t.sizes?.[alias.size]
    case 'line-height': return t.lineHeights?.[alias.size]
    case 'font-weight': { const w = alias.weight ? t.weights?.[alias.weight] : undefined; return w == null ? undefined : String(w) }
    case 'letter-spacing': return t.letterSpacings?.[alias.size] ?? 'normal'
  }
  return undefined
}

function pick(values: Record<string, string> | undefined, mode: string): string | undefined {
  if (!values) return undefined
  return values[mode] ?? Object.values(values)[0]
}

/** One non-colour `variables.css` property (`--radius-action`, `--text-button-font-size`). */
function dimensionValue(json: Json, name: string, mode: string, appearance: Appearance): string | undefined {
  const text = /^--text-(.+)-(font-family|font-size|line-height|font-weight|letter-spacing)$/.exec(name)
  if (text) return typeFacet(json, text[1], text[2], mode)
  for (const ns of DIMENSION_NS) {
    if (!name.startsWith(`--${ns}-`)) continue
    const token = resolveToken(json, `${ns}.${name.slice(ns.length + 3)}`)
    if (!token.found) return undefined
    if (ns === 'shadow') return token.appearances?.[appearance] ?? pick(token.values, mode)
    const v = pick(token.values, mode)
    return v && !v.startsWith('{') ? v : undefined
  }
  return undefined
}

/**
 * Values for the given custom properties in one column. Properties the payload
 * cannot answer are left out (never guessed); `--escala-*` are set by the
 * recipe sheet itself and are skipped.
 */
export function cssVarValues(json: TokenJSON, names: string[], mode: string, appearance: Appearance): Record<string, string> {
  const j = asJson(json)
  const colorVar = new Map(roleIds(j).map((id) => [cssVarOf(`color.${id}`), id]))
  const out: Record<string, string> = {}
  for (const name of names) {
    if (name.startsWith('--escala-') || name.startsWith('--radix-') || name.startsWith('--tw-')) continue
    const role = colorVar.get(name)
    const value = role ? roleColor(j, role, mode) : dimensionValue(j, name, mode, appearance)
    if (value) out[name] = value
  }
  return out
}
