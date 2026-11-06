// "Context for agents" from a published TokenJSON — what the Figma plugin's
// Export page calls. Same request model as the web (`contextRequest.ts`:
// scope · detail), plus a MODE: the plugin reads a payload whose Color
// Semantics columns are its modes (`light`, `dark`, `brand::light`…), so the
// person picks one column or all of them.
//
// Every output is a cut of `buildSystemContext`, never a second renderer. At
// scope `all` it ends with the (narrowed) Escala JSON in the plugin's fence, so
// the paste still imports in another file or on escalatokens.com — the same
// rule the web's `brandContext` follows. A single foundation carries no JSON.

import {
  CONTEXT_FOUNDATIONS, buildSystemContext, contextSize, foundationLabel, formatApproxTokens,
  type ContextDetail, type ContextScope,
} from '../contextRequest'
import { escalaPayloadSection } from '../escalaPayloadFence'
import { appearanceLabel, brandColumn, buildBrandsContext, contextBrands, narrowToBrand, relabelBrandColumns, type ContextBrand } from './brands'
import { brandOfKey } from './names'
import { onlyAppearance } from './narrow'
import type { TokenJSON } from './types'

export { CONTEXT_FOUNDATIONS, contextSize, foundationLabel, formatApproxTokens }
export { contextBrands, narrowToBrand, type ContextBrand }

export interface JsonContextRequest {
  scope: ContextScope
  /** A Color Semantics column (`colors.themeOrder` entry), or `all`. With two
   *  or more brands it may also be an appearance (`light` / `dark`); a column
   *  key then also picks its brand. */
  mode: string
  detail: ContextDetail
  /** Two or more brands: `all` (shared values + By brand), or one brand's
   *  slug (that brand's values, flat). Ignored for a one-brand system. */
  brand?: string
}

/** The appearances a brand pick can be cut to: that brand's, or every
 *  appearance some brand ships (`all`). Empty for a one-brand system. */
export function contextAppearances(json: TokenJSON, brand: string): ('light' | 'dark')[] {
  const brands = contextBrands(json)
  if (!brands.length) return []
  const pool = brand === 'all' ? brands : brands.filter((b) => b.slug === brand)
  const looks = new Set<'light' | 'dark'>()
  for (const b of pool) {
    if (b.appearance !== 'dark') looks.add('light')
    if (b.appearance !== 'light') looks.add('dark')
  }
  return (['light', 'dark'] as const).filter((a) => looks.has(a))
}

/** The modes a payload ships, labelled the way the Figma file names them. */
export function contextModes(json: TokenJSON): { key: string; label: string }[] {
  const order = json.colors.themeOrder?.length ? json.colors.themeOrder : Object.keys(json.colors.themes ?? {})
  const labels = json.colors.themeLabels ?? {}
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  // A brand column is labelled by the full key ("Core / Minimalist Light");
  // never fall back to the raw slug ("core--minimalist"), it reads as a bug.
  const prettySlug = (slug: string) => slug.split(/-+/).filter(Boolean).map(cap).join(' ')
  return order.map((key) => {
    if (labels[key]) return { key, label: labels[key] }
    const [brand, appearance] = key.split('::')
    if (appearance) return { key, label: `${labels[brand] ?? prettySlug(brand)} ${cap(appearance)}` }
    return { key, label: prettySlug(key) }
  })
}

/** Light or dark, read off the mode key (`dark`, `brand::dark`) or the
 *  payload's own `themeKinds` when the key says neither. */
export function modeAppearance(json: TokenJSON, mode: string): 'light' | 'dark' {
  const tail = mode.includes('::') ? mode.split('::')[1] : mode
  if (tail === 'dark' || tail === 'light') return tail
  const kinds = (json.colors as { themeKinds?: Record<string, string> }).themeKinds
  return kinds?.[mode] === 'dark' ? 'dark' : 'light'
}

/** The payload with ONE Color Semantics column and only that appearance's
 *  primitives, shadows and gradients. Everything else is untouched. */
export function narrowToMode(json: TokenJSON, mode: string): TokenJSON {
  const order = json.colors.themeOrder ?? Object.keys(json.colors.themes ?? {})
  if (mode === 'all' || !order.includes(mode)) return json
  const arch = json.colors.architecture
  const tokens = arch?.tokens
    ? Object.fromEntries(Object.entries(arch.tokens).map(([group, roles]) => [
        group,
        Object.fromEntries(Object.entries(roles).map(([role, byMode]) => [role, mode in byMode ? { [mode]: byMode[mode] } : byMode])),
      ]))
    : undefined
  const narrowed: TokenJSON = {
    ...json,
    colors: {
      ...json.colors,
      themeOrder: [mode],
      ...(json.colors.themes ? { themes: json.colors.themes[mode] ? { [mode]: json.colors.themes[mode] } : {} } : {}),
      ...(json.colors.themeSources?.[mode] ? { themeSources: { [mode]: json.colors.themeSources[mode] } } : {}),
      activeTheme: mode,
      ...(arch ? { architecture: { ...arch, tokens } } : {}),
    },
  }
  return onlyAppearance(narrowed, modeAppearance(json, mode))
}

/** One brand of several, flat: its own values under the names every brand
 *  shares, plus how to switch to it. */
function oneBrandContext(json: TokenJSON, brands: ContextBrand[], brand: ContextBrand, appearance: 'light' | 'dark' | 'all', req: JsonContextRequest): string {
  const flat = narrowToBrand(json, brand.slug)
  const col = brandColumn(brand, appearance)
  const narrowed = col ? narrowToMode(flat, col) : flat
  const md = relabelBrandColumns(
    buildSystemContext(narrowed, { scope: req.scope, detail: req.detail, appearance: col ? modeAppearance(json, col) : 'both' }),
    narrowed.colors.themeOrder ?? [],
  )
  const others = brands.filter((b) => b.slug !== brand.slug).map((b) => b.label)
  const note = [
    `**Brand: ${brand.label}** (${appearanceLabel(brand.appearance)}) — one of ${brands.length} brands in this system (also ${others.join(', ')}). Every value below is ${brand.label}'s, resolved. Token names are the same in every brand; only the values change, so never add the brand to a name.`,
    '',
    `Activate it: in code \`data-brand="${brand.dataBrand}"\` on \`<html>\` (the multi-brand \`variables.css\`, \`[data-brand]\` selectors); in Figma the \`Brand\` collection's mode \`${brand.label}\`.`,
    '',
  ]
  const lines = md.split('\n')
  const body = [lines[0]!, '', ...note, ...lines.slice(1)].join('\n').replace(/\n{3,}/g, '\n\n')
  if (req.scope !== 'all') return body
  return body.trimEnd() + '\n\n---\n\n' + escalaPayloadSection(JSON.stringify(narrowed))
}

/** The paste: one scope, one mode (or all), values or the full brief. */
export function agentContextFromJSON(json: TokenJSON, req: JsonContextRequest): string {
  const brands = contextBrands(json)
  if (brands.length >= 2) {
    let pick = req.brand ?? 'all'
    // A column key names its brand too (the Mode menu before the Brand one).
    if (req.mode.includes('::') && pick === 'all') pick = brandOfKey(req.mode)
    const appearance: 'light' | 'dark' | 'all' = req.mode === 'all' ? 'all'
      : req.mode.includes('::') ? modeAppearance(json, req.mode)
      : req.mode === 'dark' ? 'dark' : 'light'
    const one = brands.find((b) => b.slug === pick)
    if (one) return oneBrandContext(json, brands, one, appearance, req)
    const md = buildBrandsContext(json, brands, { scope: req.scope, detail: req.detail, appearance })
    if (req.scope !== 'all') return md
    return md.trimEnd() + '\n\n---\n\n' + escalaPayloadSection(JSON.stringify(json))
  }
  const narrowed = narrowToMode(json, req.mode)
  const appearance = req.mode === 'all' ? 'both' : modeAppearance(json, req.mode)
  const md = buildSystemContext(narrowed, { scope: req.scope, detail: req.detail, appearance })
  if (req.scope !== 'all') return md
  return md.trimEnd() + '\n\n---\n\n' + escalaPayloadSection(JSON.stringify(narrowed))
}
