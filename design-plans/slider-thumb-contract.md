# Contract · SliderThumb (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Slider (✓)`, set `SliderThumb` (`441:75`, 30 variants),
read read-only. **Figma rules.** Part of Slider in the ledger.

Description: "Slider thumb. Size xs | sm | default × State Default, Hover, Focused, Dragging, Disabled × Variant default | secondary.
Thumb type (short | long) and shape (rounded | pill) are instance overrides."

## API
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Dragging · Disabled | VARIANT | `Default` | `forceState` (docs); live `:hover`, `:focus-visible`, drag, `disabled` |
| `Variant` default · secondary | VARIANT | `default` | `variant` |

## Geometry
Square 14 · 16 · 20, radius `Radius/control` (8), fill `Content/on-action`, 2 INSIDE stroke (`stroke.md`).

## Colour
| Variant | Default | Hover | Focused (2 stroke + 2 OUTSIDE halo) | Dragging | Disabled |
|---|---|---|---|---|---|
| default | stroke `Action/primary/default` + `Shadow/xs` | `Action/primary/hover` + `Shadow/xs` | `Border/focus` · `Border/ring/default`, no shadow | `Action/primary/default`, no effect | fill `Surface/muted`, stroke `Action/disabled/default` |
| secondary | `Content/primary` | `Content/secondary` | `Border/strong` · `Border/subtle` | `Content/primary` | idem |

## Oddities in the file
- Dragging draws a 4 px ring with spread on a frame that does not clip: it is not painted. Dragging is indistinguishable from rest except for the ambient shadow, which disappears.
- The type (short / long) and the shape (pill) are instance overrides inside the Slider; there are no props in the set (not copied).
- Radius 8 on 20 px gives a rounded square; at 14 and 16 it is a circle.
