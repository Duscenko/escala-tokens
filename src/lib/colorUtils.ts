import chroma from 'chroma-js'

// ── Color-scale algorithms ───────────────────────────────────────────────────
// Each algorithm builds a 12-tone ramp (light → dark) in OKLCH, anchored so that
// tone 6 is exactly the base color. Lightness is interpolated in two monotonic
// halves (light → base, base → dark) so the ramp never reverses around the
// anchor regardless of the base color's own lightness. `contrastShift` (≈ −1…+1)
// widens (or narrows) the lightness range — more separation between tones.

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
const ANCHOR = 6 // tone pinned to the base color exactly

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function buildScale(baseHex: string, spec: AlgoSpec, shift: number): string[] {
  const [baseL, baseC, baseHraw] = chroma(baseHex).oklch()
  const baseH = Number.isNaN(baseHraw) ? 0 : baseHraw
  // Widen/narrow each half-range by the contrast shift.
  const lightL = clamp01(baseL + (spec.lightL - baseL) * (1 + shift))
  const darkL = clamp01(baseL - (baseL - spec.darkL) * (1 + shift))

  const out: string[] = []
  for (let i = 1; i <= TONES; i++) {
    if (i === ANCHOR) {
      out.push(chroma(baseHex).hex())
      continue
    }
    let L: number
    let C: number
    let frac: number
    if (i < ANCHOR) {
      const f = (ANCHOR - i) / (ANCHOR - 1) // 0 → 1 toward the light end
      L = baseL + (lightL - baseL) * f
      C = baseC * (1 + (spec.lightCmul - 1) * f)
      frac = -f
    } else {
      const f = (i - ANCHOR) / (TONES - ANCHOR) // 0 → 1 toward the dark end
      L = baseL + (darkL - baseL) * f
      C = baseC * (1 + (spec.darkCmul - 1) * f)
      frac = f
    }
    const H = baseH + (spec.hueShift?.(frac) ?? 0)
    out.push(chroma.oklch(L, C, H).hex())
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
  radix:         { label: 'Radix UI',        lightL: 0.99, darkL: 0.24, lightCmul: 0.22, darkCmul: 0.85 },
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
  ['lightness', 'tailwind', 'radix', 'ant', 'saturation', 'hueShift', 'monochromatic', 'analogous', 'complementary'] as ColorAlgorithm[]
).map((key) => ({ key, label: SPECS[key].label }))

// The recommended (default) algorithm — surfaced with a badge in the UI.
export const RECOMMENDED_ALGORITHM: ColorAlgorithm = 'lightness'

// ── Token naming schemes ─────────────────────────────────────────────────────
// How the 12 primitive tones are named in the export (tokens.json / CSS / README).
// On-screen swatch labels stay positional (1–12); this only renames the output.
export type ColorNaming = 'numeric' | 'hundreds' | 'tens'

export const NAMING_SCHEMES: { key: ColorNaming; label: string; labels: string[] }[] = [
  { key: 'numeric',  label: '1, 2, 3…',     labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
  { key: 'hundreds', label: '50, 100, 200…', labels: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '1000'] },
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
): Record<number, string> {
  const spec = SPECS[algorithm] ?? SPECS.default
  const colors = buildScale(baseHex, spec, contrastShift)
  const scale: Record<number, string> = {}
  colors.forEach((color, i) => {
    scale[i + 1] = color
  })
  return scale
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
// system's default tone (8) is too light for white text. Falls back to 12.
export function accessibleSolidTone(scale: Record<number, string>, start = 8): number {
  for (let t = start; t <= 12; t++) {
    const hex = scale[t]
    if (hex && checkContrast('#ffffff', hex) >= 4.5) return t
  }
  return 12
}
