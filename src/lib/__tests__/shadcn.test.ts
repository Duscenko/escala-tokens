import { describe, expect, it } from 'vitest'
import { buildArchitectureView, chartPalette, CHART_HUE_OFFSETS } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { hexToOklch } from '../color/gamut'
import { wcagRatio } from '../color/apca'
import { validateCategorical, separation, CATEGORICAL_LIMITS } from '../color/cvd'

/**
 * shadcn/ui ships a published CSS-variable contract. This holds the architecture
 * to it — every variable present, and the chart palette actually validated
 * rather than asserted by comment.
 */

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const view = buildArchitectureView('shadcn', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
} as never, system.errorSeed)!

const keys = view.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`))
const value = (group: string, key: string, mode: string) => {
  for (const c of view.categories) if (c.key === group)
    for (const t of c.tokens) if (t.key === key) return t.modes[mode]?.css
  return undefined
}

describe('the published shadcn contract is complete', () => {
  it('ships every base variable', () => {
    for (const k of [
      'base.background', 'base.foreground',
      'card.fill', 'card.foreground', 'popover.fill', 'popover.foreground',
      'primary.fill', 'primary.foreground', 'secondary.fill', 'secondary.foreground',
      'muted.fill', 'muted.foreground', 'accent.fill', 'accent.foreground',
      'destructive.fill', 'destructive.foreground',
      'border.default', 'border.input', 'border.ring',
    ]) expect(keys, `missing --${k}`).toContain(k)
  })

  it('ships chart-1 through chart-5 — they were missing entirely', () => {
    for (let n = 1; n <= 5; n++) expect(keys).toContain(`chart.chart-${n}`)
  })

  it('the focus ring clears WCAG 1.4.11 on the page', () => {
    // `--ring` is a focus indicator, so 3:1 applies. Neutral tone 6 (the old
    // value) reads 1.90:1 light and 1.57:1 dark.
    for (const mode of ['light', 'dark']) {
      const ring = value('border', 'ring', mode)!
      const page = value('base', 'background', mode)!
      expect(wcagRatio(ring, page), `${mode} ring`).toBeGreaterThanOrEqual(3)
    }
  })

  it('destructive carries a legible label', () => {
    for (const mode of ['light', 'dark']) {
      const fill = value('destructive', 'fill', mode)!
      const ink = value('destructive', 'foreground', mode)!
      expect(wcagRatio(ink, fill), `${mode} destructive`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('the chart palette is a real categorical palette', () => {
  const palette = chartPalette('#7f56d9')

  it('derives five slots from the brand hue', () => {
    expect(palette).toHaveLength(5)
    expect(CHART_HUE_OFFSETS[0]).toBe(0)
    const brandHue = hexToOklch('#7f56d9').h
    expect(Math.abs(((hexToOklch(palette[0]).h - brandHue + 540) % 360) - 180)).toBeLessThan(2)
  })

  it('holds one lightness across slots — rank is not identity', () => {
    const ls = palette.map((h) => hexToOklch(h).l)
    expect(Math.max(...ls) - Math.min(...ls)).toBeLessThan(0.02)
  })

  it('clears 3:1 against both surfaces', () => {
    for (const surface of ['#ffffff', '#111111']) {
      for (const [i, hex] of palette.entries()) {
        expect(wcagRatio(hex, surface), `chart-${i + 1} on ${surface}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('passes every categorical check in BOTH modes', () => {
    // The gate. If the offsets are ever "tidied" to an even split this fails on
    // colour-vision deficiency in CI, rather than looking fine in review.
    for (const mode of ['light', 'dark'] as const) {
      const report = validateCategorical(palette, { mode })
      const failed = report.checks.filter((c) => c.state === 'fail')
      expect(failed.map((c) => `${c.name}: ${c.detail}`), mode).toEqual([])
      expect(report.ok, mode).toBe(true)
    }
  })

  it('clears the CVD TARGET, not merely the floor', () => {
    // `ok` tolerates the 6–8 warn band, which is only legal with a second
    // encoding. shadcn charts carry no guaranteed texture or direct labels, so
    // this palette has to clear 8 outright.
    for (const mode of ['light', 'dark'] as const) {
      const { worstCvd } = validateCategorical(palette, { mode })
      expect(worstCvd!.deltaE, `${mode} ${worstCvd!.a}↔${worstCvd!.b} (${worstCvd!.kind})`)
        .toBeGreaterThanOrEqual(CATEGORICAL_LIMITS.cvdTarget)
    }
  })

  it('an EVEN hue split misses the target — this is why the offsets look arbitrary', () => {
    // The record of the decision, kept executable. Five slots 72° apart is the
    // obvious choice, and it drops amber↔green to ΔE 6.4 under a deutan
    // simulation: inside the 6–8 warn band, which is legal only alongside a
    // second encoding shadcn charts do not guarantee. The tuned offsets clear
    // the target outright, so no such obligation is inherited.
    const even = chartPalette('#7f56d9', [0, 72, 144, 216, 288])
    const worst = validateCategorical(even).worstCvd!
    expect(worst.deltaE).toBeLessThan(CATEGORICAL_LIMITS.cvdTarget)
    expect(worst.deltaE).toBeGreaterThanOrEqual(CATEGORICAL_LIMITS.cvdFloor)
    expect(separation(even[2], even[3], 'deutan')).toBeLessThan(CATEGORICAL_LIMITS.cvdTarget)
  })
})
