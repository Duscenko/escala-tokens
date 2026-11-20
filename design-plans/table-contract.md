# Table (page "‚ùñ Table (‚úì)" 1023:120189) ‚Äî contract, read 2026-11-12

Parts live in `escala-ui/table.tsx`. Build order: TableCell, TableHead, TableMediaCell, TableTrendCell, TableResizer, TableRow, TableHeader, TableFooter, TableCaption, TableDropIndicator, TableEmpty, TableLoading, TableLoadMore, Table.

## TableCell (1024:18323, 48 variants) ‚Äî READ
Props (panel order): Size default"∑xs"∑sm"∑lg "∑ Align start"∑end "∑ Pinned none(default)"∑start"∑end "∑ State Default"∑Disabled "∑ Label T `Cell text` "∑ LabelVisible true "∑ Description T `Supporting text` "∑ DescriptionVisible false "∑ LeadingVisible false "∑ Leading SLOT (Checkbox default) "∑ TrailingVisible false "∑ Trailing SLOT (IconButton secondary ghost default).
Geometry: root 200 wide, fixed HEIGHT default 48 "∑ xs 32 "∑ sm 40 "∑ lg 56 (no variable on the height), row, align MIN/CENTER, gap Spacing/gap-control (8), padding Y gap-tight (4) X inset-control (12), NO fill, NO stroke. Children: `Leading` slot (hidden by default; Checkbox sm for xs/sm, default for default/lg), `content` column (FILL, gap 0, align MIN, Align=end ‚Üí MAX) with `label` Type/body-sm Content/primary (Disabled ‚Üí Content/disabled) and `description` Type/helper Content/secondary (Disabled ‚Üí Content/disabled); `Trailing` slot (IconButton ghost secondary: xs/sm ‚Üí xs 24, default/lg ‚Üí sm 32).
Pinned start/end: absolute `pin-edge` rectangle 1 √ó height, fill Border/default, width Stroke/divider; start ‚Üí x = right (199), end ‚Üí x = 0 (left).
Description: Type/helper (16 line). Disabled has no fill change.
Description of the set: Align=end is the numeric column (tabular figures in code); the row-header column uses th scope=row.

## TableHead (1024:21090, 144 variants) ‚Äî READ
Props: Size default"∑xs"∑sm"∑lg "∑ Align start"∑end "∑ Pinned none"∑start"∑end "∑ Sort none"∑ascending"∑descending "∑ State Default"∑Hover "∑ Label T `Column` "∑ LabelVisible true "∑ LeadingVisible false "∑ Leading SLOT (Checkbox) "∑ ResizerVisible false.
Geometry as TableCell (heights 48/32/40/56, padding gap-tight √ó inset-control, gap gap-control) with fill Surface/muted (Hover: Surface/muted-hover; hover only for sortable). Children: Leading slot, `content` row (FILL, gap gap-tight 4, align MIN; end ‚Üí MAX) holding `label` Type/label (Content/secondary; Sort ascending/descending ‚Üí Content/primary) and a `sort-icon` (icon ArrowUp / ArrowDown, 16 = Size/icon-sm, Content/primary) only when sorted; `resizer` instance of TableResizer absolute x196 y0 (9 √ó height), hidden by default.
Pinned: same `pin-edge` as TableCell (Border/default, 1px) .
Colours invariant of Size √ó Align (18 groups of 8 confirmed).

## TableResizer (1030:5794, 3) ‚Äî READ
Prop State Default"∑Hover"∑Resizing. Root row centred, padding X gap-tight (4), height = the head's (48 in the set), width 9 (handle 1 + 8) "∑ 10 on Hover/Resizing. `handle` rect: Default 1px wide (Stroke/divider) NO fill (invisible at rest); Hover 2px (Stroke/focus) Border/strong; Resizing 2px Border/accent. Separator role, vertical, arrow keys.

## TableMediaCell (1035:8122, 16) ‚Äî READ
Props order: Label T `Studio portrait` "∑ LabelVisible "∑ Description T `media/photo-11` "∑ DescriptionVisible false "∑ Image SWAP (media/photo-11) "∑ Size default"∑xs"∑sm"∑lg "∑ Ratio square"∑wide "∑ State Default"∑Disabled.
Geometry = cell (200 √ó 48/32/40/56, padding 4 √ó 12, gap 8, no fill). `media`: height = Size/control-md 40 (default) "∑ control-xs 24 (xs) "∑ control-sm 32 (sm) "∑ control-lg 48 (lg), width = h (square) or 2h (wide: 80 √ó 40), radius Radius/control. `content` column FILL: `label` Type/body-sm Content/primary, `description` Type/helper Content/secondary (Disabled ‚Üí Content/disabled both). Image sample = a photo (media/photo-11): code paints the system's avatar gradient, no stock image.

## TableTrendCell (1035:8123, 24) ‚Äî READ
Props: Value T `4,335.50` "∑ Delta T `12.4%` "∑ DeltaVisible true "∑ Size "∑ Trend up"∑down"∑neutral "∑ State Default"∑Disabled.
Cell geometry as TableCell but row justified MAX (right aligned), gap gap-control 8. `value` Type/body-sm Content/primary (Disabled ‚Üí Content/disabled; tabular figures in code); `delta` row (gap gap-tight 4) with `trend-icon` 16 (Size/icon-sm; TrendUp / TrendDown / Minus) + `delta-label` Type/helper. Colour: up Status/success/content, down Status/critical/content, neutral Content/secondary; Disabled ‚Üí Content/disabled for value, icon and label.

## TableRow (1024:22071, 48) ‚Äî READ
Props: Content SLOT (TableCell instances, Size follows the row) "∑ Size default"∑xs"∑sm"∑lg "∑ State Default"∑Hover"∑Selected"∑Focused"∑Disabled"∑Dragging "∑ Dividers rows(default)"∑grid.
Root 800 wide, height 48/32/40/56, row MIN/MIN, gap 0. Default: bottom stroke 1px Border/subtle (sides 0,0,1,0, INSIDE). Hover: fill Action/ghost/hover. Selected: fill Surface/selected. Focused: stroke Border/focus 2px ALL sides inside, NO bottom divider, no fill. Disabled = Default look (cells carry the disabled ink). Dragging: fill Surface/layer-2, stroke Border/default 1px all sides. Dividers=grid: every cell except the last gets a RIGHT stroke 1px Border/subtle (sides 0,1,0,0 inside; the last cell is 199 wide instead of 200 in the sample). The row itself is identical in rows / grid. Desc: hover only on selectable/actionable rows; selected ‚Üí aria-selected; disabled ‚Üí aria-disabled.
Sample cells: Olivia Martin "∑ Design "∑ Active "∑ 1,280.00 (Align=end).

## TableHeader (1024:22168, 16) ‚Äî READ
Props Content slot "∑ Size "∑ Dividers rows"∑grid "∑ Scrolled true"∑false(default). Root 800 √ó 48/32/40/56, bottom stroke 1px Border/subtle (Scrolled=true ‚Üí Border/default). Grid ‚Üí cell right strokes as TableRow. Cells are TableHead.

## TableFooter (1034:8163, 8) ‚Äî READ
Props Content slot "∑ Size "∑ Dividers rows"∑grid. Root 800 √ó height, fill Surface/muted, TOP stroke 1px Border/subtle (sides 1,0,0,0). Cells = TableCell with Type/label values (totals).

## Table (1024:23937, 16) ‚Äî READ
Props Content slot "∑ Size default"∑xs"∑sm"∑lg "∑ Appearance filled(default)"∑ghost "∑ Dividers grid"∑rows(default). Filled: vertical column, radius Radius/container (16), fill Surface/page, stroke Border/default 1px INSIDE AND laid out (800√ó242 = 240 + 2). Ghost: radius none, no fill, no stroke (800√ó240). Content: one TableHeader + TableRow instances (the sample: header, row, selected row, row, disabled row; each row's bottom divider shows, the last one too). Size and Dividers cascade to header / rows / cells.

## Singles ‚Äî READ
- TableCaption (1034:8121, 800√ó47): column gap gap-tight 4; `title` Type/heading-2xs Content/primary ""Team billing""; `description` Type/body-sm Content/secondary ""Invoices for the current billing period, in EUR."".
- TableDropIndicator (1034:8124, 800√ó2): `line` rect height Stroke/focus (2), fill Border/accent.
- TableEmpty (1034:8130, 800√ó192): column CENTER/CENTER, gap gap-group 16, padding inset-page 32 all; `icon` Tray 24 (Size/icon-lg) Content/secondary; `text` column (gap gap-tight, align centre) with `title` Type/label Content/primary ""No invoices yet"" + `description` Type/body-sm Content/secondary ""Invoices appear here once a billing period closes.""; `Action` SLOT default Button secondary outline sm ""Clear filters"".
- TableLoading (1034:8126, 800√ó60): row CENTER/CENTER gap gap-control 8, padding Y inset-surface 20 "∑ X inset-control 12; `spinner` SpinnerGap 20 (Size/icon-md) Content/secondary; `label` Type/body-sm Content/secondary ""Loading data‚Ä¶"".
- TableLoadMore (1034:8164, 2): State Default"∑Loading. Default 800√ó48, row CENTER/CENTER, padding Y gap-control 8; Button secondary ghost sm ""Load more"". Loading 800√ó76 (padding Y 8) holding a TableLoading instance with Label ""Loading more‚Ä¶"".

## BUILT 2026-11-12 (store v137)
Recipes `src/lib/recipes/table.ts` (14 keys), component `escala-ui/table.tsx` (native table elements with explicit roles, flex rows, context cascade of Size / Dividers), catalogue, `FILE_OF`, registry, sitemap, specimens, snippets, overviews, ledger, parity (`WEB_ONLY`), motion (row / head hover, resizer handle), goldens, plugin-studio bundle, stories (Table, TableCell, TableHead, TableMediaCell, TableTrendCell, TableResizer, TableRow, TableHeader, TableFooter, TableParts).
Measured in Storybook (Escala Light) against the file: table 800√ó242 radius 16; header / rows 48 high with the bottom hairline; row states (hover fill, selected fill, focused 2px ring all round, dragging 1px + fill, grid right strokes); heads Surface/muted (hover muted-hover) with sort ink and 16px icon; media 40/24/32/48 and √ó2 wide, radius 8; trend inks up / down / neutral / disabled; resizer 9 / 10 √ó 48 with the handle 1px invisible "∑ 2px Border/strong "∑ 2px Border/accent; caption 800√ó47, drop indicator 800√ó2, empty 800√ó192, loading 800√ó60, load more 800√ó48. axe clean in Dark; Light: Content/secondary on Surface/muted 4.22:1 (head label) as the file binds it.
Not built (no variant in the file): sticky behaviour of Pinned cells (the file draws only the 1px edge) and any column-resize logic (TableResizer is the handle; the consumer resizes).
Odd in the file: the sample row's last cell is 199 wide in grid rows (the right stroke is not counted); Pinned start puts the edge on the RIGHT, end on the LEFT.
