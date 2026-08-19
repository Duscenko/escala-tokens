/**
 * IBM Carbon — the palette, the four themes, and the layer model.
 *
 * WHY CARBON IS WORTH ADDING
 * ─────────────────────────────────────────────────────────────────────────────
 * Not for its ramps. Like Tailwind, Carbon's scales are hand-tuned brand values
 * with no generator behind them, so `carbonFamily()` is a lookup and
 * `deriveCarbonScale()` is honestly labelled as Escala's own.
 *
 * Carbon is worth adding for the **layer model**, which is the one genuinely
 * different idea in the set of architectures Escala supports.
 *
 * Every other architecture here answers "what colour is this token?" with an
 * absolute value. Carbon answers "what colour is this token **at this nesting
 * depth**?" A card on the page and the same card inside a panel are not the
 * same colour, and the component does not know which it is — it asks for
 * `layer`, and the depth comes from how deeply it is wrapped.
 *
 * That is a different shape of token, and it is why Carbon's `layer01` cannot
 * be flattened into the 12-step model without losing what it means.
 *
 * THE FINDING THE DATA GIVES UP
 * ─────────────────────────────────────────────────────────────────────────────
 * The layers do NOT simply get lighter (or darker) with depth:
 *
 *   white  #ffffff → #f4f4f4 → #ffffff → #f4f4f4    ← ALTERNATES
 *   g10    #f4f4f4 → #ffffff → #f4f4f4 → #ffffff    ← ALTERNATES
 *   g90    #262626 → #393939 → #525252 → #6f6f6f    ← ascends
 *   g100   #161616 → #262626 → #393939 → #525252    ← ascends
 *
 * Light themes alternate because they have nowhere to go — one more step
 * lighter than white does not exist. Dark themes have headroom, so they lift.
 *
 * The invariant is therefore NOT "each layer is lighter than the one below".
 * It is **"each layer is distinguishable from the one below"**, and that is what
 * `__tests__/carbon.test.ts` asserts. Encoding the wrong invariant here is how a
 * derived Carbon theme would come out with two identical adjacent layers.
 */

import {
  CARBON_PALETTE, CARBON_STOPS, CARBON_THEMES, CARBON_THEME_NAMES,
  CARBON_FAMILY_NAMES, CARBON_NEUTRAL_FAMILY_NAMES,
  type CarbonLayerGroup,
} from './carbonReference'
import { rankScales, asLch, type Lch } from './scaleMatch'
import { hexToOklch, oklchToHex } from './gamut'

export type CarbonThemeName = (typeof CARBON_THEME_NAMES)[number]
export type CarbonFamilyName = (typeof CARBON_FAMILY_NAMES)[number]

export {
  CARBON_STOPS, CARBON_THEME_NAMES, CARBON_FAMILY_NAMES,
  CARBON_NEUTRAL_FAMILY_NAMES, type CarbonLayerGroup,
}

/** A real Carbon family as hex, keyed by stop (`10`…`100`). IBM's own values. */
export function carbonFamily(name: string): Record<number, string> {
  const scale = CARBON_PALETTE[name]
  if (!scale) throw new Error(`carbon: unknown family "${name}"`)
  const out: Record<number, string> = {}
  scale.forEach((hex, i) => { out[CARBON_STOPS[i]] = hex })
  return out
}

// ── The layer model ──────────────────────────────────────────────────────────

/**
 * Nesting depth. 0 is the page itself; 1–3 are Carbon's `Layer` wrappers.
 *
 * Carbon caps at 3 deliberately — past three levels of nesting the surfaces stop
 * being tellable apart, and the guidance is to restructure rather than nest
 * further. `resolveLayer` clamps instead of throwing, because a runaway nesting
 * bug should degrade to a valid colour, not crash a render.
 */
export type LayerDepth = 0 | 1 | 2 | 3

export const MAX_LAYER_DEPTH: LayerDepth = 3

/**
 * The value of a depth-indexed token at a given nesting depth.
 *
 * `borderSubtle` is the one group with a real depth-0 entry — a border on an
 * element sitting directly on the page. Every other group starts at layer 01,
 * so depth 0 and depth 1 resolve to the same token, which is Carbon's own
 * behaviour: an unwrapped component IS a layer-01 component.
 */
export function resolveLayer(
  theme: CarbonThemeName,
  group: CarbonLayerGroup,
  depth: LayerDepth,
): string {
  const t = CARBON_THEMES[theme]
  if (!t) throw new Error(`carbon: unknown theme "${theme}"`)
  const scale = t.layers[group]

  const clamped = Math.max(0, Math.min(MAX_LAYER_DEPTH, depth))
  // Groups with four entries are indexed from depth 0; the rest from depth 1.
  const index = scale.length === 4 ? clamped : Math.max(0, clamped - 1)
  return scale[Math.min(index, scale.length - 1)]
}

/** The page colour for a theme — depth 0, and what layer 1 sits on. */
export function carbonBackground(theme: CarbonThemeName): string {
  const t = CARBON_THEMES[theme]
  if (!t) throw new Error(`carbon: unknown theme "${theme}"`)
  return t.flat.background
}

/**
 * Is this token an alpha value rather than a hex?
 *
 * Carbon mixes the two — 25 of the white theme's 235 tokens are `rgba(...)`,
 * including `textPlaceholder` and `overlay`. Anything measuring contrast has to
 * composite those over the surface first; measuring the string directly throws.
 */
export const isCarbonAlphaToken = (value: string): boolean => !/^#[0-9a-f]{6}$/i.test(value)

/**
 * A theme token resolved to an opaque hex ON a given surface. Hex tokens pass
 * through; `rgba()` tokens are composited, which is what they actually render
 * as and therefore what a contrast audit must measure.
 */
export function resolveCarbonInk(
  theme: CarbonThemeName,
  token: string,
  surface: string,
): string | undefined {
  const value = carbonToken(theme, token)
  if (value === undefined) return undefined
  if (!isCarbonAlphaToken(value)) return value

  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/.exec(value)
  if (!m) return undefined
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const a = m[4] === undefined ? 1 : Number(m[4])

  const base = surface.replace(/^#/, '')
  const br = parseInt(base.slice(0, 2), 16)
  const bg = parseInt(base.slice(2, 4), 16)
  const bb = parseInt(base.slice(4, 6), 16)

  const mix = (fg: number, bgc: number) => Math.round(bgc * (1 - a) + fg * a)
  const hex2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${hex2(mix(r, br))}${hex2(mix(g, bg))}${hex2(mix(b, bb))}`
}

/** A non-depth-indexed theme token (`textPrimary`, `focus`, `supportError`…). */
export function carbonToken(theme: CarbonThemeName, token: string): string | undefined {
  const t = CARBON_THEMES[theme]
  if (!t) throw new Error(`carbon: unknown theme "${theme}"`)
  return t.flat[token]
}

/**
 * Every surface a component can land on, page first — the sequence a contrast
 * audit has to walk. This is the part other architectures cannot express: text
 * must be readable on ALL of these, not just on "the background".
 */
export function carbonSurfaceStack(theme: CarbonThemeName): string[] {
  return [
    carbonBackground(theme),
    ...([1, 2, 3] as LayerDepth[]).map((d) => resolveLayer(theme, 'layer', d)),
  ]
}

/** Is this theme's page dark? Drives which text tokens apply. */
export function isDarkCarbonTheme(theme: CarbonThemeName): boolean {
  return hexToOklch(carbonBackground(theme)).l < 0.5
}

// ── Derivation for a brand seed ──────────────────────────────────────────────

export type CarbonDerivation = {
  /** Hex per Carbon stop (`10`…`100`). */
  scale: Record<number, string>
  /** Raw OKLCH per stop, for wide-gamut output. */
  oklch: Record<number, Lch>
  nearestFamily: string
  distance: number
  /**
   * `'carbon'` when the seed IS a Carbon colour and the family is returned
   * untouched; `'escala-derived'` otherwise. Same contract as Tailwind's — the
   * user is always told whose numbers they are looking at.
   */
  provenance: 'carbon' | 'escala-derived'
}

const EXACT_MATCH_THRESHOLD = 0.01

/**
 * A 10-stop scale for `seed` in Carbon's shape. **Escala's derivation, not
 * IBM's** — Carbon ships no generator.
 *
 * Same method as the Tailwind derivation, and the same reasoning: borrow the
 * hand-tuned lightness curve (that is what makes a ramp read as Carbon), rotate
 * onto the seed's hue, scale chroma so stop **60** lands on the seed. Carbon
 * anchors identity at 60 — `blue-60` is IBM Blue — where Tailwind anchors at 500.
 */
export function deriveCarbonScale(seed: string): CarbonDerivation {
  const source = hexToOklch(seed)
  const scales = Object.fromEntries(
    Object.entries(CARBON_PALETTE).map(([name, hexes]) => [
      name,
      hexes.map((hex) => {
        const { l, c, h } = hexToOklch(hex)
        return [l, c, h] as const
      }),
    ]),
  )

  const ranked = rankScales(source, scales, CARBON_NEUTRAL_FAMILY_NAMES)
  const best = ranked[0]

  if (best.distance <= EXACT_MATCH_THRESHOLD) {
    const scale = carbonFamily(best.scale)
    const oklch: Record<number, Lch> = {}
    for (const stop of CARBON_STOPS) oklch[stop] = hexToOklch(scale[stop])
    return { scale, oklch, nearestFamily: best.scale, distance: best.distance, provenance: 'carbon' }
  }

  const family = scales[best.scale]
  const anchorIndex = CARBON_STOPS.indexOf(60)
  const anchor = asLch(family[anchorIndex])
  const chromaRatio = anchor.c > 1e-4 ? source.c / anchor.c : 0

  const scale: Record<number, string> = {}
  const oklch: Record<number, Lch> = {}
  family.forEach((step, i) => {
    const s = asLch(step)
    const c = chromaRatio > 0 ? s.c * chromaRatio : s.c
    const stop = CARBON_STOPS[i]
    oklch[stop] = { l: s.l, c, h: source.h }
    scale[stop] = oklchToHex(s.l, c, source.h)
  })

  return { scale, oklch, nearestFamily: best.scale, distance: best.distance, provenance: 'escala-derived' }
}
