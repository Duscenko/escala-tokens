import { beforeEach, describe, expect, it } from 'vitest'
import { mintTheme, slotsFromAccent } from '../../components/configurator/ThemePanel'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { applyScopedAccentColor } from '../colorActions'
import { generateColorScale, generateFamilyDarkScale, previewHarmony } from '../colorUtils'

const LEFTOVER_LIGHT = '#fef7ff'
const LEFTOVER_DARK = '#190f20'

describe('theme page anchors', () => {
  beforeEach(() => {
    useDesignStore.setState({
      ...makeDesignDefaults(),
      pageBackground: LEFTOVER_LIGHT,
      darkBackground: LEFTOVER_DARK,
    })
  })

  it('retints a custom-brand theme off leftover global purple even when gray is still global', () => {
    const s = useDesignStore.getState()
    s.addCustomColor({
      key: 'sky-brand',
      label: 'Sky Accent',
      base: '#2970ff',
      scale: generateColorScale('#2970ff', s.colorAlgorithm, s.contrastShift, LEFTOVER_LIGHT),
      darkScale: generateFamilyDarkScale('#2970ff', s.colorAlgorithm, s.contrastShift, LEFTOVER_DARK),
    })
    s.addTheme('sky', 'dark', { ...DEFAULT_THEME_SOURCES, brand: 'sky-brand' })

    expect(useDesignStore.getState().customColors.find((c) => c.key === 'sky-brand')?.darkScale?.[1].toLowerCase())
      .toBe(LEFTOVER_DARK)

    const next = '#15b79e'
    expect(applyScopedAccentColor(next, true, 'sky')).toBe(true)

    const harmony = previewHarmony(next, useDesignStore.getState().neutralTint)
    const brand = useDesignStore.getState().customColors.find((c) => c.key === 'sky-brand')
    expect(brand?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(brand?.scale[1].toLowerCase()).toBe(harmony.pageLight.toLowerCase())
    expect(brand?.darkScale?.[1].toLowerCase()).not.toBe(LEFTOVER_DARK)
    expect(brand?.base.toLowerCase()).toBe(next)
  })

  it('keeps an unlinked custom brand on its own gray page, not the leftover globals', () => {
    const accent = '#15803d'
    const tint = useDesignStore.getState().neutralTint
    const harmony = previewHarmony(accent, tint)
    const minted = mintTheme(
      slotsFromAccent(accent, tint),
      'dark',
      'Grass',
      null,
      tint,
      { light: harmony.pageLight, dark: harmony.pageDark },
    )
    expect('error' in minted).toBe(false)
    if ('error' in minted) return

    const next = '#2970ff'
    expect(applyScopedAccentColor(next, false, minted.key)).toBe(true)

    const brand = useDesignStore.getState().customColors.find((c) => {
      const refs = useDesignStore.getState().themeSources[minted.key]
      return c.key === refs?.brand
    })
    expect(brand?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(brand?.darkScale?.[1].toLowerCase()).not.toBe(LEFTOVER_DARK)
    expect(brand?.base.toLowerCase()).toBe(next)
  })

  it('moves a linked minted theme onto the new accent page', () => {
    const first = '#15803d'
    const tint = useDesignStore.getState().neutralTint
    const firstHarmony = previewHarmony(first, tint)
    const minted = mintTheme(
      slotsFromAccent(first, tint),
      'dark',
      'Grass',
      null,
      tint,
      { light: firstHarmony.pageLight, dark: firstHarmony.pageDark },
    )
    expect('error' in minted).toBe(false)
    if ('error' in minted) return

    const next = '#2970ff'
    applyScopedAccentColor(next, true, minted.key)

    const state = useDesignStore.getState()
    const refs = state.themeSources[minted.key]
    const brand = state.customColors.find((c) => c.key === refs?.brand)
    const gray = state.customColors.find((c) => c.key === refs?.gray)
    const harmony = previewHarmony(next, tint)
    expect(brand?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(gray?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(brand?.darkScale?.[1].toLowerCase()).not.toBe(LEFTOVER_DARK)
  })
})
