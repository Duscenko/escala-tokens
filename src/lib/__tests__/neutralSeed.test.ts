import { describe, expect, it } from 'vitest'
import { generateColorScale, generateLightNeutralScale, lightNeutralSolid } from '../colorUtils'
import { hexToOklch } from '../color/gamut'
import { wcagRatio } from '../color/apca'

// Reported from a real export (Flow): Neutral #121316 on page #f9fafc.
const PAGE = '#f9fafc'
const L = (hex: string) => hexToOklch(hex).l

describe('a text-grade neutral seed keeps the light ramp in order', () => {
  it('reproduces the defect when the seed is pinned to tone 9', () => {
    const raw = generateColorScale('#121316', 'radix', 0, PAGE, 'light', 'tinted')
    expect(L(raw[9])).toBeLessThan(L(raw[11])) // 9 darker than the text tone
  })

  for (const seed of ['#121316', '#000000', '#2b2d31', '#3b3c3e']) {
    it(`${seed}: lightness falls 1 → 12 and 11/12 sit beyond 9`, () => {
      const ramp = generateLightNeutralScale(seed, 'radix', 0, PAGE, 'tinted')
      for (let t = 2; t <= 12; t++) {
        if (t === 11) continue // 11 is solved against the page, not after 10
        expect(L(ramp[t]), `${t - 1} → ${t}`).toBeLessThanOrEqual(L(ramp[t - 1]) + 1e-4)
      }
      expect(L(ramp[11])).toBeLessThan(L(ramp[9]))
      expect(L(ramp[12])).toBeLessThan(L(ramp[11]))
      expect(wcagRatio(ramp[9], PAGE)).toBeGreaterThanOrEqual(3)
    })
  }

  it('keeps the seed hue', () => {
    const solid = lightNeutralSolid('#1c2533', PAGE)
    const d = Math.abs(hexToOklch(solid).h - hexToOklch('#1c2533').h)
    expect(Math.min(d, 360 - d)).toBeLessThan(6)
  })

  it('leaves an ordinary mid-grey neutral verbatim on tone 9', () => {
    for (const seed of ['#6c737f', '#808080', '#9ca3af']) {
      expect(generateLightNeutralScale(seed, 'radix', 0, PAGE)[9]).toBe(seed)
    }
  })
})
