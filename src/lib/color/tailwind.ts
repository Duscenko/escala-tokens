/**
 * Tailwind CSS palette access, and an honest derivation for custom brand seeds.
 *
 * THE HONEST PART FIRST
 * ─────────────────────────────────────────────────────────────────────────────
 * **Tailwind has no palette-generation algorithm.** Its 26 families are
 * hand-tuned OKLCH values chosen by the Tailwind team; the documented way to
 * customise is to write your own numbers. There is nothing to port.
 *
 * That leaves two truthful things this module can do, and it does both — kept
 * apart on purpose, because conflating them is how the old `tailwind` preset
 * came to claim an algorithm that never existed (DEFECT C1):
 *
 *   1. `tailwindFamily(name)` — the REAL palette, verbatim. Byte-identical to
 *      `tailwindcss/theme.css`. If a user wants Tailwind, this is Tailwind.
 *
 *   2. `deriveTailwindScale(seed)` — a scale for a brand colour Tailwind does
 *      not ship. This is **Escala's derivation, not Tailwind's**, and the
 *      returned object says so in `provenance`. It snaps to the nearest
 *      Tailwind family and rotates that family's curve onto the seed's hue,
 *      keeping Tailwind's hand-tuned lightness and chroma progression — which
 *      is the part that makes a ramp *look* like Tailwind.
 *
 * Deliberately NOT done: running Radix's reference-transposition over Tailwind
 * data. That would produce Tailwind-flavoured Radix and label it "Tailwind" —
 * the exact failure this whole workstream exists to correct. The two share only
 * `scaleMatch.rankScales`; everything downstream differs.
 */

import {
  TAILWIND, TAILWIND_STOPS, TAILWIND_BASE_INDEX,
  TAILWIND_FAMILY_NAMES, TAILWIND_NEUTRAL_FAMILY_NAMES,
} from './tailwindReference'
import { rankScales, asLch, deltaEOK, type Lch } from './scaleMatch'
import { hexToOklch, oklchToHex } from './gamut'

export type TailwindFamilyName = (typeof TAILWIND_FAMILY_NAMES)[number]

export { TAILWIND_STOPS, TAILWIND_BASE_INDEX, TAILWIND_FAMILY_NAMES }

/**
 * A real Tailwind family in raw OKLCH, keyed by stop. Tailwind's own values,
 * to the digit.
 *
 * Prefer this over `tailwindFamily` wherever the consumer can carry more than
 * 8 bits: **a good part of Tailwind's palette is outside sRGB** — `amber-400`
 * is declared at chroma 0.189, which sRGB cannot hold, and gamut mapping brings
 * it back to ~0.171. The published values assume a P3 display. Emitting hex is
 * a lossy fallback, not the source of truth.
 */
export function tailwindFamilyOklch(name: string): Record<number, Lch> {
  const scale = TAILWIND[name]
  if (!scale) throw new Error(`tailwind: unknown family "${name}"`)
  const out: Record<number, Lch> = {}
  scale.forEach((step, i) => { out[TAILWIND_STOPS[i]] = asLch(step) })
  return out
}

/**
 * A real Tailwind family as sRGB hex, keyed by stop (`50`…`950`).
 * Gamut-mapped where Tailwind's value exceeds sRGB — see `tailwindFamilyOklch`.
 */
export function tailwindFamily(name: string): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [stop, { l, c, h }] of Object.entries(tailwindFamilyOklch(name))) {
    out[Number(stop)] = oklchToHex(l, c, h)
  }
  return out
}

export type TailwindDerivation = {
  /** sRGB hex per Tailwind stop (`50`…`950`), gamut-mapped where needed. */
  scale: Record<number, string>
  /** The same stops in raw OKLCH — unclipped, for P3 output and for tests. */
  oklch: Record<number, Lch>
  /** The Tailwind family whose curve this borrows. */
  nearestFamily: string
  /** ΔE_OK from the seed to that family's closest stop. */
  distance: number
  /** The stop whose colour is closest to the seed. */
  nearestStop: number
  /**
   * Where these numbers come from. `'tailwind'` when the seed IS a Tailwind
   * colour and the family is returned untouched; `'escala-derived'` when the
   * curve was rotated onto a hue Tailwind does not ship.
   */
  provenance: 'tailwind' | 'escala-derived'
}

/** Below this ΔE the seed is, for practical purposes, the Tailwind colour. */
const EXACT_MATCH_THRESHOLD = 0.01

/**
 * An 11-stop scale for `seed`, in Tailwind's shape.
 *
 * Method — deliberately simple, and simple is the point:
 *
 *  1. Rank Tailwind's families by ΔE_OK to the seed. Neutrals are demoted when
 *     a chromatic family is also close, for the same reason Radix demotes its
 *     greys: five near-identical neutrals make the runner-up uninformative.
 *  2. If the seed already IS a Tailwind colour, return that family verbatim and
 *     mark it `provenance: 'tailwind'`.
 *  3. Otherwise take the nearest family's L and C progression, rotate every stop
 *     to the seed's hue, and scale chroma so the family's base stop lands on the
 *     seed's chroma. Hand-tuned curve, your colour.
 *
 * There is no mixing of two families and no page transposition. Tailwind's
 * palette has no notion of a page — its stops are absolute, which is exactly why
 * `bg-slate-50` looks the same in every project. Inventing a transposition would
 * be inventing Tailwind behaviour.
 */
export function deriveTailwindScale(seed: string): TailwindDerivation {
  const source = hexToOklch(seed)
  const ranked = rankScales(source, TAILWIND, TAILWIND_NEUTRAL_FAMILY_NAMES)
  const best = ranked[0]
  const family = TAILWIND[best.scale]

  const nearestStopIndex = family.reduce(
    (bestI, step, i) =>
      deltaEOK(source, asLch(step)) < deltaEOK(source, asLch(family[bestI])) ? i : bestI,
    0,
  )
  const nearestStop = TAILWIND_STOPS[nearestStopIndex]

  if (best.distance <= EXACT_MATCH_THRESHOLD) {
    return {
      scale: tailwindFamily(best.scale),
      oklch: tailwindFamilyOklch(best.scale),
      nearestFamily: best.scale,
      distance: best.distance,
      nearestStop,
      provenance: 'tailwind',
    }
  }

  // Anchor on the family's BASE stop (500) rather than the nearest one: a seed
  // closest to `blue-700` is still a brand colour that should sit where brands
  // sit, and Tailwind's own semantics put the identity colour at 500.
  const anchor = asLch(family[TAILWIND_BASE_INDEX])
  // Guard the achromatic case — a neutral family has ~0 chroma at the anchor,
  // and dividing by it would send every stop to infinity.
  const chromaRatio = anchor.c > 1e-4 ? source.c / anchor.c : 0

  const scale: Record<number, string> = {}
  const oklch: Record<number, Lch> = {}
  family.forEach((step, i) => {
    const s = asLch(step)
    const c = chromaRatio > 0 ? s.c * chromaRatio : s.c
    const stop = TAILWIND_STOPS[i]
    oklch[stop] = { l: s.l, c, h: source.h }
    scale[stop] = oklchToHex(s.l, c, source.h)
  })

  return {
    scale,
    oklch,
    nearestFamily: best.scale,
    distance: best.distance,
    nearestStop,
    provenance: 'escala-derived',
  }
}

/** Every family, ranked by how close it is to `seed`. Useful for a picker. */
export function nearestTailwindFamilies(seed: string, limit = 5): { family: string; distance: number }[] {
  return rankScales(hexToOklch(seed), TAILWIND, TAILWIND_NEUTRAL_FAMILY_NAMES)
    .slice(0, limit)
    .map((m) => ({ family: m.scale, distance: m.distance }))
}

/** The five neutral families — near-identical, and demoted during ranking. */
export const TAILWIND_NEUTRALS = TAILWIND_NEUTRAL_FAMILY_NAMES

export type { Lch }
