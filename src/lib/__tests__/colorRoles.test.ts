import { describe, expect, it } from 'vitest'
import { COLOR_ROLE_BAND, DARK_SATURATION_CAP, checkRoleColor, roleColorAtHue, solveRoleColor } from '../colorRoles'
import { colorAtHue, readHuePosition } from '../colorUtils'
import { wcagLuminance } from '../color/apca'

const PAGES = { light: '#fcfcfd', dark: '#0c0e12' }
const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const SEEDS = ['#9522e9', '#06aed4', '#ff8a00', '#00b75f', '#f33f34', '#0e8eff', '#6c727f']

describe('Color edition roles — hue bands', () => {
  it('keeps every status default inside its own band', () => {
    const inBand = (hue: number, [start, end]: [number, number]) => {
      const span = ((end - start) + 360) % 360 || 360
      return (((hue - start) % 360) + 360) % 360 <= span
    }
    expect(inBand(readHuePosition('#f33f34').hue, COLOR_ROLE_BAND.error)).toBe(true)
    expect(inBand(readHuePosition('#ff8a00').hue, COLOR_ROLE_BAND.warning)).toBe(true)
    expect(inBand(readHuePosition('#00b75f').hue, COLOR_ROLE_BAND.success)).toBe(true)
    expect(inBand(readHuePosition('#0e8eff').hue, COLOR_ROLE_BAND.info)).toBe(true)
  })
})

describe('Color edition roles — the solver', () => {
  it('clears WCAG and APCA in BOTH themes, around the whole wheel', () => {
    const misses: string[] = []
    for (const seed of SEEDS) {
      for (const hue of HUES) {
        for (const appearance of ['light', 'dark'] as const) {
          const hex = roleColorAtHue(seed, hue, appearance, PAGES[appearance])
          if (!checkRoleColor(hex, PAGES[appearance]).passes) misses.push(`${seed}@${hue} ${appearance} → ${hex}`)
        }
      }
    }
    expect(misses).toEqual([])
  })

  it('takes the DIMMEST passing tone in dark: one step dimmer fails', () => {
    for (const hue of HUES) {
      const position = readHuePosition('#ff8a00').position
      const hex = solveRoleColor(position, hue, 'dark', PAGES.dark)
      const { position: solved } = readHuePosition(hex)
      const dimmer = colorAtHue({ saturation: Math.min(position.saturation, DARK_SATURATION_CAP), lightness: solved.lightness - 0.02 }, hue)
      expect(wcagLuminance(dimmer)).toBeLessThan(wcagLuminance(hex))
      expect(checkRoleColor(dimmer, PAGES.dark).passes).toBe(false)
    }
  })

  it('pulls chroma down in dark', () => {
    const vivid = { saturation: 1, lightness: 0.5 }
    const hex = solveRoleColor(vivid, 260, 'dark', PAGES.dark)
    expect(readHuePosition(hex).position.saturation).toBeLessThanOrEqual(DARK_SATURATION_CAP + 0.02)
  })

  it('leaves a light colour that already passes where it is', () => {
    const seed = '#b42318'
    expect(checkRoleColor(seed, PAGES.light).passes).toBe(true)
    const { hue } = readHuePosition(seed)
    const solved = roleColorAtHue(seed, hue, 'light', PAGES.light)
    expect(Math.abs(readHuePosition(solved).position.lightness - readHuePosition(seed).position.lightness)).toBeLessThan(0.02)
  })

  it('moves a light colour that fails to the nearest tone that passes', () => {
    const seed = '#ffcc00' // bright yellow: invisible on a white page
    expect(checkRoleColor(seed, PAGES.light).passes).toBe(false)
    const solved = roleColorAtHue(seed, readHuePosition(seed).hue, 'light', PAGES.light)
    expect(checkRoleColor(solved, PAGES.light).passes).toBe(true)
  })
})

describe('Color edition roles — a dark anchor survives other edits', () => {
  it('keeps a status family’s own dark tone when the accent retints the theme', async () => {
    const { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } = await import('../../store/useDesignStore')
    const { applyScopedAccentColor, stateColorAnchor } = await import('../colorActions')
    const { generateColorScale, generateFamilyDarkScale } = await import('../colorUtils')
    useDesignStore.setState({ ...makeDesignDefaults() })
    const s = useDesignStore.getState()
    const fam = (key: string, base: string, darkBase?: string) => s.addCustomColor({
      key, label: key, base, darkBase,
      scale: generateColorScale(base, s.colorAlgorithm, s.contrastShift, s.pageBackground),
      darkScale: generateFamilyDarkScale(darkBase ?? base, s.colorAlgorithm, s.contrastShift, s.darkBackground),
    })
    fam('t-brand', '#2970ff')
    fam('t-warning', '#966e00', '#daab4a')
    s.addTheme('t', 'light', { ...DEFAULT_THEME_SOURCES, brand: 't-brand', warning: 't-warning' })

    expect(applyScopedAccentColor('#15b79e', false, 't')).toBe(true)

    const after = useDesignStore.getState()
    expect(stateColorAnchor(after, 'warning', 'dark', 't').toLowerCase()).toBe('#daab4a')
    expect(stateColorAnchor(after, 'warning', 'light', 't').toLowerCase()).toBe('#966e00')
  })
})
