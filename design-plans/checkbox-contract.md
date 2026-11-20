# Contract · Checkbox (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Checkbox (✓) WIP`, set `Checkbox`
(`1014:686`, 270 variants), read-only. **Figma rules; nothing is corrected.** Rebuilds the shadcn
Checkbox (Checked True/False, no Variant or Size).

Description: "Single checkbox for an independent boolean or a parent row summarising a partial selection."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (`data-size`) |
| `Checked` false · true · indeterminate | VARIANT | `false` | `checked` / `defaultChecked` (Radix; `data-checked`) |
| `State` Default · Hover · Focused · Disabled · Invalid | VARIANT | `Default` | `forceState` (docs); live `:hover`, `:focus-visible`, `disabled`, `aria-invalid` |
| `Variant` default · secondary · critical · success · info · inverse | VARIANT | `default` | `variant` (`data-variant`) |

## Geometry (does not change with Variant or State)

| Size | Box | Glyph |
|---|---|---|
| xs | `Size/selector-sm` 16 | 12 (no variable → `spacing.3`) |
| sm | `Size/selector-sm` 16 | 12 |
| default | `Size/selector-md` 20 | 16 (`icon.small`) |

`Radius/control`, stroke `Stroke/control` 1 INSIDE. Glyph `icon/Check` (true) or `icon/Minus` (indeterminate), centred.
xs and sm are the same box: the difference is in CheckboxItem (text). Hit area `size.hit` as before.

## Colour (identical across the three sizes — verified on all 270 variants)

| Variant | Empty (Default · Hover) | Checked / indeterminate (fill = stroke) · Hover | Glyph | Focus: border 2 INSIDE · halo 2 OUTSIDE |
|---|---|---|---|---|
| default | `Surface/input` · `Border/control` → `control-hover` | `Action/primary/default` → `hover` | `Content/on-action` | `Border/focus` · `Border/ring/default` |
| secondary | same | `Content/primary` → `Content/secondary` | `Content/inverse` | `Border/strong` · `Border/subtle` |
| critical | same | `Status/critical/surface-solid` → `-hover` | `Status/critical/on-solid` | `Status/critical/border-strong` · `Status/critical/border` |
| success | same | `Status/success/surface-solid` → `-hover` | `Status/success/on-solid` | `Status/success/border-strong` · `Status/success/border` |
| info | same | `Status/info/surface-solid` → `-hover` | `Status/info/on-solid` | `Status/info/border-strong` · `Status/info/border` |
| inverse | `Surface/inverse` · `Border/inverse` → `Content/inverse-secondary` | `Content/inverse` → `Content/inverse-secondary` | `Content/primary` | `Border/inverse` · `Surface/inverse-muted` |

- Focused: the fill is the resting one (empty or checked), the border goes to 2 px.
- Disabled: fill and stroke `Action/disabled/default`, glyph `Content/disabled` (all Variants).
- Invalid: stroke `Status/critical/border-strong` 1 px, fill the resting one (inverse empty: `Surface/inverse`).

## Oddities in the file
- secondary and inverse fill with TEXT roles (`Content/primary`, `Content/inverse`…): copied.
- xs and sm draw the same box (16) and the same glyph (12).
- The 12 px glyph has no variable: `spacing.3`.
