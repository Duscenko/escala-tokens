// Random accent for Color edition — the same hue-axis move SpectrumSlider
// makes, pointed at a new angle.
//
// Holding absolute L+C while spinning hue is the ratchet CLAUDE.md documents
// (`readHuePosition` / `colorAtHue`): chroma clamps through a narrow hue and
// never recovers. This generator therefore keeps the colour's RELATIVE
// position (saturation vs the gamut wall, lightness vs the cusp) and only
// changes the angle — so a vivid brand stays vivid, a dark one stays dark.
//
// A near-grey seed has no useful angle. Flooring saturation there is what
// makes Random produce a colour rather than another grey smear. Lightness is
// never invented: a muted slate stays at its depth, just with a hue.

import { colorAtHue, readHuePosition } from './colorUtils'

/** Shortest-arc degrees. Two clicks that land 8° apart read as "nothing happened." */
export const MIN_HUE_DELTA = 40

/**
 * Saturation floor for a seed that has almost no chroma of its own. Matches
 * the spirit of SpectrumSlider's track (always near the wall) without forcing
 * every already-vivid accent onto 0.95 — a hand-picked dusty rose stays dusty.
 */
export const RANDOM_MIN_SATURATION = 0.72

export function hueDelta(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

/** Hue at least `MIN_HUE_DELTA` away from `from`. Shared by accent-only
 *  Random and the full theme recipe so both stay one implementation. */
export function randomHue(from: number, rng: () => number = Math.random): number {
  const span = 360 - 2 * MIN_HUE_DELTA
  const offset = MIN_HUE_DELTA + rng() * span
  return (from + offset) % 360
}

export function randomAccent(
  current: string,
  rng: () => number = Math.random,
): string {
  const { hue, position } = readHuePosition(current)
  const saturation = Math.max(position.saturation, RANDOM_MIN_SATURATION)
  return colorAtHue({ saturation, lightness: position.lightness }, randomHue(hue, rng))
}
