# Contract · DatePickerTrigger (from Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ DatePicker (✓)`, set `DatePickerTrigger`
(`425:199`, 36 variants), read with `figma-read-set.js` (read-only). **Figma rules; nothing is corrected.**
The page's other set, `DatePickerPopover` (`425:2276`, 4 variants), is the next item in the queue
and will live in the same file (`escala-ui/date-picker.tsx`).

> Status: DONE (2026-11-12). Recipe, component, catalogue, Storybook and measurement closed. Measured in Storybook (Light and Dark, all 36 variants): 280×32 · 40 · 48; icon x13 (x14 Focused) of 16 · 20 · 16; text x37 · 41 (x38 · 42 Focused) and width 230 · 226 (228 · 224); radius 12; stroke 1 / 2 Focused; 2px outer halo only in Focused; a real focus with Tab gives the same border and halo. Axe: only `Content/subtle` on `Surface/input` in Dark, 3.16:1 (copied from the file; same as InputTagOption).

Set description: "Input-styled button that opens DatePickerPopover: leading calendar icon plus placeholder or
formatted date."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` lg · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled · Loading | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `forceState`; `aria-invalid` · `disabled` · `loading` |
| `Value` placeholder · filled | VARIANT | `placeholder` | no prop: with `valueText` the value shows, without it the placeholder |
| `PlaceholderText` | TEXT | "Select date" | `placeholderText` |
| `ValueText` | TEXT | "Nov 12, 2026" | `valueText` (a `Date` is formatted "Nov 12, 2026") |

The file's usage board names the props "1:1 with code" (`placeholderText`, `valueText`): they are copied.

## Geometry per size (horizontal root MIN / centre, 280 wide in the file)

| Size | Height | Padding X | Gap | Icon | Text |
|---|---|---|---|---|---|
| sm | `Size/control-sm` 32 | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | 16 | `Type/body-sm` 12/18 |
| default | `Size/control-md` 40 | 12 | 8 | 20 | `Type/body-md` 14/21 |
| lg | `Size/control-lg` 48 | 12 | 8 | 16 | `Type/body-md` 14/21 |

Radius `Radius/action` (12). Stroke `Stroke/control` 1 INSIDE and **inside the layout** (`strokesIncludedInLayout`):
the content starts at x 13. Icon and spinner have no size variable (instances 16 · 20 · 16).

## Color per state (identical at all three sizes and both Values)

| State | Fill | Stroke | Text | Icon | Halo |
|---|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` 1 | placeholder `Content/subtle` · value `Content/primary` | `Content/subtle` | — |
| Hover | `Surface/input` | `Border/control-hover` 1 | same | same | — |
| Focused | `Surface/input` | `Border/focus` **2** (inside the layout: content at x 14, text 2px narrower) | same | same | `focus-ring` rect. `Border/ring/default` 2 OUTSIDE |
| Invalid | `Surface/input` | `Status/critical/border-strong` 1 | same | same | **none** |
| Disabled | `Surface/muted` | `Border/control` 1 | `Content/disabled` | `Content/disabled` | — |
| Loading | `Surface/input` | `Border/control` 1 | same as Default | Spinner `Content/subtle` instead of the icon | — |

No effects (drop / inner shadow) on any variant.

## What the file does that looks odd (copied anyway)
- The description and the usage board talk about "xs 32 / sm 36 / default 40"; the real numbers are sm 32 · default 40 · lg 48.
- The icon measures 16 at lg (same as at sm) and 20 at default.
- Invalid carries no halo (inputs do) and Disabled fills with `Surface/muted`, not with the `action.disabled` wash.
- Focused thickens the stroke to 2 inside the layout: the content shifts 1px and the text loses 2px of width.
- The Spinner is a 16 · 20 · 16 instance with its 16 glyph anchored top-left.

## Nests
`icon/calendar` (Phosphor `calendar-blank` regular) and `Spinner`.
