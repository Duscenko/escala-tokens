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

/** Mint the payload as a new brand of the system on screen. */
export function addBrandFromPayload(json: Record<string, unknown>, name: string): { key: string } | { error: string } {
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
  const kind = snap.themeKinds?.[snap.themeOrder?.[0] ?? 'light'] === 'dark' ? 'dark' : 'light'
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
  const s = useDesignStore.getState()
  s.setThemeFoundations(res.key, foundations)
  // The key is a slug; the card shows the name as it came in.
  s.setThemeLabel(res.key, name)
  if (snap.typography?.fontFamily) loadGoogleFont(snap.typography.fontFamily)
  if (snap.typography?.headingFontFamily) loadGoogleFont(snap.typography.headingFontFamily)
  return { key: res.key }
}
