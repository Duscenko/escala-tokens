import { describe, expect, it } from 'vitest'
import { freeFigmaScope } from '../freeFigmaScope'

// `figmaSyncThemeKeys` lists My themes (library themes), not the scaffold pair.
const kinds = { core: 'light', night: 'dark', brand: 'light' }

describe('free Figma scope', () => {
  it('keeps one theme (its Light + Dark) and Desktop only', () => {
    const scope = freeFigmaScope('night', ['light', 'dark', 'core', 'night', 'brand'], { core: {}, night: {}, brand: {} }, kinds)
    expect(scope.themes).toEqual(['night'])
    expect(scope.viewports).toEqual(['desktop'])
    expect(scope.modes).toEqual([
      { theme: 'night', appearance: 'dark' },
      { theme: 'night', appearance: 'light' },
    ])
  })

  it('falls back to the first theme when the preferred one is not in My themes', () => {
    const scope = freeFigmaScope('ghost', ['core', 'night'], { core: {}, night: {} }, kinds)
    expect(scope.themes).toEqual(['core'])
  })

  it('limits only the viewports when there are no themes to narrow', () => {
    expect(freeFigmaScope(undefined, ['light', 'dark'], {}, {})).toEqual({ viewports: ['desktop'] })
  })
})
