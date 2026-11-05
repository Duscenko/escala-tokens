// The neutral, like the accent and the states, takes a hex of its own in Dark.
// Reported: in the Generator's Color card the Neutral row was read-only in
// Dark, so a designer could not pick its value there as they could the others.
import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { applyNeutralDarkColor } from '../colorActions'
import { BASE_TONE, generateDarkColorScale } from '../colorUtils'
import { mintTheme } from '../themeMint'

beforeEach(() => { useDesignStore.setState(makeDesignDefaults()) })

describe('neutral dark anchor', () => {
  it('lands the typed hex as tone 9 of the dark ramp, leaving light and the pages alone', () => {
    const before = useDesignStore.getState()
    applyNeutralDarkColor('#3a4a5c')
    const s = useDesignStore.getState()
    expect(s.grayDarkColor).toBe('#3a4a5c')
    expect(s.grayDarkScale[BASE_TONE].toLowerCase()).toBe('#3a4a5c')
    expect(s.grayBaseColor).toBe(before.grayBaseColor)
    expect(s.grayLightScale).toEqual(before.grayLightScale)
    expect(s.darkBackground).toBe(before.darkBackground)
    expect(s.pageBackground).toBe(before.pageBackground)
  })

  it('is a hand edit: it unlinks the neutral from the accent', () => {
    useDesignStore.setState({ linkNeutralToAccent: true })
    applyNeutralDarkColor('#3a4a5c')
    expect(useDesignStore.getState().linkNeutralToAccent).toBe(false)
  })

  it('typing the derived anchor back clears the override', () => {
    applyNeutralDarkColor('#3a4a5c')
    const s = useDesignStore.getState()
    const derived = generateDarkColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, s.darkBackground, s.neutralTint)
    applyNeutralDarkColor(derived[BASE_TONE])
    expect(useDesignStore.getState().grayDarkColor).toBe('')
    expect(useDesignStore.getState().grayDarkScale).toEqual(derived)
  })

  it('writes a theme\'s own gray family when the theme has one', () => {
    const result = mintTheme({ brand: '#2970ff', gray: '#5b4a7c', error: '#d92d20', warning: '#dc6803', success: '#079455', info: '#1570ef' }, 'light', 'Brand', null)
    expect('key' in result).toBe(true)
    const key = (result as { key: string }).key
    const gray = useDesignStore.getState().themeSources[key]?.gray
    expect(gray && gray !== 'neutral').toBe(true)
    const globalBefore = useDesignStore.getState().grayDarkScale
    applyNeutralDarkColor('#2f3d4f', key)
    const s = useDesignStore.getState()
    const fam = s.customColors.find((c) => c.key === gray)!
    expect(fam.darkBase).toBe('#2f3d4f')
    expect(fam.darkScale?.[BASE_TONE]?.toLowerCase()).toBe('#2f3d4f')
    expect(s.grayDarkScale).toEqual(globalBefore)
  })
})
