# Contract · CloseButton (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `CloseButton` (`337:2762`,
600 variants), read with `figma-read-set.js` (read-only). This document is what the
recipe, the component and Storybook copy. **Figma rules; nothing is corrected.**

Set description in the file: "Dismiss control for alerts, toasts, dialogs and tags.
Icon-only: always provide an accessible name (aria-label="Close")."

## API

| Figma (panel order) | Type | Default | Options (file order) | React |
|---|---|---|---|---|
| `Appearance` | VARIANT | `soft` | solid · outline · soft · ghost | `appearance` |
| `Shape` | VARIANT | `pill` | rounded · pill · square | `shape` |
| `Size` | VARIANT | `default` | sm · lg · xl · xs · default | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | default · inverse | `variant` |

No boolean, text or swap properties: the glyph is fixed (`icon/X`, Style=Outline).
In code the glyph is built in (Phosphor `x`) and `icon?: ReactNode` lets a system with another
library supply its own (like the Dialog's `closeIcon`). `aria-label` defaults to "Close".
There is no `Loading` (the file does not have it). Appearance × Shape × Size × State × Variant =
4 · 3 · 5 · 5 · 2 = 600 variants.

## Geometry by size

Width = height (square). No padding, no gap. Horizontal centred layout.

| Size | Height / width | Icon |
|---|---|---|
| xs | `Size/control-xs` (24) → `size.hit` | `Size/icon-sm` (16) → `icon.small` |
| sm | `Size/control-sm` (32) → `size.compact` | `Size/icon-sm` (16) → `icon.small` |
| default | `Size/control-md` (40) → `size.control` | `Size/icon-md` (20) → `icon.medium` |
| lg | `Size/control-lg` (48) → `size.touch` | `Size/icon-lg` (24) → `icon.large` |
| xl | `Size/control-xl` (56) → `size.fab` | `Size/icon-lg` (24) → `icon.large` |

Radius by `Shape`: rounded `Radius/action` (12) → `radius.action` · pill `Radius/full` →
`radius.pill` · square `Radius/none` → `radius.none`. Identical across all five sizes.

Stroke: **only `outline`** has a stroke: `Stroke/control` (1) on the inside. Solid, soft and ghost have
none (in CSS `stroke.none`). There is no padding, so there is nothing to subtract.

## Colour by combination and state

The colour is **identical across the 15 Shape × Size combinations** (measured: a single signature per
Appearance · Variant · State). `fill A + B` = two stacked fills: `A` at the bottom, `B` on top
(`fills[0]` is the bottom one in the API); `B` is a variable with its own alpha (the `opacity` that the API
returns on the fill is the variable's alpha, not a second multiplier).

### Variant = default

| Appearance | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| soft | fill `Action/secondary/default` · ink `Content/on-secondary` | fill `Action/secondary/hover` | fill `Action/secondary/pressed` | as Default + halo `Border/subtle` | fill `Action/disabled/default` · ink `Content/disabled` |
| solid | fill `Surface/inverse` · ink `Content/inverse` | fill `Surface/inverse` + `Surface/inverse-muted` | `Surface/inverse` + `Surface/inverse-muted` ×2 | as Default + halo `Border/subtle` | `Action/disabled/default` · `Content/disabled` |
| outline | stroke `Border/control` (1) · ink `Content/primary` | + fill `Action/ghost/hover` | + fill `Action/ghost/pressed` | stroke `Border/strong` (2, inside) + halo `Border/subtle` | stroke `Border/control` · ink `Content/disabled` |
| ghost | ink `Content/secondary` | fill `Action/ghost/hover` · ink `Content/primary` | fill `Action/ghost/pressed` · ink `Content/primary` | stroke `Border/strong` (2) + halo `Border/subtle` · ink `Content/secondary` | ink `Content/disabled` |

### Variant = inverse

| Appearance | Default | Hover | Pressed | Focused | Disabled |
|---|---|---|---|---|---|
| soft | fill `Surface/inverse-muted` · ink `Content/inverse` | `Surface/inverse-muted` ×2 | `Surface/inverse-muted` ×3 | as Default + halo `Surface/inverse-muted` | `Action/disabled/default` · `Content/disabled` |
| solid | fill `Surface/page` · ink `Content/primary` | `Surface/page` + `Action/ghost/hover` | `Surface/page` + `Action/ghost/pressed` | as Default + halo `Surface/inverse-muted` | `Action/disabled/default` · `Content/disabled` |
| outline | stroke `Border/inverse` (1) · ink `Content/inverse` | + fill `Surface/inverse-muted` | + fill `Surface/inverse-muted` ×2 | stroke `Border/inverse` (2) + halo `Surface/inverse-muted` | stroke `Border/control` · ink `Content/disabled` |
| ghost | ink `Content/inverse-secondary` | fill `Surface/inverse-muted` · ink `Content/inverse` | fill `Surface/inverse-muted` ×2 · ink `Content/inverse` | stroke `Border/inverse` (2) + halo `Surface/inverse-muted` · ink `Content/inverse-secondary` | ink `Content/disabled` |

## Focus

A child `focus-ring` frame the size of the control, with the control's radius, no fill, a stroke of
`Stroke/focus` (2) **outside** (`OUTSIDE`), coloured with the halo from the table. Only in `Focused`.
- `soft` and `solid`: **halo only**, no border of their own (the control has no stroke in Focused).
- `outline` and `ghost`: in addition the control itself carries a 2 px stroke **inside** in the
  border colour from the table (outline: replaces the 1 px stroke).

Different from Button (`Border/focus` + `Border/ring/default` on all) and from IconButton (`Border/strong`
border + halo in two solids): the code copies each set separately.

## Effects

None. No shadow and no top highlight (unlike solid Button / IconButton): no
`effects` in any variant of the sample.

## What the file does that looks odd (copied anyway)

- The Hover and Pressed states are drawn by **stacking** the same fill with alpha (`Surface/inverse-muted`
  two or three times), not with a hover / pressed role of their own. That is what the file asks for; in the recipe they are
  `overlay` and `overlay2` on top of `fill`.
- The `Size` options are in the order `sm · lg · xl · xs · default`; the Storybook menu
  shows them that way.
- `Variant=inverse · Disabled · outline` uses `Border/control`, not `Border/inverse`.
- `solid · default` has no role-based hover of its own: it lightens its own dark fill with a light veil
  (`inverse-muted` is white in Light, black in Dark).

## Nests

The icon is an instance of `icon/X / Style=Outline` (the file's icon set, already in the
code as `close`). It nests no other components.
