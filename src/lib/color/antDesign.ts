/**
 * Ant Design palette generation — a faithful port of `@ant-design/colors`
 * `generate.ts` (v8.0.1).
 *
 * WHY THIS IS A PORT AND NOT A TUNING
 * ─────────────────────────────────────────────────────────────────────────────
 * The `ant` preset in `colorUtils.SPECS` is the same OKLCH engine as every other
 * preset with different chroma multipliers. It shares a lightness curve with
 * `radix` to within 0.02 — which independent algorithms could not do (see
 * DEFECT C1). Ant's real algorithm is not OKLCH at all:
 *
 *   · It works in **HSV**, not OKLCH or HSL.
 *   · Hue ROTATES as you move away from the primary — by 2° per step, and the
 *     direction REVERSES for hues in 60°–240°, so warm and cool ramps bend
 *     opposite ways. Nothing in an OKLCH lerp reproduces that.
 *   · Saturation and value move on separate step sizes for the light and dark
 *     halves (0.16/0.05 and 0.05/0.15).
 *   · There are 10 stops, not 12, and the primary sits at index 5 (`.6` in
 *     Ant's 1-based naming).
 *   · The dark theme is not a recomputation — it is ten fixed mix ratios
 *     between a background colour and specific stops of the LIGHT palette.
 *
 * Saturation and value are quantised to 2 decimals inside the algorithm; that
 * rounding is load-bearing, not cosmetic, so it is reproduced exactly.
 *
 * Zero runtime dependencies. `__tests__/ant-design.test.ts` fuzzes this against
 * `@ant-design/colors` itself (a devDependency) and asserts byte-identical hex.
 *
 * Source: https://github.com/ant-design/ant-design-colors
 */

// ── Constants — frozen, from the reference implementation ────────────────────
const HUE_STEP = 2
const SATURATION_STEP = 0.16 // light half
const SATURATION_STEP_2 = 0.05 // dark half
const BRIGHTNESS_STEP_1 = 0.05 // light half
const BRIGHTNESS_STEP_2 = 0.15 // dark half
const LIGHT_COUNT = 5 // stops above the primary
const DARK_COUNT = 4 // stops below the primary

/** Dark-theme map: mix `amount`% of light-palette stop `index` into the page. */
const DARK_COLOR_MAP: { index: number; amount: number }[] = [
  { index: 7, amount: 15 }, { index: 6, amount: 25 },
  { index: 5, amount: 30 }, { index: 5, amount: 45 },
  { index: 5, amount: 65 }, { index: 5, amount: 85 },
  { index: 4, amount: 90 }, { index: 3, amount: 95 },
  { index: 2, amount: 97 }, { index: 1, amount: 98 },
]

type HSV = { h: number; s: number; v: number }
type RGB = { r: number; g: number; b: number }

// ── sRGB ↔ HSV ───────────────────────────────────────────────────────────────

function parseHex(hex: string): RGB {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('')
  if (h.length === 8) h = h.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`antDesign: not an sRGB hex color: "${hex}"`)
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/**
 * sRGB → HSV, in FastColor's exact formulation.
 *
 * Two details are load-bearing and both were wrong in the obvious version:
 *
 *  1. **Hue is ROUNDED to an integer at source.** FastColor's `getHue()` wraps
 *     the whole expression in `Math.round`. `#f0c7ae` is hue 22.727, which the
 *     reference reports as 23 — and `getHue()` then steps from 23, not 22.7.
 *  2. **Saturation is computed on 0–255 INTEGERS**, not on normalised floats.
 *     `66 / 240` is exactly 0.275; `(66/255) / (240/255)` is 0.27499999999999997.
 *     `getSaturation` subtracts 0.16 and rounds to two decimals, so that
 *     1e-17 difference lands on either side of a rounding boundary:
 *     `round(11.5) = 12` versus `round(11.4999…) = 11`. One step of the ramp
 *     comes out a different colour.
 *
 * This is why the port is written against the reference's arithmetic rather
 * than against the textbook formulas.
 */
function rgbToHsv({ r, g, b }: RGB): HSV {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  const h = delta === 0 ? 0 : Math.round(60 * (
    r === max ? (g - b) / delta + (g < b ? 6 : 0)
      : g === max ? (b - r) / delta + 2
        : (r - g) / delta + 4
  ))

  return { h, s: delta === 0 ? 0 : delta / max, v: max / 255 }
}

/**
 * HSV → sRGB, in FastColor's exact formulation.
 *
 * NOT the textbook `c`/`x`/`m` form. That is algebraically equivalent in the
 * reals but rounds differently at the boundary: it rounds `(component + m) * 255`
 * once, whereas this rounds `v*255`, `p`, `q` and `t` INDEPENDENTLY. The
 * difference is a single bit on some channels — `#2a1966` instead of `#2a1a66`
 * for `#7f56d9` — which is enough to fail byte-identity against the reference.
 * Ported verbatim rather than "cleaned up" for exactly that reason.
 */
function hsvToRgb({ h: rawH, s, v }: HSV): RGB {
  const h = ((rawH % 360) + 360) % 360
  const vv = Math.round(v * 255)
  if (s <= 0) return { r: vv, g: vv, b: vv }

  const hh = h / 60
  const i = Math.floor(hh)
  const ff = hh - i
  const p = Math.round(v * (1 - s) * 255)
  const q = Math.round(v * (1 - s * ff) * 255)
  const t = Math.round(v * (1 - s * (1 - ff)) * 255)

  switch (i) {
    case 0:  return { r: vv, g: t,  b: p }
    case 1:  return { r: q,  g: vv, b: p }
    case 2:  return { r: p,  g: vv, b: t }
    case 3:  return { r: p,  g: q,  b: vv }
    case 4:  return { r: t,  g: p,  b: vv }
    default: return { r: vv, g: p,  b: q }
  }
}

const toHex = ({ r, g, b }: RGB): string =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

// ── The three step functions ─────────────────────────────────────────────────

/**
 * Hue rotates AWAY from the primary as the ramp travels, and the direction
 * flips across the 60°–240° band. That band is roughly yellow→blue: warm hues
 * rotate one way when lightened, cool hues the other. It is what gives Ant
 * ramps their characteristic warm highlights and cool shadows, and it has no
 * equivalent in a hue-preserving OKLCH interpolation.
 */
function getHue(hsv: HSV, i: number, light: boolean): number {
  const base = Math.round(hsv.h) // already an integer; kept to mirror the reference
  let hue: number
  if (base >= 60 && base <= 240) hue = light ? base - HUE_STEP * i : base + HUE_STEP * i
  else hue = light ? base + HUE_STEP * i : base - HUE_STEP * i

  if (hue < 0) hue += 360
  else if (hue >= 360) hue -= 360
  return hue
}

function getSaturation(hsv: HSV, i: number, light: boolean): number {
  // A true grey carries no saturation to step.
  if (hsv.h === 0 && hsv.s === 0) return hsv.s

  let saturation: number
  if (light) saturation = hsv.s - SATURATION_STEP * i
  else if (i === DARK_COUNT) saturation = hsv.s + SATURATION_STEP
  else saturation = hsv.s + SATURATION_STEP_2 * i

  if (saturation > 1) saturation = 1
  // The lightest stop is capped so it reads as a tint rather than a pastel.
  if (light && i === LIGHT_COUNT && saturation > 0.1) saturation = 0.1
  if (saturation < 0.06) saturation = 0.06

  return Math.round(saturation * 100) / 100
}

function getValue(hsv: HSV, i: number, light: boolean): number {
  const value = light ? hsv.v + BRIGHTNESS_STEP_1 * i : hsv.v - BRIGHTNESS_STEP_2 * i
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100
}

/** Mix `amount`% of `other` into `base`, in sRGB — FastColor's `mix` semantics. */
function mix(base: RGB, other: RGB, amount: number): RGB {
  const p = amount / 100
  return {
    r: Math.round((other.r - base.r) * p + base.r),
    g: Math.round((other.g - base.g) * p + base.g),
    b: Math.round((other.b - base.b) * p + base.b),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export type AntTheme = 'light' | 'dark'

/**
 * The 10-stop Ant Design palette for `color`. Index 0 is the lightest tint,
 * index 5 is the primary verbatim, index 9 the darkest shade. (Ant's own docs
 * name these `-1` … `-10`, so index 5 is `colorPrimary` / `blue-6`.)
 *
 * `theme: 'dark'` returns the dark-theme palette: ten fixed mixes between
 * `backgroundColor` (default `#141414`) and stops of the light palette. It is
 * NOT a re-run of the algorithm, which is why passing a dark page to the OKLCH
 * engine could never have reproduced it.
 */
export function antPalette(
  color: string,
  opts: { theme?: AntTheme; backgroundColor?: string } = {},
): string[] {
  const primary = parseHex(color)
  const hsv = rgbToHsv(primary)
  const patterns: RGB[] = []

  for (let i = LIGHT_COUNT; i > 0; i -= 1) {
    patterns.push(hsvToRgb({
      h: getHue(hsv, i, true),
      s: getSaturation(hsv, i, true),
      v: getValue(hsv, i, true),
    }))
  }
  patterns.push(primary)
  for (let i = 1; i <= DARK_COUNT; i += 1) {
    patterns.push(hsvToRgb({
      h: getHue(hsv, i, false),
      s: getSaturation(hsv, i, false),
      v: getValue(hsv, i, false),
    }))
  }

  if (opts.theme === 'dark') {
    const page = parseHex(opts.backgroundColor ?? '#141414')
    return DARK_COLOR_MAP.map(({ index, amount }) => toHex(mix(page, patterns[index], amount)))
  }

  return patterns.map(toHex)
}

/** Index of the primary within the returned palette. */
export const ANT_PRIMARY_INDEX = LIGHT_COUNT
