import { describe, expect, it } from 'vitest'
import { freeFigmaScope } from '../freeFigmaScope'

// `figmaSyncThemeKeys` lists My themes (library themes), not the scaffold pair.
const kinds = { core: 'light', night: 'dark', brand: 'light', sea: 'light' }
const all = ['light', 'dark', 'core', 'night', 'brand', 'sea']
const themes = { core: {}, night: {}, brand: {}, sea: {} }

describe('free Figma scope', () => {
  it('keeps every brand, Light and Dark, on every viewport, up to ten modes', () => {
    const scope = freeFigmaScope('night', all, themes, kinds)
    expect(scope.themes).toEqual(['night', 'core', 'brand', 'sea'])
    expect(scope.viewports).toEqual(['desktop', 'tablet', 'mobile'])
    expect(scope.gridStyles).toEqual(['xl-desktop', 'md-tablet', 'sm-mobile'])
    expect(scope.modes).toHaveLength(8)
    expect(scope.modes?.[0]).toEqual({ theme: 'night', appearance: 'light' })
  })

  it('stops at ten modes, so a sixth brand is the first cut', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f']
    const scope = freeFigmaScope(undefined, many, Object.fromEntries(many.map((k) => [k, {}])), {})
    expect(scope.modes).toHaveLength(10)
    expect(scope.themes).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('leads with the preferred theme, else the first ones', () => {
    expect(freeFigmaScope('ghost', ['core', 'night'], themes, kinds).themes).toEqual(['core', 'night'])
  })

  it('limits only the viewports when there are no themes to narrow', () => {
    expect(freeFigmaScope(undefined, ['light', 'dark'], {}, {})).toEqual({ viewports: ['desktop', 'tablet', 'mobile'], gridStyles: ['xl-desktop', 'md-tablet', 'sm-mobile'] })
  })
})
