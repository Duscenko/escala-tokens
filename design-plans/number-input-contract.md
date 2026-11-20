# Contract · NumberInput (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ NumberInput (✓)`, set
`NumberInput` (`1107:243`, 15 variants), read with `use_figma` (read-only). **Figma rules;
nothing is corrected.** Replaces the shadcn skeleton's `InputStepper` (renamed: the ledger
had it as `rename`).

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled | VARIANT | `Default` | Hover / Focused from pointer and keyboard; Invalid = `aria-invalid`; Disabled = `disabled`; `forceState` fixes one |
| `Value` | TEXT | "1" | `value` / `defaultValue` (+ `min`, `max`, `step`, `onValueChange`) |
| `decrement` / `increment` (exposed instances) | IconButton | `Minus` / `Plus` | `decrementIcon` / `incrementIcon` |

The value is a `spinbutton` (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`); Arrow Up / Down
move it. The buttons are named Decrease / Increase and are not tab stops. At the minimum
or the maximum the corresponding button goes to `State=Disabled` (the set's description says so).

## Geometry

| Size | Box | Buttons (IconButton secondary · ghost) | Value |
|---|---|---|---|
| sm | 96 × `Size/control-sm` 32 | `Size=xs` 24 | 38 wide |
| default | 120 × `Size/control-md` 40 | `Size=sm` 32 | 46 |
| lg | 144 × `Size/control-lg` 48 | `Size=default` 40 | 54 |

Box: HORIZONTAL, gap `Spacing/none`, padding X `Spacing/gap-tight` (4) with the stroke in the layout
(`strokesIncludedInLayout`: the content starts at 5), radius `Radius/action`, 1px INSIDE stroke.
Width = 3 control heights (there is no token: in the recipe `size.X+size.X+size.X`). Value: FILL,
centred, `Type/placeholder`, clips.

## Colour by state

| State | Fill | Stroke | Halo (2px OUTSIDE) | Value · buttons |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` |
| Hover | `Surface/input` | `Border/control-hover` | — | idem |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | idem + cursor |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | idem |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled`, buttons Disabled |

## What the file does that looks odd (copied anyway)
- The Focused and Invalid halo is stroked OUTSIDE (not straddling the border like the Input's).
- Invalid always carries a halo, without focus.
- Disabled paints only `Action/disabled/default` (no `Surface/input` underneath).
- The fixed width is not bound to any variable.

## Nests
`IconButton` (done).
