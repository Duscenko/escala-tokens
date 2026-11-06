// Add a brand from what another Escala system handed out: its tokens.json, or
// the Figma "Copy context" paste (which carries the same JSON in a
// ```json escala-tokens fence). The plugin's Add Brand Variant does the same.
//
// Nothing here is a second importer. The payload goes through the import
// pipeline Home's Import JSON uses (`analyzeTokens` → `materializeImport`),
// and the brand is minted the way Random mints one (`mintTheme` +
// `setThemeFoundations`). The difference from Import JSON is only where the
// result lands: a new brand of THIS system instead of replacing it.

import { useDesignStore } from '../store/useDesignStore'
import { extractEscalaPayload } from './figmaContext'
import { analyzeTokens, materializeImport } from './tokenImport'
import { mintTheme } from './themeMint'
import { backgroundFromBase } from './colorUtils'
import { loadGoogleFont } from './fonts'
import type { ThemeFoundationOverride } from './themeFoundations'
import { contextBrands, narrowToBrand } from './agentBundle/brands'
import type { TokenJSON } from './agentBundle/types'

export type BrandSource = 'context' | 'json'

export type ReadBrandResult =
  | { ok: true; json: Record<string, unknown>; name: string }
  | { ok: false; error: string }

/** What a paste or a file is. Only an Escala payload (it has `colors`) can
 *  become a brand; everything else gets a message that says where it goes. */
export function readBrandPayload(text: string, source: BrandSource, fileName?: string): ReadBrandResult {
  if (!text.trim()) return { ok: false, error: '' }
  const payload = extractEscalaPayload(text)
  let raw: unknown
  try {
    raw = JSON.parse(payload)
  } catch {
    return {
      ok: false,
      error: /```json\s+escala-tokens/.test(text)
        ? 'Part of the context is missing. Copy it again and paste all of it.'
        : source === 'context'
          ? 'This is not an Escala context. In Figma sync, press Copy context, then paste it here.'
          : 'This is not valid JSON.',
    }
  }
  if (!raw || typeof raw !== 'object' || !('colors' in raw)) {
    return {
      ok: false,
      error: /"\$value"\s*:/.test(payload)
        ? 'These are W3C tokens, not an Escala system. Use Import JSON in All design systems to bring them in.'
        : 'This is not an Escala tokens.json.',
    }
  }
  const json = raw as Record<string, unknown>
  const project = typeof json.project === 'string' ? json.project : ''
  const name = project || fileName?.replace(/\.(json|md|txt)$/i, '') || 'Imported brand'
  return { ok: true, json, name }
}

/** Mint the payload as new brands of the system on screen: one, or — for a
 *  multi-brand context (the plugin's All brands, `brand::appearance` columns
 *  of two or more brands) — every brand it carries, each from its own flat
 *  payload (`narrowToBrand`: its colours, radius, spacing and font families).
 *  `key` is the first brand; `keys` all of them, in the paste's order. A brand
 *  the system has no room for stops the loop; the ones minted stay. */
export function addBrandFromPayload(json: Record<string, unknown>, name: string): { key: string; keys: string[]; error?: string } | { error: string } {
  const brands = contextBrands(json as unknown as TokenJSON)
  if (brands.length < 2) {
    const one = addOneBrand(json, name)
    return 'error' in one ? one : { key: one.key, keys: [one.key] }
  }
  const keys: string[] = []
  for (const b of brands) {
    const flat = narrowToBrand(json as unknown as TokenJSON, b.slug) as unknown as Record<string, unknown>
    const res = addOneBrand(flat, b.label)
    if ('error' in res) {
      if (!keys.length) return res
      return { key: keys[0]!, keys, error: res.error }
    }
    keys.push(res.key)
  }
  return { key: keys[0]!, keys }
}

function addOneBrand(json: Record<string, unknown>, name: string): { key: string } | { error: string } {
  const analyzed = analyzeTokens(json, { consolidate: true })
  if (!analyzed.ok) return { error: analyzed.error }
  const snap = materializeImport(analyzed.analysis, { name, normalize: false })
  const slots = {
    brand: snap.primaryColor,
    gray: snap.grayBaseColor,
    error: snap.errorColor,
    warning: snap.warningColor,
    success: snap.successColor,
    info: snap.infoColor,
  }
  // A brand that ships only Dark (`otra::dark`) opens in Dark.
  const cols = ((json.colors as { themeOrder?: unknown } | undefined)?.themeOrder as string[] | undefined) ?? []
  const darkOnly = cols.length > 0 && cols.every((c) => String(c).endsWith('::dark'))
  const kind = darkOnly || snap.themeKinds?.[snap.themeOrder?.[0] ?? 'light'] === 'dark' ? 'dark' : 'light'
  const res = mintTheme(slots, kind, name, null, snap.neutralTint, {
    light: backgroundFromBase(slots.gray, 'light', snap.neutralTint),
    dark: backgroundFromBase(slots.gray, 'dark', snap.neutralTint),
  })
  if ('error' in res) return res
  const foundations: ThemeFoundationOverride = {
    typography: snap.typography,
    spacing: snap.spacing,
    padding: snap.padding,
    radius: snap.radius,
    shadows: snap.shadows,
    grid: snap.grid,
    sizes: snap.sizes,
    selector: snap.selector,
    stroke: snap.stroke,
    radiusRoles: snap.radiusRoles,
    spacingRoles: snap.spacingRoles,
    sizeRoles: snap.sizeRoles,
    selectorRoles: snap.selectorRoles,
    strokeRoles: snap.strokeRoles,
    breakpointRoles: snap.breakpointRoles,
    gridFrame: snap.gridFrame,
  }
  // Role maps the import pipeline does not read: a brand's own radius roles
  // (Sharp vs Pill on the same ramp) and their per-viewport values live only
  // there, so they come straight from the payload.
  const roles = (v: unknown): Record<string, string> | undefined =>
    v && typeof v === 'object' && Object.values(v as object).every((x) => typeof x === 'string') ? (v as Record<string, string>) : undefined
  const ownRadius = roles(json.radiusRoles)
  if (ownRadius) foundations.radiusRoles = { ...snap.radiusRoles, ...ownRadius }
  const ownSpacing = roles(json.spacingRoles)
  if (ownSpacing && snap.spacingRoles) {
    // Only roles the store already knows, so a payload from another version
    // cannot add names the editor has no row for.
    foundations.spacingRoles = { ...snap.spacingRoles, ...Object.fromEntries(Object.entries(ownSpacing).filter(([k]) => k in snap.spacingRoles!)) }
  }
  const ownPadding = roles(json.padding)
  if (ownPadding && snap.padding) foundations.padding = { ...snap.padding, ...ownPadding } as typeof snap.padding
  const rv = json.radiusRoleViewports
  if (rv && typeof rv === 'object') (foundations as Record<string, unknown>).radiusRoleViewports = rv
  const s = useDesignStore.getState()
  s.setThemeFoundations(res.key, foundations)
  // The key is a slug; the card shows the name as it came in.
  s.setThemeLabel(res.key, name)
  if (snap.typography?.fontFamily) loadGoogleFont(snap.typography.fontFamily)
  if (snap.typography?.headingFontFamily) loadGoogleFont(snap.typography.headingFontFamily)
  return { key: res.key }
}
