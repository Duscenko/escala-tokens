# Contract · Switch (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Switch & SwitchGroup (✓)`, set `Switch`
(`405:358`, 48 variants), read read-only. **Figma rules; nothing is corrected.** Rebuilds the shadcn Switch
(Checked True/False, Size default · sm).

Description: "Binary on/off control for a setting that applies immediately. Always pair it with a visible label or give it
an accessible name (role="switch" with aria-checked in code)."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | `forceState` (docs); live `:hover`, `:focus-visible`, `disabled` |
| `Checked` true · false | VARIANT | `false` | `checked` / `defaultChecked` (Radix) |
| `Thumb` short · long | VARIANT | `short` | `thumb` |
| `IoVisible` | BOOLEAN | false | `ioVisible` |
| `ThumbIconVisible` | BOOLEAN | false | `thumbIconVisible` |

## Geometry

| Size · Thumb | Track | Thumb | I/O mark (off · on) |
|---|---|---|---|
| xs · short | 28×16 (`Size/selector-sm`) | 12×12 | ring 6 at (17,5) · bar 2×8 at (7,4) |
| xs · long | 36×16 | 16×12 | (23,5) · (9,4) |
| sm · short | 28×16 | 12×12 | (22,6) · (9,5) |
| sm · long | 36×16 | 16×12 | (28,6) · (11,5) |
| default · short | 36×20 (`Size/selector-md`) | 16×16 | ring 8 at (27,7) · bar 2×10 at (11,6) |
| default · long | 44×20 | 20×16 | (35,7) · (15,6) |

Padding 2 (`spacing.0_5`), radius `Radius/full`, the thumb travels its own width (long and short). No shadow. Ring with
1.5 INSIDE stroke; thumb icon 8 · 8 · 10 (`icon/check` on, `icon/close` off).
Focused: 2 INSIDE stroke counted in the layout (the thumb moves in 2 on each side, travel −4) + 2 outside halo.

## Colour (identical in all Sizes and Thumbs — checked across the 48 variants)

| | Track | Thumb | I/O mark | Focus |
|---|---|---|---|---|
| off Default / Focused | `Surface/muted` | `Surface/input` | `Content/subtle` | `Border/focus` 2 + `Border/ring/default` 2 |
| off Hover | `Surface/muted-hover` | `Surface/input` | `Content/subtle` | — |
| off Disabled | `Surface/muted` | `Surface/input` | `Content/disabled` | — |
| on Default / Focused | `Action/primary/default` | `Content/on-action` | `Content/on-action` | idem |
| on Hover | `Action/primary/hover` | `Content/on-action` | `Content/on-action` | — |
| on Disabled | `Action/disabled/default` | `Surface/input` | `Surface/input` | — |

## Oddities in the file
- The I/O marks of sm and default are at an absolute position that is NOT centred in their half (xs is): copied as is.
- `thumb-icon` is hidden in all 48 variants and its hidden instances do not let the fill be read (only an overridden "fills";
  the master is `Content/primary`): `Content/subtle` is assumed when off, `Action/primary/default` when on, `Content/disabled`
  when disabled. **Pending confirmation** with the owner if it is ever shown.
- No distinct Hover/Focused variants for the glyph.
