import { describe, expect, it } from 'vitest'
import {
  FIGMA_SYNC_MODE_CAP,
  figmaModesUsed,
  clampFigmaSyncModes,
  defaultFigmaSyncModes,
  figmaSyncModeId,
  figmaSyncModeLabel,
  hasFigmaSyncMode,
  sameFigmaSyncModes,
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

  // With two or more brands Figma gets a Brand collection (one mode per
  // brand) and Color Semantics keeps Light · Dark: the cap counts brands.
  it('fills ten brands (Light + Dark each) to the cap and stops', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
    const kinds = Object.fromEntries(keys.map((key) => [key, 'light']))
    const next = defaultFigmaSyncModes(keys, kinds)
    expect(next).toHaveLength(FIGMA_SYNC_MODE_CAP * 2)
    expect(figmaModesUsed(next)).toBe(FIGMA_SYNC_MODE_CAP)
    expect(next.filter((mode) => mode.theme === 'j')).toEqual([
      { theme: 'j', appearance: 'light' },
      { theme: 'j', appearance: 'dark' },
    ])
    expect(next.some((mode) => mode.theme === 'k')).toBe(false)
  })

  it('counts one brand by its columns and several by brands', () => {
    expect(figmaModesUsed([{ theme: 'a', appearance: 'light' }, { theme: 'a', appearance: 'dark' }])).toBe(2)
    expect(figmaModesUsed([
      { theme: 'a', appearance: 'light' }, { theme: 'a', appearance: 'dark' },
      { theme: 'b', appearance: 'light' }, { theme: 'c', appearance: 'dark' },
    ])).toBe(3)
  })

  // Built from the constant, not from a literal count: the cap is a product
  // decision that has moved once already (3 → 10) and these assert the
  // BEHAVIOUR at the cap, not what the cap happens to be.
  const atCap = (): { theme: string; appearance: 'light' | 'dark' }[] =>
    Array.from({ length: FIGMA_SYNC_MODE_CAP * 2 }, (_, i) => ({
      theme: `t${Math.floor(i / 2)}`,
      appearance: i % 2 === 0 ? 'light' : 'dark',
    }))

  it('caps the selection and never empties it', () => {
    const full = atCap()
    expect(clampFigmaSyncModes([...full, { theme: 'over', appearance: 'light' }]))
      .toEqual(full)
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

  it('a brand that fits brings both appearances', () => {
    // One brand slot left: Light and Dark both fit, since they share the
    // Color Semantics modes every brand uses.
    const oneLeft = atCap().slice(0, (FIGMA_SYNC_MODE_CAP - 1) * 2)
    const next = toggleFigmaSyncTheme(oneLeft, 'core', { core: 'dark' })
    expect(figmaModesUsed(next)).toBe(FIGMA_SYNC_MODE_CAP)
    expect(hasFigmaSyncMode(next, 'core', 'dark')).toBe(true)
    expect(hasFigmaSyncMode(next, 'core', 'light')).toBe(true)
  })

  it('offers ten brands in both appearances', () => {
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

  it('compares selections by column and order', () => {
    const a = defaultFigmaSyncModes(['core', 'nature'], { core: 'light', nature: 'dark' })
    expect(sameFigmaSyncModes(a, [...a])).toBe(true)
    expect(sameFigmaSyncModes(a, a.slice(0, 3))).toBe(false)
    // Order is the order Figma creates columns in, so it is part of identity:
    // on a plan that runs out of modes it decides which ones survive.
    expect(sameFigmaSyncModes(a, [a[1], a[0], ...a.slice(2)])).toBe(false)
    expect(
      sameFigmaSyncModes(
        [{ theme: 'core', appearance: 'light' }],
        [{ theme: 'core', appearance: 'dark' }],
      ),
    ).toBe(false)
  })
})
