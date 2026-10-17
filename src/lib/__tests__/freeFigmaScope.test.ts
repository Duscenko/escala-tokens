import { describe, expect, it } from 'vitest'
import { freeFigmaScope } from '../freeFigmaScope'

// `figmaSyncThemeKeys` lists My themes (library themes), not the scaffold pair.
const kinds = { core: 'light', night: 'dark', brand: 'light', sea: 'light' }
const all = ['light', 'dark', 'core', 'night', 'brand', 'sea']
const themes = { core: {}, night: {}, brand: {}, sea: {} }

describe('free Figma scope', () => {
  it('keeps three brands, each in Light and Dark, on every viewport', () => {
    const scope = freeFigmaScope('night', all, themes, kinds)
    expect(scope.themes).toEqual(['night', 'core', 'brand'])
    expect(scope.viewports).toEqual(['desktop', 'tablet', 'mobile'])
    expect(scope.gridStyles).toEqual(['xl-desktop', 'md-tablet', 'sm-mobile'])
    expect(scope.modes).toEqual([
      { theme: 'night', appearance: 'light' }, { theme: 'night', appearance: 'dark' },
      { theme: 'core', appearance: 'light' }, { theme: 'core', appearance: 'dark' },
      { theme: 'brand', appearance: 'light' }, { theme: 'brand', appearance: 'dark' },
    ])
  })

  it('falls back to the first themes when the preferred one is not in My themes', () => {
    expect(freeFigmaScope('ghost', ['core', 'night', 'brand', 'sea'], themes, kinds).themes).toEqual(['core', 'night', 'brand'])
  })

  it('limits only the viewports when there are no themes to narrow', () => {
    expect(freeFigmaScope(undefined, ['light', 'dark'], {}, {})).toEqual({ viewports: ['desktop', 'tablet', 'mobile'], gridStyles: ['xl-desktop', 'md-tablet', 'sm-mobile'] })
  })
})
