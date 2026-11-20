# Contract · CalendarPresets (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ Calendar (✓) (D)`, set `CalendarPresets`
(`423:988`, 4 variants), read read-only. **Figma rules; nothing is corrected.**

Set description: "Presets rail for range mode: uppercase label over a list of presets. The preset whose range matches the selection is highlighted with the range tint. Size default | sm × Variant default | secondary (matches CalendarDay Variant)."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Variant` default · secondary | VARIANT | `default` | `variant` (`data-variant`) |

The set has no TEXT / boolean / swap properties. Code extras: `presets` (by default the file's five), `selected` (by default "Last 7 days"), `onSelect`, `label` (by default "PRESETS").

## Geometry

| Size | Root | Padding | Preset row | Text |
|---|---|---|---|---|
| default | 160×226 (fixed width with no variable → `spacing.32+spacing.8`) | `Spacing/inset-surface` 20 | 119×32 (`size.compact`) | label 20,20 · presets from y 38 |
| sm | 140×190 (`spacing.32+spacing.3`) | `Spacing/inset-control` 12 | 115×28 (`spacing.6+spacing.1`) | label 12,12 · presets from y 30 |

- VERTICAL root, gap 2 (no variable → `spacing.0_5`), no fill, border ONLY on the right: `Stroke/divider` 1 px in `Border/default`, INSIDE (the preset measures 160 − 40 − 1 = 119).
- `rail-label`: the "PRESETS" text written in uppercase (textCase ORIGINAL), `Type/caption`, `Content/secondary`.
- Preset: row that fills the width, inline padding 8 (no variable → `spacing.2`), `Radius/action`, `Type/body-sm` in `Content/primary` (text at x 8; y 7 in default, 5 in sm).

## Selected preset colour ("Last 7 days" in the file)
| Variant | Fill | Text |
|---|---|---|
| default | `Surface/selected` | `Content/accent` |
| secondary | `Surface/muted` | `Content/primary` |

## Oddities in the file
- The rail width, gap 2 and preset padding carry no variable: summed spacing steps / the exact step are used.
- The label is written in uppercase in the text, not via textCase.
- No preset has hover or focus: copied as is, with no hover.
- Recipe: new `strokeRightWidth` property (single-side border), like `strokeTopWidth` / `strokeBottomWidth`. Web only (the plugin is frozen).
