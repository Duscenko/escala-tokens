import { describe, expect, it } from 'vitest'
import {
  BRAND_THEME_CHOICES, BRAND_THEME_IDS, brandThemeChoiceFor, brandThemesSummary, countShippedThemes,
  normalizeBrandThemes, plannedBrandThemes, pruneBrandThemes, shippedThemes, shipsEveryTheme, soleShippedAppearance,
} from '../brandThemes'
import { freeFigmaScope } from '../freeFigmaScope'
import {
  applyBrandThemesToSyncModes, brandThemesFromSyncModes, defaultFigmaSyncModes,
} from '../figmaSyncModes'

describe('what a brand ships is a list of themes', () => {
  it('a brand with no entry ships every theme', () => {
    expect(shippedThemes({}, 'acme')).toEqual([...BRAND_THEME_IDS])
    expect(shippedThemes(undefined, 'acme')).toEqual([...BRAND_THEME_IDS])
  })

  it('never resolves to an empty list, and drops ids it does not know', () => {
    expect(normalizeBrandThemes([])).toEqual([...BRAND_THEME_IDS])
    expect(normalizeBrandThemes(['sepia'])).toEqual([...BRAND_THEME_IDS])
    expect(normalizeBrandThemes(['dark', 'sepia', 'dark'])).toEqual(['dark'])
  })

  it('lists the preferred theme first, which is the Figma column order', () => {
    expect(shippedThemes({}, 'acme', 'dark')).toEqual(['dark', 'light'])
    expect(shippedThemes({ acme: ['light'] }, 'acme', 'dark')).toEqual(['light'])
  })

  it('offers every theme together, then each one alone, from the registry', () => {
    expect(BRAND_THEME_CHOICES.map((choice) => choice.label)).toEqual(['Light + Dark', 'Light only', 'Dark only'])
    expect(BRAND_THEME_CHOICES[0].ids).toEqual([...BRAND_THEME_IDS])
    expect(brandThemeChoiceFor(['dark']).label).toBe('Dark only')
    expect(brandThemesSummary(['light', 'dark'])).toBe('Light + Dark')
  })

  it('counts themes from what each brand ships, not brands × 2', () => {
    const shipped = { kids: ['light'], partner: ['dark'] }
    expect(countShippedThemes(['acme', 'kids', 'partner'], shipped)).toBe(4)
    expect(countShippedThemes(['acme', 'kids', 'partner'], {})).toBe(6)
  })

  it('stores nothing for a brand that ships everything or no longer exists', () => {
    expect(pruneBrandThemes({ acme: ['light', 'dark'], kids: ['light'], gone: ['dark'] }, ['acme', 'kids']))
      .toEqual({ kids: ['light'] })
    expect(shipsEveryTheme(['light'])).toBe(false)
  })
})

describe('Sync publishes what each brand ships', () => {
  const kinds = { acme: 'light', kids: 'light', partner: 'dark' }

  it('opens with each brand\'s own themes', () => {
    expect(defaultFigmaSyncModes(['acme', 'kids', 'partner'], kinds, { kids: ['light'], partner: ['dark'] })).toEqual([
      { theme: 'acme', appearance: 'light' },
      { theme: 'acme', appearance: 'dark' },
      { theme: 'kids', appearance: 'light' },
      { theme: 'partner', appearance: 'dark' },
    ])
  })

  it('is unchanged for a system that never narrowed a brand', () => {
    expect(defaultFigmaSyncModes(['acme', 'partner'], kinds, {})).toEqual(defaultFigmaSyncModes(['acme', 'partner'], kinds))
  })

  it('rewrites one brand in place and leaves the others as the user had them', () => {
    const before = [
      { theme: 'acme', appearance: 'light' as const },
      { theme: 'kids', appearance: 'light' as const },
      { theme: 'kids', appearance: 'dark' as const },
      { theme: 'partner', appearance: 'dark' as const },
    ]
    expect(applyBrandThemesToSyncModes(before, 'kids', kinds, { kids: ['dark'] })).toEqual([
      { theme: 'acme', appearance: 'light' },
      { theme: 'kids', appearance: 'dark' },
      { theme: 'partner', appearance: 'dark' },
    ])
  })

  it('does not bring back a brand the user took out of Sync', () => {
    const before = [{ theme: 'acme', appearance: 'light' as const }]
    expect(applyBrandThemesToSyncModes(before, 'kids', kinds, {})).toEqual(before)
  })

  it('reads the selection back as what each brand in it ships', () => {
    expect(brandThemesFromSyncModes([
      { theme: 'acme', appearance: 'light' },
      { theme: 'acme', appearance: 'dark' },
      { theme: 'kids', appearance: 'light' },
    ])).toEqual({ acme: ['light', 'dark'], kids: ['light'] })
  })
})

describe('Free ships one theme per brand', () => {
  const themes = { acme: {} }

  it('reads a brand that stores both as its leading theme, without rewriting it', () => {
    expect(plannedBrandThemes(['light', 'dark'], 'dark', true)).toEqual(['dark'])
    expect(plannedBrandThemes(['light', 'dark'], 'dark', false)).toEqual(['light', 'dark'])
    expect(plannedBrandThemes(['light'], 'dark', true)).toEqual(['light'])
  })

  it('a brand set to one theme ships that one, whatever is on screen', () => {
    expect(soleShippedAppearance({ acme: ['light'] }, 'acme')).toBe('light')
    expect(freeFigmaScope('acme', ['acme'], themes, { acme: 'dark' }, 'dark', { acme: ['light'] }).modes)
      .toEqual([{ theme: 'acme', appearance: 'light' }])
  })

  it('a brand that never chose ships Light and Dark', () => {
    expect(soleShippedAppearance({}, 'acme')).toBeUndefined()
    const both = [{ theme: 'acme', appearance: 'light' }, { theme: 'acme', appearance: 'dark' }]
    expect(freeFigmaScope('acme', ['acme'], themes, { acme: 'light' }, 'dark', {}).modes).toEqual(both)
    expect(freeFigmaScope('acme', ['acme'], themes, { acme: 'light' }, 'dark').modes).toEqual(both)
  })
})
