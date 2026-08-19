import { describe, expect, it } from 'vitest'
import {
  simulateLinear, separation, validateCategorical, CATEGORICAL_LIMITS,
} from '../color/cvd'
import { hexToLinearRgb, hexToOklch } from '../color/gamut'

/**
 * These pin the simulation itself. The thresholds in `CATEGORICAL_LIMITS` are
 * calibrated to Machado (2009) severity 1.0 specifically — if the matrices are
 * ever swapped for another model the numbers below move, which is exactly the
 * change that must not pass silently.
 */

describe('Machado severity-1.0 simulation', () => {
  it('leaves an achromatic colour where it was', () => {
    // Every row of every matrix sums to ~1, so grey is a fixed point. This is
    // the cheapest possible detector for a transposed or mis-typed matrix.
    for (const grey of ['#000000', '#808080', '#ffffff']) {
      for (const kind of ['protan', 'deutan', 'tritan'] as const) {
        expect(separation(grey, grey, kind), `${grey} ${kind}`).toBeCloseTo(0, 10)
        const before = hexToLinearRgb(grey)
        const after = simulateLinear(before, kind)
        expect(after.r, `${grey} ${kind} r`).toBeCloseTo(before.r, 3)
        expect(after.g, `${grey} ${kind} g`).toBeCloseTo(before.g, 3)
        expect(after.b, `${grey} ${kind} b`).toBeCloseTo(before.b, 3)
      }
    }
  })

  it('collapses a red/green pair matched in lightness — the real chart case', () => {
    // Pure #f00 vs #0f0 is the textbook illustration and the WRONG test: they
    // differ so much in luminance that even a protan simulation leaves ΔE 44.
    // Two mid-tone chart colours at comparable lightness are the case that
    // actually bites, and deutan takes them from 29.0 to 6.4 — through the
    // target, through the floor, into unusable.
    const [red, green] = ['#c04040', '#40a040']
    expect(separation(red, green)).toBeGreaterThan(25)
    expect(separation(red, green, 'deutan')).toBeLessThan(CATEGORICAL_LIMITS.cvdFloor + 1)
    expect(separation(red, green, 'protan')).toBeLessThan(separation(red, green))
    // Tritan is blue–yellow: a red/green pair survives it essentially intact.
    expect(separation(red, green, 'tritan')).toBeGreaterThan(25)
  })

  it('collapses blue onto green for tritan more than for red-green types', () => {
    const [blue, green] = ['#0000ff', '#00ff00']
    const normal = separation(blue, green)
    expect(separation(blue, green, 'tritan')).toBeLessThan(normal)
    expect(separation(blue, green, 'protan')).toBeGreaterThan(separation(blue, green, 'tritan'))
    expect(separation(blue, green, 'deutan')).toBeGreaterThan(separation(blue, green, 'tritan'))
  })

  it('is symmetric and non-negative', () => {
    const pairs: [string, string][] = [['#7f56d9', '#0d9488'], ['#d97706', '#16a34a']]
    for (const [a, b] of pairs) {
      for (const kind of [undefined, 'protan', 'deutan', 'tritan'] as const) {
        const d = separation(a, b, kind)
        expect(d).toBeGreaterThanOrEqual(0)
        expect(separation(b, a, kind)).toBeCloseTo(d, 10)
      }
    }
  })

  it('stays inside the unit cube — a simulated colour is still displayable', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']) {
      for (const kind of ['protan', 'deutan', 'tritan'] as const) {
        const { r, g, b } = simulateLinear(hexToLinearRgb(hex), kind)
        for (const [ch, v] of [['r', r], ['g', g], ['b', b]] as const) {
          expect(v, `${hex} ${kind} ${ch}`).toBeGreaterThanOrEqual(0)
          expect(v, `${hex} ${kind} ${ch}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})

describe('the categorical checks fail the things they exist to fail', () => {
  it('rejects a slot outside the lightness band', () => {
    const r = validateCategorical(['#000000', '#ff0000', '#0000ff'], { mode: 'light' })
    expect(r.ok).toBe(false)
    expect(r.checks.find((c) => c.name === 'Lightness band')!.state).toBe('fail')
  })

  it('rejects a slot that reads as grey', () => {
    const grey = '#808080'
    expect(hexToOklch(grey).c).toBeLessThan(CATEGORICAL_LIMITS.chromaFloor)
    const r = validateCategorical(['#c05a5a', grey, '#5a7fc0'])
    expect(r.checks.find((c) => c.name === 'Chroma floor')!.state).toBe('fail')
    expect(r.ok).toBe(false)
  })

  it('rejects two slots a full-colour reader cannot separate', () => {
    // Two neighbouring hues at the same L and C. Nothing about this is visible
    // in a swatch strip; it is only visible as a number.
    const r = validateCategorical(['#3f8fd0', '#3f92d0'])
    expect(r.checks.find((c) => c.name === 'Normal-vision floor')!.state).toBe('fail')
    expect(r.ok).toBe(false)
  })

  it('warns rather than fails when contrast is short — that relief is real', () => {
    // Sub-3:1 obligates visible labels or a table view; it does not make the
    // palette illegal. Recording it as a pass would erase the obligation.
    const r = validateCategorical(['#f0c8c8', '#c8d8f0'], { mode: 'light' })
    const contrast = r.checks.find((c) => c.name === 'Contrast vs surface')!
    expect(contrast.state).toBe('warn')
  })

  it('is strictly harder to pass with pairs: all', () => {
    // Adjacent-only is right for bars and lines; scatter and maps put any two
    // slots side by side, so `all` must never be the more permissive option.
    const pal = ['#8c71d7', '#cd597c', '#a38300', '#00a16d', '#0092d1']
    const adjacent = validateCategorical(pal, { pairs: 'adjacent' })
    const all = validateCategorical(pal, { pairs: 'all' })
    expect(all.worstCvd!.deltaE).toBeLessThanOrEqual(adjacent.worstCvd!.deltaE)
    expect(all.worstNormal!.deltaE).toBeLessThanOrEqual(adjacent.worstNormal!.deltaE)
  })
})
