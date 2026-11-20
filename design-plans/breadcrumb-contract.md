# Contract · Breadcrumb, BreadcrumbItem, BreadcrumbEllipsis and BreadcrumbSeparator (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Breadcrumb (✓) WIP": `Breadcrumb` (402:7814, 27 variants), `BreadcrumbItem` (402:998, 90),
`BreadcrumbEllipsis` (402:999, 72), `BreadcrumbSeparator` (402:1000, 9). Read-only. Ledger: Breadcrumb `rebuild`, the other three `part`. Prototypes (868:17264…) not read.

## API (variants first, then the rest of the panel)
- Breadcrumb: `Appearance` ghost · outline · solid (def ghost) · `Separator` chevron · slash · dot (def chevron) · `Size` xs · sm · default (def default) ·
  `EllipsisVisible` false · `Item2Visible` true · `Item3Visible` true (composition: in code these are children).
- BreadcrumbItem: `Variant` default · secondary · `Appearance` ghost · outline · solid · `Size` xs · sm · default · `State` Default · Hover · Focused · Current · Disabled ·
  `Label` · `IconLeadingVisible/Icon` (def house) · `IconTrailingVisible/Icon` (def caret-down).
- BreadcrumbEllipsis: `Variant` · `Appearance` · `Size` · `State` Default · Hover · Focused · Disabled (no Current).
- BreadcrumbSeparator: `Variant` chevron · slash · dot (def chevron) · `Size` xs · sm · default.

## Geometry
Breadcrumb root: HORIZONTAL, children (item, sep, [collapsed: ellipsis + sep], item, sep, item, sep, item Current). Gap between elements: xs `Spacing/none` (0) · sm and default
`Spacing/gap-tight` (4). Measured widths: chevron xs 272 · sm 344 · default 426 (4 items Home/Projects/Escala/Breadcrumb, 3 separators, with the ellipsis hidden). Slash default 381, xs 236, sm 311.
BreadcrumbItem: HORIZONTAL center, radius `Radius/control` 8. xs: height `Size/control-xs` 24, padding X `Spacing/gap-tight` 4, gap 4, icon `Size/icon-sm` 16, label `Type/caption`.
sm: 32 (`control-sm`), padding X `gap-control` 8, gap 4, icon 16, `Type/body-sm`. default: 40 (`control-md`), padding X `inset-control` 12, gap `gap-control` 8, icon `Size/icon-md` 20, `Type/body-md`.
Outline: stroke `Stroke/control` (1) INSIDE and counted in the layout (Default 62 = 60 + 2). Ghost / solid have no stroke except Focused (literal 1 stroke INSIDE, also in the layout: 62).
BreadcrumbEllipsis: fixed square box `Size/control-xs|sm|md` (24 · 32 · 40), no padding, radius 8, DotsThree icon 16 · 16 · 20; same appearances (outline: stroke `Stroke/control`).
BreadcrumbSeparator: centered box: chevron (CaretRight) and dot (Dot) at 16 · 16 · 20 (`icon-sm`, `icon-sm`, `icon-md`); slash is the "/" text in `Type/body-md` (5×21 at default; 4 and 5 wide at xs and sm because of the sums); ink `Content/subtle`.

## Color (Variant × Appearance × State; Size changes nothing)
Ink (label and icons): default Default/Focused `Content/secondary`, Hover `Content/accent`, Current `Content/primary`, Disabled `Content/disabled`; secondary: Hover `Content/primary`, the rest the same.
- ghost: no fill or stroke. Focused: stroke `Border/focus` (secondary `Border/strong`) + `focus-ring` (absolute frame, stroke 2 OUTSIDE) `Border/ring/default` (secondary `Border/subtle`).
- outline: Default stroke `Border/control`; default Hover `Border/accent`, secondary `Border/control-hover`; Focused `Border/focus` / `Border/strong` + ring; Current `Border/default`; Disabled `Border/subtle`.
- solid: fill `Surface/muted`; default Hover `Surface/accent`, secondary `Surface/muted-hover`; Focused and Current `Surface/muted` (+ stroke and ring on Focused); Disabled `Action/disabled/default`.
- Ellipsis: same without Current.

## Odd (copied as is)
- The Focused variant of ghost / solid grows the box by 2px because the stroke is counted in the layout; in code the stroke is an always-present transparent 1px border (the padding
  gives it back) and focus only changes the color: no layout jump (decision of the brief). Outline does carry the stroke in the layout at rest too (62).
- The `slash` separator is text, not an icon; `dot` is the Dot glyph.
- Hover on a secondary item goes to `Content/primary`, not accent.
- The Current item is not interactive (`aria-current="page"`, no link) but it does carry its own fill / stroke per appearance.

## Nests
Phosphor icons (House, CaretDown, DotsThree, CaretRight, Dot). Items and separators go in `<li>` inside `<ol>`; the ellipsis is a `<button>` with `aria-label`.

## Correction 2026-11-14 (measured in Storybook against Figma)
- **The trail was stacking in a column.** The `<ol>` carried `flex-wrap` (inherited from shadcn) and the root was `flex` (block): in any
  parent that shrinks to its content (Storybook's centered canvas, a bar) the root measured 0 wide and the list broke into one item
  per line. Figma: root HORIZONTAL `AUTO/AUTO` (hugs) and `layoutWrap` NO_WRAP. Now the root is `inline-flex` and the list `flex-nowrap`.
- Measured afterwards (default ghost chevron): items @0 · 119 · 224.8 · 319.4, separators @95 / 200.8 / 295.4 y=10, 424.3×40 against Figma
  @0 · 120 · 226 · 321, 426×40. The difference (≤ 1.7 px accumulated) is text metrics: Figma rounds each label's width
  up ("Home" 40 against 39.04). Paddings, gaps, heights, icons and separators match to the pixel at xs · sm · default and in the
  three appearances (outline +2 for the stroke in the layout).
- Odd in the file (left as is): the hidden `collapsed` frame measures 56×32 but contains a 40×40 ellipsis (old frame size).
