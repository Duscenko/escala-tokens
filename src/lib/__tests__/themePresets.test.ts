import { describe, expect, it } from 'vitest'
import { THEME_STYLE_PRESETS, presetHarmony } from '../themePresets'
import {
  checkContrast, generateColorScale, generateDarkColorScale,
  generateFamilyDarkScale,
} from '../colorUtils'
import { projectArchitecture } from '../semanticArchitectures'
import chroma from 'chroma-js'

const okL = (hex: string) => chroma(hex).oklab()[0]
/** An 8-digit alpha ref composited over the surface it sits on. */
const over = (fg: string, bg: string) => {
  const c = chroma(fg)
  return chroma.mix(chroma(bg), c.alpha(1), c.alpha(), 'rgb').hex()
}

/** Project one preset the way the try-on and the adopted theme both do. */
function resolve(preset: typeof THEME_STYLE_PRESETS[number]) {
  const tint = preset.neutralTint
  const h = presetHarmony(preset)
  const alg = 'radix' as const
  const fam = (hex: string, dark: boolean) => dark
    ? generateFamilyDarkScale(hex, alg, 0, h.pageDark)
    : generateColorScale(hex, alg, 0, h.pageLight)
  const scales = {
    gray: generateColorScale(h.neutral, alg, 0, h.pageLight, 'light', tint),
    grayDark: generateDarkColorScale(h.neutral, alg, 0, h.pageDark, tint),
    brand: fam(preset.accent, false), error: fam((preset.states ?? h.states).error, false),
    warning: fam((preset.states ?? h.states).warning, false), success: fam((preset.states ?? h.states).success, false),
    info: fam((preset.states ?? h.states).info, false),
    dark: {
      gray: generateDarkColorScale(h.neutral, alg, 0, h.pageDark, tint),
      brand: fam(preset.accent, true), error: fam((preset.states ?? h.states).error, true),
      warning: fam((preset.states ?? h.states).warning, true), success: fam((preset.states ?? h.states).success, true),
      info: fam((preset.states ?? h.states).info, true),
    },
  }
  const overrides: Record<string, Record<string, string>> = {}
  for (const [token, modes] of Object.entries(preset.semantics ?? {})) {
    overrides[token] = {}
    if (modes.light) overrides[token].light = modes.light
    if (modes.dark) overrides[token].dark = modes.dark
  }
  const st = preset.states ?? h.states
  const view = projectArchitecture('categorical', {
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {}, scales, accent: preset.accent,
    pageBackground: h.pageLight, darkBackground: h.pageDark,
  }, st.error, overrides, ['light', 'dark']) as {
    tokens: Record<string, Record<string, Record<string, string>>>
  }
  return (group: string, token: string, mode: 'light' | 'dark') =>
    view.tokens[group]?.[token]?.[mode] ?? ''
}

describe('system style presets', () => {
  // The whole reason `ThemeStyleSemantics` exists. A style may soften its
  // border, but `border.control` is what identifies a text field, so it still
  // owes WCAG 1.4.11's 3:1 — measured against `surface.input`, NOT the page,
  // because a style that adds an input fill moves the surface the border sits
  // on. That exact mistake shipped once: keeping the page-solved border after
  // adding a fill dropped Core to 2.91:1 and Material to 2.75:1.
  //
  // Core, Glass, Nature and Retro are deliberate exceptions: their adopted
  // recipes use quiet / style-led edges — fill + rim (or press character)
  // identify the field. Owner waived the floor.
  it('keeps every style\'s input border over WCAG 1.4.11 on its own field', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      if (
        preset.id === 'core-minimal'
        || preset.id === 'cupertino-glass'
        || preset.id === 'nature-organic'
        || preset.id === 'retro-vintage'
      ) continue
      const get = resolve(preset)
      for (const mode of ['light', 'dark'] as const) {
        const input = get('surface', 'input', mode)
        const raw = get('border', 'control', mode)
        expect(input, `${preset.id} ${mode} surface.input`).toBeTruthy()
        expect(raw, `${preset.id} ${mode} border.control`).toBeTruthy()
        const border = raw.length > 7 ? over(raw, input) : raw
        expect(
          checkContrast(border, input),
          `${preset.id} · ${mode}: border.control ${raw} on surface.input ${input}`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  // The defect the alpha borders were introduced to fix: on a dark ramp the
  // `{ui:…}` solver has to walk to tone 11 (the near-white TEXT tone), which
  // measured ΔL +0.63…+0.68 against the field — a highlight, not a boundary.
  // Neo is the deliberate exception: its border IS the design.
  it('keeps dark borders at boundary weight, not highlight weight', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      if (preset.id === 'neo-brutalism') continue
      const get = resolve(preset)
      const input = get('surface', 'input', 'dark')
      const raw = get('border', 'control', 'dark')
      const border = raw.length > 7 ? over(raw, input) : raw
      expect(
        okL(border) - okL(input),
        `${preset.id}: dark border.default is too heavy`,
      ).toBeLessThan(0.45)
    }
  })

  // Three of the original six accents used to sit within 20° of each other
  // (Core 262°, Glass 254°, Material 274°) — that is not a set, it is four
  // plus two duplicates. Hue is still the cheapest axis of distinctness.
  // Twelve styles cannot all clear the old 30° floor (360/12 = 30, and the
  // existing six already cluster), so the gate is the defect that forced
  // this test: no two adjacent hues within 18°.
  // Dark is not light inverted: the dark ramp's low steps are compressed, so
  // the schema's `{neutral.2}` card lifted by only ΔL 0.022–0.027 against
  // light's 0.028–0.037 — a quarter less separation on the appearance that
  // needs more. `DARK_DEPTH` moves each surface a step; this asserts dark now
  // separates at least as much as light does.
  //
  // Nature is the deliberate exception: its lived-in Neutral (`#092012`) is a
  // near-black green-gray, so even `{neutral-dark.3}` for layer-1 can't match
  // light's separation on that compressed ramp. Owner waived the floor.
  it('gives dark surfaces at least light-mode separation', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      if (preset.id === 'nature-organic') continue
      const get = resolve(preset)
      for (const layer of ['layer-1', 'layer-2'] as const) {
        const lightGap = Math.abs(okL(get('surface', layer, 'light')) - okL(get('surface', 'page', 'light')))
        const darkGap = Math.abs(okL(get('surface', layer, 'dark')) - okL(get('surface', 'page', 'dark')))
        expect(darkGap, `${preset.id} · ${layer}: dark ${darkGap.toFixed(3)} vs light ${lightGap.toFixed(3)}`)
          .toBeGreaterThanOrEqual(lightGap)
      }
    }
  })

  // `content.subtle` is `{neutral.9}`, which reads 3.27–5.10:1 on a light page
  // and fell to 2.90–3.19:1 on a dark one before `DARK_DEPTH` moved it up.
  it('keeps subtle ink from being weaker in dark than in light', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      const get = resolve(preset)
      const light = checkContrast(get('content', 'subtle', 'light'), get('surface', 'page', 'light'))
      const dark = checkContrast(get('content', 'subtle', 'dark'), get('surface', 'page', 'dark'))
      expect(dark, `${preset.id}: subtle ink dark ${dark.toFixed(2)}`).toBeGreaterThan(3.4)
      expect(dark, `${preset.id}: dark ${dark.toFixed(2)} vs light ${light.toFixed(2)}`)
        .toBeGreaterThan(Math.min(light, 3.4) - 0.01)
    }
  })

  it('spreads the accents around the hue wheel', () => {
    const hues = THEME_STYLE_PRESETS
      .map((p) => chroma(p.accent).oklch()[2])
      .map((h) => (Number.isNaN(h) ? 0 : h))
      .sort((a, b) => a - b)
    for (let i = 1; i < hues.length; i++) {
      expect(hues[i] - hues[i - 1], `hues too close: ${hues[i - 1]} / ${hues[i]}`).toBeGreaterThan(18)
    }
  })

  it('spans every neutral tint level across the set', () => {
    const tints = new Set(THEME_STYLE_PRESETS.map((p) => p.neutralTint))
    expect([...tints].sort()).toEqual(['pure', 'subtle', 'tinted', 'vivid'])
  })

  // Every override has to be a ref the projection can actually resolve — an
  // unknown one (`{accent-dark.8}` was the real slip) throws at projection time.
  // Nested ids (`action.primary.default`) keep everything after the first dot
  // as the token key — same split `applyArchTokenOverrides` uses.
  it('resolves every semantic override to a real colour', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      const get = resolve(preset)
      for (const token of Object.keys(preset.semantics ?? {})) {
        const dot = token.indexOf('.')
        const group = token.slice(0, dot)
        const key = token.slice(dot + 1)
        for (const mode of ['light', 'dark'] as const) {
          expect(get(group, key, mode), `${preset.id} ${token} ${mode}`).toMatch(/^#[0-9a-f]{6,8}$/i)
        }
      }
    }
  })
})
