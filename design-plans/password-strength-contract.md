# Contract · PasswordStrength · Meter · Rule (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ PasswordStrength`: sets
`PasswordStrength` (`417:679`, 18), `PasswordStrengthMeter` (`417:131`, 18) and `PasswordStrengthRule`
(`417:156`, 6; its DocMatrix is `888:8689`), read-only. **Figma rules; nothing is corrected.**

## API

| Set | Figma (panel order) | Default | React |
|---|---|---|---|
| PasswordStrength | `Size` xs · sm · default | `default` | `size` |
| | `Strength` 0 – 5 | `0` | `strength`, or `value` (Strength = rules met) |
| | `RulesVisible` (BOOLEAN) | `true` | `rulesVisible` |
| PasswordStrengthMeter | `Size` xs · sm · default · `Strength` 0 – 5 | `default` · `0` | `size` · `strength` |
| PasswordStrengthRule | `Met` true · false · `Size` xs · sm · default · `Label` (TEXT) | `true` · `default` · "At least 8 characters" | `met` · `size` · `label` |

## PasswordStrength (card)
Fixed width 350 with no variable (in code the consumer sets it). `Surface/layer-1`, border `Border/subtle` 1 INSIDE
(inside the layout), `Radius/container`. Column: rules · meter · level label.

| Size | Padding | Gap | Gap between rules |
|---|---|---|---|
| xs | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | `Spacing/gap-tight` 4 |
| sm · default | `Spacing/inset-surface` 20 | `Spacing/gap-group` 16 | `Spacing/gap-control` 8 |

Strength n = the first n rules met. Label `Type/label`: 0 "Too Weak" (hidden) · 1 "Too Weak"
`Status/critical/content` · 2 "Weak" and 3 "Fair" `Status/warning/content` · 4 "Strong" and 5 "Very Strong"
`Status/success/content`. The file's rules: At least 8 characters · One uppercase letter · One lowercase letter ·
One number · One special character.

## PasswordStrengthMeter
Five `Radius/full` segments, FILL, `Spacing/gap-tight` 4; height 4 · 6 · 8 (xs · sm · default). Empty
`Surface/muted`. Fills (the first n): 1 `Status/critical/surface-solid` · 2 `Status/warning/surface-solid` ·
3 `Status/warning/surface-solid-pressed` · 4 `Status/success/surface-solid-pressed` · 5 `Status/success/surface-solid`.

## PasswordStrengthRule
Row, `Spacing/gap-tight` 4, centered. Met true: icon/check 12 · 14 · 16 in `Status/success/content`, label
`Content/primary`. Met false: ring 8 · 10 · 12 (stroke `Border/control` 1 INSIDE), label `Content/secondary`.
Text `Type/caption` · `Type/body-sm` · `Type/body-md`.

## What the file does that looks odd
- Strength 3 uses warning's "pressed" solid and Strength 4 success's "pressed": the scale is not a monotonic
  ramp per family (4 is darker than 5).
- The level label exists at Strength 0 ("Too Weak") but hidden; in code it remains for screen readers only.
- Width 350, meter heights and icon/ring sizes have no variable.

## Nests
PasswordStrength nests PasswordStrengthRule and PasswordStrengthMeter (same file `password-strength.tsx`, `FILE_OF`).
