import { beforeEach, describe, expect, it } from 'vitest'
import { generateColorScale, generateFamilyDarkScale } from '../colorUtils'
import {
  LEGACY_MOSS_GLOW_STOPS,
  LINKED_GRADIENT_TONES,
  gradientToCss,
  linkedStopsFor,
  makeDefaultGradients,
  stopColorOn,
  stopsMatch,
} from '../gradients'
import { resolvePreviewTokens } from '../previewTokens'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'

const BLUE = '#2970ff'
const GOLD = '#eebd62'
const LIME = ['#66c61c', '#16653a']

function ramp(hex: string, dark = false) {
  return dark
    ? generateFamilyDarkScale(hex, 'radix', 0, '#0c0e12')
    : generateColorScale(hex, 'radix', 0, '#ffffff')
}

describe('linked default gradients', () => {
  it('seeds Moss Glow as a tone-backed accent link, never the lime seed', () => {
    const scale = ramp(BLUE)
    const darkScale = ramp(BLUE, true)
    const moss = makeDefaultGradients(BLUE, scale, darkScale).find((g) => g.id === 'moss-glow')!
    expect(moss.linked).toBe(true)
    expect(moss.type).toBe('radial')
    expect(moss.stops.every((s) => typeof s.tone === 'number')).toBe(true)
    expect(moss.stops.map((s) => s.color.toLowerCase())).not.toEqual(LIME)
    const signature = LINKED_GRADIENT_TONES['moss-glow']
    expect(moss.stops.map((s) => s.tone)).toEqual(signature.map((s) => s.tone))
    expect(moss.stops[0].color.toLowerCase()).toBe(scale[signature[0].tone].toLowerCase())
    expect(moss.stops[1].color.toLowerCase()).toBe(scale[signature[1].tone].toLowerCase())
  })

  it('linkedStopsFor replaces the legacy lime with the current ramp', () => {
    const scale = ramp(GOLD)
    const stops = linkedStopsFor('moss-glow', scale, LEGACY_MOSS_GLOW_STOPS)!
    expect(stopsMatch(stops, LEGACY_MOSS_GLOW_STOPS)).toBe(false)
    expect(stops[0].color.toLowerCase()).toBe(scale[7].toLowerCase())
    expect(stops[1].color.toLowerCase()).toBe(scale[11].toLowerCase())
    expect(stops.every((s) => s.color.toLowerCase() !== LIME[0])).toBe(true)
  })
})

describe('gradients follow the previewed theme ramp', () => {
  it('resolving brand-cover, aurora and moss-glow against another brand retints every stop', () => {
    const blue = ramp(BLUE)
    const gold = ramp(GOLD)
    const seeded = makeDefaultGradients(BLUE, blue, ramp(BLUE, true))
    for (const id of ['brand-cover', 'aurora', 'moss-glow'] as const) {
      const g = seeded.find((x) => x.id === id)!
      const blueCss = gradientToCss(g, 'light', blue)
      const goldCss = gradientToCss(g, 'light', gold)
      expect(goldCss, id).not.toBe(blueCss)
      const firstTone = g.stops[0].tone!
      expect(goldCss.toLowerCase()).toContain(gold[firstTone].toLowerCase())
      expect(blueCss.toLowerCase()).toContain(blue[firstTone].toLowerCase())
      // Cached hex without a ramp stays on the seed brand — the stale-cache
      // failure the editor used to paint. Passing the other theme's ramp is
      // what makes the live path follow the preview.
      expect(gradientToCss(g, 'light').toLowerCase()).toContain(blue[firstTone].toLowerCase())
    }
  })

  it('an unlinked lime Moss Glow stays lime until it has tones — stopColorOn does not invent a colour', () => {
    const gold = ramp(GOLD)
    const stale = { color: '#66c61c', pos: 0 }
    expect(stopColorOn(stale, 'light', gold).toLowerCase()).toBe('#66c61c')
    expect(stopColorOn({ ...stale, tone: 7 }, 'light', gold).toLowerCase()).toBe(gold[7].toLowerCase())
  })
})

describe('preview tokens resolve linked gradients per theme brand', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('switching the previewed theme retints cover, avatar and Moss Glow', () => {
    const goldScale = ramp(GOLD)
    const goldDark = ramp(GOLD, true)
    const store = useDesignStore.getState()
    store.addCustomColor({
      key: 'gold',
      label: 'Gold',
      base: GOLD,
      scale: goldScale,
      darkScale: goldDark,
    })
    store.addTheme('gold-theme', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'gold' })

    const after = useDesignStore.getState()
    const light = resolvePreviewTokens(after, 'light')
    const goldTheme = resolvePreviewTokens(after, 'gold-theme')
    expect(goldTheme.coverGradient).not.toBe(light.coverGradient)
    expect(goldTheme.avatarGradient).not.toBe(light.avatarGradient)
    expect(goldTheme.coverGradient?.toLowerCase()).toContain(goldScale[9].toLowerCase())

    const moss = after.gradients.find((g) => g.id === 'moss-glow')!
    const mossOnGold = gradientToCss(moss, 'light', goldScale)
    const mossOnAccent = gradientToCss(moss, 'light', after.primaryScale)
    expect(mossOnGold).not.toBe(mossOnAccent)
    expect(mossOnGold.toLowerCase()).toContain(goldScale[7].toLowerCase())
    expect(mossOnGold.toLowerCase()).not.toContain('#66c61c')
  })
})
