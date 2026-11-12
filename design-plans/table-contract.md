# Table (page «❖ Table (✓)» 1023:120189) — contract, read 2026-11-12

Parts live in `escala-ui/table.tsx`. Build order: TableCell, TableHead, TableMediaCell, TableTrendCell, TableResizer, TableRow, TableHeader, TableFooter, TableCaption, TableDropIndicator, TableEmpty, TableLoading, TableLoadMore, Table.

## TableCell (1024:18323, 48 variants) — READ
Props (panel order): Size default·xs·sm·lg · Align start·end · Pinned none(default)·start·end · State Default·Disabled · Label T `Cell text` · LabelVisible true · Description T `Supporting text` · DescriptionVisible false · LeadingVisible false · Leading SLOT (Checkbox default) · TrailingVisible false · Trailing SLOT (IconButton secondary ghost default).
Geometry: root 200 wide, fixed HEIGHT default 48 · xs 32 · sm 40 · lg 56 (no variable on the height), row, align MIN/CENTER, gap Spacing/gap-control (8), padding Y gap-tight (4) X inset-control (12), NO fill, NO stroke. Children: `Leading` slot (hidden by default; Checkbox sm for xs/sm, default for default/lg), `content` column (FILL, gap 0, align MIN, Align=end → MAX) with `label` Type/body-sm Content/primary (Disabled → Content/disabled) and `description` Type/helper Content/secondary (Disabled → Content/disabled); `Trailing` slot (IconButton ghost secondary: xs/sm → xs 24, default/lg → sm 32).
Pinned start/end: absolute `pin-edge` rectangle 1 × height, fill Border/default, width Stroke/divider; start → x = right (199), end → x = 0 (left).
Description: Type/helper (16 line). Disabled has no fill change.
Description of the set: Align=end is the numeric column (tabular figures in code); the row-header column uses th scope=row.

## TableHead (1024:21090, 144 variants) — READ
Props: Size default·xs·sm·lg · Align start·end · Pinned none·start·end · Sort none·ascending·descending · State Default·Hover · Label T `Column` · LabelVisible true · LeadingVisible false · Leading SLOT (Checkbox) · ResizerVisible false.
Geometry as TableCell (heights 48/32/40/56, padding gap-tight × inset-control, gap gap-control) with fill Surface/muted (Hover: Surface/muted-hover; hover only for sortable). Children: Leading slot, `content` row (FILL, gap gap-tight 4, align MIN; end → MAX) holding `label` Type/label (Content/secondary; Sort ascending/descending → Content/primary) and a `sort-icon` (icon ArrowUp / ArrowDown, 16 = Size/icon-sm, Content/primary) only when sorted; `resizer` instance of TableResizer absolute x196 y0 (9 × height), hidden by default.
Pinned: same `pin-edge` as TableCell (Border/default, 1px) .
Colours invariant of Size × Align (18 groups of 8 confirmed).

## TableResizer (1030:5794, 3) — READ
Prop State Default·Hover·Resizing. Root row centred, padding X gap-tight (4), height = the head's (48 in the set), width 9 (handle 1 + 8) · 10 on Hover/Resizing. `handle` rect: Default 1px wide (Stroke/divider) NO fill (invisible at rest); Hover 2px (Stroke/focus) Border/strong; Resizing 2px Border/accent. Separator role, vertical, arrow keys.

## TableMediaCell (1035:8122, 16) — READ
Props order: Label T `Studio portrait` · LabelVisible · Description T `media/photo-11` · DescriptionVisible false · Image SWAP (media/photo-11) · Size default·xs·sm·lg · Ratio square·wide · State Default·Disabled.
Geometry = cell (200 × 48/32/40/56, padding 4 × 12, gap 8, no fill). `media`: height = Size/control-md 40 (default) · control-xs 24 (xs) · control-sm 32 (sm) · control-lg 48 (lg), width = h (square) or 2h (wide: 80 × 40), radius Radius/control. `content` column FILL: `label` Type/body-sm Content/primary, `description` Type/helper Content/secondary (Disabled → Content/disabled both). Image sample = a photo (media/photo-11): code paints the system's avatar gradient, no stock image.

## TableTrendCell (1035:8123, 24) — READ
Props: Value T `4,335.50` · Delta T `12.4%` · DeltaVisible true · Size · Trend up·down·neutral · State Default·Disabled.
Cell geometry as TableCell but row justified MAX (right aligned), gap gap-control 8. `value` Type/body-sm Content/primary (Disabled → Content/disabled; tabular figures in code); `delta` row (gap gap-tight 4) with `trend-icon` 16 (Size/icon-sm; TrendUp / TrendDown / Minus) + `delta-label` Type/helper. Colour: up Status/success/content, down Status/critical/content, neutral Content/secondary; Disabled → Content/disabled for value, icon and label.
