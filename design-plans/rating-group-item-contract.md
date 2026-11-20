# Contract · RatingGroupItem (Figma to code)

Date: 2026-11-12 · Source: set `RatingGroupItem` (`1122:195`, 60 variants), page `❖ RatingGroup (✓)`, read-only.
**Figma rules.** Part of RatingGroup in the ledger.

Description: "One option of a RatingGroup (role="radio", aria-checked, aria-label such as "4 of 5 stars" or "Good"). Type=star fills the
Star glyph in Content/accent; Type=emoji keeps its own icon (Icon swap) and marks the choice with Surface/selected and Content/accent.
In a star group set Checked on every item up to the value; code sets aria-checked on the chosen item only."

## API
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (from the group) |
| `Type` star · emoji | VARIANT | `star` | `kind` (`type` is the button's attribute); from the group |
| `Checked` false · true | VARIANT | `false` | `checked` (from the group: value) |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); live `:hover`, `:active`, `:focus-visible`, `disabled` |
| `Icon` | INSTANCE_SWAP | Star / Smiley | `icon` |

## Geometry
Square 32 · 24 · 40 (`size.compact` · `size.hit` · `size.control`), radius `Radius/action`, icon 20 · 16 · 24 (`Size/icon-md · sm · lg`) centred.
Checked star = filled `Star` glyph (fill); unchecked and emoji = outline. Focused: stroke 2 INSIDE + `focus-ring` 2 OUTSIDE.

## Colour (identical across the three sizes — verified on all 60 variants)
| Type · Checked | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| star · false | ink `Content/secondary` | `Action/ghost/hover` + `Content/primary` | `Action/ghost/pressed` + `Content/primary` | edge `Border/focus` + ring `Border/ring/default` | `Content/disabled` |
| star · true | `Content/accent` | `Action/ghost/hover` + accent | `Action/ghost/pressed` + accent | same | `Content/disabled` |
| emoji · false | same as star false | same | same | same | same |
| emoji · true | `Surface/selected` + `Content/accent` | same | `Surface/selected-pressed` | `Surface/selected` + focus | `Surface/selected` + `Content/disabled` |

## Oddities in the file
- `Checked` on a star fills ALL up to the value: the group visually marks every item ≤ value and `aria-checked` only the chosen one.
- Emoji Disabled keeps the checked `Surface/selected` fill.
