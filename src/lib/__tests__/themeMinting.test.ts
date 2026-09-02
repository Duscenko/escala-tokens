import { beforeEach, describe, expect, it } from 'vitest'
import { mintTheme, slotsFromAccent } from '../../components/configurator/ThemePanel'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { previewHarmony } from '../colorUtils'

describe('theme minting page anchors', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('anchors a new theme to its own neutral instead of the open system page', () => {
    const accent = '#15803d'
    const tint = 'subtle' as const
    const harmony = previewHarmony(accent, tint)
    const result = mintTheme(
      slotsFromAccent(accent, tint),
      'dark',
      'Grass regression',
      null,
      tint,
      { light: harmony.pageLight, dark: harmony.pageDark },
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    const state = useDesignStore.getState()
    const refs = state.themeSources[result.key]
    const brand = state.customColors.find((family) => family.key === refs.brand)
    const neutral = state.customColors.find((family) => family.key === refs.gray)

    expect(brand?.scale[1].toLowerCase()).toBe(harmony.pageLight.toLowerCase())
    expect(brand?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(neutral?.scale[1].toLowerCase()).toBe(harmony.pageLight.toLowerCase())
    expect(neutral?.darkScale?.[1].toLowerCase()).toBe(harmony.pageDark.toLowerCase())
    expect(harmony.pageDark.toLowerCase()).not.toBe('#190f20')
    expect(harmony.pageLight.toLowerCase()).not.toBe('#fef7ff')
  })
})
