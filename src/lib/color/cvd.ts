/**
 * Colour-vision-deficiency simulation, and the categorical-palette checks that
 * depend on it.
 *
 * WHY THIS LIVES IN THE REPOSITORY
 * ─────────────────────────────────────────────────────────────────────────────
 * Escala emits categorical palettes — `--chart-1…5` for shadcn, and the
 * Categorical architecture as a whole. A categorical palette encodes identity in
 * hue ALONE, so the one failure mode that matters is two slots collapsing onto
 * each other for a reader with anomalous colour vision. Roughly 8% of men and
 * 0.5% of women are affected; deuteranomaly alone is the majority of that.
 *
 * That failure is computable, so it is computed. It is NOT reviewable by eye:
 * evenly spaced hues *look* obviously distinct in review and still put green
 * beside amber at ΔE 5.9 under a deutan simulation. The offsets in
 * `CHART_HUE_OFFSETS` exist because this module rejected the even split.
 *
 * WHY THE MATH IS HERE RATHER THAN CALLED OUT TO A TOOL
 * ─────────────────────────────────────────────────────────────────────────────
 * A check that only runs on one machine is not a guard. This is ~40 lines of
 * matrix arithmetic with no dependencies, so it ships with the palette it
 * governs and runs in CI on every push.
 *
 * The simulation is Machado, Oliveira & Fernandes (2009) at severity 1.0,
 * applied in LINEAR light. The choice of model is load-bearing, not an
 * implementation detail: the thresholds below are calibrated to it, and
 * swapping in e.g. Viénot (1999) moves borderline pairs and would require
 * recalibrating them.
 *
 * Reference: "A Physiologically-based Model for Simulation of Color Vision
 * Deficiency", IEEE TVCG 15(6), 2009.
 */

import { deltaEOK, hexToLinearRgb, hexToOklch, linearToOklab, type LinearRGB } from './gamut'
import { wcagRatio } from './apca'

export type CvdKind = 'protan' | 'deutan' | 'tritan'

/** Machado et al. (2009), severity 1.0, operating on linear-light sRGB. */
const MACHADO: Record<CvdKind, readonly (readonly number[])[]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Simulate `kind` on a linear-light colour. */
export function simulateLinear(rgb: LinearRGB, kind: CvdKind): LinearRGB {
  const m = MACHADO[kind]
  const { r, g, b } = rgb
  return {
    r: clamp01(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    g: clamp01(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    b: clamp01(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  }
}

/**
 * Perceptual distance between two hexes, ×100, optionally under a simulation.
 * Omit `kind` for unsimulated (normal) vision.
 *
 * ×100 because that is the scale the published data-viz thresholds are quoted
 * on; raw OKLab ΔE would put every threshold behind a mental decimal shift.
 */
export function separation(a: string, b: string, kind?: CvdKind): number {
  const la = kind ? simulateLinear(hexToLinearRgb(a), kind) : hexToLinearRgb(a)
  const lb = kind ? simulateLinear(hexToLinearRgb(b), kind) : hexToLinearRgb(b)
  return 100 * deltaEOK(linearToOklab(la), linearToOklab(lb))
}

// ── Categorical palette validation ───────────────────────────────────────────

/**
 * Thresholds. These are the published data-viz gates, restated here so the
 * numbers that fail a build are visible next to the code that applies them.
 */
export const CATEGORICAL_LIMITS = {
  /** OKLCH L must sit inside the mode's band, or a slot reads as a shade. */
  band: { light: [0.43, 0.77], dark: [0.48, 0.67] } as Record<string, readonly [number, number]>,
  /** Below this chroma a hue reads as grey and stops carrying identity. */
  chromaFloor: 0.1,
  /** Target CVD separation on the checked pairs; below `cvdFloor` is a failure. */
  cvdTarget: 8,
  /**
   * Between `cvdFloor` and `cvdTarget` the pair is legal ONLY with a second
   * encoding (direct labels, gaps, texture) — it is a warning, not a pass.
   */
  cvdFloor: 6,
  /**
   * Normal vision needs a wider margin than a dichromat simulation does, so
   * this floor is higher AND is a hard gate: no amount of secondary encoding
   * excuses two slots a full-colour reader cannot separate.
   */
  normalFloor: 15,
  /** Each mark against the chart surface. A mark is a UI component, so 3:1. */
  contrastMin: 3,
} as const

export type CheckState = 'pass' | 'warn' | 'fail'

export type CategoricalCheck = {
  name: string
  state: CheckState
  detail: string
}

export type CategoricalReport = {
  ok: boolean
  checks: CategoricalCheck[]
  /** The weakest pair under simulation, which is the number worth surfacing. */
  worstCvd: { deltaE: number; kind: CvdKind; a: string; b: string } | null
  worstNormal: { deltaE: number; a: string; b: string } | null
}

/**
 * `adjacent` is right for bars, stacks and lines, where only neighbouring
 * series touch. `all` is required for scatter, bubble and maps, where any two
 * slots can end up side by side — it is strictly harder to pass.
 */
export type PairMode = 'adjacent' | 'all'

const pairsOf = (n: number, mode: PairMode): [number, number][] => {
  const out: [number, number][] = []
  if (mode === 'all') {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j])
  } else {
    for (let i = 0; i + 1 < n; i++) out.push([i, i + 1])
  }
  return out
}

/**
 * Validate a categorical palette. Returns a report rather than throwing, so the
 * same function can back a CI assertion and a UI panel.
 */
export function validateCategorical(
  palette: readonly string[],
  opts: { mode?: 'light' | 'dark'; surface?: string; pairs?: PairMode } = {},
): CategoricalReport {
  const mode = opts.mode ?? 'light'
  const surface = opts.surface ?? (mode === 'dark' ? '#1a1a19' : '#fcfcfb')
  const pairs = opts.pairs ?? 'adjacent'
  const L = CATEGORICAL_LIMITS
  const checks: CategoricalCheck[] = []

  const [lo, hi] = L.band[mode]
  const offBand = palette.filter((c) => {
    const l = hexToOklch(c).l
    return l < lo || l > hi
  })
  checks.push({
    name: 'Lightness band',
    state: offBand.length ? 'fail' : 'pass',
    detail: offBand.length
      ? `outside L ${lo}–${hi}: ${offBand.join(', ')}`
      : `all ${palette.length} inside L ${lo}–${hi}`,
  })

  const lowChroma = palette.filter((c) => hexToOklch(c).c < L.chromaFloor)
  checks.push({
    name: 'Chroma floor',
    state: lowChroma.length ? 'fail' : 'pass',
    detail: lowChroma.length
      ? `reads grey: ${lowChroma.join(', ')}`
      : `all ${palette.length} >= ${L.chromaFloor}`,
  })

  const pairList = pairsOf(palette.length, pairs)

  let worstCvd: CategoricalReport['worstCvd'] = null
  for (const kind of ['protan', 'deutan'] as const) {
    for (const [i, j] of pairList) {
      const d = separation(palette[i], palette[j], kind)
      if (!worstCvd || d < worstCvd.deltaE) {
        worstCvd = { deltaE: d, kind, a: palette[i], b: palette[j] }
      }
    }
  }
  const cvd = worstCvd?.deltaE ?? Infinity
  checks.push({
    name: 'CVD separation',
    state: cvd >= L.cvdTarget ? 'pass' : cvd >= L.cvdFloor ? 'warn' : 'fail',
    detail: worstCvd
      ? `worst ${pairs} ${worstCvd.a}↔${worstCvd.b} ΔE ${worstCvd.deltaE.toFixed(1)} (${worstCvd.kind})`
      : 'n/a',
  })

  let worstNormal: CategoricalReport['worstNormal'] = null
  for (const [i, j] of pairList) {
    const d = separation(palette[i], palette[j])
    if (!worstNormal || d < worstNormal.deltaE) {
      worstNormal = { deltaE: d, a: palette[i], b: palette[j] }
    }
  }
  const normal = worstNormal?.deltaE ?? Infinity
  checks.push({
    name: 'Normal-vision floor',
    state: normal >= L.normalFloor ? 'pass' : 'fail',
    detail: worstNormal
      ? `worst ${pairs} ${worstNormal.a}↔${worstNormal.b} ΔE ${worstNormal.deltaE.toFixed(1)}`
      : 'n/a',
  })

  const lowContrast = palette.filter((c) => wcagRatio(c, surface) < L.contrastMin)
  checks.push({
    name: 'Contrast vs surface',
    // A warning, not a failure: sub-3:1 is legal with visible labels or a
    // table view. Recording it as a pass would hide that obligation.
    state: lowContrast.length ? 'warn' : 'pass',
    detail: lowContrast.length
      ? `below ${L.contrastMin}:1 on ${surface} — needs labels or a table view: ${lowContrast.join(', ')}`
      : `all ${palette.length} >= ${L.contrastMin}:1 on ${surface}`,
  })

  return { ok: checks.every((c) => c.state !== 'fail'), checks, worstCvd, worstNormal }
}
