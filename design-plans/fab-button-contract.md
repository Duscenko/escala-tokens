# Contract · FABButton (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `FABButton` (`345:868`,
100 variants, page "❖ FABButton & FABGroup"), read with the Plugin API (read-only) and
checked against the render's pixels. The recipe, the component and Storybook copy it.
**Figma rules; nothing is corrected.**

Set description: "Floating action button: leading icon plus optional label. Variant default =
Action/primary, secondary = Action/secondary (soft = Surface/layer-2), inverse = Surface/inverse chip
(default appearance only). Size default is Size/control-lg (48), lg is Size/control-xl (56, the FAB
size). Width hugs content and never goes below the size role, so icon-only (LabelVisible off) stays
square; give an icon-only FAB an accessible name (aria-label)."

## API

| Figma | Type | Default | Options (file order) | React |
|---|---|---|---|---|
| `Appearance` | VARIANT | `solid` | solid · soft | `appearance` |
| `Shape` | VARIANT | `rounded` | rounded · pill | `shape` |
| `Size` | VARIANT | `default` | default · lg | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | inverse · default · secondary | `variant` |
| `Label` | TEXT | "Create" | — | `children` |
| `LabelVisible` | BOOLEAN | `true` | — | with `children` = visible; without `children` = icon only |
| `IconLeadingIcon` | INSTANCE_SWAP | `Plus` | — | `icon?: ReactNode` (default: Phosphor `plus`) |

100 variants: `inverse` only exists in `solid` (2 · 2 · 2 · 5 · 3 − 20). In code `inverse · soft` is
accepted and painted as `inverse · solid`. Panel: variant axes first, then Label, LabelVisible,
IconLeadingIcon (API order; I did not see the playground panel).

## Geometry

Root: horizontal, centred, **width = content, fixed height**, gap `Spacing/gap-control` (8), padding X
`Spacing/inset-control` (12), padding Y 0, minimum width = height, radius `Radius/action` (rounded, 12) or
`Radius/full` (pill).

| Size | Height and minimum width | Icon |
|---|---|---|
| default | `Size/control-lg` (48) → `size.touch` | `Size/icon-md` (20) → `icon.medium` |
| lg | `Size/control-xl` (56) → `size.fab` | `Size/icon-lg` (24) → `icon.large` |

`label-wrap` (text column): `padding-right` `Spacing/gap-control` (8), only if `LabelVisible`.
Text `Type/button` (Inter semibold, 18 high). Measurements from the file (default, "Create"): 100 × 48
(12 + 20 + 8 + 40 + 8 + 12); lg 104 × 56. Without a label: 44 → the minimum makes it 48 × 48 (square).
No stroke in any state.

## Colour by Variant, Appearance and State

The same across all four Shape × Size (measured). `fill A + B` = two stacked fills, B on top (the
variable's own alpha, not a second multiplier). Text and icon share ink.

| Variant · Appearance | Default · Focused | Hover | Pressed | Ink | Focus halo |
|---|---|---|---|---|---|
| default · solid | `Action/primary/default` | `…/hover` | `…/pressed` | `Content/on-action` | `Border/ring/default` |
| default · soft | `Surface/accent` | + `Surface/selected` | + `Surface/selected-pressed` | `Content/accent` | `Border/ring/default` |
| secondary · solid | `Action/secondary/default` | `…/hover` | `…/pressed` | `Content/on-secondary` | `Border/subtle` |
| secondary · soft | `Surface/layer-2` | + `Action/ghost/hover` | + `Action/ghost/pressed` | `Content/primary` | `Border/subtle` |
| inverse · solid | `Surface/inverse` | + `Surface/inverse-muted` | + `Surface/inverse-muted` ×2 | `Content/inverse` | `Surface/inverse-muted` |
| any · Disabled | `Surface/page` + `Action/disabled/default` | | | `Content/disabled` | — |

## Focus

Only a `focus-ring` frame the size of the root, the control's radius, `Stroke/focus` (2) stroke **outside**
(`OUTSIDE`) in the halo colour from the table. **No border of its own inside** (unlike
Button and TextLink). The elevation effects remain in Focused.

## Effects (all states except Disabled, which has none)

Five in the file; checked against the render's pixels (`default · solid`, rounded):

| Effect | Default · Focused | Hover | Pressed | Painted? |
|---|---|---|---|---|
| `DROP_SHADOW` `Elevation/shadow-key` | 0 12 blur 16 (spread −4) | 0 20 blur 24 (spread −4) | 0 4 blur 6 (spread −1) | yes, without the spread |
| `DROP_SHADOW` `Elevation/shadow-ambient` | 0 4 blur 6 (spread −2) | 0 8 blur 8 (spread −4) | 0 2 blur 4 (spread −2) | yes, without the spread |
| `DROP_SHADOW` `Elevation/shadow-ring` | 0 0 blur 0 spread 1 | same | same | **no** (the frame does not clip; row 0 over the node = page) |
| `DROP_SHADOW` fill colour | 0 0 blur 0 spread 1 | same | same | **no** (idem) |
| `INNER_SHADOW` `Elevation/highlight` | 0 2 blur 0 | same | same | yes: 2 px band on the top edge |

**No spread is painted, not even the negative one.** The frame does not clip its content, so Figma ignores
the spread of a `DROP_SHADOW` (the render bounds do count it: 124 × 73 in Default, 140 × 89 in
Hover, 110 × 58 in Pressed, which is misleading). Measured in the pixels: 1 px from the left edge the render
reads 237 (`rgba(0,0,0,.065)`), which is the Gaussian model without spread (245 with it); below the button, 220 versus
219 modelled without spread. In code the elevation is only the table's `offset y · blur`, with no spread.

## Known residues

- **The focus halo, over the shadow.** In the file's render the halo (2 px, α 0.31) is seen over the
  bare page: at the sides and below it reads `(190,177,254)` even where there is a shadow under it. In CSS the halo is
  a `box-shadow` above the elevation shadow, so that band comes out darker (about 12 to 24
  units in the lower band). An opaque background behind the halo would match it, but it would break the button on
  any background that is not the page. Not copied.
- The compared pixels (Default, Hover, Pressed): shadow below and to the left within 6 of 255.

## What the file does that looks odd (copied anyway)

- The Disabled fill is two layers: `Surface/page` with `Action/disabled/default` on top.
- `Hover` and `Pressed` of `soft` and `inverse` stack a translucent layer; in `default · solid` and
  `secondary · solid` there is a hover / pressed role of its own.
- The label carries 8 px of right padding in addition to the root's 12: with a label, the
  content ends up 8 px further from the right edge than from the left.
- The Hover and Pressed states change only the elevation and the fill: the icon and text do not move.

## Nests

The icon is an instance of `Plus / Format=Outline, Weight=Regular` (the file's icon set,
already in code). It nests no other components. `FABGroup` lives on the same page and is another component.
