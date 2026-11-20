/** SplitBar, SplitBarSegment and SplitBarLegendItem — the Figma `❖ SplitBar (PRO)` page (sets 2401:248 · 2401:102 · 2401:211).
 *  Contract: design-plans/splitbar-contract.md. Every value is a token reference; the chart colours are the `Chart/series-<n>`
 *  roles (solid · soft · content), never a primitive and never an opacity. Motion by role name in `recipes/motion.ts`. */
import { c, NONE, part, type ComponentRecipe } from './helpers.js'

/** Figma axis `Series` 1–8 (ARC-AXIS-01): one value per categorical chart colour. */
export const SPLIT_BAR_SERIES = ['1', '2', '3', '4', '5', '6', '7', '8'] as const
export type SplitBarSeries = (typeof SPLIT_BAR_SERIES)[number]
export const SPLIT_BAR_SEGMENT_STATES = ['Default', 'Focused'] as const
export const SPLIT_BAR_LEGEND_ITEM_STATES = ['Default', 'Focused'] as const
export const SPLIT_BAR_LEGEND_CHECKED = ['true', 'false'] as const

const chart = (n: string, slot: 'solid' | 'soft' | 'content') => c(`chart.series-${n}.${slot}`)

/** One share of the bar. Fill `/soft`, the 2px right edge `/solid` (Figma binds the edge to `Stroke/focus`: DIM-03), text `/content`.
 *  Focused is an inside ring, `Stroke/focus` wide, in `Border/ring/neutral`: Figma's `focus-ring` rectangle is 240 × 48, stroked INSIDE.
 *  There is no Hover colour: hover and focus WIDEN the segment (behaviour, `use-hover`). A segment too narrow for its text
 *  (`data-fit="none"`) drops its padding, as the file's 30 and 26 px instances do; one that is turned off (`data-collapsed`) drops its edge. */
export const SPLIT_BAR_SEGMENT: ComponentRecipe = {
  key: 'SplitBarSegment',
  slots: ['root', 'content', 'label', 'value'],
  defaults: { Series: '1', State: 'Default' },
  parts: [
    part({ Series: SPLIT_BAR_SERIES }, (n) => ({
      root: { fill: chart(n, 'soft'), stroke: chart(n, 'solid'), strokeRightWidth: 'stroke.focus', text: chart(n, 'content') },
      label: { text: chart(n, 'content') },
      value: { text: chart(n, 'content') },
    })),
    part({}, () => ({
      root: { height: 'size.lg', paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
      'root[data-fit="none"]': { paddingX: 'spacing.0' },
      'root[data-collapsed]': { strokeRightWidth: 'spacing.0' },
      content: { gap: 'spacing.gap-control' },
      label: { font: 'type.body-sm' },
      value: { font: 'type.label' },
    })),
    part({ State: SPLIT_BAR_SEGMENT_STATES }, (state) => ({ root: { ring: state === 'Focused' ? c('border.ring.neutral') : NONE } })),
  ],
}

/** The legend entry and the toggle of a series. On: swatch `/solid`, label `Content/secondary`, value `Content/primary`.
 *  Off: swatch `Surface/muted`, both texts `Content/disabled`. Focused is the Button ring: 2px, 1px off the edge, radius + 1
 *  (Figma's `focus-ring`: 158 × 26 at -1 · -1, radius 5, stroked OUTSIDE). The 12px swatch is a Dimension primitive (DIM-01). */
export const SPLIT_BAR_LEGEND_ITEM: ComponentRecipe = {
  key: 'SplitBarLegendItem',
  slots: ['root', 'swatch', 'label', 'value'],
  defaults: { Series: '1', Checked: 'true', State: 'Default' },
  parts: [
    part({ Series: SPLIT_BAR_SERIES, Checked: SPLIT_BAR_LEGEND_CHECKED }, (n, checked) => ({
      swatch: { fill: checked === 'true' ? chart(n, 'solid') : c('surface.muted') },
      label: { text: checked === 'true' ? c('content.secondary') : c('content.disabled') },
      value: { text: checked === 'true' ? c('content.primary') : c('content.disabled') },
    })),
    part({}, () => ({
      root: { height: 'size.xs', paddingX: 'spacing.gap-tight', gap: 'spacing.gap-control', radius: 'radius.control' },
      swatch: { width: 'spacing.3', height: 'spacing.3', radius: 'radius.control' },
      label: { font: 'type.body-sm' },
      value: { font: 'type.label' },
    })),
    part({ State: SPLIT_BAR_LEGEND_ITEM_STATES }, (state) => ({ root: { gapRing: state === 'Focused' ? c('border.ring.neutral') : NONE } })),
  ],
}

/** The whole chart: the bar over its legend on `Spacing/gap-group`. The bar clips its segments to `Radius/action`.
 *  The `leader*` slots are code only (the file calls it "consumer layout"): a segment under 5 % keeps no text inside, so its
 *  callout sits under the bar, one row (`Size/control-xs`) per callout, with a hairline in the segment's `/solid` running up to it. */
export const SPLIT_BAR: ComponentRecipe = {
  key: 'SplitBar',
  slots: ['root', 'bar', 'leaders', 'leaderRow', 'leaderLine', 'leaderText', 'leaderLabel', 'leaderValue', 'legend'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-group' },
      bar: { radius: 'radius.action' },
      leaderRow: { height: 'size.xs' },
      leaderLine: { width: 'stroke.divider' },
      leaderText: { gap: 'spacing.gap-tight', paddingX: 'spacing.gap-tight' },
      leaderLabel: { font: 'type.body-sm', text: c('content.secondary') },
      leaderValue: { font: 'type.label', text: c('content.primary') },
      legend: { gap: 'spacing.gap-group', rowGap: 'spacing.gap-group' },
      ...Object.fromEntries(SPLIT_BAR_SERIES.map((n) => [`leaderLine[data-series="${n}"]`, { fill: chart(n, 'solid') }])),
    })),
  ],
}
