import { describe, expect, it } from 'vitest'
import { readHuePosition } from '../colorUtils'
import { FONT_PRESETS } from '../fonts'
import { hueDelta, MIN_HUE_DELTA } from '../randomAccent'
import {
  fontPairingsAreCatalogued,
  randomAccentVoice,
  randomTheme,
} from '../randomTheme'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { TYPE_SCALE_MODES, inferTypeScaleMode } from '../typographyStandard'

function sequence(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

const VIVID = '#9522e9'

describe('randomTheme', () => {
  it('only pairs fonts the type picker ships', () => {
    expect(fontPairingsAreCatalogued()).toBe(true)
  })

  it('is deterministic for a given rng', () => {
    const a = randomTheme({ accent: VIVID, rng: sequence(4) })
    const b = randomTheme({ accent: VIVID, rng: sequence(4) })
    expect(a).toEqual(b)
  })

  it('lands a new accent at least MIN_HUE_DELTA away', () => {
    const { hue } = readHuePosition(VIVID)
    for (let i = 0; i < 24; i++) {
      const next = randomAccentVoice(VIVID, sequence(i + 9))
      expect(hueDelta(hue, readHuePosition(next).hue)).toBeGreaterThanOrEqual(MIN_HUE_DELTA)
    }
  })

  it('borrows a real System Style for geometry and borders', () => {
    const recipe = randomTheme({ accent: VIVID, rng: sequence(21) })
    const scaffold = THEME_STYLE_PRESETS.find((preset) => preset.id === recipe.scaffoldId)
    expect(scaffold).toBeDefined()
    expect(recipe.foundations.radiusRoles).toEqual(scaffold?.foundations.radiusRoles)
    expect(recipe.foundations.shadows).toEqual(scaffold?.foundations.shadows)
    expect(recipe.semantics).toEqual(scaffold?.semantics)
  })

  it('replaces the style typeface with a catalogued pair and a real type scale', () => {
    const recipe = randomTheme({
      accent: VIVID,
      bodyFont: 'Inter',
      headingFont: 'Inter',
      typeScale: 'default',
      rng: sequence(33),
    })
    const known = new Set(FONT_PRESETS.map((font) => font.value))
    expect(known.has(recipe.bodyFont)).toBe(true)
    expect(known.has(recipe.headingFont)).toBe(true)
    expect(TYPE_SCALE_MODES.some((mode) => mode.key === recipe.typeScale)).toBe(true)
    expect(inferTypeScaleMode(recipe.foundations.typography?.sizes)).toBe(recipe.typeScale)
    expect(recipe.foundations.typography?.fontFamily).toBe(recipe.bodyFont)
    expect(recipe.foundations.typography?.headingFontFamily).toBe(recipe.headingFont)
  })

  it('avoids repeating the last scaffold', () => {
    const first = randomTheme({ accent: VIVID, rng: sequence(2) })
    const second = randomTheme({
      accent: first.accent,
      avoidScaffold: first.scaffoldId,
      rng: sequence(2),
    })
    expect(second.scaffoldId).not.toBe(first.scaffoldId)
  })

  it('changes more than hue — type or density moves', () => {
    const recipe = randomTheme({
      accent: VIVID,
      bodyFont: 'Inter',
      headingFont: 'Inter',
      typeScale: 'default',
      rng: sequence(17),
    })
    const typeMoved = recipe.bodyFont !== 'Inter' || recipe.headingFont !== 'Inter'
    const scaleMoved = recipe.typeScale !== 'default'
    expect(typeMoved || scaleMoved).toBe(true)
  })
})
