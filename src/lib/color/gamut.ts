/**
 * OKLab/OKLCH ↔ sRGB conversion and CSS Color 4 gamut mapping.
 *
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The ramp engine composes colors in OKLCH and then calls `.hex()` to emit them.
 * chroma-js (like most libraries) converts by CLAMPING each RGB channel into
 * 0–255 independently. For any (L, C, H) outside the sRGB gamut — routine for a
 * vivid brand around steps 8–10 — per-channel clamping does not preserve hue or
 * lightness. It bends the color toward whichever primary saturated first, so a
 * ramp built from #ff0055 can drift in hue between adjacent steps and stop being
 * monotonic in perceived lightness.
 *
 * CSS Color 4 §13.2 specifies the correct behaviour: hold L and H, binary-search
 * chroma DOWN until the color is representable, accepting the clipped result
 * once it is within one JND (ΔE_OK ≤ 0.02) of the reduced color. Hue is
 * preserved by construction; lightness is preserved to within a JND.
 *
 * This module has NO dependencies on purpose — it is the layer everything else
 * is verified against, so it must not inherit another library's rounding.
 *
 * Reference: https://www.w3.org/TR/css-color-4/#css-gamut-mapping
 */

export type OKLCH = { l: number; c: number; h: number }
export type OKLab = { l: number; a: number; b: number }
export type LinearRGB = { r: number; g: number; b: number }

// ── sRGB transfer function ───────────────────────────────────────────────────

const toLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)

const toGamma = (v: number): number =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

// ── OKLab ↔ linear sRGB (Björn Ottosson's matrices) ──────────────────────────

/**
 * OKLab ↔ linear sRGB, via CIE XYZ (D65) — the CSS Color 4 definition.
 *
 * Ottosson's published matrices are a FUSED form of this same pipeline, carried
 * to fewer digits. They agree to ~1e-7, which sounds irrelevant and is not: at
 * an 8-bit quantisation boundary it flips a channel by one. That showed up as
 * `#120f1b` where the Radix reference generator emits `#120f1c` — three steps
 * of a dark ramp, off by a bit.
 *
 * Going through XYZ is what colorjs.io, the CSS spec and every reference
 * implementation do, so this is the canonical path rather than a workaround.
 */

// OKLab → LMS' (cube roots), then LMS → XYZ.
const OKLAB_TO_LMS = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
] as const

const LMS_TO_XYZ = [
  [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
  [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
] as const

const XYZ_TO_LMS = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
] as const

const XYZ_TO_LIN_SRGB = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
] as const

const LIN_SRGB_TO_XYZ = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
] as const

const apply = (m: readonly (readonly number[])[], v: readonly [number, number, number]) =>
  [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ] as [number, number, number]

/**
 * CIE XYZ (D65) → OKLab. Exported because the Radix reference table is built
 * from display-p3 values, which reach OKLab through XYZ on different primaries
 * — it must use THESE constants, not a second copy of them.
 */
export function xyzToOklab(xyz: readonly [number, number, number]): OKLab {
  const lms = apply(XYZ_TO_LMS, xyz)
  const l_ = Math.cbrt(lms[0])
  const m_ = Math.cbrt(lms[1])
  const s_ = Math.cbrt(lms[2])
  // Full-precision LMS'→OKLab. Ottosson publishes this truncated to 10 digits;
  // the extra digits are what close the last ~1e-9 against colorjs.io, and 1e-9
  // is exactly enough to flip an 8-bit channel at a quantisation boundary.
  return {
    l: 0.210454268309314 * l_ + 0.7936177747023054 * m_ - 0.0040720430116193 * s_,
    a: 1.9779985324311684 * l_ - 2.4285922420485799 * m_ + 0.450593709617411 * s_,
    b: 0.0259040424655478 * l_ + 0.7827717124575296 * m_ - 0.8086757549230774 * s_,
  }
}

export function linearToOklab({ r, g, b }: LinearRGB): OKLab {
  return xyzToOklab(apply(LIN_SRGB_TO_XYZ, [r, g, b]))
}

export function oklabToLinear({ l, a, b }: OKLab): LinearRGB {
  const lms_ = apply(OKLAB_TO_LMS, [l, a, b])
  const lms: [number, number, number] = [lms_[0] ** 3, lms_[1] ** 3, lms_[2] ** 3]
  const xyz = apply(LMS_TO_XYZ, lms)
  const [r, g, bb] = apply(XYZ_TO_LIN_SRGB, xyz)
  return { r, g, b: bb }
}

export const oklchToOklab = ({ l, c, h }: OKLCH): OKLab => {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

export const oklabToOklch = ({ l, a, b }: OKLab): OKLCH => {
  const c = Math.sqrt(a * a + b * b)
  // Below this the hue angle is numerically meaningless — report 0, not NaN,
  // so downstream arithmetic never propagates NaN through a whole ramp.
  const h = c < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  return { l, c, h }
}

// ── Hex I/O ──────────────────────────────────────────────────────────────────

/**
 * Hex → linear-light sRGB. Exported because anything modelling *light* rather
 * than *colour* — CVD simulation, alpha compositing, luminance — has to work in
 * linear RGB, and there must be exactly one sRGB transfer function in the
 * codebase for those results to agree with `hexToOklch`.
 */
// A `#rrggbbaa`/`#rgba` input used to have its alpha channel silently
// dropped, same bug as apca.ts's `parseHex` (see that function's comment) —
// this IS "the single sRGB transfer function" every colour-vision-deficiency
// simulation and ΔE comparison in the codebase runs through, so a translucent
// alpha primitive (`accent-a-*`, `black-a-*`, …) fed in here would silently
// simulate/compare the wrong colour. Same fix: throw on a real alpha channel,
// let a channel that rounds to fully opaque (≥99.9%) through unchanged.
export function hexToLinearRgb(hex: string): LinearRGB {
  const stripped = hex.trim().replace(/^#/, '')
  let h = stripped
  let alphaDigits: string | null = null
  if (h.length === 4) { alphaDigits = h[3] + h[3]; h = h.slice(0, 3) }
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length === 8) { alphaDigits = stripped.slice(6, 8); h = h.slice(0, 6) }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`gamut: not an sRGB hex color: "${hex}"`)
  if (alphaDigits) {
    const a = parseInt(alphaDigits, 16) / 255
    if (a < 0.999) {
      throw new Error(
        `gamut: "${hex}" is translucent (alpha ${Math.round(a * 100)}%) — composite it over its real backdrop first (colorUtils.compositeOver), then convert the result.`,
      )
    }
  }
  return {
    r: toLinear(parseInt(h.slice(0, 2), 16) / 255),
    g: toLinear(parseInt(h.slice(2, 4), 16) / 255),
    b: toLinear(parseInt(h.slice(4, 6), 16) / 255),
  }
}

export function hexToOklch(hex: string): OKLCH {
  return oklabToOklch(linearToOklab(hexToLinearRgb(hex)))
}

const byte = (v: number): string =>
  Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')

/** Naive conversion — CLIPS. Exposed so tests can demonstrate the failure mode. */
export function oklchToHexClipped(color: OKLCH): string {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  return `#${byte(toGamma(r))}${byte(toGamma(g))}${byte(toGamma(b))}`
}

// ── Gamut test and mapping ───────────────────────────────────────────────────

/** A hair of slack so a color exactly ON the boundary is not judged outside. */
const GAMUT_EPS = 1e-6

export function inSrgbGamut(color: OKLCH): boolean {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  return (
    r >= -GAMUT_EPS && r <= 1 + GAMUT_EPS &&
    g >= -GAMUT_EPS && g <= 1 + GAMUT_EPS &&
    b >= -GAMUT_EPS && b <= 1 + GAMUT_EPS
  )
}

/** Euclidean distance in OKLab — the ΔE the CSS algorithm is specified against. */
export function deltaEOK(a: OKLab, b: OKLab): number {
  const dl = a.l - b.l
  const da = a.a - b.a
  const db = a.b - b.b
  return Math.sqrt(dl * dl + da * da + db * db)
}

/** Per-channel clip in linear light, returned as OKLab for the ΔE comparison. */
function clipToOklab(color: OKLCH): OKLab {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  const cl = (v: number) => Math.max(0, Math.min(1, v))
  return linearToOklab({ r: cl(r), g: cl(g), b: cl(b) })
}

/** One just-noticeable difference, per CSS Color 4. */
const JND = 0.02
const SEARCH_EPS = 0.0001

/**
 * CSS Color 4 §13.2 gamut mapping. Returns an OKLCH color guaranteed to be
 * representable in sRGB, with hue preserved exactly and lightness preserved to
 * within one JND. Colors already in gamut are returned untouched.
 */
export function gamutMapSrgb(color: OKLCH): OKLCH {
  if (color.l >= 1) return { l: 1, c: 0, h: color.h }
  if (color.l <= 0) return { l: 0, c: 0, h: color.h }
  if (inSrgbGamut(color)) return color

  let min = 0
  let max = color.c
  let minInGamut = true
  let current: OKLCH = { ...color }
  let clipped = clipToOklab(current)

  if (deltaEOK(clipped, oklchToOklab(current)) < JND) return oklabToOklch(clipped)

  while (max - min > SEARCH_EPS) {
    const chroma = (min + max) / 2
    current = { l: color.l, c: chroma, h: color.h }

    if (minInGamut && inSrgbGamut(current)) {
      min = chroma
      continue
    }

    clipped = clipToOklab(current)
    const e = deltaEOK(clipped, oklchToOklab(current))

    if (e < JND) {
      if (JND - e < SEARCH_EPS) return oklabToOklch(clipped)
      minInGamut = false
      min = chroma
    } else {
      max = chroma
    }
  }

  return oklabToOklch(clipped)
}

/**
 * The drop-in replacement for `chroma.oklch(l, c, h).hex()`.
 *
 * Not yet wired into `buildScale` — see the P1 decision in the research plan.
 * Swapping it in changes emitted hex values for out-of-gamut steps, which is a
 * correction, but a visible one. Land it behind the golden-file baseline.
 */
export function oklchToHex(l: number, c: number, h: number): string {
  return oklchToHexClipped(gamutMapSrgb({ l, c, h: Number.isNaN(h) ? 0 : h }))
}

/** `oklch()` CSS string, for wide-gamut output (P3 and beyond). No clipping. */
export function oklchToCss({ l, c, h }: OKLCH, precision = 4): string {
  const r = (n: number) => Number(n.toFixed(precision))
  return `oklch(${r(l)} ${r(c)} ${r(h)})`
}
