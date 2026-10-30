import { describe, expect, it } from 'vitest'
import chroma from 'chroma-js'
import {
  backgroundFromBase, checkContrast, generateColorScale, generateDarkColorScale,
  generateFamilyDarkScale, readHuePosition,
} from '../colorUtils'
import { projectArchitecture } from '../semanticArchitectures'
import { hueDelta } from '../randomAccent'
import { PALETTE_LEVELS, RADIX_ACCENTS, radixPalette, radixSolid, type RadixPalette } from '../radixPalettes'

function sequence(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

/** Neutral → pages → ramps → Categorical roles, as an adopted theme resolves. */
function resolve(p: RadixPalette) {
  const tint = p.neutralTint
  const pageLight = backgroundFromBase(p.neutral, 'light', tint)
  const pageDark = backgroundFromBase(p.neutral, 'dark', tint)
  const alg = 'radix' as const
  const fam = (hex: string, dark: boolean) => dark
    ? generateFamilyDarkScale(hex, alg, 0, pageDark)
    : generateColorScale(hex, alg, 0, pageLight)
  const st = p.states
  const scales = {
    gray: generateColorScale(p.neutral, alg, 0, pageLight, 'light', tint),
    grayDark: generateDarkColorScale(p.neutral, alg, 0, pageDark, tint),
    brand: fam(p.accent, false), error: fam(st.error, false), warning: fam(st.warning, false),
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
    themePalettes: {}, scales, accent: p.accent,
    pageBackground: pageLight, darkBackground: pageDark,
  }, st.error, {}, ['light', 'dark']) as { tokens: Record<string, Record<string, Record<string, string>>> }
  return (group: string, token: string, mode: 'light' | 'dark') => view.tokens[group]?.[token]?.[mode] ?? ''
}

const DRAWS = PALETTE_LEVELS.flatMap((level) =>
  Array.from({ length: 40 }, (_, i) => radixPalette(level, sequence(i * 7 + 1))))

describe('Radix palettes for Random', () => {
  it('draws every accent from a Radix family solid', () => {
    const solids = new Set(RADIX_ACCENTS.map(radixSolid))
    for (const p of DRAWS) {
      expect(solids.has(p.accent), `${p.level} ${p.accent}`).toBe(true)
      for (const hex of [p.neutral, ...Object.values(p.states)]) expect(chroma.valid(hex)).toBe(true)
    }
  })

  it('keeps every severity on its own hue band', () => {
    const bands: Record<string, [number, number][]> = {
      error: [[0, 45], [340, 360]], warning: [[40, 112]], success: [[118, 200]], info: [[195, 290]],
    }
    for (const p of DRAWS) {
      for (const [role, hex] of Object.entries(p.states)) {
        const h = chroma(hex).oklch()[2]
        expect(bands[role].some(([lo, hi]) => h >= lo - 2 && h <= hi + 2), `${p.level} ${role} ${hex} @ ${h.toFixed(0)}°`).toBe(true)
      }
    }
  })

  it('conservative keeps the canonical severities and a near-neutral page', () => {
    for (const p of DRAWS.filter((d) => d.level === 'conservative')) {
      expect(['pure', 'subtle']).toContain(p.neutralTint)
      expect(p.oppositePage).toBe(false)
    }
  })

  it('bold puts the page on the far side of the wheel from the accent', () => {
    for (const p of DRAWS.filter((d) => d.level === 'bold')) {
      expect(p.oppositePage).toBe(true)
      const page = backgroundFromBase(p.neutral, p.appearance, p.neutralTint)
      expect(hueDelta(readHuePosition(page).hue, readHuePosition(p.accent).hue), `${p.accent} on ${page}`).toBeGreaterThan(90)
    }
  })

  it('clears AA for body text, the primary label and every status solid, both appearances', () => {
    for (const p of DRAWS) {
      const get = resolve(p)
      for (const mode of ['light', 'dark'] as const) {
        const page = get('surface', 'page', mode)
        const body = checkContrast(get('content', 'primary', mode), page)
        expect(body, `${p.level} ${p.accentFamily} ${mode} body`).toBeGreaterThanOrEqual(4.5)
        const fill = get('action', 'primary.default', mode)
        const label = get('content', 'on-action', mode)
        if (fill && label) expect(checkContrast(label, fill), `${p.level} ${p.accentFamily} ${mode} button`).toBeGreaterThanOrEqual(4.5)
        for (const sev of ['critical', 'warning', 'success', 'info']) {
          const solid = get('status', `${sev}.surface-solid`, mode)
          const ink = get('status', `${sev}.on-solid`, mode)
          if (solid && ink) expect(checkContrast(ink, solid), `${p.level} ${mode} ${sev}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('never deals the accent family it avoids, and is deterministic', () => {
    const rng = sequence(11)
    for (let i = 0; i < 200; i++) expect(radixPalette('liberal', rng, 'blue').accentFamily).not.toBe('blue')
    expect(radixPalette('bold', sequence(3))).toEqual(radixPalette('bold', sequence(3)))
  })
})
