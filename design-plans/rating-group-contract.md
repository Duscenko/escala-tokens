# Contract · RatingGroup (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ RatingGroup (✓)`, set `RatingGroup` (`1122:316`, 6 variants)
and its part `RatingGroupItem` (`1122:195`, 60 variants), read read-only. **Figma rules.** Renames the code's `Rating`
(read-only stars with a label) to `RatingGroup`.

Description: "Single-choice scale of 5 RatingGroupItems (role="radiogroup", named by its visible question). Type=star for scores,
emoji for sentiment; Size cascades to every item. One tab stop; arrow keys move and select. Use SegmentedControl for labelled
options and Slider for a continuous value."

## API
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Content` | SLOT | five items (four marked in star; the fourth in emoji) | `children`; without children, the file's five |
| `Size` default · sm · lg | VARIANT | `default` | `size` (cascade) |
| `Type` star · emoji | VARIANT | `star` | `type` (cascade) |

The value is `value` / `defaultValue` (4) / `onValueChange`; a star group marks (visually) all up to the value, `aria-checked` only the chosen one.

## Geometry
Row of 5 items in a `Content` slot: gap `Spacing/gap-tight` 4 (star), `Spacing/gap-control` 8 (emoji). Width: 176 · 136 · 216 (star) and
192 · 152 · 232 (emoji) for default · sm · lg; height = item (32 · 24 · 40).
Sample emoji: SmileySad, SmileyNervous, SmileyMeh, Smiley (chosen), SmileyWink (Phosphor regular).

## Oddities in the file
- The "4.0 · 128 reviews" label and the previous `Rating`'s read-only mode do not exist in the file: they are lost.
- The name of the chosen child in emoji is `RatingGroupItem` (the others `item`): irrelevant.
- The stars are no longer yellow (`status.warning`) but `Content/accent`.
