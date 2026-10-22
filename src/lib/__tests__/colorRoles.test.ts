import { describe, expect, it } from 'vitest'
import { COLOR_ROLE_BAND, DARK_SATURATION_CAP, checkRoleColor, rolePasses, clampToBand, darkTwinOf, harmonizedState, lightTwinOf, roleColorAtHue, solveRoleColor, type StateRoleId } from '../colorRoles'
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
          if (!rolePasses(checkRoleColor(hex, PAGES[appearance]), appearance)) misses.push(`${seed}@${hue} ${appearance} → ${hex}`)
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

  it('moves a light colour that is hard to see on white to the nearest tone that passes', () => {
    // Reported: #5dff75 (1.3:1) and #ffb04a (1.8:1) graded "Good" in Light.
    for (const seed of ['#ffcc00', '#5dff75', '#ffb04a', '#22d3ee', '#beff00', '#e0559a']) {
      expect(checkRoleColor(seed, PAGES.light).passes).toBe(false)
      const solved = roleColorAtHue(seed, readHuePosition(seed).hue, 'light', PAGES.light)
      const c = checkRoleColor(solved, PAGES.light)
      expect(c.passes).toBe(true)
      expect(c.pageWcag).toBeGreaterThanOrEqual(3)
      const d = Math.abs(readHuePosition(solved).hue - readHuePosition(seed).hue)
      expect(Math.min(d, 360 - d)).toBeLessThan(4)
    }
  })

  it('grades the same in Light and Dark — a label alone is not a pass', () => {
    const c = checkRoleColor('#5dff75', PAGES.light)
    expect(c.ink).not.toBe(null)
    expect(rolePasses(c, 'light')).toBe(false)
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

describe('Color edition roles — light and dark are one colour', () => {
  it('gives a light colour a dark twin of the SAME hue, solved for the dark page', () => {
    for (const light of ['#669f2a', '#9522e9', '#ff8a00', '#0e8eff', '#f33f34', '#06aed4']) {
      const dark = darkTwinOf(light, PAGES.dark)
      const d = Math.abs(readHuePosition(light).hue - readHuePosition(dark).hue)
      expect(Math.min(d, 360 - d)).toBeLessThan(3)
      expect(checkRoleColor(dark, PAGES.dark).passes).toBe(true)
    }
  })
})

describe('Color edition roles — a Dark pick reads the same in Light', () => {
  it('gives a dark colour a light twin of the SAME hue that passes on white', () => {
    for (const dark of ['#ffd60a', '#ff79c6', '#51fa7b', '#8be9fd', '#beff00', '#4fbed3']) {
      const light = lightTwinOf(dark, PAGES.light)
      const d = Math.abs(readHuePosition(light).hue - readHuePosition(dark).hue)
      expect(Math.min(d, 360 - d)).toBeLessThan(3)
      expect(rolePasses(checkRoleColor(light, PAGES.light), 'light')).toBe(true)
    }
  })
})

describe('Color edition roles — states follow the accent', () => {
  const STATES: [StateRoleId, string][] = [['success', '#34c759'], ['error', '#ff3b30'], ['warning', '#ff8a00'], ['info', '#01b5fc']]
  const ACCENTS = ['#669f2a', '#9522e9', '#2970ff', '#8a7f6a', '#ff5fa2']

  it('keeps each state on its own hue, clears both themes, and takes the accent’s saturation', () => {
    const misses: string[] = []
    for (const accent of ACCENTS) {
      const accentSat = readHuePosition(accent).position.saturation
      for (const [role, seed] of STATES) {
        const { light, dark } = harmonizedState(role, seed, accent, PAGES)
        for (const [name, hex, page] of [['light', light, PAGES.light], ['dark', dark, PAGES.dark]] as const) {
          if (!rolePasses(checkRoleColor(hex, page), name)) misses.push(`${role} ${name} for ${accent}: ${hex}`)
          const hue = readHuePosition(hex).hue
          if (Math.abs(clampToBand(hue, COLOR_ROLE_BAND[role]) - hue) > 3) misses.push(`${role} ${name} hue ${hue} left its band`)
        }
        expect(Math.abs(readHuePosition(light).position.saturation - accentSat)).toBeLessThan(0.08)
      }
    }
    expect(misses).toEqual([])
  })

  it('tones a vivid red and blue down beside a muted accent', () => {
    const muted = '#8a7f6a'
    for (const [role, seed] of [['error', '#ff3b30'], ['info', '#01b5fc']] as const) {
      const { light } = harmonizedState(role, seed, muted, PAGES)
      expect(readHuePosition(light).position.saturation).toBeLessThan(readHuePosition(seed).position.saturation)
    }
  })
})
