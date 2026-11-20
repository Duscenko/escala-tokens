# Contract · Gauge (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page "❖ Gauge (PRO)" (2397:78), set `Gauge` (2398:762, 60 variants), read with `use_figma`
(read-only, `figma-read-set.js` + a second read of fills and positions) on 2026-11-19. Every role below is the one the file binds. Built in the
library before Storybook (`GOV-01`). **Figma rules; nothing is corrected.** Behavior plan: `HANDOFF-dataviz-2026-11-19.md` §3.1 (where it differs, Figma wins and
the difference is noted below).

## What it is
A measure against a fixed range, on an open 270° arc with round ends: track, fill and, in the center, the value with its unit and a label. The
fill reads the chart's neutral series (`Chart/series-1/solid`) or, if the color means good or bad, a status (`Status/<sev>/surface-solid`). To complete a
task use `ProgressCircle`; for a trend, `Sparkline`.

## 0 · Anatomy (Figma layer → code slot)
| Figma | Code | Note |
|---|---|---|
| root (square component, no auto-layout, does not clip) | `root` | `role="meter"` |
| `track` (ELLIPSE, arc 135°→405°, `innerRadius` .85 · .875 · .833) | `track` | SVG circle, `currentColor` stroke, `stroke-linecap: round` |
| `track-cap-start` · `track-cap-end` (ELLIPSE Ø 12 · 8 · 16) | — | the round ends of the SVG stroke (same shape: half the thickness beyond each end) |
| `fill` (ELLIPSE, arc 135° → 135° + 270° × value) | `arc` | the same circle, with `stroke-dasharray` = the value |
| `cap-start` · `cap-end` | — | idem; they do not exist at `Value=0` (the fill is not drawn) |
| `content` (VERTICAL, gap `Spacing/gap-tight`, centered) | `content` | center 6 · 4 · 6 px below the side's center (`travel` recipe: `spacing.1_5` · `spacing.1` · `spacing.1_5`) |
| `value-row` (HORIZONTAL, baseline, gap `Spacing/gap-tight`) | `valueRow` | |
| `value` (TEXT, `ValueText`) | `value` | |
| `unit` (TEXT, `Unit`, `UnitVisible`) | `unit` | |
| `label` (TEXT, `Label`, `LabelVisible`) | `label` | |

## 1 · Properties → props (Figma panel order)
| Figma | Type | Default | React |
|---|---|---|---|
| `Variant` default · success · warning · critical | VARIANT | `default` | `variant` |
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `Value` 0 · 25 · 50 · 75 · 100 | VARIANT | `0` | `value` (continuous) + `min` (0) + `max` (100) |
| `ValueText` | TEXT | "72" | `valueText` (by default, the value rounded to one decimal) |
| `Unit` | TEXT | "%" | `unit` |
| `Label` | TEXT | "Healthy" | `label` |
| `UnitVisible` | BOOLEAN | `true` | shown if `unit` is provided; in the story it is the `unitVisible` control |
| `LabelVisible` | BOOLEAN | `true` | idem with `label` |

Code only: `min`, `max` (`aria-valuemin` / `aria-valuemax`), `aria-label` / `aria-labelledby` (the meter's name).

## 2 · Geometry by size (measured in Figma, sweep of the set)
| Size | Side | Arc thickness | `innerRadius` | Cap Ø | Value (text) | Unit | Label | `content` (width × height, as "72 % Healthy" shows it) |
|---|---|---|---|---|---|---|---|---|
| sm | 128 | 8 | .875 | 8 | `Type/heading-md` | `Type/body-sm` | `Type/body-sm` | 45 × 55 |
| default | 160 | 12 | .85 | 12 | `Type/heading-lg` | `Type/body-md` | `Type/label` | 55 × 61 |
| lg | 192 | 16 | .833 | 16 | `Type/heading-xl` | `Type/body-md` | `Type/label` | 66 × 75 |

- The file binds the side to the dimension primitives `128 · 160 · 192` (DIM-01). In code: `spacing.32` · `spacing.32 + spacing.8` · `spacing.32 + spacing.16`.
- Thickness = radius × (1 − `innerRadius`) = 12 · 8 · 16: loose values with no variable (**DIM-03**, see below). In code the file's proportion is kept
  (`GAUGE_INNER` in `gauge.tsx`, like `ProgressCircle`).
- `content` and `value-row`: gap `Spacing/gap-tight` (4). With the unit, the value and the unit are aligned on the baseline.
- Position of `content`: center at x = side / 2, y = side / 2 + 6 · 4 · 6 = 86 · 68 · 102 (measured: frame `y` 55.5 · 40.5 · 64.5, no padding). The arc is open at the
  bottom, so the content moves down a little to sit at the optical center.

## 3 · Arc: angles and positions
- Figma angles (clockwise from 3 o'clock): track 135° → 405°; fill 135° → 135° + 270° × (value / range): 202.5° · 270° · 337.5° · 405° for 25 · 50 · 75 · 100.
- Fill ends at `Value=50` (default): cap-start (21.67, 126.33) and cap-end (74, 0), Ø 12 — the stroke's center is at R − thickness / 2 = 74 from the center.
- `Value=0`: only the track and its two ends; there is no `fill` or `cap`.

## 4 · Color by variant (invariant of Size and Value)
| Variant | Track and its ends | Fill and its ends | `value` | `unit` | `label` |
|---|---|---|---|---|---|
| default | `Surface/muted` | `Chart/series-1/solid` | `Content/primary` | `Content/secondary` | `Chart/series-1/content` |
| success | `Surface/muted` | `Status/success/surface-solid` | `Content/primary` | `Content/secondary` | `Status/success/content` |
| warning | `Surface/muted` | `Status/warning/surface-solid` | `Content/primary` | `Content/secondary` | `Status/warning/content` |
| critical | `Surface/muted` | `Status/critical/surface-solid` | `Content/primary` | `Content/secondary` | `Status/critical/content` |

Usage rule: **`Chart/*` for a reading without judgment; `Status/*` when the color means good or bad.** Never an opacity over a chart role. Components read
only roles (`--color-chart-series-1-solid`, `--color-status-success-surface-solid`…), never the ramp.

No strokes, no effects, no shadows. The root does not clip (`clipsContent: false`).

## 5 · Behavior (decided by Storybook)
- `role="meter"` with `aria-valuenow` (clamped to `[min, max]`), `aria-valuemin`, `aria-valuemax` and `aria-valuetext`, which reads the label: "72 %, Healthy" (as the
  set's description says). It is not focusable. It needs an accessible name: `aria-label` or `aria-labelledby` (if there is none, `label` is used).
- The visible value is `valueText`, or the value rounded to one decimal. `unit` and `label` are shown only if provided.

## 6 · Motion (only roles that already exist, `RECIPE_MOTION`)
| Moment | Role |
|---|---|
| The value changes: the fill sweeps the arc (the transition is the `stroke-dasharray`) | `use-travel-in` |
| Reduced motion | instant: it comes from the roles themselves, the component names no duration |

No animation on mount (the handoff only asks for the sweep when the value changes).

## 7 · File items copied as is / findings
- **Inconsistent sample value.** The set ships `Value=0` by default, but the default `ValueText` is "72" (and the label "Healthy"): with the arc empty the center says 72.
  In code `value` is the data and `valueText` is derived from it; the `Playground` story starts at 72 so the arc and text say the same thing, and `AllCombinations` draws
  the file's grid (60 variants, Value 0 · 25 · 50 · 75 · 100) with the text following each value instead of the fixed "72".
- **DIM-03 · data strokes.** The 8 · 12 · 16 arc is not bound to any role: it comes from the ellipse's `innerRadius` and the side. No `Stroke/data` role is invented.
- **DIM-01.** The side (128 · 160 · 192) is bound to dimension primitives, not to a `Size/*` role; it is expressed with `Spacing` steps (128 + 32 + 32…).
- The file's round ends are separate circles (like `ProgressCircle`); the SVG stroke with `stroke-linecap: round` paints exactly the same.
- At `Value=100` the file draws the fill's two ends over the track's: the arc rounds on both sides (unlike `ProgressCircle`, which closes).
- Handoff vs Figma: the handoff asks for the `Status/<sev>/surface-solid` fill and the `Chart/series-1/content` or `Status/<sev>/content` label — matches. Sizes
  sm 128 · default 160 · lg 192 — matches. Stroke 8 · 12 · 16 — matches (sm 8, default 12, lg 16).

## Nests
Nothing: the set contains no instances.
