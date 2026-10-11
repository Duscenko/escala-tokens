import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'
import {
  applyAccentColor, applyStateColorForAppearance, ensureColorScales, resolveThemePages,
} from '../colorActions'
import {
  backgroundFromBase, generateColorScale, generateFamilyDarkScale, neutralFromBrand,
} from '../colorUtils'
import { generateTokenJSON } from '../tokenGenerator'
import { hexToOklch } from '../color/gamut'

/**
 * Tone 1 is the page. These lock the three ways it stopped being one:
 * a theme regenerated against a page it does not sit on, an achromatic family
 * given a hue it does not have, and dark ramps left on the previous dark page.
 */

const same = (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase()

describe('a System Style keeps the page it was minted on', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    ensureColorScales()
  })

  for (const preset of THEME_STYLE_PRESETS) {
    for (const appearance of ['light', 'dark'] as const) {
      it(`${preset.id} · ${appearance}`, () => {
        const adopted = adoptPreset(preset, appearance, { track: false })
        if ('error' in adopted) throw new Error(adopted.error)
        const s = useDesignStore.getState()
        const refs = s.themeSources[adopted.key]!
        const family = (key: string) => useDesignStore.getState().customColors.find((c) => c.key === key)
        const ramp = (key: string) => (appearance === 'dark' ? family(key)?.darkScale : family(key)?.scale)
        const gray = ramp(refs.gray)
        if (!gray) return // the style reads the system's own neutral

        // The page later edits regenerate against is the page the theme has.
        const page = resolveThemePages(s, adopted.key)[appearance]
        expect(same(page, gray[1])).toBe(true)

        // A status edit therefore leaves the family on the same paper.
        if (refs.error !== 'error') {
          const before = ramp(refs.error)![1]
          applyStateColorForAppearance('error', family(refs.error)!.base, appearance, true, adopted.key)
          expect(same(ramp(refs.error)![1], before)).toBe(true)
        }

        // And the exported alpha twin of the neutral's tone 1 is fully
        // transparent: tone 1 composited over its own page is the page.
        const alpha = (generateTokenJSON().colors as { primitiveAlpha?: Record<string, string> }).primitiveAlpha ?? {}
        const key = Object.keys(alpha).find((k) =>
          k.startsWith(refs.gray) && /-1$/.test(k) && k.includes('-dark-') === (appearance === 'dark'))
        if (key) expect(alpha[key].slice(-2)).toBe('00')
      })
    }
  }
})

describe('an achromatic family has no hue to rematch', () => {
  const page = { light: '#fef7ff', dark: '#190f20' } // violet `tinted` paper
  for (const seed of ['#808080', '#000000', '#ffffff', '#f5f5f5']) {
    it(`${seed} takes the page as tone 1`, () => {
      expect(same(generateColorScale(seed, 'radix', 0, page.light)[1], page.light)).toBe(true)
      expect(same(generateFamilyDarkScale(seed, 'radix', 0, page.dark)[1], page.dark)).toBe(true)
    })
  }

  it('a coloured family of another hue still rematches', () => {
    const tone1 = generateFamilyDarkScale('#17b26a', 'radix', 0, page.dark)[1]
    expect(same(tone1, page.dark)).toBe(false)
    expect(Math.abs(hexToOklch(tone1).h - hexToOklch('#17b26a').h)).toBeLessThan(15)
  })
})

describe('an accent edit that moves only the dark page', () => {
  it('re-anchors the status dark ramps', () => {
    // Two accents whose linked neutral lands on one light page and two dark ones.
    const pages = (hex: string) => {
      const n = neutralFromBrand(hex, 'subtle')
      return { light: backgroundFromBase(n, 'light', 'subtle'), dark: backgroundFromBase(n, 'dark', 'subtle') }
    }
    let pair: [string, string] | null = null
    for (let v = 0x10; v < 0xf0 && !pair; v += 2) {
      const a = `#9522${v.toString(16).padStart(2, '0')}`
      const b = `#9522${(v + 2).toString(16).padStart(2, '0')}`
      if (pages(a).light === pages(b).light && pages(a).dark !== pages(b).dark) pair = [a, b]
    }
    expect(pair, 'no dark-only page move in the sweep').not.toBeNull()

    useDesignStore.setState({ ...makeDesignDefaults(), linkStatesToAccent: false })
    ensureColorScales()
    applyAccentColor(pair![0], true, 'light')
    applyAccentColor(pair![1], true, 'light')
    const s = useDesignStore.getState()
    expect(s.darkBackground).toBe(pages(pair![1]).dark)
    expect(s.errorDarkScale).toEqual(
      generateFamilyDarkScale(s.errorColor, s.colorAlgorithm, s.contrastShift, s.darkBackground),
    )
  })
})
