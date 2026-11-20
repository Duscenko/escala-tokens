# Contract · Calendar (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓) (D)`, set `Calendar`
(`424:4667`, 18 variants), read read-only. **Figma rules; nothing is corrected.** Replaces the shadcn /
react-day-picker Calendar (`calendar.tsx` no longer imports it; the dependency remains in `package.json`, unused).

Set description: "Date selection panel: CalendarHeader, CalendarMonth, optional CalendarPresets (PresetsVisible) and CalendarFooter (FooterVisible). Size default (314 px) / sm (250 px), Mode single / multiple / range, Header single / multiple / plain. Date Picker wraps it with an input trigger."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single · multiple · range | VARIANT | `single` | `mode` (`data-mode`) |
| `Header` single · multiple · plain | VARIANT | `single` | `header` (`data-header`) |
| `FooterVisible` | BOOLEAN | false | `footer` |
| `PresetsVisible` | BOOLEAN | false | `presets` |

Code extras: `value` / `defaultValue` / `onValueChange` (Date · Date[] · { from, to } depending on the mode), `month` /
`defaultMonth` / `onMonthChange`, `today`, `disabledDays`, `unavailableDays`, `onApply`, `variant` (passed to the cells and
to the rail), `children` (below the month, inside the body: the day's event on the board). Without a month or value it shows the
file's sample (November 2026, today the 7th, 24–25 Disabled, 27 Unavailable, the CalendarMonth selection).

## Geometry

| | default | sm |
|---|---|---|
| Root (no presets or footer) | 314×314 | 250×254 |
| Body | 312×312, padding 16 (primitive "16" → `spacing.4`), gap 8 (`spacing.2`) | 248×252, padding 12 (`spacing.3`), gap 8 |
| Header / month | 280×32 at 17,17 · 280×240 at 17,57 | 224×28 at 13,13 · 224×192 at 13,49 |
| Presets (visible) | 160 wide, column height | 140, column height |
| Footer (visible) | CalendarFooter 312×72 below the body | 248×56 |

- HORIZONTAL root: [presets] [column = body + footer]. Fill `Surface/layer-1`, `Border/default` 1 px (`Stroke/divider`)
  on all four sides, INSIDE; `Radius/container` (16); clips its content.
- Parts: CalendarHeader `422:355`, CalendarMonth `422:1713` (Variant default), CalendarPresets `423:988` (Variant default),
  CalendarFooter `423:963`, all at the Calendar's `Size`.

## Behaviour (code; the file does not draw it)
- single: one click picks the day · multiple: each click adds or removes · range: the first click opens, the second closes (in
  either order); a single-day range is painted Selected.
- Header arrows: previous / next month. Clicking a day from another month switches to that month.
- Presets: ranges counted from `today` (Today, Yesterday, Last 7 days, Last 30 days, This month); the one that
  matches the chosen range is highlighted.
- Footer: Today goes to today's month (and picks it outside range), Clear empties, Apply calls `onApply(value)`.
- Keyboard: a single day takes Tab (the selection, otherwise today, otherwise the first of the month); ←→↑↓ move between enabled days.
  Each day is named with its full date and carries `aria-pressed` if selected.

## Oddities in the file
- The set's body is bound to loose primitives ("16", "12", "8"), not to roles.
- In the DatePickerPopover (`425:2276`), the Calendar instance overrides the body padding with
  `Spacing/inset-surface` (20) at Size default: the body becomes 320 and the panel 322×394 · 482×394, but the footer still
  measures 312 (8 px short on the right). At sm there is no override (12). Copied as is (`date-picker.tsx`).
- Presets: in the set it is a fixed 160×384 rectangle; in the popover it stretches to the column (392 · 308). In code it always
  stretches to the column height (matches every instance in the file that shows it).

## Measured (Storybook, Escala Light and Dark)
The 6 Size × Mode combinations of the set and the 4 of the popover match Figma to the pixel (root, body, header,
month, presets, footer sizes). Fill `#f5f4f6` / `#18161a` and border `#000000@0.15` / `#ffffff@0.15`, the same as the file's.
