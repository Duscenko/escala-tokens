import { describe, expect, it } from 'vitest'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { colorParsley } from 'colorparsley'
import { apcaLc, wcagRatio, evaluate } from '../color/apca'

/**
 * Two layers of verification:
 *
 *  1. Frozen reference vectors — values produced by `apca-w3` 0.1.9 and pasted
 *     here, so the test still means something if the dependency ever drifts.
 *  2. A conformance fuzz against the `apca-w3` package itself over a
 *     deterministic pseudo-random sample. This is the one that actually proves
 *     our implementation is the reference implementation.
 *
 * `apca-w3` is a devDependency only. `src/lib/color/apca.ts` ships with zero
 * runtime dependencies.
 */

describe('APCA 0.1.9 — frozen reference vectors', () => {
  const cases: [text: string, bg: string, expected: number][] = [
    ['#000000', '#ffffff', 106.04067321268862],
    ['#ffffff', '#000000', -107.88473318309848],
    ['#888888', '#ffffff', 63.056469930209424],
    ['#ffffff', '#888888', -68.54146436644962],
    ['#8888aa', '#000000', -40.027665265155655],
    ['#aaaaaa', '#123456', -50.27310100285638],
    ['#123456', '#aaaaaa', 50.64594345279896],
  ]

  for (const [text, bg, expected] of cases) {
    it(`${text} on ${bg} → Lc ${expected.toFixed(2)}`, () => {
      expect(apcaLc(text, bg)).toBeCloseTo(expected, 8)
    })
  }
})

describe('APCA — conformance against apca-w3', () => {
  it('matches the reference implementation over 2000 deterministic pairs', () => {
    // xorshift32 — deterministic, so a failure is always reproducible.
    let s = 0x2f6e2b1
    const rnd = () => {
      s ^= s << 13; s >>>= 0
      s ^= s >>> 17
      s ^= s << 5; s >>>= 0
      return s / 0xffffffff
    }
    const hex = () =>
      '#' + Array.from({ length: 3 }, () =>
        Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')

    let worst = 0
    for (let i = 0; i < 2000; i++) {
      const fg = hex()
      const bg = hex()
      const ours = apcaLc(fg, bg)
      const theirs = APCAcontrast(sRGBtoY(colorParsley(fg)), sRGBtoY(colorParsley(bg))) as number
      worst = Math.max(worst, Math.abs(ours - Number(theirs)))
    }
    // Both compute the same closed-form expression in float64; any divergence
    // above 1e-9 means a constant or a branch is wrong, not rounding.
    expect(worst).toBeLessThan(1e-9)
  })
})

describe('APCA polarity', () => {
  it('is directional — swapping fg/bg is not the same magnitude', () => {
    const a = apcaLc('#333333', '#eeeeee')
    const b = apcaLc('#eeeeee', '#333333')
    expect(Math.sign(a)).toBe(1)
    expect(Math.sign(b)).toBe(-1)
    expect(Math.abs(a)).not.toBeCloseTo(Math.abs(b), 1)
  })

  it('reports 0 for pairs below the delta floor', () => {
    expect(apcaLc('#777777', '#777777')).toBe(0)
  })
})

describe('WCAG 2.x reference values', () => {
  it('black on white is 21:1', () => {
    expect(wcagRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })
  it('is symmetric', () => {
    expect(wcagRatio('#123456', '#aaaaaa')).toBeCloseTo(wcagRatio('#aaaaaa', '#123456'), 10)
  })
})

describe('the two metrics disagree — which is the whole point', () => {
  it('#a0a0a0 on black clears WCAG AAA but is not APCA body-text grade', () => {
    const v = evaluate('#a0a0a0', '#000000', 'body-text')
    expect(v.wcag).toBeGreaterThan(7)          // WCAG says AAA
    expect(v.passesWcag).toBe(true)
    expect(Math.abs(v.apcaLc)).toBeLessThan(75) // APCA says: not body copy
    expect(v.passesApca).toBe(false)
    expect(v.pass).toBe(false)
  })
})
