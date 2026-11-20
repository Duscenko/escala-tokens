# Contract · Sparkline (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page "❖ Sparkline (PRO)" (2397:79), set `Sparkline` (2399:90, 12 variants), read with `use_figma`
(read-only, a one-axis sweep + a full read of the curve paths) on 2026-11-19. Every role below is the one the file binds. Built in the library
before Storybook (`GOV-01`). **Figma rules; nothing is corrected.** Behaviour plan: `HANDOFF-dataviz-2026-11-19.md` §3.2.

## What it is
A compact trend next to a value, with no axes or grid: a smooth line (monotone curve, round caps and joins) over a soft area that closes against the bottom
edge and a dot on the last datum. `default` uses the chart's neutral series; `success` and `critical` use status roles because they carry meaning (rising is good / falling
is bad); `secondary` is a grey, discreet trend.

## 0 · Anatomy (Figma layer → code slot)
| Figma | Code | Note |
|---|---|---|
| root (component, no auto-layout, does not clip, no fill or stroke) | `root` | `role="img"`, `aria-label` required |
| — (each data layer) | `layer` | code only: each drawn series lives in its own layer so it can cross-fade with the next when the data changes |
| `area` (VECTOR, `AreaVisible`) | `area` | curve path + two lines down to the bottom edge; `currentColor` fill |
| `line` (VECTOR, CENTER stroke, ROUND cap and join) | `line` | curve path, `currentColor` stroke |
| `dot` (ELLIPSE, `DotVisible`) | `dot` | round `<span>` centred on the last point |

## 1 · Properties → props (Figma panel order)
| Figma | Type | Default | React |
|---|---|---|---|
| `Variant` default · secondary · success · critical | VARIANT | `default` | `variant` |
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `AreaVisible` | BOOLEAN | `true` | `area` |
| `DotVisible` | BOOLEAN | `true` | `dot` |

Code only: `data: number[]` (the series; the file draws a 9-point sample curve), `aria-label` (required), `fluid` (the width follows the container).

## 2 · Geometry by size (measured in Figma)
| Size | Root | Dot Ø | Line stroke | Horizontal inset | Measured vertical air |
|---|---|---|---|---|---|
| sm | 96 × 32 | 4 | **1.5** (loose value, no variable) | 2 | 3.12 |
| default | 256 × 64 | 6 | `Stroke/focus` (2) | 3 | 5.32 |
| lg | 480 × 128 | 8 | `Stroke/focus` (2) | 4 | 8.80 |

- Width: the file binds it to the primitives `96 · 256 · 480` and the height to `32 · 64 · 128` (DIM-01); in code, `Spacing` steps (`spacing.24` · `spacing.32 + spacing.32` ·
  `spacing.32 × 3 + spacing.24`; `spacing.8` · `spacing.16` · `spacing.32`). The width is fixed per Size; with `fluid` it follows the container (the height stays).
- Line and area start half a dot from the left edge (x = Ø / 2) and end half a dot from the right; the dot is centred on the last datum (`dot` x = width − Ø,
  y = y of the last point − Ø / 2).
- Vertical: the file's sample leaves 5.32 · 3.12 · 8.80 px above the maximum and below the minimum; these are hand-set values (≈ one dot diameter ±0.9 px). In code the
  vertical air is exactly one dot diameter, so neither the line nor the dot is ever clipped. Scale: the data minimum at the bottom, the maximum at the top (constant `data`
  → a straight line at mid height).
- The `area` closes against the component's bottom edge (its box is 58.68 tall, 5.32 + 58.68 = 64). No stroke.
- Curve: monotone cubic Bézier (Fritsch–Carlson, d3's `curveMonotoneX`) between the points, spaced at the same distance in x. The file ships a hand-drawn curve with
  shorter handles at the ends; the visual result is the same without repeating those undulations.

## 3 · Colour by variant (invariant across Size)
| Variant | `area` | `line` | `dot` |
|---|---|---|---|
| default | `Chart/series-1/soft` | `Chart/series-1/solid` | `Chart/series-1/solid` |
| secondary | `Surface/muted` | `Content/secondary` | `Content/secondary` |
| success | `Status/success/surface` | `Status/success/surface-solid` | `Status/success/surface-solid` |
| critical | `Status/critical/surface` | `Status/critical/surface-solid` | `Status/critical/surface-solid` |

Usage rule: **`Chart/*` for a series with no judgement; `Status/*` when the colour means good or bad.** Never an opacity over a chart role. Components read
only the roles (`--color-chart-series-1-soft`, `--color-status-critical-surface`…).
No effects, no shadows, no fill on the root.

## 4 · Behaviour (decided by Storybook)
- `role="img"` with an `aria-label` that states the trend ("Daily active users, up 7.2 % this week"); the drawing (`layer`) is `aria-hidden`. The component has no text of its own.
- It is not focusable or interactive.

## 5 · Motion (only roles that already exist, `RECIPE_MOTION`)
| Moment | Role |
|---|---|
| On mount, once: the line draws itself (its `stroke-dashoffset`); the area and the dot appear with it | `use-reveal` |
| The data changes: the old layer fades out and the new one fades in | `use-color` |
| Reduced motion | instant: comes from the roles themselves |

## 6 · Things in the file copied as is / findings
- **DIM-03 · data strokes.** The line is bound to `Stroke/focus` (the focus ring's width, 2 px) in default and lg, and to a loose 1.5 in sm. Copied as is: `strokeWidth:
  stroke.focus` and, in sm, the recipe property `hairline: '1.5'`. No `Stroke/data` role is invented.
- **DIM-01.** Root bound to dimension primitives, not to a `Size/*` role.
- The `area` has no stroke and its box is taller than the line's (it reaches the bottom edge).
- The file's sample curve has 9 points with relative heights 0 · 19 · 22 · 18 · 33 · 32 · 27 · 19 · 46 (out of 46); the story uses that data (added to a base)
  to resemble the file.
- Handoff vs Figma: the handoff says "line width as Figma binds it (`Stroke/focus`, 1.5 on sm)" — it matches. "width fluid" — the file has fixed widths per Size; `fluid`
  is a code-only addition.

## Nests
Nothing: the set contains no instances.
