import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import * as CarbonColors from '@carbon/colors'
import * as CarbonThemes from '@carbon/themes'
import {
  carbonFamily, carbonBackground, carbonToken, resolveLayer, carbonSurfaceStack,
  isDarkCarbonTheme, deriveCarbonScale, MAX_LAYER_DEPTH,
  resolveCarbonInk, isCarbonAlphaToken,
  CARBON_STOPS, CARBON_THEME_NAMES, CARBON_FAMILY_NAMES,
  type LayerDepth,
} from '../color/carbon'
import {
  CARBON_COLORS_VERSION, CARBON_THEMES_VERSION, CARBON_TOKENS, CARBON_CORE_TOKEN_COUNT,
} from '../color/carbonReference'
import { hexToOklch, deltaEOK, oklchToOklab } from '../color/gamut'
import { wcagRatio, apcaLc } from '../color/apca'
import { buildArchitectureView, CARBON_GROUP_META } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'

const root = resolve(__dirname, '../../..')
const colors = CarbonColors as unknown as Record<string, Record<number, string>>
const themes = CarbonThemes as unknown as Record<string, Record<string, string>>

describe('the palette IS Carbon', () => {
  it('every family and stop equals @carbon/colors', () => {
    let checked = 0
    for (const family of CARBON_FAMILY_NAMES) {
      const ours = carbonFamily(family)
      for (const stop of CARBON_STOPS) {
        expect(ours[stop], `${family}.${stop}`).toBe(colors[family][stop].toLowerCase())
        checked++
      }
    }
    expect(checked).toBe(CARBON_FAMILY_NAMES.length * CARBON_STOPS.length)
  })

  it('every layer token equals @carbon/themes', () => {
    for (const theme of CARBON_THEME_NAMES) {
      expect(carbonBackground(theme), `${theme}.background`).toBe(themes[theme].background.toLowerCase())
      for (const depth of [1, 2, 3] as LayerDepth[]) {
        expect(resolveLayer(theme, 'layer', depth), `${theme}.layer0${depth}`)
          .toBe(themes[theme][`layer0${depth}`].toLowerCase())
        expect(resolveLayer(theme, 'field', depth), `${theme}.field0${depth}`)
          .toBe(themes[theme][`field0${depth}`].toLowerCase())
      }
      for (const depth of [0, 1, 2, 3] as LayerDepth[]) {
        expect(resolveLayer(theme, 'borderSubtle', depth), `${theme}.borderSubtle0${depth}`)
          .toBe(themes[theme][`borderSubtle0${depth}`].toLowerCase())
      }
    }
  })

  it('the generated table is current', () => {
    const v = (p: string) => (JSON.parse(
      readFileSync(resolve(root, `node_modules/${p}/package.json`), 'utf8'),
    ) as { version: string }).version
    expect(CARBON_COLORS_VERSION).toBe(v('@carbon/colors'))
    expect(CARBON_THEMES_VERSION).toBe(v('@carbon/themes'))
  })

  it('regenerating produces the committed file byte-for-byte', () => {
    const path = resolve(root, 'src/lib/color/carbonReference.ts')
    const before = readFileSync(path, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-carbon-reference.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(path, 'utf8')).toBe(before)
  }, 60_000)
})

describe('the layer model — the reason Carbon is here', () => {
  it('light themes ALTERNATE, dark themes ascend', () => {
    // The finding this whole module is documented around. Encoding
    // "each layer is lighter than the last" would be wrong for half the themes.
    const lightness = (theme: (typeof CARBON_THEME_NAMES)[number]) =>
      carbonSurfaceStack(theme).map((hex) => hexToOklch(hex).l)

    for (const theme of ['white', 'g10'] as const) {
      const ls = lightness(theme)
      // Alternating: the sign of the step flips at least once.
      const signs = ls.slice(1).map((l, i) => Math.sign(l - ls[i]))
      expect(new Set(signs).size, `${theme} should alternate, got ${ls.join(' ')}`).toBeGreaterThan(1)
    }

    for (const theme of ['g90', 'g100'] as const) {
      const ls = lightness(theme)
      for (let i = 1; i < ls.length; i++) {
        expect(ls[i], `${theme} layer ${i} should be lighter than ${i - 1}`).toBeGreaterThan(ls[i - 1])
      }
    }
  })

  it('every adjacent pair of surfaces is DISTINGUISHABLE — the real invariant', () => {
    // Not "lighter", which is false for light themes. Distinguishable.
    for (const theme of CARBON_THEME_NAMES) {
      const stack = carbonSurfaceStack(theme)
      for (let i = 1; i < stack.length; i++) {
        expect(stack[i], `${theme}: layer ${i} equals layer ${i - 1}`).not.toBe(stack[i - 1])
        const d = deltaEOK(oklchToOklab(hexToOklch(stack[i])), oklchToOklab(hexToOklch(stack[i - 1])))
        expect(d, `${theme}: layers ${i - 1}→${i} only ΔE ${d.toFixed(4)} apart`).toBeGreaterThan(0.01)
      }
    }
  })

  it('primary text is readable on EVERY surface in the stack', () => {
    // The thing the layer model makes checkable and the flat architectures
    // cannot express: a component does not know which surface it landed on, so
    // the text token has to clear all four.
    for (const theme of CARBON_THEME_NAMES) {
      const text = carbonToken(theme, 'textPrimary')!
      for (const [depth, surface] of carbonSurfaceStack(theme).entries()) {
        expect(wcagRatio(text, surface), `${theme} textPrimary on depth ${depth}`)
          .toBeGreaterThanOrEqual(4.5)
        expect(Math.abs(apcaLc(text, surface)), `${theme} textPrimary on depth ${depth} (APCA)`)
          .toBeGreaterThanOrEqual(60)
      }
    }
  })

  it('MEASURED: the deepest layer runs out of contrast headroom', () => {
    // A real property of IBM's shipped tokens, not a defect of this port — and
    // the clearest argument for auditing the layer model at all.
    //
    // Each layer lifts the surface toward the text, so by depth 3 the gap has
    // narrowed. `textPrimary` survives everywhere; the softer text tokens do
    // not. Measured (WCAG, AA = 4.5):
    //
    //   g90  textSecondary  d0 8.86  d1 6.76  d2 4.57  d3 2.94  ✗
    //   g90  textHelper     d0 8.86  d1 6.76  d2 4.57  d3 2.94  ✗
    //   g100 textHelper     d0 7.61  d1 6.36  d2 4.86  d3 3.29  ✗
    //
    // Pinned rather than asserted-away: if IBM changes these values, this test
    // fails and we find out, instead of a silent drift in either direction.
    const failures: string[] = []
    for (const theme of CARBON_THEME_NAMES) {
      for (const token of ['textSecondary', 'textHelper'] as const) {
        carbonSurfaceStack(theme).forEach((surface, depth) => {
          const ink = resolveCarbonInk(theme, token, surface)
          if (!ink) return
          if (wcagRatio(ink, surface) < 4.5) failures.push(`${theme}/${token}@${depth}`)
        })
      }
    }
    expect(failures.sort()).toEqual([
      'g100/textHelper@3',
      'g90/textHelper@3',
      'g90/textSecondary@3',
    ])
  })

  it('WCAG overrates Carbon\'s dark themes, the same as everywhere else', () => {
    // g90 textSecondary at depth 0 is WCAG 8.86 — comfortably AAA — and Lc 69,
    // below the 75 body text needs. The dual metric earns its keep here too.
    const surface = carbonSurfaceStack('g90')[0]
    const ink = resolveCarbonInk('g90', 'textSecondary', surface)!
    expect(wcagRatio(ink, surface)).toBeGreaterThan(7)
    expect(Math.abs(apcaLc(ink, surface))).toBeLessThan(75)
  })

  it('composites alpha tokens instead of choking on them', () => {
    // 25 of 235 tokens are `rgba(...)`, including textPlaceholder and overlay.
    for (const theme of CARBON_THEME_NAMES) {
      const raw = carbonToken(theme, 'textPlaceholder')!
      expect(isCarbonAlphaToken(raw)).toBe(true)
      const surface = carbonBackground(theme)
      const ink = resolveCarbonInk(theme, 'textPlaceholder', surface)!
      expect(ink).toMatch(/^#[0-9a-f]{6}$/)
      // Compositing 40% ink over the page must land between the two.
      const l = hexToOklch(ink).l
      const pageL = hexToOklch(surface).l
      expect(Math.abs(l - pageL)).toBeGreaterThan(0.05)
    }
  })

  it('depth 0 and depth 1 agree for groups that start at layer 01', () => {
    // Carbon's own behaviour: an unwrapped component IS a layer-01 component.
    for (const theme of CARBON_THEME_NAMES) {
      expect(resolveLayer(theme, 'layer', 0)).toBe(resolveLayer(theme, 'layer', 1))
      expect(resolveLayer(theme, 'field', 0)).toBe(resolveLayer(theme, 'field', 1))
    }
  })

  it('borderSubtle is the one group with a real depth 0', () => {
    for (const theme of CARBON_THEME_NAMES) {
      expect(resolveLayer(theme, 'borderSubtle', 0))
        .not.toBe(resolveLayer(theme, 'borderSubtle', 1))
    }
  })

  it('clamps runaway nesting instead of throwing', () => {
    // A nesting bug should degrade to a valid colour, not crash a render.
    for (const theme of CARBON_THEME_NAMES) {
      expect(resolveLayer(theme, 'layer', 9 as LayerDepth))
        .toBe(resolveLayer(theme, 'layer', MAX_LAYER_DEPTH))
      expect(resolveLayer(theme, 'layer', -2 as LayerDepth)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('classifies the four themes by page lightness', () => {
    expect(CARBON_THEME_NAMES.map(isDarkCarbonTheme)).toEqual([false, false, true, true])
  })
})

describe('derivation — and its provenance', () => {
  it('returns Carbon verbatim when the seed is a Carbon colour', () => {
    const d = deriveCarbonScale(carbonFamily('blue')[60]) // IBM Blue
    expect(d.provenance).toBe('carbon')
    expect(d.nearestFamily).toBe('blue')
    expect(d.scale).toEqual(carbonFamily('blue'))
  })

  it('marks a non-Carbon seed as escala-derived', () => {
    const d = deriveCarbonScale('#7f56d9')
    expect(d.provenance).toBe('escala-derived')
    expect(d.scale).not.toEqual(carbonFamily(d.nearestFamily))
  })

  it('anchors the seed chroma at stop 60, where Carbon puts identity', () => {
    for (const seed of ['#7f56d9', '#0d9488', '#d97706']) {
      const d = deriveCarbonScale(seed)
      expect(d.oklch[60].c, seed).toBeCloseTo(hexToOklch(seed).c, 10)
      expect(d.oklch[60].h, seed).toBe(hexToOklch(seed).h)
    }
  })

  it('keeps Carbon\'s lightness curve exactly, 10 stops', () => {
    const d = deriveCarbonScale('#7f56d9')
    const family = carbonFamily(d.nearestFamily)
    expect(Object.keys(d.scale).map(Number).sort((a, b) => a - b)).toEqual([...CARBON_STOPS])
    for (const stop of CARBON_STOPS) {
      expect(d.oklch[stop].l, `stop ${stop}`).toBeCloseTo(hexToOklch(family[stop]).l, 10)
    }
  })

  it('survives an achromatic seed', () => {
    const d = deriveCarbonScale('#808080')
    expect(CARBON_STOPS.every((s) => /^#[0-9a-f]{6}$/.test(d.scale[s]))).toBe(true)
  })
})

// ── The Carbon SEMANTIC ARCHITECTURE ────────────────────────────────────────
// The port above proves the palette and themes are IBM's. This proves the
// architecture Escala ships behaves like Carbon's — four themes instead of
// light/dark, and surfaces that resolve by depth.

describe('the Carbon architecture ships Carbon\'s contract', () => {
  const system = buildSystem('violet/radix', '#7f56d9', 'radix')
  const view = buildArchitectureView('carbon', {
    themes: {}, themeKinds: {}, themePalettes: {},
    scales: system.scales, accent: system.accent,
  } as never, system.errorSeed)!

  const token = (key: string, mode: string) => {
    for (const c of view.categories) for (const t of c.tokens) if (t.key === key) return t.modes[mode]?.css
    return undefined
  }
  const stack = (mode: string) =>
    ['background', 'layer-01', 'layer-02', 'layer-03'].map((k) => token(k, mode)!)

  it('exposes Carbon\'s four themes, not light/dark', () => {
    expect(view.modeKeys).toEqual(['white', 'g10', 'g90', 'g100'])
  })

  const keys = view.categories.flatMap((c) => c.tokens.map((t) => t.key))

  it('ships IBM\'s ENTIRE core token list — not a hand-picked subset', () => {
    // The guard that makes the architecture generated rather than curated. The
    // expected set is read straight out of the reference table, so adding a
    // token to Carbon and regenerating is enough; forgetting to project one is
    // a failure here rather than a gap a user discovers.
    //
    // This started as 42 hand-written tokens. The 61 that were missing were
    // invisible until this assertion existed.
    const ibm = Object.keys(CARBON_TOKENS.white).sort()
    expect(keys.slice().sort()).toEqual(ibm)
    expect(keys).toHaveLength(CARBON_CORE_TOKEN_COUNT)
  })

  it('uses Carbon\'s own token names, kebab-cased for export', () => {
    for (const expected of [
      'layer-01', 'layer-02', 'layer-03', 'field-01',
      'border-subtle-00', 'border-subtle-01', 'border-strong-01',
      'text-primary', 'text-on-color', 'icon-primary', 'support-error',
      // The families the 42-token version omitted entirely.
      'layer-active-01', 'layer-selected-01', 'field-hover-01',
      'link-secondary', 'link-visited', 'focus-inverse',
      'support-error-inverse', 'toggle-off', 'skeleton-element',
    ]) {
      expect(keys, `missing Carbon token "${expected}"`).toContain(expected)
    }
  })

  it('every token lands in a group that has a label', () => {
    for (const c of view.categories) {
      expect(CARBON_GROUP_META[c.key], `group "${c.key}" has no meta`).toBeTruthy()
      expect(c.label).not.toBe(c.key)
    }
  })

  it('resolves every token, in every theme, to a real colour', () => {
    for (const c of view.categories) {
      for (const t of c.tokens) {
        for (const mode of view.modeKeys) {
          expect(t.modes[mode]?.css, `${c.key}.${t.key} @ ${mode}`).toMatch(/^#[0-9a-f]{6}$/i)
        }
      }
    }
  })

  it('separates INFO from the brand, which Carbon does not have to', () => {
    // IBM's brand IS blue, so `supportInfo` and `linkPrimary` are both blue
    // stops. Escala carries `accent` and `info` as different families, and
    // folding them would make every info token brand-coloured.
    for (const mode of view.modeKeys) {
      expect(token('support-info', mode)).not.toBe(token('link-primary', mode))
    }
  })

  it('gives visited links their own hue, at Carbon\'s own angle', () => {
    // Carbon distinguishes visited by hue: purple-60 sits +33° from blue-60 in
    // OKLCH. Escala has no purple family, so the accent is rotated by that same
    // angle — IBM's relationship, the user's starting hue.
    for (const mode of view.modeKeys) {
      const visited = hexToOklch(token('link-visited', mode)!)
      const primary = hexToOklch(token('link-primary', mode)!)
      const delta = ((visited.h - primary.h + 540) % 360) - 180
      expect(Math.abs(delta), `${mode} visited hue offset`).toBeGreaterThan(20)
      expect(Math.abs(delta), `${mode} visited hue offset`).toBeLessThan(50)
    }
  })

  it('MEASURED: the light-end collapse the Radix shape forces', () => {
    // Carbon's neutral ladder is denser at the far end than a 12-step Radix
    // ramp: `gray-80`, `gray-90` and `gray-100` are three distinct values in
    // IBM's light themes and there is only ONE step at that end here. So
    // `background-inverse` (gray-80) and `text-primary` (gray-100) come out
    // identical. That is a real loss, and it is asserted rather than hidden —
    // if the ramp ever grows a step, this test is what says so.
    for (const mode of ['white', 'g10'] as const) {
      expect(token('background-inverse', mode)).toBe(token('text-primary', mode))
    }
    for (const mode of ['g90', 'g100'] as const) {
      expect(token('background-inverse', mode)).toBe(token('text-primary', mode))
    }
  })

  it('reproduces Carbon\'s alternate-in-light / ascend-in-dark layers', () => {
    for (const mode of ['white', 'g10'] as const) {
      const ls = stack(mode).map((hex) => hexToOklch(hex).l)
      const signs = ls.slice(1).map((l, i) => Math.sign(l - ls[i]))
      expect(new Set(signs).size, `${mode} should alternate`).toBeGreaterThan(1)
    }
    for (const mode of ['g90', 'g100'] as const) {
      const ls = stack(mode).map((hex) => hexToOklch(hex).l)
      for (let i = 1; i < ls.length; i++) {
        expect(ls[i], `${mode} depth ${i}`).toBeGreaterThan(ls[i - 1])
      }
    }
  })

  it('keeps every depth distinguishable from the one below', () => {
    for (const mode of view.modeKeys) {
      const s = stack(mode)
      for (let i = 1; i < s.length; i++) {
        expect(s[i], `${mode}: depth ${i} equals depth ${i - 1}`).not.toBe(s[i - 1])
      }
    }
  })

  it('primary text clears AA on ALL FOUR depths — the layer model\'s own test', () => {
    for (const mode of view.modeKeys) {
      const ink = token('text-primary', mode)!
      stack(mode).forEach((surface, depth) => {
        expect(wcagRatio(ink, surface), `${mode} depth ${depth}`).toBeGreaterThanOrEqual(4.5)
        expect(Math.abs(apcaLc(ink, surface)), `${mode} depth ${depth} APCA`).toBeGreaterThanOrEqual(75)
      })
    }
  })

  it('the focus ring is NOT the brand colour in dark — as Carbon does it', () => {
    // IBM ships `focus: #ffffff` for g90/g100 while the light themes use
    // blue-60, because a brand-blue ring vanishes on a dark surface. Mirrored.
    for (const mode of ['g90', 'g100'] as const) {
      const focus = token('focus', mode)!
      const page = token('background', mode)!
      expect(hexToOklch(focus).l, `${mode} focus should be near-white`).toBeGreaterThan(0.85)
      expect(wcagRatio(focus, page), `${mode} focus on page`).toBeGreaterThanOrEqual(3)
    }
    for (const mode of ['white', 'g10'] as const) {
      expect(hexToOklch(token('focus', mode)!).l, `${mode} focus should be the brand`).toBeLessThan(0.8)
    }
  })

  it('border-subtle carries a real depth 0, unlike every other group', () => {
    for (const mode of view.modeKeys) {
      expect(token('border-subtle-00', mode)).not.toBe(token('border-subtle-01', mode))
    }
  })
})
