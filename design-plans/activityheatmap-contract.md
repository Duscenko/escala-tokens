# Contract · ActivityHeatmap and ActivityHeatmapCell (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page "❖ ActivityHeatmap (PRO)" (2397:80): `ActivityHeatmapCell` (2400:57, a set of 12 variants) and
`ActivityHeatmap` (2400:58, a loose component, 876×156). Read with `use_figma` (read-only) on 2026-11-19; every role below is the one the file binds.
The handoff (`HANDOFF-dataviz-2026-11-19.md` §3.3) asks for the same except where noted in "Where the handoff and Figma differ". **Figma rules; nothing is corrected.**

## What it is
A year of activity: one square per day, one column per week (53 weeks × 7 days, weeks start on Sunday). The square's fill is the chart's sequential scale
(`Chart/sequential/0…5`): 0 = no activity, 5 = the maximum. **The level never depends on colour alone**: each cell is a `gridcell` with an `aria-label` that states
the day and the count ("Tuesday, March 18: 8 contributions"). Switching the year is a SegmentedControl **outside** the component; the focused day is announced and the
consumer shows it in a legend under the grid (`onFocusDay`).

## 0 · Anatomy (Figma layer → code slot)
| Figma | Code (`data-part="ActivityHeatmap.<slot>"`) | Note |
|---|---|---|
| `ActivityHeatmap` (VERTICAL, hug) | `root` (`data-escala="ActivityHeatmap"`) | gap `Spacing/gap-control` between the three rows |
| `month-labels` (876×16, no layout, 12 hand-placed `month` texts) | `monthLabels` + `monthSlot` + `month` | hidden with `MonthLabelsVisible=false` |
| `body` (HORIZONTAL, gap `Spacing/gap-tight`) | `body` | |
| `day-labels` (VERTICAL, 28 wide, 7 `day` 12 tall) + `label` on Mon · Wed · Fri | `dayLabels` + `day` + `dayLabel` | hidden with `DayLabelsVisible=false` |
| `grid` (53 `week`, HORIZONTAL, gap tight) → `week` (VERTICAL, 7 `cell`, gap tight) | `grid` → `row` → `ActivityHeatmapCell` | see "Structural differences" |
| `legend-row` (HORIZONTAL, content at the end) → `legend` (HORIZONTAL centre, gap tight): `legend-less`, 6 `swatch`, `legend-more` | `legendRow` → `legend` → `legendLabel` + 6 `ActivityHeatmapCell` | hidden with `LegendVisible=false` |
| `ActivityHeatmapCell` (12×12) | `root` (`data-escala="ActivityHeatmapCell"`, `data-value`) | |
| `focus-ring` (rectangle 14×14, radius 5) | `gapRing` of the `root` | `Stroke/focus`, `Border/ring/default`, OUTSIDE, 1 px from the cell |

## 1 · Properties → props
**ActivityHeatmap** (no axes; three booleans, in panel order):

| Figma | Type | Default | React |
|---|---|---|---|
| `LegendVisible` | BOOLEAN | `true` | `showLegend` |
| `MonthLabelsVisible` | BOOLEAN | `true` | `showMonthLabels` |
| `DayLabelsVisible` | BOOLEAN | `true` | `showDayLabels` |
| — (code data) | | | `data: {date, count}[]` · `thresholds` · `endDate?` · `onFocusDay` · `getCellLabel` · `forceFocusedDate` (docs) · `lessLabel` / `moreLabel` · `aria-label` |

**ActivityHeatmapCell** (two axes):

| Figma | Type | Default | React |
|---|---|---|---|
| `Value` 0 · 1 · 2 · 3 · 4 · 5 | VARIANT | `0` | `value` (the handoff calls it `level`; the Figma axis is `Value`) |
| `State` Default · Focused | VARIANT | `Default` | live `:focus-visible` + `forceState` in docs |

## 2 · Geometry and roles (read from the file)
| Layer | Value | Role | In code |
|---|---|---|---|
| Cell | 12 × 12 | Dimension **primitive** `12` (no role) | `spacing.3` (the 12 step) — finding `DIM-01`, accepted |
| Cell, radius | 4 | `Radius/control` | `radius.control` capped by the black box (`min(radius.control, radius.sm)`), so no Selectors setting turns it into a dot |
| Gap cell↔cell, week↔week, day↔grid, `body`, `legend`, `month-labels` | 4 | `Spacing/gap-tight` | `spacing.gap-tight` |
| Root gap | 8 | `Spacing/gap-control` | `spacing.gap-control` |
| `day` (row height) | 12 | primitive `12` | `spacing.3` |
| `day-labels` (width) | 28 | raw value (HUG, there is a 28 in the file) | `spacing.6+spacing.1` (24 + 4) |
| Text of `month`, `label`, `legend-less`, `legend-more` | 16 tall | `Type/caption`, ink `Content/secondary` | `type.caption`, `color.content.secondary` |

Measurements from the file with everything visible: 876 × 156 = 16 (months) + 8 + 108 (7 × 12 + 6 × 4) + 8 + 16 (legend); width 28 + 4 + 53 × 12 + 52 × 4 = 876. Without day labels,
month labels or legend (the prototype's "Compact" variant) it is 844 × 108.

| Value | Cell fill |
|---|---|
| 0 | `Chart/sequential/0` (no activity) |
| 1 · 2 · 3 · 4 · 5 | `Chart/sequential/1 … 5` |

No stroke, no shadow, no opacity. Focus: the cell stays the same and adds **one** ring (`focus-ring`): a 14 × 14 rectangle (1 px larger per side), radius 5 (raw: finding `DIM-02`), `Border/ring/default` stroke
of `Stroke/focus` (2), OUTSIDE alignment → no border of its own, 1 px from the square (the Button's `gapRing`: `outline` 2 px with `outline-offset` 1 px, which follows the radius + 1).

## 3 · Data and grid (code)
- `data: {date, count}[]` — ISO dates `YYYY-MM-DD` (UTC, the same day in every time zone); a missing day counts as 0; repeated dates are summed; a negative `count` is 0.
- The grid is the 53 weeks that **end in the week of `endDate`** (by default, the most recent date in `data`; with no data, today in UTC). The last column
  runs up to `endDate` and paints nothing beyond it (the file's example: 52 full weeks + 3 days, Sunday to Tuesday).
- `thresholds` = the count from which each level 1…5 starts, ascending (default `[1, 3, 6, 10, 15]`): level 0 if `count = 0` or lower than the first step.
- Month labels: one on the column that contains the 1st of each month; the first column is labelled with its own month only if the next label is 3 or more columns away.
- Deterministic sample: `apps/storybook/stories/activityHeatmapSample.ts` (no `Math.random`, no `Date.now()`): "Figma sample" reproduces the file's picture cell by cell
  (Value → the count that starts that level), and `Sparse` / `Dense` are seeded series.

## 4 · Accessibility and keyboard (code)
- `role="grid"` with `aria-label` (default "Activity by day"), `aria-rowcount=7`, `aria-colcount=53`; 7 `role="row"` (**the weekdays**) with `gridcell`s; each cell with
  `aria-label` = "Tuesday, March 18: 8 contributions" (`1 contribution` in the singular; `getCellLabel` to translate) and `aria-colindex`.
- A single Tab stop (roving tabindex): the last-focused cell (the `endDate` one at first); the rest are `tabindex=-1`.

| Key | Action |
|---|---|
| Tab | enters the grid at its Tab stop and leaves it |
| ← → | the same weekday in the previous / next week (by week); stops at the ends; in the last column it stays on a day that exists |
| ↑ ↓ | the previous / next day of the week; stops at Sunday and Saturday |
| Home · End | the first (Sunday) / last (Saturday) day of the focused week |
| Ctrl + Home · Ctrl + End | the first / last day of the grid |

- `onFocusDay(day | null)` fires when a cell receives focus (keyboard, Tab or click) and with `null` when focus leaves the grid.
- The legend, months and days are decorative (`aria-hidden`): each cell's name already carries the count.
- Visible focus: the ring appears with `:focus-visible` (keyboard), not on click.

## 5 · Motion (code, by role)
`ActivityHeatmapCell: { transitions: { root: { 'outline-color': 'use-focus' } } }`. **No animation on mount** or when the data changes; the year change is animated by the consumer
(`use-page-transition` on the region). The ring is an `outline`: its style does not animate, so it appears at once (same as Button's); the role stays declared.

## 6 · Usage
- **whenToUse:** one figure per day over a year (contributions, habits, sessions). It goes inside a card (`DashboardActivityCard`); the year is switched with a SegmentedControl outside.
- **whenNotToUse:** a continuous series → Sparkline; the split of a total → SplitBar; a value and its threshold → Gauge. Fewer than a few weeks of data → a table.
- **related:** ActivityHeatmapCell, SegmentedControl, Sparkline.

## Structural differences (on purpose, the look is identical)
- Figma puts the **weeks as columns** (`week` VERTICAL inside `grid` HORIZONTAL). For ARIA a `row` is a line of the grid as it appears, and the arrows must follow
  what the eye sees (→ goes right), so the code puts **one row per weekday** with 53 cells, with the same gap and the same size: it looks the same, and ← → (week) / ↑ ↓ (day) are
  the standard `grid` arrows. Figma's `week` slot is the code's `row` slot.
- The file's 12 `month` texts are placed by hand (x = 32 + 16 × column). The code places them on the grid's column rhythm: one slot per week, one cell wide.

## Where the handoff and Figma differ
- `level` (handoff) → `Value` (Figma) → prop `value`.
- "focus ring `Border/ring/default` · `Stroke/focus`, 1 px outside": Figma draws it as a rectangle 1 px larger with a 2 px **OUTSIDE** stroke, i.e. 1 px of air and a 2 px ring; that is what is copied.
- The handoff lists `showLegend`, `showMonthLabels`, `showDayLabels`; Figma calls them `LegendVisible`, `MonthLabelsVisible`, `DayLabelsVisible`. The handoff's code names are kept
  as props and Figma's as Storybook controls (like `LabelVisible` ↔ `hideLabel` in TabBarItem).

## Odd (copied as is)
- Cell 12 × 12 and `day` row of 12: bound to the Dimension Primitives **primitive** `12`, not to a `Size/*` or `Spacing/*` role (finding `DIM-01`, accepted; in code, `spacing.3`).
- `day-labels` measures 28 (HUG) although its texts measure 23 · 24 · 14: raw value, no variable.
- In the component, `week`, `grid` and `body` **clip their content** (`clipsContent`): the Focused cell's ring, which sticks out 3 px, ends up almost entirely clipped in the
  component's render (it looks faint on the week 11 cell, Tuesday March 18). In the cell's set the ring is fully visible. The code does not clip: the ring is fully visible.
- A `Focused` ring remains inside the component as published (week 11, day 3: "Tuesday, March 18"). The Storybook sample leaves it off by default (`Focused day` sets it).
- November label: in the file it sits on column 44 (x = 736); with the real dates (Sunday Dec 29 2024 → Tuesday Dec 30 2025) November 1 falls on column 43. The other 11
  months match column by column. The code uses the real date.
- The "Compact" prototype (labels and legend hidden, "for small cards") scales the example to 0.8 and leaves only the grid (844 × 108 → 675 × 86); in code it is `showDayLabels`, `showMonthLabels` and `showLegend` set to `false`.
