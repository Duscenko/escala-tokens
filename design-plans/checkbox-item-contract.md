# Contract · CheckboxItem (from Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Checkbox (✓) WIP`, set `CheckboxItem`
(`1015:7515`, 324 variants), read-only. **Figma rules; nothing is corrected.** New component (`part`
of Checkbox in the ledger).

Description: "Checkbox with a visible label and optional description; the whole row toggles the checkbox."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (passed to the Checkbox) |
| `Checked` false · true · indeterminate | VARIANT | `false` | `checked` / `defaultChecked` |
| `State` Default · Disabled · Invalid | VARIANT | `Default` | `disabled`, `invalid` (`forceState` docs) |
| `Placement` left · right | VARIANT | `left` | `placement` |
| `Variant` default · … · inverse | VARIANT | `default` | `variant` (passed to the Checkbox) |
| `Label` | TEXT | "Label" | `label` |
| `DescriptionVisible` | BOOLEAN | false | `description` (absent = hidden) |
| `Description` | TEXT | "Helper text" | `description` |

The nested Checkbox ALWAYS carries the same Size · Checked · State · Variant as the row (checked across all 324).

## Geometry
Row (sample width 280 → `spacing.32+spacing.32+spacing.6`), gap `Spacing/gap-control` 8, no padding.
`control`: frame that hugs the Checkbox with the label's FIRST-LINE HEIGHT and centres it (y 3 in 25 · 3 in 21 · 1 in 18).
`content`: column that fills, gap `Spacing/gap-tight` 4: label + description. Placement right: content first, control at the end.

| Size | Checkbox | Label | Description | Height |
|---|---|---|---|---|
| xs | 16 | `Type/body-sm` | `Type/caption` | 18 |
| sm | 16 | `Type/body-md` | `Type/caption` | 21 |
| default | 20 | `Type/body-lg` | `Type/body-sm` | 25 |

## Color
Label `Content/primary`, description `Content/secondary`; Disabled both `Content/disabled`. Invalid does not change the texts
(only the Checkbox's border). Variant does not change the texts (inverse neither).

## The odd bits of the file
- Fixed sample width of 280: in a group the row fills.
- inverse does not change the text (it stays `Content/primary`): designed for the normal surface, copied as is.
