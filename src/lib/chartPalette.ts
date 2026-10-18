// Categorical chart palette. Imported by the registry API (`api/registry.ts`),
// so every relative import here carries `.js` (Vercel runs api/ as Node ESM).
import { hexToOklch, oklchToHex } from './color/gamut.js'

/**
 * Five series colours derived from the brand hue, for shadcn's `--chart-1…5`.
 *
 * Categorical means IDENTITY, not magnitude, so the constraint is that adjacent
 * slots stay separable — including for a reader with colour-vision deficiency.
 *
 * Evenly spaced hues fail that. A 72° split puts green next to amber at ΔE 6.4
 * under deuteranopia — inside the 6–8 band that is legal only with a second
 * encoding (direct labels, gaps, texture) which a shadcn chart does not
 * guarantee. The offsets here were found by search and verified against
 * `color/cvd.ts`:
 *
 *   worst adjacent pair  ΔE 9.0 protan · 15.3 normal vision — clears the target
 *   every slot ≥ 3:1 against the surface, in BOTH light and dark
 *
 * L and C are fixed across the five so no series reads as "more important" than
 * another — rank is not identity. `__tests__/shadcn.test.ts` re-runs the checks
 * rather than trusting this comment, INCLUDING the even split, so the reason
 * these numbers look arbitrary stays executable.
 */
export const CHART_HUE_OFFSETS = [0, 70, 160, 230, 300] as const
const CHART_L = 0.62
const CHART_C = 0.15

/**
 * `offsets` is a parameter only so the test can demonstrate the rejected even
 * split against the real generator. Production always takes the default.
 */
export function chartPalette(
  accentHex: string,
  offsets: readonly number[] = CHART_HUE_OFFSETS,
): string[] {
  let hue = 0
  try {
    hue = hexToOklch(accentHex).h
  } catch { /* an unparseable accent falls back to hue 0 rather than crashing */ }
  return offsets.map((d) => oklchToHex(CHART_L, CHART_C, (hue + d) % 360))
}
