# Contract "� CalendarMonth (Figma to code)

Date: 2026-11-12 "� Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓)`, set `CalendarMonth`
(`422:1713`, 12 variants), read with `figma-read-set.js` (adapted) + reads of the cells (read-only). **Figma rules; nothing is corrected.**

Set description: ""One visible month (Sunday start, 5 weeks) of CalendarDay instances. Mode single | multiple | range × Variant default | secondary. Width = 7 day cells.""

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default "� sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single "� multiple "� range | VARIANT | `single` | `mode` (`data-mode`) |
| `Variant` default "� secondary | VARIANT | `default` | `variant` (`data-variant`, passed to each CalendarDay) |

The set has no TEXT / boolean / swap properties. Code extras: `month`, `today`, `selected`, `range`, `disabledDays`, `unavailableDays`, `onDayClick` (without them the file's sample is painted: November 2026).

## Geometry
Root: VERTICAL frame, no fill, stroke, effects, padding or gap; fixed width = 7 day cells.

| Size | Root | Name row (`weekdays`) | Week (`week-N`) | Cell |
|---|---|---|---|---|
| default | 280×240 (7 × `Size/control`) | 280×40, 7 boxes 40×40 | 280×40 × 5, gap 0 | CalendarDay 40 |
| sm | 224×192 (7 × `Size/compact`) | 224×32, 7 boxes 32×32 | 224×32 × 5, gap 0 | CalendarDay 32 (`Size=sm`) |

- Names: `Su Mo Tu We Th Fr Sa` (Sunday first), `Type/caption` (11 px) in `Content/secondary`, centred in their box; the same in both sizes.
- Weeks: HORIZONTAL rows of 7 `CalendarDay` instances; November 2026 starts on a Sunday → 5 rows, the last with 1–5 December (`Outside`).

## Cell states by Mode (identical across Size and Variant; `Variant` is only passed to the cell)
Common: day 7 `Today`, 24 and 25 `Disabled`, 27 `Unavailable`, 1–5 Dec `Outside`, the rest `Default`.
- single: 12 `Selected`.
- multiple: 4, 12, 19, 30 `Selected`.
- range: 10 `RangeStart`, 11–17 `RangeMiddle`, 18 `RangeEnd` (row 2 ends at 14 and row 3 continues at 15: the band crosses rows).
`IndicatorVisible` false on all.

## Odd in the file
- The sample mixes states that cannot coexist in a real calendar (Today without Selected on the 7th, Unavailable and Disabled together): it is copied as a sample; the component uses it only when it receives no data.
- Mode changes neither the geometry nor the month's own colour: only which cells are Selected / Range*.
- No piece has its own hover/focus (the CalendarDay cells do).
