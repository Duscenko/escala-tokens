# Contract · NavItem, Brand and AccountMenuTrigger (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`: `NavItem` (1095:19644, 15 variants, "❖ NavItem"), `Brand` (1098:42, 2, "❖ Brand"),
`AccountMenuTrigger` (1098:119, 8, "❖ AccountMenuTrigger"; "Account Manager" in the brief). Read-only. All three are in the ledger as `new` (no prior code; `Navbar` is a different component and is not touched).

## NavItem
Variants: `Size` default · sm · lg · `State` Default · Hover · Current · Focused · Disabled; then `Label` "Overview", `IconLeadingVisible/Icon` (house), `TrailingVisible` (Badge xs · soft · pill · number · secondary, count 8),
`IconTrailingVisible/Icon` (caret-down). It is a TabMenuItem whose selected state is called `Current`: HORIZONTAL centre, height 40 · 32 · 48 (`Size/control-md|sm|lg`), radius `Radius/action`, padding X `Spacing/inset-control` in
all sizes, gap `Spacing/gap-control`, `Type/button`, icons 20 · 16 · 24. Default ink `Content/secondary`; Hover fill `Action/ghost/hover` and `Content/primary`; Current fill `Surface/selected` and `Content/accent`;
Focused stroke `Border/focus` 2px INSIDE (outside the layout) + `focus-ring` 2px OUTSIDE `Border/ring/default`; Disabled `Content/disabled`. Description: header navigation link or menu trigger; Current = `aria-current="page"`,
with a caret it opens a NavigationMenu (`aria-expanded`).

## Brand
Variants: `Size` default · sm; `Logo` (slot), `Name` "Escala", `VersionVisible` true. Hug row, no padding, gap `Spacing/gap-control`, centred. default 139×32: logo = Avatar (icon · sm 32 · rounded · default · solid) with the Stack glyph
(Phosphor), name `Type/heading-sm` `Content/primary`, version = Badge (soft · rounded · xs · default · secondary, "v1.1", 26×16). sm 122×26: Avatar xs 24, name `Type/heading-xs`.

## AccountMenuTrigger
Variants: `Size` default · sm · `State` Default · Hover · Pressed · Focused; `Name` "Ayla", `NameVisible` true. HORIZONTAL button, centre, height 40 / 32, radius `Radius/action`, left padding `Spacing/gap-tight` (4) and right `Spacing/inset-control` (12) (Figma: pad 0/12/0/4 = top/right/bottom/left), gap `Spacing/gap-control` (8); Avatar (image · sm 32 / xs 24), name `Type/button` `Content/primary`, caret 20 / 16. 109×40 and 97×32 with "Ayla". Hover fill `Action/ghost/hover`, Pressed
`Action/ghost/pressed`, Focused stroke `Border/focus` 2 INSIDE + ring 2 OUTSIDE.

## Odd (copied as is)
- The AccountMenuTrigger's avatar is a CIRCLE in Default and a rounded square (`Radius/control`) in Hover · Pressed · Focused.
- The AccountMenuTrigger's left padding is 4 and the right is 12 (the avatar sits 4 from the edge).
- The focus of all three has a 2px stroke inside and a halo outside without growing the box (box-shadow), like the other controls.
