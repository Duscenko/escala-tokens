# Contract · CalendarDay (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓)`, set `CalendarDay`
(`421:309`, 44 variants), read with `figma-read-set.js` (adapted) + a sweep of cells (read-only). **Figma rules; nothing is corrected.**

Set description: "Calendar day cell. Size default 40 / sm 32 × State Default, Hover, Today, Selected, RangeMiddle,
RangeStart, RangeEnd, Outside, Disabled, Unavailable, Focused × Variant default | secondary. Day shape (rounded | pill |
square) is an instance override. Indicator toggles the dash under the date."

> Status: DONE (2026-11-12). Measured in Storybook, Escala Light and Dark: all 44 combinations (box, fill, ink, stroke,
> halo, band and its position) match the roles in the table; the dash (indicator) at x14 y34 12×2 as in the file.

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `State` Default · Hover · Today · Selected · RangeMiddle · RangeStart · RangeEnd · Outside · Disabled · Unavailable · Focused | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `state` (data states) + `forceState` (docs) |
| `Variant` default · secondary | VARIANT | `default` | `variant` |
| `Day` | TEXT | `"15"` | `children` |
| `IndicatorVisible` | BOOLEAN | `false` | `indicator` |
| (instance override) shape | — | rounded | `shape` rounded · pill · square (`data-shape`) |

## Geometry
Root: HORIZONTAL frame, centred, no fill or stroke, `clipsContent: false`. Children from back to front: `range-band` (absolute, only
in RangeMiddle/Start/End), `cell` (frame fills the root, `Radius/action`), `Day` (text), `indicator-dash` (absolute), `focus-ring`.

| Size | Box | Text | Dash |
|---|---|---|---|
| default | `Size/control` 40×40 | `Type/body-md` (16×21) | 12×2 at x14 y34 (= 4px from the bottom edge) |
| sm | `Size/compact` 32×32 | `Type/body-sm` (13×18) | 12×2 at x10 y26 |

Band (height = box): RangeMiddle the whole box; RangeStart the right half (x = box/2); RangeEnd the left (x 0). No radius.
Dash: width `spacing.3` (12), height `spacing.0_5` (2), no radius.

## Colour by state × variant
| State | default · fill / ink / stroke | secondary |
|---|---|---|
| Default · Outside | no fill · `Content/primary` · `Content/secondary` | same |
| Hover | `Action/ghost/hover` · `Content/primary` | same (also `Action/ghost/hover`) |
| Today | stroke `Border/accent` 1 INSIDE · `Content/primary` | `Border/strong` 1 |
| Selected · RangeStart · RangeEnd | `Action/primary/default` · `Content/on-action` | `Surface/inverse` · `Content/inverse` |
| RangeMiddle | ink `Content/accent`, band `Surface/selected` | ink `Content/primary`, band `Surface/muted` |
| Disabled · Unavailable | ink `Content/disabled` (identical) | same |
| Focused | stroke `Border/focus` 2 INSIDE + halo `Border/ring/default` 2 OUTSIDE · `Content/primary` | `Border/strong` 2 + halo `Border/subtle` |
Dash: `Border/accent` (default) · `Border/strong` (secondary). RangeStart/End also carry a band (`Surface/selected` · `Surface/muted`).

## What the file does that looks odd (copied as is)
- Disabled and Unavailable are identical (both `Content/disabled`, no strikethrough or background): the code draws them the same and both disable the button.
- Hover and Today/Selected do not combine: a pinned data state stops the pointer rules (a selected day has no hover).
- The secondary variant uses `Action/ghost/hover` on Hover but `Border/strong` on Today/Focused and `Surface/inverse` for the selected day.
- sm carries `Radius/action` (12) just like default: on a 32 square that is almost a circle; copied.
- In `Size=default, State=Default, Variant=secondary` the `Day` text and the dash are not bound to their properties (empty `componentPropertyReferences`): that variant would ignore `Day` / `IndicatorVisible` on an instance. The code always honours them.
- `Day shape` (rounded | pill | square) is not a property: it is an instance override, and here it is the `shape` prop (`radius.action` · `radius.pill` · `radius.none`).
- The text measures 18×21 in the browser against 16×21 in Figma (Storybook's font is not the file's); the height matches.

## Nests
Nothing (it is a leaf). It is used by `CalendarMonth` (`422:1713`) and, through it, `Calendar` (`424:4667`): the session 8 Calendar must compose it (today `calendar.tsx` keeps `CalendarDayButton` from react-day-picker).
