# Contract · TabMenu, TabMenuItem and TabMenuLineItem (from Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ TabMenu (✓) WIP": `TabMenu` (984:1830, 12 variants), `TabMenuItem` (984:939, 15),
`TabMenuLineItem` (984:1156, 30). Read-only. Ledger: TabMenu `rebuild`, the other two `part`.

## API (variants first, then the rest of the panel)
- TabMenu: `Size` default · sm · lg (default default) · `Variant` horizontal-line · horizontal-button · vertical-line · vertical-button (default horizontal-line) · `Content` (slot).
- TabMenuItem (button): `Size` · `State` Default · Hover · Selected · Focused · Disabled · `Label` "Overview" · `IconLeadingVisible/Icon` (default house) · `TrailingVisible` (a Badge) ·
  `IconTrailingVisible/Icon` (default caret-down).
- TabMenuLineItem: same + `Indicator` bottom · left (default bottom).
File description: group of real buttons, `role="group"`, `aria-pressed`, each item its own tab stop, Space or Enter activate.

## Geometry
TabMenu root: HORIZONTAL (vertical: VERTICAL) with no gap or padding, hug. `*-line` variants: absolute `track` rectangle, `Border/subtle`, 1px (`Stroke/divider`): at the bottom and full width
(horizontal, y = height − 1) or on the left and full height (vertical). `Content` slot: gap 0 in line, `Spacing/gap-tight` (4) in button. Vertical: the items fill the width (224 in the example).
Horizontal width measured with Overview / Activity / Members+badge / Settings: 325 (line) and 337 (button, 3 gaps of 4); height = item height.
Items (both sets): HORIZONTAL centre, height `Size/control-md|sm|lg` (40 · 32 · 48), radius `Radius/action`, padding X `Spacing/inset-control` (12) at ALL sizes, Y 0,
gap `Spacing/gap-control` (8), `Type/button`. Icons `Size/icon-md|sm|lg` (20 · 16 · 24). Trailing: Badge instance (xs · soft · pill · number · secondary, count 8, 16×16 with `Radius/full`).
Selected: Item fills `Surface/selected`, ink `Content/accent`; LineItem has no fill, accent ink and `indicator` (absolute 2px rectangle = `Stroke/focus`, `Border/accent`): bottom → x0, y = height − 2, full
width; left → x0 y0, 2 × full height; only visible in Selected.
Colors (Size changes nothing): Default ink `Content/secondary`; Hover ink `Content/primary` and, only in Item, fill `Action/ghost/hover`; Selected above; Focused ink secondary + `Border/focus` 2px INSIDE stroke
(does not count in the layout) + `focus-ring` 2px OUTSIDE `Border/ring/default`; Disabled `Content/disabled`.

## Odd bits (copied anyway)
- Padding X does not shrink with Size (12 at sm and lg).
- The TabMenu no longer slides a pill: the file paints the selection static (no `SlidingSelection`); the semantics go from `tablist/tab` to `group` + `aria-pressed`.
- The LineItem's focus also carries a full 2px stroke all around even though the indicator is a bar.
