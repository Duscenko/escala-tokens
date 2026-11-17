import { describe, expect, it } from 'vitest'
import { CURATED_COLORS, curatedPalette } from '../curatedColors'
import { checkRoleColor, rolePasses } from '../colorRoles'
import { hexToOklch } from '../color/gamut'

describe('curated colours (Create UI + HeroUI)', () => {
  it('ships Create UI’s eight and HeroUI’s sixteen, interleaved, all distinct', () => {
    expect(CURATED_COLORS.filter((c) => c.source === 'createui')).toHaveLength(8)
    expect(CURATED_COLORS.filter((c) => c.source === 'heroui')).toHaveLength(16)
    // Dealt one vivid, two soft: C H H C H H …
    expect(CURATED_COLORS.slice(0, 6).map((c) => c.source)).toEqual(['createui', 'heroui', 'heroui', 'createui', 'heroui', 'heroui'])
    expect(new Set(CURATED_COLORS.map((c) => c.id)).size).toBe(24)
    expect(new Set(CURATED_COLORS.map((c) => c.hex)).size).toBe(24)
    expect(new Set(CURATED_COLORS.map((c) => c.name)).size).toBe(24)
  })

  it('Create UI pairs read on zinc with Create UI’s own severities', () => {
    for (const c of CURATED_COLORS.filter((x) => x.source === 'createui')) {
      const p = curatedPalette(c)
      expect(p.neutral).toBe('#71717b')
      expect(p.states.error).toBe('#e7000b')
      expect(c.dark).toBeTruthy()
    }
  })

  it('every accent passes Escala’s role rule in Light AND Dark', () => {
    for (const c of CURATED_COLORS) {
      const p = curatedPalette(c)
      expect(rolePasses(checkRoleColor(p.accent, p.pages.dark), 'dark'), `${c.name} dark`).toBe(true)
      expect(rolePasses(checkRoleColor(p.accentLight, p.pages.light), 'light'), `${c.name} light`).toBe(true)
    }
  })

  it('keeps the accent verbatim wherever it already passes, and its hue everywhere', () => {
    for (const c of CURATED_COLORS) {
      const p = curatedPalette(c)
      const dark = (c.dark ?? c.hex).toLowerCase()
      if (rolePasses(checkRoleColor(dark, p.pages.dark), 'dark')) expect(p.accent).toBe(dark)
      if (rolePasses(checkRoleColor(c.hex, p.pages.light), 'light')) expect(p.accentLight).toBe(c.hex.toLowerCase())
      const h0 = hexToOklch(c.hex).h
      for (const v of [p.accent, p.accentLight]) {
        const d = Math.abs(((hexToOklch(v).h - h0 + 540) % 360) - 180)
        expect(d, `${c.name} ${v}`).toBeLessThan(12)
      }
    }
  })

  it('pages are near-neutral, like HeroUI’s', () => {
    for (const c of CURATED_COLORS) {
      const { pages } = curatedPalette(c)
      expect(hexToOklch(pages.light).c).toBeLessThan(0.012)
      expect(hexToOklch(pages.dark).c).toBeLessThan(0.025)
    }
  })
})
