# Table Prototype (section `1025:2250`, instance `Table / Prototype` 1025:2251) — contract, read 2026-11-13

Read-only, depth-walked in passes < 48 KB. The section is ONE doc board (`DocBoardPrototype`, 1824 × 1603) with intro text and two `DocPrototypeExample` frames. Each example holds a `Table` instance at desktop width 1440 × 290 (a 1438 × 288 content) with a window chrome around it (three dots).

Intro (copied): «This board shows the Table at desktop width (1440) with real people data: Avatar with photos from the Media library, Badge for department and status, ProgressLine for progress. Light shows resting, hover, selected and disabled rows; Dark adds grid dividers, a pinned column, sorting, resizing and the scrolled header. Hover rows in the prototype.»
Header description of the board: «Displays structured records in rows and columns with sortable headers and selectable rows. Two appearances, two divider styles, four sizes and no root states; give the table an aria-label and keep Pagination outside it.»

## Example Light — «RESTING · HOVER · SELECTED · DISABLED»
`Table` Size default · Appearance filled · Dividers rows. Header `TableHeader` Size default · Dividers rows · **Scrolled false**.
Columns (widths, sum 1440 − 2): 56 · 320 · 200 · 240 · 160 · 200 · 264.

| # | Head | Head props | Cell content (every row) |
|---|---|---|---|
| 1 | (select-all) | `LeadingVisible` true, `LabelVisible` false, Leading = **Checkbox default, Checked `indeterminate`** | `TableCell` LeadingVisible, LabelVisible false, Leading = Checkbox default (`Checked` false · true on the selected row · Disabled on the disabled row) |
| 2 | **Name** | **Sort ascending** (ArrowUp icon) | media cell: Leading = **Avatar** 40 (Type image, circle, secondary, soft, Photo from Media), label name (body-sm) + description email (`DescriptionVisible`) |
| 3 | Department | — | LeadingVisible, LabelVisible false, Leading = **Badge** soft · pill · sm · secondary (Label = department) |
| 4 | Role | — | label only |
| 5 | Status | — | Leading = **Badge** soft · pill · sm · success (Active) / warning (On leave) / secondary (Inactive) |
| 6 | Join date | — | label only |
| 7 | Progress | — | Leading = **ProgressLine** xs · solid, 160 wide, Value 75 · 50 · 25 · 100 · 0 |

Rows (TableRow Size default, Dividers rows, no pinned, no resizer):
1. State **Default** — Olivia Martin · olivia@escala.design · Design · Lead Designer · Active · Jan 12, 2025 · 75
2. **Default** — Karim Haddad · karim@escala.design · Engineering · Senior Engineer · Active · Mar 3, 2025 · 50
3. **Selected** (checkbox true) — Sofia Rossi · sofia@escala.design · Product · Product Manager · On leave (warning) · Aug 21, 2025 · 25
4. **Hover** — Ethan Walsh · ethan@escala.design · Marketing · Growth Lead · Active · Nov 5, 2024 · 100
5. **Disabled** (every cell + checkbox State Disabled) — Noah Dubois · noah@escala.design · Design · Product Designer · Inactive (secondary) · Jun 18, 2024 · 0

## Example Dark — «GRID · PINNED · SORTED · RESIZING» (the dark chrome is the page's Dark mode; same data)
`Table` default · filled · **Dividers grid**. `TableHeader` Dividers grid · **Scrolled true**.
Differences from Light, nothing else changes:
- **Name** head: `Pinned start`, Sort none (shows the `pin-edge`, 1px); its column cells (rows 1–5) are **Pinned start** (the disabled row's cell too, State Disabled).
- **Role** head: `ResizerVisible` true holding a `TableResizer` in **State Resizing**.
- **Join date** head: **Sort descending** (ArrowDown).
- Rows keep the same states (Default · Default · Selected · Hover · Disabled), each row with **Dividers grid**.
- Selected row's Department badge shows no pill fill in the screenshot (hover/selected composite); same Badge props as Light.

## What the code has / needs
Everything the prototype draws already exists as a part (TableHead sort/pinned/resizer, TableCell leading slot + pinned, TableRow states, TableHeader scrolled). Missing, and built tal cual:
- A composed **TablePrototype** (docs/story composition, not an escala-ui part): real behaviour for the select-all indeterminate Checkbox, row selection, click-to-sort on Name / Join date, a Resizing handle state, Pinned Name column.
- Photos: the file uses stock photos (`904:6116…`). Code has no photos → the Avatar draws the system's **gradient fill** (see Avatar group fix, same commit family), one hue per person.
- Specimen/overview: Table overview gets the two prototype rows.

## Owner's call (2026-11-13)
The Name column's Avatar is `sm` (32) in code, not the file's `default` (40): with the gradient stand-in instead of photos, 40 read too big. Everything else stays the file's.
Also (same day): the Dark example's Role handle is NOT pinned in Resizing (the file draws it Border/accent; it read as a stray divider). It rests like the other heads' edges and lights on hover / drag; the `Resizer` control still pins it.
