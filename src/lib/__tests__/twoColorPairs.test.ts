import { describe, expect, it } from 'vitest'
import chroma from 'chroma-js'
import {
  backgroundFromBase, checkContrast, generateColorScale, generateDarkColorScale,
  generateFamilyDarkScale,
} from '../colorUtils'
import { projectArchitecture } from '../semanticArchitectures'
import { TWO_COLOR_PAIRS, lightAccentOf, pairPalette, pairRoles, type TwoColorPalette } from '../twoColorPairs'
import { checkRoleColor, rolePasses } from '../colorRoles'
import { maxChromaSrgb } from '../color/gamut'
import { hueDelta } from '../randomAccent'


/** Neutral → pages → ramps → Categorical roles, as an adopted theme resolves
 *  — with the accent anchored separately per appearance, as the rail writes it. */
function resolve(p: TwoColorPalette) {
  const tint = p.neutralTint
  const { light: pageLight, dark: pageDark } = p.pages
  const alg = 'radix' as const
  const fam = (hex: string, dark: boolean) => dark
    ? generateFamilyDarkScale(hex, alg, 0, pageDark)
    : generateColorScale(hex, alg, 0, pageLight)
  const st = p.states
  const scales = {
    gray: generateColorScale(p.neutral, alg, 0, pageLight, 'light', tint),
    grayDark: generateDarkColorScale(p.neutral, alg, 0, pageDark, tint),
    brand: fam(p.accentLight, false), error: fam(st.error, false), warning: fam(st.warning, false),
    success: fam(st.success, false), info: fam(st.info, false),
    dark: {
      gray: generateDarkColorScale(p.neutral, alg, 0, pageDark, tint),
      brand: fam(p.accent, true), error: fam(st.error, true), warning: fam(st.warning, true),
      success: fam(st.success, true), info: fam(st.info, true),
    },
  }
  const view = projectArchitecture('categorical', {
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {}, scales, accent: p.accentLight,
    pageBackground: pageLight, darkBackground: pageDark,
  }, st.error, {}, ['light', 'dark']) as { tokens: Record<string, Record<string, Record<string, string>>> }
  return (group: string, token: string, mode: 'light' | 'dark') => view.tokens[group]?.[token]?.[mode] ?? ''
}

const STRENGTHS = ['soft', 'rich'] as const
const PALETTES = TWO_COLOR_PAIRS.flatMap((pair) => STRENGTHS.map((strength) => ({ pair, strength, p: pairPalette(pair, strength) })))
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('Two-colour pairs (Bold)', () => {
  it('has unique ids and valid colours, and no hue-less white accent', () => {
    expect(new Set(TWO_COLOR_PAIRS.map((pair) => pair.id)).size).toBe(TWO_COLOR_PAIRS.length)
    for (const pair of TWO_COLOR_PAIRS) {
      expect(chroma.valid(pair.a) && chroma.valid(pair.b)).toBe(true)
      expect([pair.a, pair.b]).not.toContain('#ffffff')
    }
  })

  it('ONE accent: the lighter colour, verbatim in Dark, on a page seeded by the darker one', () => {
    for (const { pair, p } of PALETTES) {
      const { page, accent } = pairRoles(pair)
      expect(chroma(page).oklch()[0]).toBeLessThanOrEqual(chroma(accent).oklch()[0])
      expect(p.accent).toBe(accent.toLowerCase())
      expect(p.neutral).toBe(page)
    }
  })

  it('Light keeps the accent: same hue, never greyer than the pair chose', () => {
    for (const { pair, p } of PALETTES) {
      const [, c0, h0] = chroma(p.accent).oklch()
      const [l1, c1, h1] = chroma(p.accentLight).oklch()
      if (c0 < 0.02) { expect(c1 || 0, pair.id).toBeLessThan(0.03); continue }
      expect(hueGap(h1, h0), `${pair.id} ${p.accent} → ${p.accentLight}`).toBeLessThan(12)
      // As much of the pair's chroma as sRGB allows at the lightness Light needs
      // (a yellow dark enough to read on white is mustard: its wall is lower).
      expect(c1, `${pair.id} ${p.accent} → ${p.accentLight}`).toBeGreaterThanOrEqual(Math.min(c0, maxChromaSrgb(l1, h1)) * 0.9)
    }
  })

  it('each version passes its own page (Dark 4.5:1, Light visible + labelled)', () => {
    for (const { pair, p } of PALETTES) {
      expect(checkContrast(p.accent, p.pages.dark), `${pair.id} dark`).toBeGreaterThanOrEqual(4.5)
      expect(rolePasses(checkRoleColor(p.accentLight, p.pages.light), 'light'), `${pair.id} light ${p.accentLight}`).toBe(true)
    }
  })

  it('an accent that already passes on the light page is kept as is', () => {
    expect(lightAccentOf('#2563eb', '#ffffff')).toBe('#2563eb')
  })

  it('Rich carries more colour on the dark page than Soft, never less', () => {
    for (const pair of TWO_COLOR_PAIRS) {
      if ((chroma(pairRoles(pair).page).oklch()[1] || 0) < 0.01) continue // a grey page has no colour to deepen
      const soft = chroma(pairPalette(pair, 'soft').pages.dark).oklch()[1] || 0
      const rich = chroma(pairPalette(pair, 'rich').pages.dark).oklch()[1] || 0
      expect(rich, pair.id).toBeGreaterThanOrEqual(soft)
    }
  })

  it('the soft light page is an off-white and every dark page keeps the pair\'s hue', () => {
    for (const { pair, strength, p } of PALETTES) {
      if (strength === 'soft') {
        const [l, c] = chroma(p.pages.light).oklch()
        expect(l, pair.id).toBeGreaterThanOrEqual(0.978)
        expect(c || 0, pair.id).toBeLessThanOrEqual(0.02)
      }
      const [, sc, sh] = chroma(p.neutral).oklch()
      if (sc < 0.03) continue
      expect(hueGap(chroma(p.pages.dark).oklch()[2], sh), pair.id).toBeLessThan(15)
    }
  })

  it('clears AA for body text, the primary label and every status solid, both appearances', () => {
    for (const { pair, strength, p } of PALETTES) {
      const get = resolve(p)
      for (const mode of ['light', 'dark'] as const) {
        const tag = `${pair.id} ${strength} ${mode}`
        const page = get('surface', 'page', mode)
        expect(checkContrast(get('content', 'primary', mode), page), `${tag} body`).toBeGreaterThanOrEqual(4.5)
        const fill = get('action', 'primary.default', mode)
        const label = get('content', 'on-action', mode)
        if (fill && label) expect(checkContrast(label, fill), `${tag} button`).toBeGreaterThanOrEqual(4.5)
        for (const sev of ['critical', 'warning', 'success', 'info']) {
          const solid = get('status', `${sev}.surface-solid`, mode)
          const ink = get('status', `${sev}.on-solid`, mode)
          if (solid && ink) expect(checkContrast(ink, solid), `${tag} ${sev}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})
