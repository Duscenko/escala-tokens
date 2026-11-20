# Contract "∑ SegmentedControl (Figma to code)

Date: 2026-11-12 "∑ Source: Figma `Escala Design System (Real)`, page `‚ùñ SegmentedControl (‚úì)`, set `SegmentedControl`
(`1102:5136`, 3 variants) and its part `SegmentedControlItem` (`1102:5087`, 30 variants). Read-only read.
**Figma rules.** Rebuilds shadcn's SegmentedControl (`options`, `size` default "∑ sm).

Description: ""Single choice between 2 to 5 short options shown as one track (role="radiogroup", each segment role="radio" with
aria-checked). One tab stop; arrow keys move and select. Size cascades to every SegmentedControlItem; exactly one item is
Checked. Use RadioGroup for long labels or more options, TabMenu to switch views, ButtonGroup for independent actions.""

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Content` | SLOT | Day (checked) "∑ Week "∑ Month | `children` (SegmentedControlItem); shortcut `options` |
| `Size` default "∑ sm "∑ lg | VARIANT | `default` | `size` (cascades to the items) |

## Geometry
Track: fill `Surface/muted`, radius `Radius/action`, padding `Spacing/gap-tight` 4 on all four sides, one `Content` slot with gap
4 between items. Height = item + 8: 40 "∑ 32 "∑ 48 (default "∑ sm "∑ lg). Width: hug (182 with Day "∑ Week "∑ Month).

## Odd in the file
- The track is `Surface/muted`, not `layer-2` like shadcn's SegmentedControl (roles test narrowed, dated).
- `Content/secondary` on `Surface/muted` gives 4.22:1 in Light (axe flags it): it is copied.
- The sliding pill disappears: the checked item IS the raised piece (the item paints its own fill and shadow).
