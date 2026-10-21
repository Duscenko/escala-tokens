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
import { onlyAppearance } from './narrow'
import type { TokenJSON } from './types'

export { CONTEXT_FOUNDATIONS, contextSize, foundationLabel, formatApproxTokens }

export interface JsonContextRequest {
  scope: ContextScope
  /** A Color Semantics column (`colors.themeOrder` entry), or `all`. */
  mode: string
  detail: ContextDetail
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

/** The paste: one scope, one mode (or all), values or the full brief. */
export function agentContextFromJSON(json: TokenJSON, req: JsonContextRequest): string {
  const narrowed = narrowToMode(json, req.mode)
  const appearance = req.mode === 'all' ? 'both' : modeAppearance(json, req.mode)
  const md = buildSystemContext(narrowed, { scope: req.scope, detail: req.detail, appearance })
  if (req.scope !== 'all') return md
  return md.trimEnd() + '\n\n---\n\n' + escalaPayloadSection(JSON.stringify(narrowed))
}
