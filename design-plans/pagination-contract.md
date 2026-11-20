# Contract · Pagination, PaginationLink and PaginationEllipsis (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Pagination (✓) WIP": `Pagination` (989:714, 8 variants), `PaginationLink` (988:330, 40),
`PaginationEllipsis` (988:343, 4). Read-only. Ledger: Pagination `rebuild`, the others `part`.

## API (variants first, then the rest of the panel)
- Pagination: `Size` default · xs · sm · lg (default default) · `Variant` compact · compact-grouped (default compact-grouped) · `Content` (slot: PaginationLink and PaginationEllipsis) · `JumpButtonsVisible` false (First and Last).
- PaginationLink: `Size` · `State` Default · Hover · Pressed · Focused · Disabled · `Active` false · true · `Label` "1".
- PaginationEllipsis: `Size`.
Description: First/Previous, numbered links and ellipsis in the Content, Next/Last; `nav aria-label="pagination"`; disable First/Prev on page 1 and Next/Last on the last.

## Geometry
- compact-grouped: the root is a group of OUTLINE buttons (radius `Radius/action`, stroke `Border/control` 1 INSIDE outside the layout, effects `Elevation/shadow-ring` spread 1 and `shadow-ambient` 0 1 2 = Shadow/xs): children first (hidden) · prev · Content · next · last (hidden),
  all ButtonGroupItem (outline, IconOnly for first / prev / next / last; the links are ButtonGroupItem with the label, Active = `Surface/selected` fill) and a `ButtonGroupDivider` (1px `Border/control`) between each pair,
  also inside the Content (including the ellipsis). Gap 0. Height = the item's height (`Size/control-md|xs|sm|lg` = 40 · 24 · 32 · 48). 258×40 with prev + Content (1, 2 active, 3, …, 10) + next; xs 210×24, sm 234×32, lg 282×48.
- compact: HORIZONTAL gap `Spacing/gap-tight` (4) with no background: first (hidden) and prev / next / last are IconButton (secondary · ghost · same Size), Content gap 4 with PaginationLink and PaginationEllipsis. 304×40 (xs 192, sm 248, lg 360).
- PaginationLink: HORIZONTAL centre, height = `Size/control-*`, min width = its height (40×40 with one digit), padding X `Spacing/gap-tight` (4) in all sizes, gap `gap-control` (8) (xs: gap-tight), radius `Radius/action`, `Type/button`.
  Active: stroke `Border/control` 1 INSIDE (without growing). Ink always `Content/primary` (Disabled `Content/disabled`).
- PaginationEllipsis: square box `Size/control-md|xs|sm|lg` (40 · 24 · 32 · 48), DotsThree icon 20 · 16 · 16 · 24 (`icon-md|sm|sm|lg`), ink `Content/secondary`, no fill or stroke, not interactive.

## PaginationLink colour (Size changes nothing)
Default no fill; Hover `Action/ghost/hover`; Pressed `Action/ghost/pressed`; Focused stroke `Border/focus` 2 INSIDE + `focus-ring` 2 OUTSIDE `Border/ring/default` (Active also loses its control stroke in Focused); Disabled no fill.
Active keeps its `Border/control` stroke in Hover, Pressed and Disabled.

## Odd (copied as is)
- The two Pagination variants do not share components: the grouped one reuses ButtonGroupItem / ButtonGroupDivider, the compact one IconButton and PaginationLink; that is why the active link is a fill in one and a stroke in the other.
- The grouped variant's ellipsis carries dividers on both sides like any item.
- The active link's ink does not change to accent (only the fill / stroke marks it; the description asks not to rely on colour alone).
