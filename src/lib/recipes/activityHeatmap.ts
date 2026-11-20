// ── ActivityHeatmap and ActivityHeatmapCell ────────────────────────────────
// The Figma `ActivityHeatmapCell` set (2400:57: Value 0–5 × State Default · Focused, 12 variants) and the `ActivityHeatmap` component
// (2400:58, page ❖ ActivityHeatmap (PRO) 2397:80) — design-plans/activityheatmap-contract.md.
// A year of activity, one square per day. The square's fill is the chart's SEQUENTIAL colour ladder (`Chart/sequential/0…5`):
// 0 = no activity, 5 = the most. The level never stands alone: each cell carries its count in its accessible name.
import { c, NONE, part, SELECTOR_SQUARE_RADIUS, type ComponentRecipe } from './helpers.js'

export const ACTIVITY_HEATMAP_CELL_VALUES = ['0', '1', '2', '3', '4', '5'] as const
export const ACTIVITY_HEATMAP_CELL_STATES = ['Default', 'Focused'] as const

export const ACTIVITY_HEATMAP_CELL: ComponentRecipe = {
  key: 'ActivityHeatmapCell',
  slots: ['root'],
  defaults: { Value: '0', State: 'Default' },
  parts: [
    // Figma: 12 × 12, both bound to the Dimension primitive `12` (no role). `spacing.3` is that step on the scale (DIM-01).
    // The radius is `Radius/control`, capped so no Selectors pick turns the square into a dot (SELECTOR_SQUARE_RADIUS).
    part({}, () => ({ root: { width: 'spacing.3', height: 'spacing.3', radius: SELECTOR_SQUARE_RADIUS.compact } })),
    part({ Value: ACTIVITY_HEATMAP_CELL_VALUES }, (value) => ({ root: { fill: c(`chart.sequential.${value}`) } })),
    // Focused: Figma's `focus-ring`, a rectangle 1px larger than the cell on every side (14 × 14, radius 5), stroked `Border/ring/default`,
    // `Stroke/focus` wide, OUTSIDE — the Button `gapRing` (outline + 1px offset). The fill stays the cell's.
    part({ State: ACTIVITY_HEATMAP_CELL_STATES }, (state) => ({
      root: { gapRing: state === 'Focused' ? c('border.ring.default') : NONE },
    })),
  ],
}

export const ACTIVITY_HEATMAP: ComponentRecipe = {
  key: 'ActivityHeatmap',
  slots: ['root', 'monthLabels', 'monthSlot', 'month', 'body', 'dayLabels', 'day', 'dayLabel', 'grid', 'row', 'legendRow', 'legend', 'legendLabel'],
  defaults: {},
  parts: [
    part({}, () => ({
      // Figma root: VERTICAL, gap `Spacing/gap-control` (8) between the month labels, the body and the legend row.
      root: { gap: 'spacing.gap-control' },
      // The month row is one slot per week column, each as wide as a cell, so a label starts on its week. Figma sets the
      // labels by hand at x = 32 + 16 × week; here the row is the grid's own column rhythm (gap `Spacing/gap-tight`).
      monthLabels: { gap: 'spacing.gap-tight' },
      monthSlot: { width: 'spacing.3', font: 'type.caption' },
      month: { text: c('content.secondary'), font: 'type.caption' },
      // body: HORIZONTAL, gap `Spacing/gap-tight` between the day labels and the grid.
      body: { gap: 'spacing.gap-tight' },
      // day-labels: VERTICAL, gap `Spacing/gap-tight`, 28 wide (a raw width in the file: 24 + 4 on the scale).
      dayLabels: { gap: 'spacing.gap-tight', width: 'spacing.6+spacing.1' },
      // One row per weekday, 12 high (the Dimension primitive `12`): the label is centred on it, as `Type/caption` is 16 high.
      day: { height: 'spacing.3' },
      dayLabel: { text: c('content.secondary'), font: 'type.caption' },
      // grid: the weeks side by side, the days stacked, both with `Spacing/gap-tight`.
      grid: { gap: 'spacing.gap-tight' },
      row: { gap: 'spacing.gap-tight' },
      // legend-row: HORIZONTAL, content pushed to the end; legend: HORIZONTAL centre, gap `Spacing/gap-tight`.
      legend: { gap: 'spacing.gap-tight' },
      legendLabel: { text: c('content.secondary'), font: 'type.caption' },
    })),
  ],
}
