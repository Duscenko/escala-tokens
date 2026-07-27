import chroma from 'chroma-js'

// ── Color-scale algorithms ───────────────────────────────────────────────────
// Each algorithm builds a 12-tone ramp (light → dark) in OKLCH following the
// Radix Colors taxonomy: 1–2 backgrounds · 3–5 interactive fills · 6–8 borders
// · 9–10 solid fills · 11–12 text. The base color anchors tone 9 (the solid),
// and the light run (1–8) eases toward white so backgrounds and borders stay
// pastel — that's what keeps borders soft. The dark run (10–12) eases in so 10
// reads as the solid's hover and 11–12 reach text-grade darkness. Lightness is
// interpolated in two monotonic halves so the ramp never reverses around the
// anchor regardless of the base color's own lightness. `contrastShift`
// (≈ −1…+1) widens (or narrows) the lightness range — more tone separation.

export type ColorAlgorithm =
  | 'default'
  | 'tailwind'
  | 'radix'
  | 'ant'
  | 'lightness'
  | 'saturation'
  | 'hueShift'
  | 'monochromatic'
  | 'analogous'
  | 'complementary'

type AlgoSpec = {
  label: string
  lightL: number // target OKLCH lightness at tone 1
  darkL: number // target OKLCH lightness at tone 12
  lightCmul: number // chroma multiplier at the light extreme
  darkCmul: number // chroma multiplier at the dark extreme
  /** Hue offset by position: frac −1 (lightest) … 0 (base) … +1 (darkest). */
  hueShift?: (frac: number) => number
}

const TONES = 12
/** Tone pinned to the base color exactly — the Radix "solid" step. */
export const BASE_TONE = 9

/**
 * Which END of the ramp the page background anchors. Both appearances keep the
 * same 1→12 light-to-dark orientation; they differ only in which extreme grows
 * out of the page. See `buildScale` for the full rationale.
 */
export type ScaleAppearance = 'light' | 'dark'

// Easing exponents for the two halves. The light run (1–8) uses a square-root
// ease so tones rush toward white and the border band (6–8) stays pastel —
// linear interpolation is what made borders look heavy. The dark run (10–12)
// eases in gently so tone 10 sits just below the solid (its hover) while 11–12
// still reach text-grade contrast.
const LIGHT_EASE = 0.5
const DARK_EASE = 1.4

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function buildScale(
  baseHex: string,
  spec: AlgoSpec,
  shift: number,
  background?: string,
  appearance: ScaleAppearance = 'light',
): string[] {
  const [baseL, baseC, baseHraw] = chroma(baseHex).oklch()
  const baseH = Number.isNaN(baseHraw) ? 0 : baseHraw
  // Widen/narrow each half-range by the contrast shift.
  let lightL = clamp01(baseL + (spec.lightL - baseL) * (1 + shift))
  let darkL = clamp01(baseL - (baseL - spec.darkL) * (1 + shift))

  // Radix custom-palette behavior: every ramp grows out of the page background.
  // Which END the background anchors depends on the ramp's appearance:
  //
  //  • 'light' (default) — tone 1 anchors to the background's OKLCH lightness.
  //    A tinted/cream page pulls the whole light run down with it, so
  //    backgrounds and subtle fills sit ON the page instead of floating above
  //    it. Backgrounds lighter than the spec's own extreme (pure white) change
  //    nothing, and dark backgrounds are ignored — this ramp is light-appearance.
  //
  //  • 'dark' — tone 12 anchors to the background instead. Dark themes read the
  //    gray hierarchy inverted (recDarkTone: surface-0 → tone 12), so tone 12 IS
  //    the dark page. Anchoring it here is what makes a dark background actually
  //    drive the dark surfaces. A light hex is meaningless here, so it's ignored.
  //
  // The anchors double as blend targets for their band, so the tones nearest the
  // page read as subtle washes sitting on it rather than saturated fills.
  let surfaceAnchor = '#ffffff'
  let deepAnchor: string | null = null
  if (background) {
    try {
      const bgL = chroma(background).oklch()[0]
      if (appearance === 'dark') {
        if (bgL <= 0.5) {
          darkL = clamp01(bgL)
          deepAnchor = chroma(background).hex()
        }
      } else if (bgL > 0.5) {
        lightL = Math.min(lightL, clamp01(bgL))
        surfaceAnchor = chroma(background).hex()
      }
    } catch { /* invalid background — ignore */ }
  }

  const out: string[] = []
  for (let i = 1; i <= TONES; i++) {
    if (i === BASE_TONE) {
      out.push(chroma(baseHex).hex())
      continue
    }
    let L: number
    let C: number
    let frac: number
    if (i < BASE_TONE) {
      const f = ((BASE_TONE - i) / (BASE_TONE - 1)) ** LIGHT_EASE // 0 → 1 toward the light end
      L = baseL + (lightL - baseL) * f
      C = baseC * (1 + (spec.lightCmul - 1) * f)
      frac = -f
    } else {
      const f = ((i - BASE_TONE) / (TONES - BASE_TONE)) ** DARK_EASE // 0 → 1 toward the dark end
      L = baseL + (darkL - baseL) * f
      C = baseC * (1 + (spec.darkCmul - 1) * f)
      frac = f
    }
    const H = baseH + (spec.hueShift?.(frac) ?? 0)
    let color = chroma.oklch(L, C, H)
    // Surface band (Radix taxonomy: 1–2 backgrounds, tapering into 3): ease
    // the tone into the page background so surface-0/1 stay subtle regardless
    // of the algorithm's own light-end chroma. Weights ≈ .85/.54/.27 → 0.
    if (i < BASE_TONE) {
      const f = ((BASE_TONE - i) / (BASE_TONE - 1)) ** LIGHT_EASE
      const pull = Math.max(0, (f - 0.75) / 0.25)
      if (pull > 0) color = chroma.mix(color, surfaceAnchor, Math.pow(pull, 1.5) * 0.85, 'oklab')
    }
    // Deep band (tones 10–12) — the mirror of the surface band, for dark ramps.
    // These are what a dark theme reads as its surfaces (12 = page, 11 = card,
    // 10 = sunken), so ease them into the dark page background the same way.
    if (i > BASE_TONE && deepAnchor) {
      const f = ((i - BASE_TONE) / (TONES - BASE_TONE)) ** DARK_EASE
      const pull = Math.max(0, (f - 0.4) / 0.6)
      if (pull > 0) color = chroma.mix(color, deepAnchor, Math.pow(pull, 1.5) * 0.85, 'oklab')
    }
    out.push(color.hex())
  }
  return out
}

const SPECS: Record<ColorAlgorithm, AlgoSpec> = {
  // Legacy / neutral lightness ramp — the default feel.
  default:       { label: 'Lightness Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90 },
  lightness:     { label: 'Lightness Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90 },
  monochromatic: { label: 'Monochromatic',   lightL: 0.97, darkL: 0.20, lightCmul: 0.45, darkCmul: 0.95 },
  // System-flavored ramps — distinct light/dark extremes + chroma feel.
  tailwind:      { label: 'Tailwind CSS',    lightL: 0.97, darkL: 0.18, lightCmul: 0.40, darkCmul: 1.00 },
  // Radix's light steps 1–2 are near-white with almost no chroma (app/subtle
  // backgrounds) — hence the very low light-end chroma multiplier.
  radix:         { label: 'Radix UI',        lightL: 0.995, darkL: 0.24, lightCmul: 0.04, darkCmul: 0.85 },
  ant:           { label: 'Ant Design',      lightL: 0.96, darkL: 0.20, lightCmul: 0.45, darkCmul: 0.95 },
  // Chroma fans wide from pale tints to saturated shades.
  saturation:    { label: 'Saturation Scale', lightL: 0.92, darkL: 0.30, lightCmul: 0.15, darkCmul: 1.45 },
  // Hue-relationship variants.
  hueShift:      { label: 'Hue Shift Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90, hueShift: (f) => f * 25 },
  analogous:     { label: 'Analogous',       lightL: 0.97, darkL: 0.20, lightCmul: 0.40, darkCmul: 0.95, hueShift: (f) => f * 30 },
  // Tints rotate toward the complement; shades hold the base hue.
  complementary: { label: 'Complementary',   lightL: 0.97, darkL: 0.20, lightCmul: 0.40, darkCmul: 0.95, hueShift: (f) => (f < 0 ? -f * 180 : 0) },
}

export const ALGORITHM_OPTIONS: { key: ColorAlgorithm; label: string }[] = (
  ['radix', 'lightness', 'tailwind', 'ant', 'saturation', 'hueShift', 'monochromatic', 'analogous', 'complementary'] as ColorAlgorithm[]
).map((key) => ({ key, label: SPECS[key].label }))

// The recommended (default) algorithm — surfaced with a badge in the UI.
export const RECOMMENDED_ALGORITHM: ColorAlgorithm = 'radix'

// ── Token naming schemes ─────────────────────────────────────────────────────
// How the 12 primitive tones are named in the export (tokens.json / CSS / README).
// On-screen swatch labels stay positional (1–12); this only renames the output.
export type ColorNaming = 'numeric' | 'hundreds' | 'tens'

export const NAMING_SCHEMES: { key: ColorNaming; label: string; labels: string[] }[] = [
  { key: 'numeric',  label: '1, 2, 3…',     labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
  // Canonical Untitled-UI / Tailwind ramp: 25 (lightest) … 950 (darkest). The
  // semantic catalogue's tone→label mapping is built against this (tone 11 = 900,
  // tone 12 = 950), so exported references read gray.900 / gray.950 etc.
  { key: 'hundreds', label: '25, 50, 100…', labels: ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] },
  { key: 'tens',     label: '10, 20, 30…',  labels: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120'] },
]

/** Exported name for a 1-based tone under the active naming scheme. */
export function toneLabel(naming: ColorNaming, tone: number): string {
  const scheme = NAMING_SCHEMES.find((s) => s.key === naming) ?? NAMING_SCHEMES[0]
  return scheme.labels[tone - 1] ?? String(tone)
}

export function generateColorScale(
  baseHex: string,
  algorithm: ColorAlgorithm = 'default',
  contrastShift = 0,
  background?: string,
  appearance: ScaleAppearance = 'light',
): Record<number, string> {
  const spec = SPECS[algorithm] ?? SPECS.default
  const colors = buildScale(baseHex, spec, contrastShift, background, appearance)
  const scale: Record<number, string> = {}
  colors.forEach((color, i) => {
    scale[i + 1] = color
  })
  return scale
}

/**
 * The page background DERIVED from the base neutral — HeroUI's model: you pick
 * one base and the surfaces every element sits on are computed from it, instead
 * of the page being a second, independent choice that can drift out of step
 * with the ramps grown against it.
 *
 * It keeps the base's hue and a trace of its chroma, so the page carries the
 * same tint as the neutral ramp. Light lands just under pure white; dark lands
 * at L 0.17 — the same lightness `generateDarkColorScale` assumes when no dark
 * page is given, so the derived page and its ramp agree by construction.
 */
export function backgroundFromBase(baseHex: string, appearance: ScaleAppearance = 'light'): string {
  try {
    const [, c, hRaw] = chroma(baseHex).oklch()
    const h = Number.isNaN(hRaw) ? 0 : hRaw
    return appearance === 'dark'
      ? chroma.oklch(0.17, Math.min(c * 0.35, 0.022), h).hex()
      : chroma.oklch(0.995, Math.min(c * 0.12, 0.006), h).hex()
  } catch {
    return appearance === 'dark' ? '#0c0e12' : '#ffffff'
  }
}

/**
 * Dark-appearance neutral ramp — the ramp gray roles resolve from in dark
 * themes, where recDarkTone inverts the hierarchy (surface-0 → tone 12,
 * surface-1 → 11, surface-2 → 10, text-primary → 1).
 *
 * Two things make this different from just calling `generateColorScale` with a
 * dark background:
 *
 *  1. Tone 12 grows out of `darkBackground` (appearance: 'dark'), so the chosen
 *     dark page IS the dark surface.
 *  2. The ramp's BASE (tone 9) is re-derived as a *dark* neutral sitting just
 *     above the page, instead of being pinned to `neutralHex` — a mid-gray base
 *     would leave tones 9–10 (surface-3 / surface-2) as light grays, which in a
 *     dark theme read as blown-out surfaces. It keeps the neutral's hue (which
 *     itself derives from the accent), so the whole dark ramp carries the
 *     accent's tint.
 */
export function generateDarkColorScale(
  neutralHex: string,
  algorithm: ColorAlgorithm = 'default',
  contrastShift = 0,
  darkBackground?: string,
): Record<number, string> {
  let base = neutralHex
  try {
    const [, nC, nHraw] = chroma(neutralHex).oklch()
    const nH = Number.isNaN(nHraw) ? 0 : nHraw
    const bgL = darkBackground ? chroma(darkBackground).oklch()[0] : 0.17
    // Base sits ~0.17 L above the page — enough separation for the elevated
    // surfaces (9–11) to step up from it without ever reaching mid-gray.
    const baseL = Math.max(0.25, Math.min(0.45, bgL + 0.17))
    base = chroma.oklch(baseL, nC * 0.5, nH).hex()
  } catch { /* invalid neutral — fall back to the raw hex */ }
  return generateColorScale(base, algorithm, contrastShift, darkBackground, 'dark')
}

// ── Alpha ramps (Radix custom-palette architecture) ─────────────────────────
// Radix ships every scale twice: solid AND alpha, where each alpha step is the
// most-transparent overlay that reproduces the solid when composited over the
// page background — `solid = background×(1−α) + overlay×α`, solved for α and
// the overlay channels. Alpha tokens are therefore background-DEPENDENT: they
// only exist relative to a declared page background, which is why the
// background is a primitive input here, not a cosmetic choice.

/** Overlay color (#rrggbbaa) that reproduces `targetHex` over `backgroundHex`. */
export function alphaColorOver(targetHex: string, backgroundHex: string, targetAlpha?: number): string {
  const [tr, tg, tb] = chroma(targetHex).rgb()
  const [br, bg, bb] = chroma(backgroundHex).rgb()
  // Overlay toward white if any channel must lighten the background, else black.
  const desired = tr > br || tg > bg || tb > bb ? 255 : 0
  const alphaFor = (t: number, b: number) => (desired === b ? 0 : (t - b) / (desired - b))
  const a = targetAlpha ?? Math.max(alphaFor(tr, br), alphaFor(tg, bg), alphaFor(tb, bb))
  const A = Math.min(1, Math.max(0, Math.ceil(a * 255) / 255))
  if (A === 0) return desired === 255 ? '#ffffff00' : '#00000000'
  const ch = (t: number, b: number) => Math.min(255, Math.max(0, Math.round((t - b * (1 - A)) / A)))
  return chroma.rgb(ch(tr, br), ch(tg, bg), ch(tb, bb)).alpha(A).hex()
}

/** Alpha twin of a 1–12 solid scale, derived against the page background. */
export function generateAlphaScale(scale: Record<number, string>, backgroundHex: string): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [k, hex] of Object.entries(scale)) {
    if (!hex) continue
    try { out[Number(k)] = alphaColorOver(hex, backgroundHex) } catch { out[Number(k)] = hex }
  }
  return out
}

// Canonical hues for the four state roles (recognizable red / amber / green /
// blue). recommendStateColors keeps these hues + lightness but pulls each
// toward the brand's chroma, so the state set feels cohesive with the brand.
const STATE_CANONICAL = {
  error: '#f04438',
  warning: '#f79009',
  success: '#17b26a',
  info: '#2e90fa',
} as const

export type StateColors = { error: string; warning: string; success: string; info: string }

export function recommendStateColors(brandHex: string): StateColors {
  let brandC = 0.13
  try { brandC = chroma(brandHex).oklch()[1] } catch { /* keep fallback */ }
  const out = {} as StateColors
  for (const [key, hex] of Object.entries(STATE_CANONICAL)) {
    const [l, c, h] = chroma(hex).oklch()
    // Blend the state's own chroma with the brand's so the whole set shares a
    // saturation character without losing each role's recognizable hue.
    const blended = (c + brandC) / 2
    out[key as keyof StateColors] = chroma.oklch(l, blended, Number.isNaN(h) ? 0 : h).hex()
  }
  return out
}

export function checkContrast(fg: string, bg: string): number {
  return chroma.contrast(fg, bg)
}

export function isAccessible(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const contrast = checkContrast(fg, bg)
  return level === 'AA' ? contrast >= 4.5 : contrast >= 7
}

// Lightest brand tone (>= start) whose WHITE text passes WCAG AA (4.5:1).
// Keeps the solid brand button accessible even for bright hues where the design
// system's solid tone (9) is too light for white text. Falls back to 12.
export function accessibleSolidTone(scale: Record<number, string>, start = BASE_TONE): number {
  for (let t = start; t <= 12; t++) {
    const hex = scale[t]
    if (hex && checkContrast('#ffffff', hex) >= 4.5) return t
  }
  return 12
}

// Accent ink for app chrome (rail labels, section titles): brand tone 9 is tuned
// for white surfaces, so over the dark theme it can dip below readable contrast.
// Brightens the hue in steps until it clears 4.5:1 on the given background.
export function readableAccent(hex: string, bg: string): string {
  try {
    let c = chroma(hex)
    for (let i = 0; i < 8 && chroma.contrast(c, bg) < 4.5; i++) c = c.brighten(0.4)
    return c.hex()
  } catch {
    return hex
  }
}

// Ink (light or dark) that reads best ON a filled surface — picks whichever of
// the two candidates has the higher WCAG contrast against `bg`. Used for labels
// that sit on the brand/status solid fills, so a light accent gets dark ink and
// a dark accent gets light ink automatically, in both light and dark themes.
export function readableInk(bg: string, darkInk = '#0a0d12', lightInk = '#ffffff'): string {
  try {
    return chroma.contrast(lightInk, bg) >= chroma.contrast(darkInk, bg) ? lightInk : darkInk
  } catch {
    return lightInk
  }
}

// Applies alpha transparency to a hex color — used for the translucent panel
// background treatment (Radix `panelBackground="translucent"` equivalent).
export function withAlpha(hex: string, alpha: number): string {
  try {
    return chroma(hex).alpha(alpha).css()
  } catch {
    return hex
  }
}
