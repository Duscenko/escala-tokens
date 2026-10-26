import { describe, expect, it } from 'vitest'
import { COLOR_ROLE_BAND, DARK_MIN_SATURATION, DARK_PAGE_WCAG, checkRoleColor, rolePasses, clampToBand, darkTwinOf, harmonizedState, highChromaDark, lightTwinOf, roleColorAtHue, solveRoleColor, type StateRoleId } from '../colorRoles'
import { readHuePosition } from '../colorUtils'
import { wcagRatio } from '../color/apca'
import chroma from 'chroma-js'

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

  it('is HIGH CHROMA in dark: HSL hue held, saturation ≥ 85%, lightness only as high as 4.5:1 needs', () => {
    for (const page of ['#121212', '#1e1e1e', PAGES.dark]) {
      for (const light of ['#2970ff', '#9522e9', '#f33f34', '#d92d20', '#0e8eff', '#7a5af8', '#008189']) {
        const dark = highChromaDark(light, page)
        const [h0] = chroma(light).hsl()
        const [h1, s1, l1] = chroma(dark).hsl()
        const dh = Math.abs(h1 - h0)
        expect(Math.min(dh, 360 - dh)).toBeLessThanOrEqual(3)
        expect(s1).toBeGreaterThanOrEqual(DARK_MIN_SATURATION - 0.01)
        expect(wcagRatio(dark, page)).toBeGreaterThanOrEqual(DARK_PAGE_WCAG)
        // Strictly necessary: a clearly dimmer tone at the same hue/saturation
        // fails (4.5:1 on the page, or a 4.5:1 label on the fill).
        const dimmer = chroma.hsl(h1, s1, l1 - 0.02).hex()
        if (l1 - 0.02 > chroma(light).hsl()[2]) expect(rolePasses(checkRoleColor(dimmer, page), 'dark')).toBe(false)
        expect(l1).toBeLessThan(0.75)
      }
    }
  })

  it('never lowers saturation in dark, and leaves a neutral grey grey', () => {
    expect(chroma(highChromaDark('#2970ff', '#121212')).hsl()[1]).toBeGreaterThanOrEqual(0.99)
    expect(chroma(highChromaDark('#6c727f', '#121212')).hsl()[1]).toBeLessThan(0.2)
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
      expect(Math.min(d, 360 - d)).toBeLessThan(4)
      expect(rolePasses(checkRoleColor(dark, PAGES.dark), 'dark')).toBe(true)
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
