# Contract · DatePickerPopover (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ DatePicker (✓)`, set `DatePickerPopover`
(`425:2276`, 4 variants), read with `figma-read-set.js` + `get_metadata`/pixels (read-only). **Figma rules; nothing is corrected.**

Set description: "Popover content for the Date Picker: a Calendar panel with Radius/overlay, opened below
DatePickerTrigger with an 8 px offset. Size default / sm × Mode single / range (range adds the presets rail)."

> Status: DONE (2026-11-12). Measured in Storybook (Light and Dark): shell with radius 16, shadow `0 12 16 key + 0 4 6 ambient` (Light .1/.05, Dark .4/.2), no fill; opened from the trigger it sits 8px away and aligned to its start; `data-size`/`data-mode` on the root. The panel widths/heights (322×394, 250×310, 482×394, 390×310) were measured with the new Calendar: they match.

## What it is (and what it is NOT)
The set is a **thin shell**: a vertical frame with no fill, no stroke and no padding, with `Radius/overlay` and the
`Shadow/lg` effect, containing ONE instance of `Calendar` (`424:4667`). Everything visible in the panel (`Surface/layer-1`
fill, `Border/default` 1 inside the layout, overlay radius, header, month, days, Clear/Apply footer, presets rail) belongs to the
**Calendar** and its parts: CalendarHeader `422:355`, CalendarMonth `422:1713`, CalendarDay `421:309`,
CalendarPresets `423:988` (and `423:963`), Calendar `424:4667` = elements 3–8 of the queue, each its own session.
That is why DatePickerPopover does NOT rebuild any of them: the component accepts the calendar as `children`.
> **DONE (2026-11-12, Calendar session):** the popover hosts the file's Calendar (footer always, presets in range)
> and copies its instance's override: the body moves to `Spacing/inset-surface` (20) at Size default. Measured: 322×394 ·
> 482×394 · 250×310 · 390×310, same as the file (see `calendar-contract.md`).

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single · range | VARIANT | `single` | `mode` (`data-mode`) |

The usage board's names are "1:1 with code" (`Size → size`, `Mode → mode`). No texts or swaps.
Both props are only reflected as `data-*` and choose which Calendar goes inside (Size = 322 · 250 wide, Mode range adds
the presets rail: 482 · 390). `inline` draws the panel in place (docs); without it, it mounts in a Radix Portal.

## Geometry and color (the 4 variants are identical)
| | |
|---|---|
| Root | vertical frame MIN/MIN, gap 0, no padding, no fill, no stroke, `clipsContent: false` |
| Radius | `Radius/overlay` (16) |
| Effects | style `Shadow/lg`: DROP_SHADOW `0 0 0 1 Elevation/shadow-ring` · `0 12 16 -4 Elevation/shadow-key` · `0 4 6 -2 Elevation/shadow-ambient` |
| Position | opens below the trigger with an 8px gap (`sideOffset 8`); closes on select or with Escape |
| Child | `calendar` = Calendar (`Surface/layer-1` fill, `Border/default` 1 INSIDE and included in the layout, overlay radius) |

### Shadow: copy what Figma PAINTS, not what it declares
The three effects carry a spread (1 · −4 · −2) on a frame that does not clip content: Figma does not paint it. Pixels from the render
of `425:200` (346×419, node at x 12–334): side edge 237 with a soft 12px gradient up to 254, **no hard 1px ring**,
no shadow on top and ~24px below. It is exactly the FABButton's `lift: rest` (`0 12 16 key` + `0 4 6 ambient`, no spread),
which is reused.

## What the file does that looks odd (copied as is)
- The shell declares an `Elevation/shadow-ring` ring and negative spreads that Figma does not render: they are not copied (pixels).
- The `Shadow/lg` style has 3 layers, but the web system already has its own `shadow.lg` ramp: the popover does not use it, it uses
  `shadow-key` + `shadow-ambient` exactly as the file does.
- Radius/overlay on the shell and again on the Calendar (both 16): the calendar covers the whole shell.
- The usage board mentions "Spacing/inset-surface, Spacing/gap-tight": those are the Calendar's tokens, not this shell's.

## Nests
`Calendar` (+ `CalendarPresets` in Mode=range, with `PresetsVisible` true). Its parts are elements 3–8 of the queue.
