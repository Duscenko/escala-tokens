# Contrato · PasswordStrength · Meter · Rule (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ PasswordStrength`: sets
`PasswordStrength` (`417:679`, 18), `PasswordStrengthMeter` (`417:131`, 18) y `PasswordStrengthRule`
(`417:156`, 6; su DocMatrix es `888:8689`), leídos en solo lectura. **Figma manda; nada se corrige.**

## API

| Set | Figma (orden del panel) | Defecto | React |
|---|---|---|---|
| PasswordStrength | `Size` xs · sm · default | `default` | `size` |
| | `Strength` 0 – 5 | `0` | `strength`, o `value` (Strength = reglas cumplidas) |
| | `RulesVisible` (BOOLEAN) | `true` | `rulesVisible` |
| PasswordStrengthMeter | `Size` xs · sm · default · `Strength` 0 – 5 | `default` · `0` | `size` · `strength` |
| PasswordStrengthRule | `Met` true · false · `Size` xs · sm · default · `Label` (TEXT) | `true` · `default` · "At least 8 characters" | `met` · `size` · `label` |

## PasswordStrength (tarjeta)
Ancho 350 fijo sin variable (en código lo pone quien la usa). `Surface/layer-1`, borde `Border/subtle` 1 INSIDE
(dentro del layout), `Radius/container`. Columna: reglas · medidor · etiqueta de nivel.

| Size | Padding | Gap | Gap entre reglas |
|---|---|---|---|
| xs | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | `Spacing/gap-tight` 4 |
| sm · default | `Spacing/inset-surface` 20 | `Spacing/gap-group` 16 | `Spacing/gap-control` 8 |

Strength n = las n primeras reglas cumplidas. Etiqueta `Type/label`: 0 "Too Weak" (oculta) · 1 "Too Weak"
`Status/critical/content` · 2 "Weak" y 3 "Fair" `Status/warning/content` · 4 "Strong" y 5 "Very Strong"
`Status/success/content`. Reglas del archivo: At least 8 characters · One uppercase letter · One lowercase letter ·
One number · One special character.

## PasswordStrengthMeter
Cinco segmentos `Radius/full`, FILL, `Spacing/gap-tight` 4; alto 4 · 6 · 8 (xs · sm · default). Vacío
`Surface/muted`. Rellenos (los n primeros): 1 `Status/critical/surface-solid` · 2 `Status/warning/surface-solid` ·
3 `Status/warning/surface-solid-pressed` · 4 `Status/success/surface-solid-pressed` · 5 `Status/success/surface-solid`.

## PasswordStrengthRule
Fila, `Spacing/gap-tight` 4, centrada. Met true: icon/check 12 · 14 · 16 en `Status/success/content`, etiqueta
`Content/primary`. Met false: anillo 8 · 10 · 12 (trazo `Border/control` 1 INSIDE), etiqueta `Content/secondary`.
Texto `Type/caption` · `Type/body-sm` · `Type/body-md`.

## Lo que el archivo hace y parece raro
- Strength 3 usa el sólido "pressed" de warning y Strength 4 el "pressed" de success: la escala no es una rampa
  monótona por familia (4 es más oscuro que 5).
- La etiqueta de nivel existe en Strength 0 ("Too Weak") pero oculta; en código queda solo para lectores de pantalla.
- Ancho 350, alturas del medidor y tamaños de icono/anillo sin variable.

## Anida
PasswordStrength anida PasswordStrengthRule y PasswordStrengthMeter (mismo archivo `password-strength.tsx`, `FILE_OF`).
