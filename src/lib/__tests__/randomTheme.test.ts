import { describe, expect, it } from 'vitest'
import { readHuePosition } from '../colorUtils'
import { FONT_PRESETS } from '../fonts'
import { hueDelta, MIN_HUE_DELTA } from '../randomAccent'
import {
  fontPairingsAreCatalogued,
  nextRandomLabel,
  daringAccent,
  oppositeNeutral,
  randomAccentVoice,
  randomLabelAfterTweak,
  randomBoardAppearance,
  randomTheme,
  moodSafeSemantics,
  stylePreviewFromRecipe,
} from '../randomTheme'
import { PROCEDURAL_MOOD_ID, curatedMood } from '../themeMoods'
import { radiusRolesFromGroups } from '../layoutTokens'
import { guestStarterPreview } from '../stylePreviewOverlay'
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

  it('puts the accent on the far side of the wheel and the paper opposite it', () => {
    const { hue } = readHuePosition(VIVID)
    for (let i = 0; i < 24; i++) {
      const rng = sequence(i + 3)
      const accent = daringAccent(VIVID, rng)
      const accentHue = readHuePosition(accent).hue
      expect(hueDelta(hue, accentHue)).toBeGreaterThanOrEqual(120)
      const neutral = oppositeNeutral(accent, i % 2 === 0 ? 'vivid' : 'tinted', rng)
      expect(hueDelta(accentHue, readHuePosition(neutral).hue)).toBeGreaterThanOrEqual(140)
    }
  })

  it('lands a new accent at least MIN_HUE_DELTA away', () => {
    const { hue } = readHuePosition(VIVID)
    for (let i = 0; i < 24; i++) {
      const next = randomAccentVoice(VIVID, sequence(i + 9))
      expect(hueDelta(hue, readHuePosition(next).hue)).toBeGreaterThanOrEqual(MIN_HUE_DELTA)
    }
  })

  it('borrows a real System Style for sizes and borders, and a mood for radius', () => {
    const recipe = randomTheme({ accent: VIVID, rng: sequence(21) })
    const scaffold = THEME_STYLE_PRESETS.find((preset) => preset.id === recipe.scaffoldId)
    expect(scaffold).toBeDefined()
    expect(recipe.foundations.sizes).toEqual(scaffold?.foundations.sizes)
    expect(recipe.foundations.spacing).toEqual(scaffold?.foundations.spacing)
    expect(recipe.semantics).toEqual(moodSafeSemantics(scaffold?.semantics))
    const mood = recipe.moodId === PROCEDURAL_MOOD_ID ? undefined : curatedMood(recipe.moodId)
    if (mood) expect(recipe.foundations.radiusRoles).toEqual(radiusRolesFromGroups(mood.radius))
  })

  it('takes colour from a mood: own page hue, own severities, own appearance', () => {
    for (let i = 0; i < 40; i++) {
      const recipe = randomTheme({ accent: VIVID, rng: sequence(i + 101) })
      if (recipe.moodId === PROCEDURAL_MOOD_ID) continue
      const mood = curatedMood(recipe.moodId)!
      expect(recipe.accent).toBe(mood.accent)
      expect(recipe.neutral).toBe(mood.neutral)
      expect(recipe.states).toEqual(mood.states)
      expect(recipe.appearance).toBe(mood.appearance)
    }
  })

  it('never draws the same mood twice in a row', () => {
    let last: string | undefined
    for (let i = 0; i < 60; i++) {
      const recipe = randomTheme({ accent: VIVID, avoidMood: last, rng: sequence(i + 7) })
      if (last && last !== PROCEDURAL_MOOD_ID) expect(recipe.moodId).not.toBe(last)
      last = recipe.moodId
    }
  })

  it('drops scaffold pins tuned to that style\'s own accent', () => {
    const glass = THEME_STYLE_PRESETS.find((p) => p.id === 'cupertino-glass')!
    const safe = moodSafeSemantics(glass.semantics)!
    expect(Object.keys(safe).some((k) => k.startsWith('action.') || k.startsWith('status.'))).toBe(false)
    expect(safe['border.control']).toEqual(glass.semantics?.['border.control'])
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

  it('paints a recipe onto the try-on without leaving the scaffold id', () => {
    const current = guestStarterPreview()
    const recipe = randomTheme({
      accent: current.preset.accent,
      avoidScaffold: current.preset.id,
      rng: sequence(3),
    })
    const next = stylePreviewFromRecipe(current, recipe, 'light')
    expect(next.preset.id).toBe(recipe.scaffoldId)
    expect(next.preset.accent).toBe(recipe.accent)
    expect(next.preset.neutralTint).toBe(recipe.neutralTint)
    expect(next.appearance).toBe('light')
    expect(next.preset.id).not.toBe(current.preset.id)
  })

  it('starts a visitor on Cupertino / Glass', () => {
    const preview = guestStarterPreview()
    expect(preview.preset.id).toBe('cupertino-glass')
    expect(preview.appearance).toBe(preview.preset.preferredAppearance)
  })

  it('flips the whole artefacts board to light or dark', () => {
    const first = randomBoardAppearance(sequence(5))
    const second = randomBoardAppearance(sequence(5))
    expect(first === 'light' || first === 'dark').toBe(true)
    expect(second).toBe(first)
  })
})

describe('random theme naming', () => {
  it('calls the first Random "Random" and numbers the rest', () => {
    expect(nextRandomLabel({})).toBe('Random')
    expect(nextRandomLabel({ a: 'Random' })).toBe('Random 2')
    expect(nextRandomLabel({ a: 'Random', b: 'Random 2' })).toBe('Random 3')
  })

  it('replaces a name the designer never chose', () => {
    const style = THEME_STYLE_PRESETS[0]
    expect(randomLabelAfterTweak('t', { t: style.label }, style.id)).toBe('Random')
    expect(randomLabelAfterTweak('t', {}, undefined)).toBe('Random')
  })

  it('keeps a name that was typed, and one already Random', () => {
    const style = THEME_STYLE_PRESETS[0]
    expect(randomLabelAfterTweak('t', { t: 'Acme brand' }, style.id)).toBeNull()
    expect(randomLabelAfterTweak('t', { t: 'Random 2' }, undefined)).toBeNull()
  })
})
