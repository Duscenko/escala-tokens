import { describe, expect, it } from 'vitest'
import {
  FIGMA_SYNC_MODE_CAP,
  clampFigmaSyncModes,
  defaultFigmaSyncModes,
  figmaSyncModeId,
  figmaSyncModeLabel,
  hasFigmaSyncMode,
  toggleFigmaSyncAppearance,
  toggleFigmaSyncTheme,
  uniqueThemesFromModes,
} from '../figmaSyncModes'

describe('figma sync modes', () => {
  it('defaults to nothing when My themes is empty', () => {
    expect(defaultFigmaSyncModes([], { light: 'light', dark: 'dark' })).toEqual([])
  })

  it('defaults to every listed theme in both appearances', () => {
    expect(defaultFigmaSyncModes(['nature', 'core'], { nature: 'light', core: 'dark' })).toEqual([
      { theme: 'nature', appearance: 'light' },
      { theme: 'nature', appearance: 'dark' },
      { theme: 'core', appearance: 'dark' },
      { theme: 'core', appearance: 'light' },
    ])
    expect(defaultFigmaSyncModes(['neo'], { neo: 'dark' })).toEqual([
      { theme: 'neo', appearance: 'dark' },
      { theme: 'neo', appearance: 'light' },
    ])
  })

  it('fills five themes to the ten-column cap and stops', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f']
    const kinds = Object.fromEntries(keys.map((key) => [key, 'light']))
    const next = defaultFigmaSyncModes(keys, kinds)
    expect(next).toHaveLength(FIGMA_SYNC_MODE_CAP)
    expect(next.filter((mode) => mode.theme === 'e')).toEqual([
      { theme: 'e', appearance: 'light' },
      { theme: 'e', appearance: 'dark' },
    ])
    expect(next.some((mode) => mode.theme === 'f')).toBe(false)
  })

  // Built from the constant, not from a literal count: the cap is a product
  // decision that has moved once already (3 → 10) and these assert the
  // BEHAVIOUR at the cap, not what the cap happens to be.
  const atCap = (): { theme: string; appearance: 'light' | 'dark' }[] =>
    Array.from({ length: FIGMA_SYNC_MODE_CAP }, (_, i) => ({
      theme: `t${Math.floor(i / 2)}`,
      appearance: i % 2 === 0 ? 'light' : 'dark',
    }))

  it('caps the selection and never empties it', () => {
    const full = atCap()
    expect(clampFigmaSyncModes([...full, { theme: 'over', appearance: 'light' }]))
      .toHaveLength(FIGMA_SYNC_MODE_CAP)
    // At the cap, adding is a no-op — the earlier picks win, which is what
    // makes the order meaningful when Figma's own plan limit trims further.
    expect(toggleFigmaSyncAppearance(full, 'over', 'dark')).toEqual(full)
    // Removing the last remaining mode is refused: an empty list would
    // publish nothing.
    expect(toggleFigmaSyncAppearance(
      [{ theme: 'a', appearance: 'light' }],
      'a',
      'light',
    )).toEqual([{ theme: 'a', appearance: 'light' }])
    expect(toggleFigmaSyncTheme(full, 'over', { over: 'light' })).toEqual(full)
  })

  it('adds both appearances when a theme is toggled on', () => {
    const next = toggleFigmaSyncTheme(
      [{ theme: 'nature', appearance: 'light' }, { theme: 'nature', appearance: 'dark' }],
      'core',
      { core: 'light' },
    )
    expect(next).toEqual([
      { theme: 'nature', appearance: 'light' },
      { theme: 'nature', appearance: 'dark' },
      { theme: 'core', appearance: 'light' },
      { theme: 'core', appearance: 'dark' },
    ])
  })

  it('adds only the appearances that still fit', () => {
    // One slot left: the preferred appearance takes it and the other is
    // dropped, rather than the whole toggle being refused.
    const oneLeft = atCap().slice(0, FIGMA_SYNC_MODE_CAP - 1)
    const next = toggleFigmaSyncTheme(oneLeft, 'core', { core: 'dark' })
    expect(next).toHaveLength(FIGMA_SYNC_MODE_CAP)
    expect(hasFigmaSyncMode(next, 'core', 'dark')).toBe(true)
    expect(hasFigmaSyncMode(next, 'core', 'light')).toBe(false)
  })

  it('offers five themes in both appearances', () => {
    expect(FIGMA_SYNC_MODE_CAP).toBe(10)
  })

  it('names Figma columns from the theme plus Light/Dark', () => {
    expect(figmaSyncModeId({ theme: 'nature--organic', appearance: 'dark' })).toBe('nature--organic::dark')
    expect(figmaSyncModeLabel('Nature / Organic', 'dark')).toBe('Nature / Organic Dark')
    expect(uniqueThemesFromModes([
      { theme: 'nature', appearance: 'light' },
      { theme: 'nature', appearance: 'dark' },
      { theme: 'core', appearance: 'light' },
    ])).toEqual(['nature', 'core'])
  })
})
