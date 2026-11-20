# Contract · CalendarFooter (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓) (D)`, set `CalendarFooter`
(`423:963`, 2 variants), read-only. **Figma rules; nothing is corrected.**

Set description: "Bottom bar of the Calendar body: Today link (left) and Clear / Apply actions (right). Height 72 at default, 56 at sm; top divider. Built from the Button set (link, outline, default)."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`, and the `size` of the three Buttons) |

No other properties on the set. Code extras: `todayLabel` / `clearLabel` / `applyLabel` (default "Today", "Clear", "Apply", the instances' texts) and `onToday` / `onClear` / `onApply`.

## Geometry

| Size | Root | Side padding | Buttons |
|---|---|---|---|
| default | 312×72 fixed (= 7 × `Size/control` + 2 × 16; height = 40 + 2 × 16) | 16 (primitive variable "16" → `spacing.4`) | Button `Size=default` (40) |
| sm | 248×56 fixed (= 7 × `Size/compact` + 2 × 12; height = 32 + 2 × 12) | 12 (primitive "12" → `spacing.3`) | Button `Size=sm` (32) |

- Root HORIZONTAL SPACE_BETWEEN, vertically centered, no fill; border ONLY on top: `Stroke/divider` 1 px in `Border/default`, INSIDE.
- Start: Button `Variant=default, Appearance=link`, label "Today", no icons.
- End: `actions` frame, gap 8 (primitive "8" → `spacing.2`): Button `Variant=secondary, Appearance=outline` "Clear" + Button `Variant=default, Appearance=solid` "Apply", no icons.

## Odd in the file
- Fixed width and height with no variable: in code, sums of refs (cells + padding; button + padding), so they stay current with the cells and the button.
- Padding and gap tied to loose primitives ("16", "12", "8") instead of roles: the equivalent spacing steps are used.
- The color and shape of the buttons are those of the system's Button; this recipe only assembles the bar.
