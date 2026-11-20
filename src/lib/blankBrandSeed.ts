import { hexToOklch } from './color/gamut'
import { CURATED_COLORS, type CuratedColor } from './curatedColors'

/** Below this OKLCH chroma a colour reads as grey: it has no hue to avoid. */
const GREY_CHROMA = 0.04

/** Shortest distance between two hues on the colour wheel, in degrees. */
function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * The accent a blank brand starts on, when it joins a system that already
 * has brands. "Start from blank" used to mint the system's own style, so the
 * new brand wore the same accent as the brand beside it and the board did not
 * move: it looked as if nothing had happened.
 *
 * The pick is one of the vivid curated accents (the first ones Suggested
 * colours shows), the one whose hue sits farthest from every accent already in
 * the system. Same system, same pick: the choice is deterministic.
 */
export function pickBlankBrandSeed(existingAccents: readonly string[]): CuratedColor {
  const vivid = CURATED_COLORS.filter((color) => color.source === 'createui')
  const hues = existingAccents
    .map((hex) => hexToOklch(hex))
    .filter((c) => c.c >= GREY_CHROMA && Number.isFinite(c.h))
    .map((c) => c.h)
  if (hues.length === 0) return vivid[0]
  let best = vivid[0]
  let bestGap = -1
  for (const color of vivid) {
    const h = hexToOklch(color.hex).h
    const gap = Math.min(...hues.map((other) => hueGap(h, other)))
    if (gap > bestGap) { best = color; bestGap = gap }
  }
  return best
}
