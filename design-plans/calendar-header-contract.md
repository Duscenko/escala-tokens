# Contract · CalendarHeader (from Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓)`, set `CalendarHeader`
(`422:355`, 6 variants), read with `figma-read-set.js` (adapted) + a position read (read-only). **Figma rules; nothing is corrected.**

Set description: "Calendar header. Header=single: one combined month/year chip; multiple: separate month and year chips; plain:
static heading with no picker. Prev/next arrows flank the title. Width = 7 day cells."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Header` single · multiple · plain | VARIANT | `single` | `header` (`data-header`) |
| `Label` | TEXT | `"November 2026"` | `label` (single, plain) |
| `Month` | TEXT | `"November"` | `month` (multiple) |
| `Year` | TEXT | `"2026"` | `year` (multiple) |

Code extras (not in the set): `onPreviousMonth`, `onNextMonth`, `onLabelClick`, `onMonthClick`, `onYearClick`.

## Geometry
Root: HORIZONTAL frame, SPACE_BETWEEN / centred, no fill or stroke, FIXED width = 7 day cells, height = that of the buttons.

| Size | Root | Nav button | Nav glyph | Label |
|---|---|---|---|---|
| default | 280×32 (7 × `Size/control`) | 32×32 (`Size/compact`) | 20×20 (`icon.medium`), vector 8×14 | `Type/body-md` |
| sm | 224×28 (7 × `Size/compact`) | 28×28 (no token: `Spacing/6 + Spacing/1`) | 16×16 (`icon.small`), vector 6×11 | `Type/body-sm` |

- `nav-prev` / `nav-next`: `Radius/action`, `Border/control` 1px stroke **INSIDE**, no fill, `Content/secondary` glyph.
- `title` (centred: x 68.5 in 280): auto-layout HUG, gap `Spacing/gap-tight` 4. Contains:
  - single: `month-year-chip` (143×29 default · 128×26 sm); multiple: `month-chip` + `year-chip` (105 + 71, gap 4); plain: only the `label` text (107×21).
  - chip: HUG, `padding` 4 / 8 (no variable), gap `Spacing/gap-tight`, `Radius/action`, no fill or stroke.
  - `label`: `Content/primary`, `Type/body-md` (sm: `body-sm`); `icon/down` 16×16 (both sizes), vector 11×6, `Content/secondary`.

## The odd bits of the file
- There are no states (hover / focus / pressed) on any piece: it is copied, none are invented. The chips and arrows stay without hover.
- The sm button (28) has no size token: it is built with `spacing.6+spacing.1`.
- The chip's chevron-down is 16 at both sizes; the side arrows do drop 20 → 16.
- Chip padding has no variable in Figma (4/8): `spacing.1` / `spacing.2` are used.
