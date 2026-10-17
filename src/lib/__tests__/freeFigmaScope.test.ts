import { describe, expect, it } from 'vitest'
import { freeFigmaScope } from '../freeFigmaScope'

// `figmaSyncThemeKeys` lists My themes (library themes), not the scaffold pair.
const kinds = { core: 'light', night: 'dark', brand: 'light' }
const all = ['light', 'dark', 'core', 'night', 'brand']
const themes = { core: {}, night: {}, brand: {} }

describe('free Figma scope', () => {
  it('keeps two brands, each in Light and Dark, on Desktop and Mobile', () => {
    const scope = freeFigmaScope('night', all, themes, kinds)
    expect(scope.themes).toEqual(['night', 'core'])
    expect(scope.viewports).toEqual(['desktop', 'mobile'])
    expect(scope.gridStyles).toEqual(['xl-desktop', 'sm-mobile'])
    expect(scope.modes).toEqual([
      { theme: 'night', appearance: 'light' }, { theme: 'night', appearance: 'dark' },
      { theme: 'core', appearance: 'light' }, { theme: 'core', appearance: 'dark' },
    ])
  })

  it('falls back to the first themes when the preferred one is not in My themes', () => {
    expect(freeFigmaScope('ghost', ['core', 'night', 'brand'], themes, kinds).themes).toEqual(['core', 'night'])
  })

  it('limits only the viewports when there are no themes to narrow', () => {
    expect(freeFigmaScope(undefined, ['light', 'dark'], {}, {})).toEqual({ viewports: ['desktop', 'mobile'], gridStyles: ['xl-desktop', 'sm-mobile'] })
  })
})
