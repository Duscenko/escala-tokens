/**
 * Data-display recipes: Gauge and Sparkline. Rules as in `componentRecipes.ts`.
 *
 * Both read the chart colour roles (`Chart/series-1/solid · soft · content`) for a neutral series, and the Status roles
 * only when the colour MEANS good or bad (`Status/<sev>/surface-solid`, `/surface`, `/content`). Never an opacity on top
 * of a chart role. Contracts: design-plans/gauge-contract.md (2398:762), design-plans/sparkline-contract.md (2399:90).
 */
import { c, part, type ComponentRecipe } from './helpers.js'

// ── Gauge ──────────────────────────────────────────────────────────────────
// The Figma set (60 variants: Variant default · success · warning · critical × Size default · sm · lg × Value 0 · 25 · 50 · 75 ·
// 100). A square 160 · 128 · 192 across holding a 270° arc open at the bottom (from 135°, clockwise) with round ends: the
// track on Surface/muted and the fill on Chart/series-1/solid (default) or Status/<sev>/surface-solid. The arc is 12 · 8 · 16
// thick (the file draws it as an ellipse with an inner radius ratio; `GAUGE_INNER` in gauge.tsx). In the middle: the value
// (Content/primary) with its unit baseline-aligned (Content/secondary), the label under them in the variant's content role.

export const GAUGE_VARIANTS = ['default', 'success', 'warning', 'critical'] as const
export const GAUGE_SIZES = ['default', 'sm', 'lg'] as const

// 128 = spacing.32, 160 = spacing.32 + spacing.8, 192 = spacing.32 + spacing.16 (the file binds the primitives 128 · 160 · 192).
const GAUGE_DIAMETER: Record<string, string> = { sm: 'spacing.32', default: 'spacing.32+spacing.8', lg: 'spacing.32+spacing.16' }
// Value · unit · label text styles per size (sm: heading-md · body-sm · body-sm; default: heading-lg · body-md · label; lg: heading-xl · body-md · label).
const GAUGE_TYPE: Record<string, { value: string; unit: string; label: string }> = {
  sm: { value: 'type.heading-md', unit: 'type.body-sm', label: 'type.body-sm' },
  default: { value: 'type.heading-lg', unit: 'type.body-md', label: 'type.label' },
  lg: { value: 'type.heading-xl', unit: 'type.body-md', label: 'type.label' },
}

/** The fill and the label's ink of a Variant: the neutral series for `default`, the severity's own roles otherwise. */
function gaugeTone(variant: string): { arc: string; label: string } {
  return variant === 'default'
    ? { arc: c('chart.series-1.solid'), label: c('chart.series-1.content') }
    : { arc: c(`status.${variant}.surface-solid`), label: c(`status.${variant}.content`) }
}

export const GAUGE: ComponentRecipe = {
  key: 'Gauge',
  slots: ['root', 'track', 'arc', 'content', 'valueRow', 'value', 'unit', 'label'],
  defaults: { Variant: 'default', Size: 'default' },
  parts: [
    part({ Size: GAUGE_SIZES }, (size) => ({
      root: { width: GAUGE_DIAMETER[size], height: GAUGE_DIAMETER[size] },
      // The arc is open at the bottom, so the content sits under the centre: 6 · 4 · 6 px (the file's y 55.5 · 40.5 · 64.5), read as `--escala-travel`.
      content: { gap: 'spacing.gap-tight', travel: size === 'sm' ? 'spacing.1' : 'spacing.1_5' },
      valueRow: { gap: 'spacing.gap-tight' },
      value: { font: GAUGE_TYPE[size].value },
      unit: { font: GAUGE_TYPE[size].unit },
      label: { font: GAUGE_TYPE[size].label },
    })),
    part({ Variant: GAUGE_VARIANTS }, (variant) => ({
      track: { text: c('surface.muted') },
      arc: { text: gaugeTone(variant).arc },
      value: { text: c('content.primary') },
      unit: { text: c('content.secondary') },
      label: { text: gaugeTone(variant).label },
    })),
  ],
}

// ── Sparkline ──────────────────────────────────────────────────────────────
// The Figma set (12 variants: Variant default · secondary · success · critical × Size default · sm · lg, plus the booleans
// AreaVisible and DotVisible). 256 × 64 · 96 × 32 · 480 × 128: a monotone line (round caps and joins) over a soft area that
// closes to the bottom edge, with a dot on the last point. Default binds the neutral series; secondary is a quiet grey;
// success and critical carry meaning, so they read the Status roles. The line is `Stroke/focus` (2) on default and lg and a
// raw 1.5 on sm (DIM-03: data strokes bound to the focus-ring width); the dot is 6 · 4 · 8.

export const SPARKLINE_VARIANTS = ['default', 'secondary', 'success', 'critical'] as const
export const SPARKLINE_SIZES = ['default', 'sm', 'lg'] as const

// 256 = 2 × spacing.32, 96 = spacing.24, 480 = 3 × spacing.32 + spacing.24; heights 64 · 32 · 128 = spacing.16 · 8 · 32.
const SPARKLINE_BOX: Record<string, { w: string; h: string; dot: string }> = {
  sm: { w: 'spacing.24', h: 'spacing.8', dot: 'spacing.1' },
  default: { w: 'spacing.32+spacing.32', h: 'spacing.16', dot: 'spacing.1_5' },
  lg: { w: 'spacing.32+spacing.32+spacing.32+spacing.24', h: 'spacing.32', dot: 'spacing.2' },
}

function sparklineTone(variant: string): { line: string; area: string } {
  switch (variant) {
    case 'secondary': return { line: c('content.secondary'), area: c('surface.muted') }
    case 'success':
    case 'critical': return { line: c(`status.${variant}.surface-solid`), area: c(`status.${variant}.surface`) }
    default: return { line: c('chart.series-1.solid'), area: c('chart.series-1.soft') }
  }
}

export const SPARKLINE: ComponentRecipe = {
  key: 'Sparkline',
  slots: ['root', 'layer', 'area', 'line', 'dot'],
  defaults: { Variant: 'default', Size: 'default' },
  parts: [
    part({ Size: SPARKLINE_SIZES }, (size) => ({
      root: { width: SPARKLINE_BOX[size].w, height: SPARKLINE_BOX[size].h },
      // A dot is a circle: its box is the Figma ellipse (6 · 4 · 8). The line is `Stroke/focus` except on sm, where the file
      // draws a raw 1.5 (`hairline` is the recipe's hand-set px width: DIM-03).
      dot: { width: SPARKLINE_BOX[size].dot, height: SPARKLINE_BOX[size].dot, radius: 'radius.pill' },
      line: size === 'sm' ? { hairline: '1.5' } : { strokeWidth: 'stroke.focus' },
    })),
    part({ Variant: SPARKLINE_VARIANTS }, (variant) => ({
      area: { text: sparklineTone(variant).area },
      line: { text: sparklineTone(variant).line },
      dot: { fill: sparklineTone(variant).line },
    })),
  ],
}
