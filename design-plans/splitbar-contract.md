# Contract · SplitBar, SplitBarSegment and SplitBarLegendItem (from Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page `❖ SplitBar (PRO)` (`2397:81`): set `SplitBar` (`2401:248`), set `SplitBarSegment` (`2401:102`) and set `SplitBarLegendItem` (`2401:211`), read with `figma-read-set.js` (read-only). This document is what the recipe, the component and Storybook copy. **Figma rules; nothing is corrected.** Where the handoff (`HANDOFF-dataviz-2026-11-19.md` §3.4) and Figma differ, Figma wins and it is noted below.

Code: `src/components/escala-ui/split-bar.tsx` · recipes `src/lib/recipes/splitBar.ts` (SplitBar, SplitBarSegment, SplitBarLegendItem) · motion `src/lib/recipes/motion.ts` · stories `apps/storybook/stories/SplitBar*.stories.tsx` · catalogue `componentCatalogue.ts` (Indicators category).

## What it is

A single bar that is 100 % of something, split into shares (`SplitBarSegment`), with a legend (`SplitBarLegendItem`) that also turns each series off and on. It serves parts of a whole, up to eight: traffic by source, spend by team, storage by type. A share that is not part of a whole is a `ProgressLine`; a trend is a `Sparkline`.

**Color: Chart vs Status.** The colors are `Chart/series-1…8` (`--color-chart-series-<n>-solid|soft|content`): categories **with no meaning** (one source is not better than another), in the fixed order violet · teal · amber · blue · pink · lime · magenta · orange. When the color *means* good or bad (passed · failed, within · over budget) `Status/*` is used, never a `Chart/*`. Never an opacity over a Chart role. Components read only the roles, never the `--color-chart-<hue>-<n>` ramps.

## API

### SplitBar (`2401:248`, single component, 960 × 88)

| Figma | Type | Default | React |
|---|---|---|---|
| `Bar` | SLOT | six `SplitBarSegment` | `segments: { id, label, value, series }[]` (`value` = any number ≥ 0; the bar shows each one as its share of what is visible; `series` 1–8) |
| `Legend` | SLOT | six `SplitBarLegendItem` | generated from `segments` (one item per series) |
| `LegendVisible` | BOOLEAN | `true` | `showLegend` |
| — | — | — | `aria-label` or `aria-labelledby` (one required): the chart title |
| — | — | — | `valueUnit`, `hiddenIds` · `defaultHiddenIds` · `onHiddenIdsChange`, `onSegmentClick`, `leaderBelow` (5), `showLegendValues`, `forceActiveId` (docs only) |

### SplitBarSegment (`2401:102`, 16 variants, 240 × 48)

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Series` 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 | VARIANT | `1` | `series` (`"1"`–`"8"` or `1`–`8`). New axis: it is **not** `Variant` (ARC-AXIS-01) |
| `State` Default · Focused | VARIANT | `Default` | CSS `:focus-visible` + `forceState` |
| `Label` | TEXT | `"Organic search"` | `label` |
| `Value` | TEXT | `"41.6%"` | `value` |
| `LabelVisible` | BOOLEAN | `true` | `labelVisible` (the bar decides it by width: `fit`) |
| `ValueVisible` | BOOLEAN | `true` | `valueVisible` (same) |

### SplitBarLegendItem (`2401:211`, 32 variants, 156 × 24)

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Series` 1–8 | VARIANT | `1` | `series` |
| `Checked` true · false | VARIANT | `true` | `checked` + `onCheckedChange` (`aria-pressed`) |
| `State` Default · Focused | VARIANT | `Default` | CSS `:focus-visible` + `forceState` |
| `Label` | TEXT | `"Organic search"` | `label` |
| `Value` | TEXT | `"41.6%"` | `value` |
| `ValueVisible` | BOOLEAN | `true` | `valueVisible` |

## Geometry

**SplitBar** (VERTICAL, `FIXED`/`HUG`, does not clip): gap `Spacing/gap-group` (16) between `Bar` and `Legend`. `Bar`: HORIZONTAL, gap 0, `FILL`/`HUG`, **clips** (`clipsContent`), radius `Radius/action` (12). `Legend`: HORIZONTAL with wrap, gap `Spacing/gap-group` (16), clips, `FILL`/`HUG`.

**SplitBarSegment**: HORIZONTAL MIN/CENTER, height `Size/control-lg` (48), width = its share of the 100 % (240 by default), horizontal padding `Spacing/inset-control` (12, vertical 0), gap `Spacing/gap-control` (8), does not clip. Text: `label` `Type/body-sm`, `value` `Type/label`, both HUG.
Border: a single stroke on the **right** side, `INSIDE`, of width `Stroke/focus` (2) and color `Chart/series-<n>/solid`.

**SplitBarLegendItem**: HORIZONTAL MIN/CENTER, height `Size/control-xs` (24), width HUG (156 by default), horizontal padding `Spacing/gap-tight` (4), gap `Spacing/gap-control` (8), radius `Radius/control` (4). `swatch`: 12 × 12 rectangle (both dimensions bound to the Dimension primitive `12`, **DIM-01**), radius `Radius/control`. `label` `Type/body-sm`, `value` `Type/label`.

## Color per combination and state

### SplitBarSegment

| Series | fill | stroke (right border) | ink (`label`, `value`) |
|---|---|---|---|
| 1…8 | `Chart/series-<n>/soft` | `Chart/series-<n>/solid` | `Chart/series-<n>/content` |

The 16 colors come from the roles of the 30 `Chart/*` (`Chart/series-1…8/{solid,soft,content}`), Light and Dark. The state **changes no color**: there is no Hover (behaviour, below).

| State | Ring |
|---|---|
| Default | none |
| Focused | `focus-ring`: 240 × 48 rectangle at (0, 0), **`INSIDE`**, `Stroke/focus` (2) on all four sides, `Border/ring/neutral`, no radius (the bar clips). Code: `ring` = 2 px outline with −2 px offset |

### SplitBarLegendItem

| Checked | swatch | label | value |
|---|---|---|---|
| true | `Chart/series-<n>/solid` | `Content/secondary` | `Content/primary` |
| false | `Surface/muted` | `Content/disabled` | `Content/disabled` |

| State | Ring |
|---|---|
| Default | none |
| Focused | `focus-ring`: 158 × 26 rectangle at (−1, −1), radius **5** (= `Radius/control` + 1), `Stroke/focus` (2), `Border/ring/neutral`, **`OUTSIDE`**. It is the Button's ring: 2 px at 1 px from the border (`gapRing`) |

No fill, no border, no effects on any legend variant.

## Effects
None in the three sets.

## Instances inside the bar (what Figma draws and code decides by width)

The page's `SplitBar` shows six segments across 960 px (399 · 238 · 183 · 95 · 30 · 26 wide):
- the 399, 238 and 183 ones carry `Label` and `Value`;
- the 95 one (9.9 %) carries **only the value** (`LabelVisible=false`);
- the 30 (3.1 %) and 26 (1.5 %) ones carry no text (`LabelVisible=false`, `ValueVisible=false`) and **their horizontal padding is 0** (in the original they stay at 26 px minimum).
Code: the bar measures the natural text and decides `fit` per segment: `full` (label + value) if it fits, `value` if only the value fits, `none` if nothing fits; at `none` the padding drops to 0 (`data-fit="none"`). The width is always the real share: `width` as a percentage (padding and border do not distort it).

## Behaviour (decided by code, the handoff §3.4)

- **Root** `role="group"` named by the chart title. Each segment is a `<button>` with `aria-label` "Organic search, 41.6%, 41,300 sessions" (label, share, value + `valueUnit`); the visible text is `aria-hidden`. Each legend is a `<button aria-pressed>`.
- **No Hover color.** Hovering or focusing a segment **widens** it (`width` up to the share its text needs, at most 60 % of the bar) and the others give way; `use-hover` transition. `forceActiveId` pins it for docs.
- **Labels**: inside if they fit; only the value if narrow; **below 5 %** (`leaderBelow`) the text leaves the bar and goes in a callout under it with a leader line (`Chart/series-<n>/solid`, `Stroke/divider`, `Size/control-xs` row). Figma calls it "consumer layout": it is code only and is noted as an addition.
- **Turning a series off** (legend): the others share out the 100 % — those that grow with `use-travel-in`, those that shrink with `use-travel-out`. The last visible series cannot be turned off. The percentages shown are those of what is visible (a turned-off series keeps its share of the full total, in `Content/disabled`). A turned-off segment becomes `aria-hidden`, out of the tab order and without a border.
- **Reduced motion**: decided by the foundation, not the component: the motion roles fall back to the system `fade` (`--motion-duration-fade`, 160 ms in Standard), with no travel. The handoff asked for "instant"; the foundation's rule rules and it is noted.
- **Keyboard**: Tab walks the segments and then the legend; Enter or Space press (a segment calls `onSegmentClick`, a legend turns its series off or on). No arrows: it is not a tablist.

## What the file does that looks odd (copied anyway)

- **`Stroke/focus` as the segment's border width.** Figma binds the segment's right stroke (2 px) to `Stroke/focus`, which is the focus ring's width. It is copied as is and stays as candidate **DIM-03** (no `Stroke/data` role is invented).
- **The two focus rings are different**: the segment's goes **inside** (INSIDE, no gap) and the legend's goes **outside** with a 1 px gap (OUTSIDE, radius 5). Both are copied.
- **12 × 12 swatch bound to the `12` primitive**, not to a role (DIM-01, Accepted).
- The narrow segments of the page's `SplitBar` have **padding 0** and width 26–30; in code the padding drops to 0 and the width is proportional (thinner).
- The page's `SplitBar` legend shows the values of the full set; in code the values are those of what is visible (see Behaviour).
- There are no Hover or Pressed variants in any set, nor a hover color.
- The `SplitBar` set is a single component (no axes); `Bar` and `Legend` are slots.
- The segments' `ValueVisible` and `LabelVisible` are Figma booleans; code decides them by width inside the bar (`fit`) and exposes them on the standalone segment.
- The three sets are not yet in `spec/figma-components.json` (the generated inventory predates the page): the families go with `page: "SplitBar (PRO)"` in `storybook-families.json` and there is no entry in `figma-components.status.json` to remove.

## Nests
None from other components of the file: `SplitBar` nests `SplitBarSegment` and `SplitBarLegendItem` (built first). Their texts use the `Type/body-sm` and `Type/label` styles.

## Accessibility (documentation)
- Chart name: `aria-label` or `aria-labelledby` required (one of the two) on the `role="group"` root.
- Segments and legend are native buttons: focus with Tab, Enter/Space. Visible focus rings (2 px) on both.
- Color is not the only separator: each segment has a `Chart/series-<n>/solid` border and the legend repeats label and value as text.
- Contrast, measured (WCAG 2.x, hex resolved from Figma): `Chart/series-n/solid` on `Surface/page` ≥ 3 : 1 in all 8 series, Light and Dark (border, swatch). Text `Chart/series-n/content` on its own `soft` (what the segment draws): **Dark 6.3–8.0 : 1 (all pass 4.5)**; **Light 4.31 · 4.40 · 4.46 · 4.30 in series 2 · 3 · 4 · 6 (below 4.5)**, 4.71 · 4.79 · 4.82 · 4.56 in 1 · 5 · 7 · 8. That is what the file does (the Chart roles were validated against the page, not against `/soft`): it is copied and noted as candidate finding **COL-CHART-01**. The legend in the turned-off state uses `Content/disabled` on the page: 3.58 : 1 in Light and 4.29 : 1 in Dark (**COL-CHART-02**; the button is not `disabled`, so axe requires it). The stories exclude from the a11y panel only those elements, with the reason.
