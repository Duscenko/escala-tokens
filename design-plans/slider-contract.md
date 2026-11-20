# Contract "∑ Slider (Figma to code)

Date: 2026-11-12 "∑ Source: set `Slider` (`447:19`, 36 variants), page `‚ùñ Slider (‚úì)`, read-only read. **Figma rules.**
Rebuilds shadcn's Slider (label + value, a single thumb).

Description: ""Slider: single or range value with optional tooltip (TooltipVisible) and tick marks (MarksVisible). Size xs / sm /
default √ó Range single, range √ó State Default, Dragging, Disabled √ó Variant default, secondary. Uses SliderThumb.""

## API
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs "∑ sm "∑ default | VARIANT | `default` | `size` |
| `Range` single "∑ range | VARIANT | `single` | `value` / `defaultValue` number or array (or `range`) |
| `State` Default "∑ Dragging "∑ Disabled | VARIANT | `Default` | `forceState` (docs); live: dragging and `disabled` |
| `Variant` default "∑ secondary | VARIANT | `default` | `variant` |
| `TooltipVisible` | BOOLEAN | false | `tooltipVisible` |
| `MarksVisible` | BOOLEAN | false | `marksVisible`, `marks` |
| `TooltipText` / `TooltipEndText` | TEXT | "40" / "70" | `tooltipText` / `tooltipEndText` (by default, the value) |

Sample: width 320; single at 40, range from 25 to 70 (thumbs at 75/210 of 320).

## Geometry
Column with gap `Spacing/gap-control` 8: tooltips (28) "∑ control "∑ marks (24).
| Size | Control | Track | Thumb |
|---|---|---|---|
| xs | 32 | 4 | 14 |
| sm | 36 | 6 | 16 |
| default | 40 | 8 | 20 |
Track `Surface/muted`, radius `Radius/control`; the fill runs between the thumbs' CENTRES: centre = half the thumb + p √ó (width ‚àí thumb).
Tooltip 36√ó24 centred on the thumb: `Surface/inverse`, text `Type/caption` `Content/inverse`, radius control.
Mark 20√ó20: tick 2√ó6 `Border/strong` at 50 % opacity + label `Type/caption` `Content/secondary`, gap 4, distributed with space-between.

## Fill colour
default `Action/primary/default` "∑ secondary `Content/primary` "∑ Disabled `Action/disabled/default`. The thumbs are SliderThumb (in Dragging single, the only one; in range, the second).

## Odd in the file
- shadcn's label + value do not exist: it is kept as `label` only for legacy callers (the board).
- The tick is `Border/strong` with paint opacity 0.5 (the recipe's `opacity` property).
- The mark (20 high) contains tick 6 + gap 4 + label 16 = 26: it overflows as in Figma.
