# Contract · SegmentedControlItem (Figma to code)

Date: 2026-11-12 · Source: set `SegmentedControlItem` (`1102:5087`, 30 variants), page `❖ SegmentedControl (✓)`, read
read-only. **Figma rules.** Part of SegmentedControl in the ledger.

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (from the group if inside one) |
| `Checked` false · true | VARIANT | `false` | `checked` (from the group: `value`) |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); live `:hover`, `:active`, `:focus-visible`, `disabled` |
| `Label` | TEXT | "Label" | `label` |
| `LabelVisible` | BOOLEAN | true | `labelVisible` (false → requires `aria-label`) |
| `IconLeadingVisible` | BOOLEAN | false | `iconLeadingVisible` |
| `IconLeadingIcon` | INSTANCE_SWAP | `icon/House` | `iconLeading` |

## Geometry
| Size | Height | Gap | Icon |
|---|---|---|---|
| default | `Size/control-sm` 32 | `Spacing/gap-control` 8 | `Size/icon-sm` 16 |
| sm | `Size/control-xs` 24 | `Spacing/gap-tight` 4 | 16 |
| lg | `Size/control-md` 40 | 8 | `Size/icon-md` 20 |

Padding X `Spacing/inset-control` 12, Y 0, text `Type/button`. Radius: unchecked `Radius/action` (12), checked `Radius/control` (8).
Focused: 2 INSIDE stroke that does NOT enter the layout (children in the same position) + 2 OUTSIDE `focus-ring`.

## Colour
| | fill | ink | effect |
|---|---|---|---|
| unchecked Default | — | `Content/secondary` | — |
| unchecked Hover | `Action/ghost/hover` | `Content/primary` | — |
| unchecked Pressed | `Action/ghost/pressed` | `Content/primary` | — |
| unchecked Focused | — | `Content/secondary` | `Border/focus` 2 + `Border/ring/default` 2 |
| unchecked Disabled | — | `Content/disabled` | — |
| checked Default / Hover / Pressed | `Surface/input` | `Content/primary` | `Shadow/xs` |
| checked Focused | `Surface/input` | `Content/primary` | focus + `Shadow/xs` |
| checked Disabled | `Surface/input` | `Content/disabled` | none |

## Oddities in the file
- `Shadow/xs` carries a ring with spread 1 on a frame that does not clip: it is not painted; only the ambient shadow `0 1 2` counts.
- The "Label" text measures 31.5 px in the browser and 32 in Figma (text rounding): each item 1 px narrower.
- Checked + Hover / Pressed do not change (the file draws nothing different).
