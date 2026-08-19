/**
 * Radix Colors custom-palette generation — a faithful port of
 * `radix-ui/website · components/generate-radix-colors.tsx`.
 *
 * WHY THE `radix` PRESET WAS NEVER THIS
 * ─────────────────────────────────────────────────────────────────────────────
 * `colorUtils.SPECS.radix` is the shared OKLCH engine with `lightCmul: 0.04`.
 * It builds a ramp by interpolating page → solid. **Radix does not generate
 * ramps at all.** It:
 *
 *   1. measures ΔE_OK from the seed to all 348 colours of 29 curated reference
 *      scales, and takes the two closest UNIQUE scales;
 *   2. decides by trigonometry whether the seed sits BETWEEN them (mix
 *      proportionally) or BEYOND one (use it alone);
 *   3. rewrites the mixed scale's hue to the seed's and rescales its chroma;
 *   4. TRANSPOSES the resulting lightness progression onto the actual page
 *      colour through a cubic-bezier ease.
 *
 * So the shape of a Radix scale is inherited from hand-tuned reference data,
 * not computed. No amount of retuning a parametric engine reproduces it — which
 * is the substance of DEFECT C1.
 *
 * Reference data lives in `radixReference.ts` (generated, committed). This
 * module has zero runtime dependencies; `__tests__/radix.test.ts` runs the
 * ACTUAL upstream generator (via `colorjs.io` + `bezier-easing`, devDeps) side
 * by side and asserts byte-identical output.
 */

import {
  RADIX_LIGHT, RADIX_DARK, RADIX_LIGHT_GRAY, RADIX_DARK_GRAY,
  RADIX_GRAY_SCALE_NAMES, type ReferenceScale,
} from './radixReference'
import { apcaLc } from './apca'
import { rankScales, deltaEOK, asLch, type Lch } from './scaleMatch'
// `oklchToHex` GAMUT-MAPS (CSS Color 4 chroma reduction). Not a preference:
// colorjs's `toString({format:'hex'})` maps by default, so the reference
// generator's output is mapped, and several dark steps come from P3 reference
// data that lands outside sRGB. `gamut.oklchToHexClipped` — the naive
// per-channel clip — differs by a bit on exactly those steps: `#bda3ff` where
// upstream emits `#bda4ff`. Do not swap it in here.
import { hexToOklch, oklchToHex, xyzToOklab, type OKLCH } from './gamut'

const toHex = (c: Lch) => oklchToHex(c.l, c.c, c.h)

// ── Cubic-bezier easing ──────────────────────────────────────────────────────
// The `bezier-easing` package's algorithm (Newton-Raphson with a binary
// subdivision fallback). Ported because the eases below are the difference
// between "a ramp that grows out of the page" and "a ramp that starts at it".

const NEWTON_ITERATIONS = 4
const NEWTON_MIN_SLOPE = 0.001
const SUBDIVISION_PRECISION = 0.0000001
const SUBDIVISION_MAX_ITERATIONS = 10
const K_SPLINE_TABLE_SIZE = 11
const K_SAMPLE_STEP_SIZE = 1.0 / (K_SPLINE_TABLE_SIZE - 1.0)

const A = (a1: number, a2: number) => 1.0 - 3.0 * a2 + 3.0 * a1
const B = (a1: number, a2: number) => 3.0 * a2 - 6.0 * a1
const C = (a1: number) => 3.0 * a1

const calcBezier = (t: number, a1: number, a2: number) =>
  ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t
const getSlope = (t: number, a1: number, a2: number) =>
  3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1)

function bezierEasing(mX1: number, mY1: number, mX2: number, mY2: number): (x: number) => number {
  if (mX1 === mY1 && mX2 === mY2) return (x) => x

  const sampleValues = new Float32Array(K_SPLINE_TABLE_SIZE)
  for (let i = 0; i < K_SPLINE_TABLE_SIZE; ++i) {
    sampleValues[i] = calcBezier(i * K_SAMPLE_STEP_SIZE, mX1, mX2)
  }

  function binarySubdivide(x: number, a: number, b: number): number {
    let currentX: number
    let currentT: number
    let i = 0
    do {
      currentT = a + (b - a) / 2.0
      currentX = calcBezier(currentT, mX1, mX2) - x
      if (currentX > 0.0) b = currentT
      else a = currentT
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS)
    return currentT
  }

  function newtonRaphsonIterate(x: number, guessT: number): number {
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
      const currentSlope = getSlope(guessT, mX1, mX2)
      if (currentSlope === 0.0) return guessT
      guessT -= (calcBezier(guessT, mX1, mX2) - x) / currentSlope
    }
    return guessT
  }

  function getTForX(x: number): number {
    let intervalStart = 0.0
    let currentSample = 1
    const lastSample = K_SPLINE_TABLE_SIZE - 1
    for (; currentSample !== lastSample && sampleValues[currentSample] <= x; ++currentSample) {
      intervalStart += K_SAMPLE_STEP_SIZE
    }
    --currentSample

    const dist = (x - sampleValues[currentSample]) /
      (sampleValues[currentSample + 1] - sampleValues[currentSample])
    const guessForT = intervalStart + dist * K_SAMPLE_STEP_SIZE
    const initialSlope = getSlope(guessForT, mX1, mX2)

    if (initialSlope >= NEWTON_MIN_SLOPE) return newtonRaphsonIterate(x, guessForT)
    if (initialSlope === 0.0) return guessForT
    return binarySubdivide(x, intervalStart, intervalStart + K_SAMPLE_STEP_SIZE)
  }

  return (x: number) => (x === 0 || x === 1 ? x : calcBezier(getTForX(x), mY1, mY2))
}

const DARK_MODE_EASING: [number, number, number, number] = [1, 0, 1, 0]
const LIGHT_MODE_EASING: [number, number, number, number] = [0, 2, 0, 2]

/** Shift a progression so its FIRST value lands on `to`, easing out the shift. */
export function transposeProgressionStart(
  to: number,
  arr: number[],
  curve: [number, number, number, number],
): number[] {
  const fn = bezierEasing(...curve)
  const lastIndex = arr.length - 1
  const diff = arr[0] - to
  return arr.map((n, i) => n - diff * fn(1 - i / lastIndex))
}

// ── OKLCH helpers ────────────────────────────────────────────────────────────
// `Lch`, `deltaEOK`, `asLch` and the nearest-scale ranking come from
// `scaleMatch.ts` — Tailwind needs the same ranking, and a second copy here is
// precisely the duplication the colour layer is under a rule about.

const toLab = ({ l, c, h }: Lch) => {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

const fromLab = ({ l, a, b }: { l: number; a: number; b: number }): Lch => {
  const c = Math.hypot(a, b)
  return { l, c, h: c < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
}

// ── CIE Lab (D50) — because that is where colorjs mixes ─────────────────────
// `Color.mix(a, b, ratio)` in colorjs.io interpolates in **CIE Lab**, not in
// the colours' own space and not in OKLab. Nothing in the Radix source says so;
// it is a library default. Mixing in OKLab instead produces chroma errors of
// ~0.0003 — invisible in isolation, and enough to shift the emitted hex by one
// bit on several dark steps.
//
// colorjs's `lab` is D50-referenced, so this is a real chromatic adaptation
// (Bradford), not just a different formula. These constants exist nowhere else
// in the codebase — this is the only place a D50 space is needed.

const D50_WHITE = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585] as const

const XYZ_D65_TO_D50 = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
] as const

const XYZ_D50_TO_D65 = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
] as const

const mat = (m: readonly (readonly number[])[], v: readonly [number, number, number]) =>
  [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ] as [number, number, number]

const LAB_E = 216 / 24389
const LAB_K = 24389 / 27

function xyzD65ToLab(xyz: [number, number, number]): [number, number, number] {
  const d50 = mat(XYZ_D65_TO_D50, xyz)
  const f = d50.map((v, i) => {
    const t = v / D50_WHITE[i]
    return t > LAB_E ? Math.cbrt(t) : (LAB_K * t + 16) / 116
  })
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])]
}

function labToXyzD65([L, a, b]: [number, number, number]): [number, number, number] {
  const f1 = (L + 16) / 116
  const f0 = a / 500 + f1
  const f2 = f1 - b / 200
  const d50: [number, number, number] = [
    (f0 ** 3 > LAB_E ? f0 ** 3 : (116 * f0 - 16) / LAB_K) * D50_WHITE[0],
    (L > LAB_K * LAB_E ? ((L + 16) / 116) ** 3 : L / LAB_K) * D50_WHITE[1],
    (f2 ** 3 > LAB_E ? f2 ** 3 : (116 * f2 - 16) / LAB_K) * D50_WHITE[2],
  ]
  return mat(XYZ_D50_TO_D65, d50)
}

/** OKLab → XYZ(D65). Inverse of `gamut.xyzToOklab`, kept local to this module. */
function oklabToXyz({ l, a, b }: { l: number; a: number; b: number }): [number, number, number] {
  const lms_ = mat([
    [1, 0.3963377773761749, 0.2158037573099136],
    [1, -0.1055613458156586, -0.0638541728258133],
    [1, -0.0894841775298119, -1.2914855480194092],
  ], [l, a, b])
  return mat([
    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
    [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
  ], [lms_[0] ** 3, lms_[1] ** 3, lms_[2] ** 3])
}

/** Reproduces `Color.mix(a, b, ratio)`: interpolate in CIE Lab (D50). */
const mixOklab = (x: Lch, y: Lch, ratio: number): Lch => {
  const labA = xyzD65ToLab(oklabToXyz(toLab(x)))
  const labB = xyzD65ToLab(oklabToXyz(toLab(y)))
  const mixed: [number, number, number] = [
    labA[0] + (labB[0] - labA[0]) * ratio,
    labA[1] + (labB[1] - labA[1]) * ratio,
    labA[2] + (labB[2] - labA[2]) * ratio,
  ]
  return fromLab(xyzToOklab(labToXyzD65(mixed)))
}

// ── The nearest-scale search ─────────────────────────────────────────────────

function getScaleFromColor(
  source: Lch,
  scales: Record<string, ReferenceScale>,
  background: Lch,
): Lch[] {
  // Rank the reference families, greys demoted so the runner-up is a real
  // alternative rather than another grey (see `rankScales`).
  const closest = rankScales(source, scales, RADIX_GRAY_SCALE_NAMES)

  const colorA = closest[0]
  const colorB = closest[1]

  // ── Light trigonometry ─────────────────────────────────────────────────────
  // Treat source C, nearest A and runner-up B as a triangle. If neither angle at
  // A nor at B exceeds 90°, the source sits BETWEEN the two scales and mixing
  // them proportionally lands closer than either alone (a desaturated blue
  // between `indigo` and `slate`). If an angle is obtuse, the source is BEYOND
  // one of them and mixing would move away — `ratio` comes out ≤ 0 and A is
  // used unmixed (a saturated blue, where `indigo` is simply further).
  const a = colorB.distance
  const b = colorA.distance
  const c = deltaEOK(colorA.color, colorB.color)

  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c)
  const radA = Math.acos(cosA)
  const sinA = Math.sin(radA)

  const cosB = (a ** 2 + c ** 2 - b ** 2) / (2 * a * c)
  const radB = Math.acos(cosB)
  const sinB = Math.sin(radB)

  const tanC1 = cosA / sinA
  const tanC2 = cosB / sinB
  const ratio = Math.max(0, tanC1 / tanC2) * 0.5

  const scaleA = scales[colorA.scale]
  const scaleB = scales[colorB.scale]
  const scale: Lch[] = scaleA.map((_, i) => mixOklab(asLch(scaleA[i]), asLch(scaleB[i]), ratio))

  // Adopt the seed's hue wholesale, and rescale chroma by how much more (or
  // less) saturated the seed is than the mixed scale's nearest step — capped at
  // 1.5× the seed's own chroma so a pale reference cannot be blown out.
  const baseColor = scale.slice().sort((x, y) => deltaEOK(source, x) - deltaEOK(source, y))[0]
  const ratioC = source.c / baseColor.c
  for (const color of scale) {
    color.c = Math.min(source.c * 1.5, color.c * ratioC)
    color.h = source.h
  }

  // ── Transpose onto the actual page ─────────────────────────────────────────
  if (scale[0].l > 0.5) {
    // Light: white is prepended as a virtual step 0 so the ease has somewhere to
    // come from, then dropped again.
    const lightnessScale = scale.map((s) => s.l)
    const backgroundL = Math.max(0, Math.min(1, background.l))
    const shifted = transposeProgressionStart(backgroundL, [1, ...lightnessScale], LIGHT_MODE_EASING)
    shifted.shift()
    shifted.forEach((l, i) => { scale[i].l = l })
    return scale
  }

  // Dark: if the requested page is LIGHTER than the reference's own step 1, the
  // ease is relaxed toward linear so the ramp does not bunch up at the bottom.
  const ease: [number, number, number, number] = [...DARK_MODE_EASING]
  const referenceBackgroundL = scale[0].l
  const backgroundColorL = Math.max(0, Math.min(1, background.l))
  const ratioL = backgroundColorL / referenceBackgroundL

  if (ratioL > 1) {
    const maxRatio = 1.5
    for (let i = 0; i < ease.length; i++) {
      const metaRatio = (ratioL - 1) * (maxRatio / (maxRatio - 1))
      ease[i] = ratioL > maxRatio ? 0 : Math.max(0, ease[i] * (1 - metaRatio))
    }
  }

  const lightnessScale = scale.map((s) => s.l)
  transposeProgressionStart(background.l, lightnessScale, ease)
    .forEach((l, i) => { scale[i].l = l })
  return scale
}

// ── Step 9, step 10, ink ─────────────────────────────────────────────────────

function getStep9Colors(scale: Lch[], accentBase: Lch): [Lch, Lch] {
  const distance = deltaEOK(accentBase, scale[0]) * 100
  // A seed sitting almost ON the page is white-on-white or black-on-black; fall
  // back to the reference's own solid rather than emitting an invisible fill.
  if (distance < 25) return [scale[8], getTextColor(scale[8])]
  return [accentBase, getTextColor(accentBase)]
}

/** White, unless white would be illegible on the fill — then a dark tint of it. */
function getTextColor(background: Lch): Lch {
  const bgHex = toHex(background)
  // Matches the reference's `white.contrastAPCA(background)`: white as the
  // BACKGROUND and the fill as the text. Only the magnitude is used.
  if (Math.abs(apcaLc(bgHex, '#ffffff')) < 40) {
    return { l: 0.25, c: Math.max(0.08 * background.c, 0.04), h: background.h }
  }
  return { l: 1, c: 0, h: 0 }
}

function getButtonHoverColor(source: Lch, scales: Lch[][]): Lch {
  const { l: L, c: C, h: H } = source
  const newL = L > 0.4 ? L - 0.03 / (L + 0.1) : L + 0.03 / (L + 0.1)
  const newC = L > 0.4 && !Number.isNaN(H) ? C * 0.93 : C
  const hover: Lch = { l: newL, c: newC, h: H }

  // Donate chroma and hue from the nearest in-scale colour — matters most when
  // the seed is pure white or black but the grey scale is tinted.
  let closest = hover
  let minDistance = Infinity
  for (const scale of scales) {
    for (const color of scale) {
      const d = deltaEOK(hover, color)
      if (d < minDistance) { minDistance = d; closest = color }
    }
  }
  hover.c = closest.c
  hover.h = closest.h
  return hover
}

// ── Alpha scales, solved exactly ─────────────────────────────────────────────
// target = background × (1 − α) + foreground × α  ⇒  solve for the α and the
// foreground that composite EXACTLY onto the given page. Radix does this rather
// than approximating, which is why its alpha scales lay over the page invisibly.

/** How the browser actually blends: each term rounded, not the sum. */
const blendAlpha = (fg: number, alpha: number, bg: number) =>
  Math.round(bg * (1 - alpha)) + Math.round(fg * alpha)

function getAlphaColorSrgb(targetHex: string, backgroundHex: string, targetAlpha?: number): string {
  const parse = (hex: string): [number, number, number] => {
    const h = hex.replace(/^#/, '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  }
  const [tr, tg, tb] = parse(targetHex)
  const [br, bg, bb] = parse(backgroundHex)

  // Lighten or darken the page? If ANY channel of the target is above the page,
  // we are adding light.
  const desired = tr > br || tg > bg || tb > bb ? 255 : 0

  const alphaR = (tr - br) / (desired - br)
  const alphaG = (tg - bg) / (desired - bg)
  const alphaB = (tb - bb) / (desired - bb)

  const isPureGray = alphaG === alphaR && alphaB === alphaR
  const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0')

  // A fully opaque result carries no alpha channel — `#bda4ffff` and `#bda4ff`
  // are the same colour, and the 8-digit form reads as "this token has
  // transparency" when it does not.
  const withAlpha = (r: number, g: number, b: number, alpha: number) => {
    const a255 = Math.round(alpha * 255)
    const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`
    return a255 >= 255 ? base : `${base}${hex2(a255)}`
  }

  if (!targetAlpha && isPureGray) {
    return withAlpha(desired, desired, desired, alphaR)
  }

  const clampRgb = (n: number) => (Number.isNaN(n) ? 0 : Math.min(255, Math.max(0, n)))
  const clampA = (n: number) => (Number.isNaN(n) ? 0 : Math.min(255, Math.max(0, n)))
  const maxAlpha = targetAlpha ?? Math.max(alphaR, alphaG, alphaB)

  const Aa = clampA(Math.ceil(maxAlpha * 255)) / 255
  let R = Math.ceil(clampRgb(((br * (1 - Aa) - tr) / Aa) * -1))
  let G = Math.ceil(clampRgb(((bg * (1 - Aa) - tg) / Aa) * -1))
  let Bc = Math.ceil(clampRgb(((bb * (1 - Aa) - tb) / Aa) * -1))

  const blendedR = blendAlpha(R, Aa, br)
  const blendedG = blendAlpha(G, Aa, bg)
  const blendedB = blendAlpha(Bc, Aa, bb)

  // Nudge for rounding error, in whichever direction we are compositing.
  if (desired === 0) {
    if (tr <= br && tr !== blendedR) R = tr > blendedR ? R + 1 : R - 1
    if (tg <= bg && tg !== blendedG) G = tg > blendedG ? G + 1 : G - 1
    if (tb <= bb && tb !== blendedB) Bc = tb > blendedB ? Bc + 1 : Bc - 1
  } else {
    if (tr >= br && tr !== blendedR) R = tr > blendedR ? R + 1 : R - 1
    if (tg >= bg && tg !== blendedG) G = tg > blendedG ? G + 1 : G - 1
    if (tb >= bb && tb !== blendedB) Bc = tb > blendedB ? Bc + 1 : Bc - 1
  }

  return withAlpha(R, G, Bc, Aa)
}

// ── Public API ───────────────────────────────────────────────────────────────

export type RadixAppearance = 'light' | 'dark'

export type RadixPalette = {
  /** Steps 1–12, sRGB hex. */
  accentScale: string[]
  /** Steps 1–12 as alpha values that composite EXACTLY onto `background`. */
  accentScaleAlpha: string[]
  /** Steps 1–12 as `oklch()` strings, for wide-gamut CSS output. */
  accentScaleWideGamut: string[]
  /** Steps 1–12 as raw OKLCH coordinates — unquantised, for further math. */
  accentScaleOklch: OKLCH[]
  /** The ink that is legible on step 9 — white, or a dark tint of the accent. */
  accentContrast: string
  grayScale: string[]
  grayScaleAlpha: string[]
  grayScaleWideGamut: string[]
  background: string
}

const toOklchString = ({ l, c, h }: Lch) =>
  `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(4)} ${h.toFixed(4)})`

/**
 * Generate a Radix-compatible palette. Mirrors `generateRadixColors` from the
 * Radix website, including its choice to read the P3 reference scales.
 */
export function generateRadixPalette({
  appearance, accent, gray, background,
}: {
  appearance: RadixAppearance
  accent: string
  gray: string
  background: string
}): RadixPalette {
  const allScales = appearance === 'light' ? RADIX_LIGHT : RADIX_DARK
  const grayScales = appearance === 'light' ? RADIX_LIGHT_GRAY : RADIX_DARK_GRAY

  const backgroundColor = hexToOklch(background)
  const grayBaseColor = hexToOklch(gray)
  const grayScaleColors = getScaleFromColor(grayBaseColor, grayScales, backgroundColor)

  const accentBaseColor = hexToOklch(accent)
  let accentScaleColors = getScaleFromColor(accentBaseColor, allScales, backgroundColor)

  const backgroundHex = toHex(backgroundColor)

  // Pure white or black carries no hue, so it borrows the grey scale's tint
  // rather than producing a hueless ramp on a tinted page.
  const accentBaseHex = toHex(accentBaseColor)
  if (accentBaseHex === '#000000' || accentBaseHex === '#ffffff') {
    accentScaleColors = grayScaleColors.map((c) => ({ ...c }))
  }

  const [accent9Color, accentContrastColor] = getStep9Colors(accentScaleColors, accentBaseColor)
  accentScaleColors[8] = accent9Color
  accentScaleColors[9] = getButtonHoverColor(accent9Color, [accentScaleColors])

  // Text steps never carry more chroma than the solid band — otherwise 11–12
  // read as coloured type rather than tinted ink.
  const textChromaCap = Math.max(accentScaleColors[8].c, accentScaleColors[7].c)
  accentScaleColors[10].c = Math.min(textChromaCap, accentScaleColors[10].c)
  accentScaleColors[11].c = Math.min(textChromaCap, accentScaleColors[11].c)

  const accentScale = accentScaleColors.map(toHex)
  const grayScale = grayScaleColors.map(toHex)

  return {
    accentScale,
    accentScaleAlpha: accentScale.map((c) => getAlphaColorSrgb(c, backgroundHex)),
    accentScaleWideGamut: accentScaleColors.map(toOklchString),
    accentScaleOklch: accentScaleColors.map((c) => ({ ...c })),
    accentContrast: toHex(accentContrastColor),
    grayScale,
    grayScaleAlpha: grayScale.map((c) => getAlphaColorSrgb(c, backgroundHex)),
    grayScaleWideGamut: grayScaleColors.map(toOklchString),
    background: backgroundHex,
  }
}
