/**
 * Nearest-reference-scale matching — the primitive shared by every architecture
 * whose palette is DATA rather than a formula.
 *
 * Radix and Tailwind both ship hand-tuned scales and no generator. Deriving a
 * palette for an arbitrary brand seed therefore starts the same way in both:
 * measure perceptual distance from the seed to every colour of every reference
 * scale, and rank the families by how close their nearest member is.
 *
 * What each architecture does AFTERWARDS is entirely its own — Radix mixes the
 * top two by trigonometry and transposes onto the page; Tailwind does something
 * much simpler (see `tailwind.ts`). Only the ranking lives here. Putting the
 * per-architecture parts in a shared "generic engine" is exactly the mistake
 * DEFECT C1 describes: one implementation wearing several names.
 */

import { deltaEOK as deltaEOKLab, oklchToOklab, type OKLCH } from './gamut'

export type Lch = OKLCH
export type ReferenceScale = readonly (readonly [l: number, c: number, h: number])[]

/** ΔE_OK between two OKLCH colours. Delegates to the one implementation. */
export const deltaEOK = (a: Lch, b: Lch): number =>
  deltaEOKLab(oklchToOklab(a), oklchToOklab(b))

export const asLch = (t: ReferenceScale[number]): Lch => ({ l: t[0], c: t[1], h: t[2] })

export type ScaleMatch = {
  /** Reference scale name. */
  scale: string
  /** The single closest colour within that scale. */
  color: Lch
  /** ΔE_OK from the source to that colour. */
  distance: number
}

/**
 * Every reference scale ranked by its closest member, nearest first, ONE entry
 * per scale.
 *
 * The de-duplication matters: without it the top N are all neighbouring steps
 * of the same family, which tells you nothing about which family the seed
 * belongs to.
 *
 * `demoteGroup` handles near-identical families. Radix ships six greys within
 * ~0.01 ΔE of each other, so if the nearest is a grey the runner-up will be too
 * and comparing their distances is meaningless — pass the grey names and the
 * runner-up is advanced to the first family outside the group. Ignored when
 * EVERY candidate is in the group (an actually-grey seed).
 */
export function rankScales(
  source: Lch,
  scales: Record<string, ReferenceScale>,
  demoteGroup: readonly string[] = [],
): ScaleMatch[] {
  const all: ScaleMatch[] = []
  for (const [scale, steps] of Object.entries(scales)) {
    for (const step of steps) {
      const color = asLch(step)
      all.push({ scale, color, distance: deltaEOK(source, color) })
    }
  }
  all.sort((a, b) => a.distance - b.distance)

  const ranked = all.filter((c, i, arr) => i === arr.findIndex((v) => v.scale === c.scale))

  if (demoteGroup.length && ranked.length > 1) {
    const allInGroup = ranked.every((c) => demoteGroup.includes(c.scale))
    if (!allInGroup && demoteGroup.includes(ranked[0].scale)) {
      while (ranked.length > 1 && demoteGroup.includes(ranked[1].scale)) ranked.splice(1, 1)
    }
  }

  return ranked
}
