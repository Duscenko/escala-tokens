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
  createShuffleDeck,
  nextShuffle,
  styleLabelAfterShuffle,
  withOppositePage,
} from '../randomTheme'
import { RADIX_ACCENTS, radixSolid } from '../radixPalettes'
import { backgroundFromBase, checkContrast, generateColorScale } from '../colorUtils'
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

  it('takes colour from a Radix palette at the chosen level, geometry from a mood', () => {
    for (const level of ['conservative', 'liberal', 'bold'] as const) {
      for (let i = 0; i < 20; i++) {
        const recipe = randomTheme({ accent: VIVID, level, rng: sequence(i + 101) })
        expect(RADIX_ACCENTS.map(radixSolid)).toContain(recipe.accent)
        expect(Boolean(recipe.oppositePage)).toBe(level === 'bold')
      }
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

describe('the dice: System Styles first, then Random', () => {
  it('deals every System Style once, in catalogue order, before any random look', () => {
    const deck = createShuffleDeck()
    const dealt: (string | undefined)[] = []
    for (let i = 0; i < THEME_STYLE_PRESETS.length; i++) {
      dealt.push(nextShuffle({ accent: VIVID, deck, rng: sequence(i + 1) }).styleId)
    }
    expect(dealt).toEqual(THEME_STYLE_PRESETS.map((preset) => preset.id))
    const after = nextShuffle({ accent: VIVID, deck, rng: sequence(99) })
    expect(after.styleId).toBeUndefined()
  })

  it('never deals the style already on screen', () => {
    const deck = createShuffleDeck()
    const first = nextShuffle({ accent: VIVID, deck, currentStyle: 'core-minimal' })
    expect(first.styleId).toBe('cupertino-glass')
    const seen = new Set([first.styleId])
    for (let i = 0; i < THEME_STYLE_PRESETS.length; i++) {
      const recipe = nextShuffle({ accent: VIVID, deck, rng: sequence(i + 5) })
      expect(recipe.styleId).not.toBe('core-minimal')
      if (recipe.styleId) {
        expect(seen.has(recipe.styleId)).toBe(false)
        seen.add(recipe.styleId)
      }
    }
  })

  it('deals a style whole: its own accent, type and geometry', () => {
    const core = THEME_STYLE_PRESETS[0]
    const recipe = nextShuffle({ accent: VIVID, deck: createShuffleDeck() })
    expect(recipe.accent).toBe(core.accent)
    expect(recipe.foundations).toEqual(core.foundations)
    expect(recipe.appearance).toBe(core.preferredAppearance)
  })

  it('turns the page opposite the accent on Bold spins, never on the safer levels', () => {
    for (const level of ['conservative', 'liberal', 'bold'] as const) {
      const deck = createShuffleDeck()
      THEME_STYLE_PRESETS.forEach((preset) => deck.shown.add(preset.id))
      for (let i = 0; i < 40; i++) {
        const recipe = nextShuffle({ accent: VIVID, deck, level, rng: sequence(i * 7 + 3) })
        expect(Boolean(recipe.oppositePage), `${level} #${i}`).toBe(level === 'bold')
      }
    }
  })

  it('an opposite page keeps its hue across the wheel and its text readable', () => {
    for (let i = 0; i < 40; i++) {
      const rng = sequence(i + 301)
      const recipe = withOppositePage(randomTheme({ accent: VIVID, rng }), rng)
      expect(['tinted', 'vivid']).toContain(recipe.neutralTint)
      for (const appearance of ['light', 'dark'] as const) {
        const page = backgroundFromBase(recipe.neutral, appearance, recipe.neutralTint)
        expect(hueDelta(readHuePosition(recipe.accent).hue, readHuePosition(page).hue)).toBeGreaterThanOrEqual(130)
        const ramp = generateColorScale(recipe.neutral, 'default', 0, page, appearance, recipe.neutralTint)
        expect(checkContrast(ramp[12], page)).toBeGreaterThanOrEqual(4.5)
        expect(checkContrast(ramp[11], page)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('names a dealt style after itself unless the designer typed a name', () => {
    expect(styleLabelAfterShuffle('t', { t: 'Random 2' }, undefined, 'cupertino-glass')).toBe('Cupertino / Glass')
    expect(styleLabelAfterShuffle('t', { t: 'Core / Minimalist' }, 'core-minimal', 'cupertino-glass')).toBe('Cupertino / Glass')
    expect(styleLabelAfterShuffle('t', { t: 'Acme' }, 'core-minimal', 'cupertino-glass')).toBeNull()
  })
})
