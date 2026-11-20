# Contract · CheckboxGroup (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Checkbox (✓) WIP`, set `CheckboxGroup`
(`1015:10216`, 108 variants), read-only. **Figma rules; nothing is corrected.** New component (`part`
of Checkbox in the ledger).

Description: "Labelled multi-select: group label, three CheckboxItems and an optional footer (helper or error). Each
checkbox stays independent; render role="group" with aria-labelledby on the group label, and aria-describedby on the footer."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (cascades to the rows) |
| `Placement` left · right | VARIANT | `left` | `placement` (cascades) |
| `State` Default · Invalid · Disabled | VARIANT | `Default` | `invalid`, `disabled` (cascade; `forceState` docs) |
| `Variant` default · … · inverse | VARIANT | `default` | `variant` (cascades) |
| `GroupLabel` | TEXT | "Notifications" | `label` |
| `FooterVisible` | BOOLEAN | false | `footer` (absent = hidden) |
| `FooterText` | TEXT | "Helper text" | `footer` |

Content: `children` (the rows). Without children, the file's three rows: Email (checked), SMS, Push notifications (checked).
Each row inherits Size · Placement · State · Variant from the group (verified on the instances).

## Geometry
Column (sample width 280 → `spacing.32+spacing.32+spacing.6`; the rows fill), gap `Spacing/gap-control` 8.
Height: 117 · 105 · 96 (default · sm · xs) without footer.

| Part | Type | Color |
|---|---|---|
| group label | `Type/label` (all Sizes) | `Content/primary`; Disabled `Content/disabled` |
| footer | `Type/body-sm` (default) · `Type/caption` (sm, xs) | `Content/secondary`; Invalid `Status/critical/content`; Disabled `Content/disabled` |

## Odd in the file
- The group label is `Type/label` at all three Sizes (it does not scale with the rows).
- Fixed sample width 280.
