import { describe, expect, it } from 'vitest'
import chroma from 'chroma-js'
import {
  backgroundFromBase, checkContrast, generateColorScale, generateDarkColorScale,
  generateFamilyDarkScale, readHuePosition,
} from '../colorUtils'
import { projectArchitecture } from '../semanticArchitectures'
import { hueDelta } from '../randomAccent'
import {
  CURATED_MOODS, DAISY_MOOD_SPECS, PROCEDURAL_MOOD_ID, curatedMood, moodFromSpec,
  pickMood, proceduralMoodSpec, type ThemeMood,
} from '../themeMoods'

function sequence(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

/** Project a mood the way an adopted theme is: neutral → pages → ramps →
 *  Categorical roles, every ink solved by Escala. */
function resolve(mood: ThemeMood) {
  const tint = mood.neutralTint
  const pageLight = backgroundFromBase(mood.neutral, 'light', tint)
  const pageDark = backgroundFromBase(mood.neutral, 'dark', tint)
  const alg = 'radix' as const
  const fam = (hex: string, dark: boolean) => dark
    ? generateFamilyDarkScale(hex, alg, 0, pageDark)
    : generateColorScale(hex, alg, 0, pageLight)
  const st = mood.states
  const scales = {
    gray: generateColorScale(mood.neutral, alg, 0, pageLight, 'light', tint),
    grayDark: generateDarkColorScale(mood.neutral, alg, 0, pageDark, tint),
    brand: fam(mood.accent, false), error: fam(st.error, false), warning: fam(st.warning, false),
    success: fam(st.success, false), info: fam(st.info, false),
    dark: {
      gray: generateDarkColorScale(mood.neutral, alg, 0, pageDark, tint),
      brand: fam(mood.accent, true), error: fam(st.error, true), warning: fam(st.warning, true),
      success: fam(st.success, true), info: fam(st.info, true),
    },
  }
  const view = projectArchitecture('categorical', {
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {}, scales, accent: mood.accent,
    pageBackground: pageLight, darkBackground: pageDark,
  }, st.error, {}, ['light', 'dark']) as {
    tokens: Record<string, Record<string, Record<string, string>>>
  }
  return (group: string, token: string, mode: 'light' | 'dark') => view.tokens[group]?.[token]?.[mode] ?? ''
}

const PROCEDURAL = Array.from({ length: 40 }, (_, i) => moodFromSpec(`p${i}`, proceduralMoodSpec(sequence(i + 1))))
const ALL = [...CURATED_MOODS, ...PROCEDURAL]

describe('theme moods', () => {
  it('maps every DaisyUI spec onto a mood', () => {
    expect(CURATED_MOODS).toHaveLength(Object.keys(DAISY_MOOD_SPECS).length)
    for (const mood of ALL) {
      for (const hex of [mood.accent, mood.neutral, ...Object.values(mood.states)]) {
        expect(chroma.valid(hex), `${mood.id}: ${hex}`).toBe(true)
      }
    }
  })

  // The hue IS the semantics: DaisyUI's cmyk ships a magenta success and nord a
  // pink info. Those fall back to the conventional severity.
  it('keeps every severity on its own hue', () => {
    const bands: Record<string, [number, number][]> = {
      error: [[0, 45], [340, 360]], warning: [[40, 112]], success: [[118, 200]], info: [[195, 290]],
    }
    for (const mood of ALL) {
      for (const [role, hex] of Object.entries(mood.states)) {
        const h = chroma(hex).oklch()[2]
        expect(bands[role].some(([lo, hi]) => h >= lo - 2 && h <= hi + 2), `${mood.id} ${role} ${hex} @ ${h.toFixed(0)}°`).toBe(true)
      }
    }
    expect(curatedMood('cmyk')!.states.success).toBe('#079455')
    expect(curatedMood('nord')!.states.info).toBe('#1570ef')
  })

  // The defect that started this: Random's page was always a tint of the
  // accent. Abyss is a teal page under a lime primary.
  it('gives the page its own hue, independent of the accent', () => {
    const abyss = curatedMood('abyss')!
    expect(abyss.neutralTint).toBe('vivid')
    const page = backgroundFromBase(abyss.neutral, 'dark', abyss.neutralTint)
    expect(hueDelta(readHuePosition(page).hue, readHuePosition(abyss.accent).hue)).toBeGreaterThan(60)
    expect(chroma(page).oklch()[1]).toBeGreaterThan(0.03)
    const synth = curatedMood('synthwave')!
    expect(hueDelta(readHuePosition(synth.neutral).hue, readHuePosition(synth.accent).hue)).toBeGreaterThan(60)
  })

  it('keeps a white DaisyUI page pure and a cream one barely tinted', () => {
    expect(curatedMood('corporate')!.neutralTint).toBe('pure')
    expect(curatedMood('cupcake')!.neutralTint).toBe('subtle')
    expect(curatedMood('nord')!.neutralTint).toBe('tinted')
  })

  // Every mood still goes through Escala's solvers, so the pairs a person reads
  // clear AA in BOTH appearances — whichever one the mood was designed in.
  it('clears AA for body text and the primary button label in both appearances', () => {
    for (const mood of ALL) {
      const get = resolve(mood)
      for (const mode of ['light', 'dark'] as const) {
        const page = get('surface', 'page', mode)
        const body = checkContrast(get('content', 'primary', mode), page)
        expect(body, `${mood.id} ${mode} body ${body.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
        const fill = get('action', 'primary', mode) || get('action', 'primary.default', mode)
        const label = get('content', 'on-action', mode)
        if (fill && label) {
          const ratio = checkContrast(label, fill)
          expect(ratio, `${mood.id} ${mode} button ${label} on ${fill}`).toBeGreaterThanOrEqual(4.5)
        }
        for (const sev of ['critical', 'warning', 'success', 'info']) {
          const solid = get('status', `${sev}.surface-solid`, mode)
          const ink = get('status', `${sev}.on-solid`, mode)
          if (!solid || !ink) continue
          const r = checkContrast(ink, solid)
          expect(r, `${mood.id} ${mode} ${sev} on-solid ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('draws curated most of the time and never repeats the mood it avoids', () => {
    const rng = sequence(9)
    let curated = 0
    for (let i = 0; i < 400; i++) {
      const mood = pickMood(rng, 'abyss')
      expect(mood.id).not.toBe('abyss')
      if (mood.id !== PROCEDURAL_MOOD_ID) curated++
    }
    expect(curated / 400).toBeGreaterThan(0.65)
    expect(curated / 400).toBeLessThan(0.85)
  })

  it('is deterministic for a given rng', () => {
    expect(pickMood(sequence(3))).toEqual(pickMood(sequence(3)))
    expect(proceduralMoodSpec(sequence(5))).toEqual(proceduralMoodSpec(sequence(5)))
  })
})
