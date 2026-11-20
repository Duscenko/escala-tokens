# Contract · InputOTP · InputOTPSlot (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ InputOTP`: sets `InputOTP`
(`416:994`, 135 variants) and `InputOTPSlot` (`416:108`, 54 variants), read read-only.
**Figma rules; nothing is corrected.**

## API

### InputOTP
| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `Length` 4 · 6 · 8 | VARIANT | `4` | `length` (= `maxLength`) |
| `State` Empty · Typing · Filled · Invalid · Disabled | VARIANT | `Empty` | the code (`value`), `aria-invalid`, `disabled`; `forceState` draws the file's variant |
| `Variant` outline · filled · underline | VARIANT | `outline` | `variant` |

### InputOTPSlot
| Figma | Type | Default | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` (inside InputOTP, its own) |
| `State` Default · Filled · Typing · Focused · Invalid · Disabled | VARIANT | `Default` | from the `input-otp` context: with a digit Filled; active empty Typing (caret); active with a digit Focused; `forceState` |
| `Variant` outline · filled · underline | VARIANT | `outline` | `variant` |
| `Digit` | TEXT | `"7"` | `digit` (outside InputOTP) |

## Geometry

| Size | Slot (width × height) | Digit | Caret |
|---|---|---|---|
| sm | `Size/control-sm` 32 × `Size/control-md` 40 | `Type/body-md` | 1 × 18 |
| default | `Size/control-md` 40 × `Size/control-lg` 48 | `Type/body-lg` | 1 × 20 |
| lg | `Size/control-lg` 48 × `Size/control-xl` 56 | `Type/body-xl` | 1 × 22 |

Row: horizontal, `Spacing/gap-control` 8. Length 6 and 8: 8×2 separator (`Content/subtle`; `Content/disabled`
in Disabled) between the two halves, with the same gap on each side. Radius `Radius/action`; underline `Radius/none`.
INSIDE stroke `Stroke/control`; Typing / Focused `Stroke/focus` (2). underline: bottom border only.

## Colour

| Variant · State | Fill | Stroke | Halo (2px OUTSIDE) | Digit |
|---|---|---|---|---|
| outline · Default / Filled | `Surface/input` | `Border/control` | — | `Content/primary` |
| filled · Default / Filled | `Surface/muted` | `Border/subtle` | — | `Content/primary` |
| underline · Default / Filled | `Surface/page` | `Border/control` (bottom) | — | `Content/primary` |
| · Typing / Focused | (same) | `Border/focus` 2px (underline: bottom) | `Border/ring/default` | caret / digit `Content/primary` |
| · Invalid | (same) | `Status/critical/border-strong` | — | `Content/primary` |
| outline · Disabled | `Surface/muted` | `Border/control` | — | `Content/disabled` |
| filled · Disabled | `Surface/muted` | `Border/subtle` | — | `Content/disabled` |
| underline · Disabled | `Surface/muted` | `Border/control` (bottom) | — | `Content/disabled` |

InputOTP states → slots: Empty all Default; Typing the first half Filled, the next slot Typing, the rest
Default; Filled / Invalid / Disabled all in that state.

## What the file does that looks odd
- In the `filled` and `underline` slots the digit text is NOT bound to the `Digit` property: it always shows
  "7" (the prototype page paints "7777777"). In code the digit is the typed value in all three variants.
- Invalid has no halo (only the red border), unlike Input / Textarea.
- The underline's focus halo is a full rectangle around the slot, even though the border is bottom only.
- Separator, caret and its height have no variable.

## Nests
InputOTP nests InputOTPSlot (same file `input-otp.tsx`, `FILE_OF`).
