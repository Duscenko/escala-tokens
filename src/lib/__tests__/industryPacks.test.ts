import { describe, expect, it } from 'vitest'
import { BRAND_SPECTRUM, BRAND_PRESETS } from '../brandPalette'
import {
  INDUSTRY_PACKS,
  INDUSTRY_SPECTRUM,
  hexEq,
  industryFromHex,
  industryFromHue,
  industryHeroesAreUnique,
  industryPacksAreCurated,
  industryPacksUniqueWithinGroup,
  packById,
  sortAccentsByHue,
} from '../industryPacks'

describe('industry packs', () => {
  it('ships twelve fields of four curated accents with unique heroes', () => {
    expect(INDUSTRY_PACKS).toHaveLength(12)
    for (const pack of INDUSTRY_PACKS) {
      expect(pack.accents).toHaveLength(4)
    }
    expect(industryPacksAreCurated()).toBe(true)
    expect(industryHeroesAreUnique()).toBe(true)
    expect(industryPacksUniqueWithinGroup()).toBe(true)
    for (const pack of INDUSTRY_PACKS) {
      for (const a of pack.accents) {
        expect(BRAND_PRESETS.some((h) => hexEq(h, a.hex))).toBe(true)
      }
    }
  })

  it('detects each hero hex as that field', () => {
    expect(industryFromHex('#ef6820')).toBe('food')
    expect(industryFromHex('#ee46bc')).toBe('fashion')
    expect(industryFromHex('#fb542b')).toBe('hospitality')
    expect(industryFromHex('#875bf7')).toBe('luxury')
    expect(industryFromHex('#2970ff')).toBe('business')
    expect(industryFromHex('#06aed4')).toBe('tech')
    expect(industryFromHex('#0ba5ec')).toBe('education')
    expect(industryFromHex('#ff4405')).toBe('energy')
    expect(industryFromHex('#15b79e')).toBe('health')
    expect(industryFromHex('#669f2a')).toBe('nature')
    expect(industryFromHex('#66c61c')).toBe('recreation')
    expect(industryFromHex('#d444f1')).toBe('art')
  })

  it('breaks overlapping non-hero hexes toward the tighter pack', () => {
    // Blue is in Business (hero is Blue Dark) — mean ΔE stays with the blues.
    expect(industryFromHex('#2e90fa')).toBe('business')
    expect(packById('luxury').accents.some((a) => hexEq(a.hex, '#7a5af8'))).toBe(true)
  })

  it('maps hue bands onto fields', () => {
    expect(industryFromHue(16)).toBe('energy')
    expect(industryFromHue(30)).toBe('food')
    expect(industryFromHue(160)).toBe('health')
    expect(industryFromHue(190)).toBe('tech')
    expect(industryFromHue(220)).toBe('business')
    expect(industryFromHue(300)).toBe('art')
    expect(industryFromHue(350)).toBe('hospitality')
  })

  it('curated palette bar matches every agent accent in hue order', () => {
    const agentHexes = new Set(
      INDUSTRY_PACKS.flatMap((p) => p.accents.map((a) => a.hex.toLowerCase())),
    )
    const barHexes = new Set(INDUSTRY_SPECTRUM.map((a) => a.hex.toLowerCase()))
    expect(barHexes.size).toBe(agentHexes.size)
    for (const hex of agentHexes) expect(barHexes.has(hex)).toBe(true)
    // Blues → Pinks → Warm → Greens — same sequence as BRAND_SPECTRUM.
    expect(INDUSTRY_SPECTRUM.map((a) => a.hex.toLowerCase())).toEqual(
      BRAND_SPECTRUM.map((a) => a.hex.toLowerCase()),
    )
  })

  it('sorts row swatches by ascending hue', () => {
    const food = packById('food')
    const sorted = sortAccentsByHue(food.accents)
    expect(sorted.map((a) => a.hex.toLowerCase())).toEqual([
      '#ef6820', '#eaaa08', '#16b364', '#f63d68',
    ])
  })
})
