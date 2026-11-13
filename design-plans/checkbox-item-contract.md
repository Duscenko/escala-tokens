# Contrato · CheckboxItem (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Checkbox (✓) WIP`, set `CheckboxItem`
(`1015:7515`, 324 variantes), leído en solo lectura. **Figma manda; nada se corrige.** Componente nuevo (`part`
de Checkbox en el ledger).

Descripción: «Checkbox with a visible label and optional description; the whole row toggles the checkbox.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (pasa al Checkbox) |
| `Checked` false · true · indeterminate | VARIANT | `false` | `checked` / `defaultChecked` |
| `State` Default · Disabled · Invalid | VARIANT | `Default` | `disabled`, `invalid` (`forceState` docs) |
| `Placement` left · right | VARIANT | `left` | `placement` |
| `Variant` default · … · inverse | VARIANT | `default` | `variant` (pasa al Checkbox) |
| `Label` | TEXT | «Label» | `label` |
| `DescriptionVisible` | BOOLEAN | false | `description` (ausente = oculta) |
| `Description` | TEXT | «Helper text» | `description` |

El Checkbox anidado lleva SIEMPRE los mismos Size · Checked · State · Variant que la fila (comprobado en las 324).

## Geometría
Fila (ancho 280 de muestra → `spacing.32+spacing.32+spacing.6`), gap `Spacing/gap-control` 8, sin padding.
`control`: marco que abraza el Checkbox con la ALTURA DE LA PRIMERA LÍNEA del label y lo centra (y 3 en 25 · 3 en 21 · 1 en 18).
`content`: columna que llena, gap `Spacing/gap-tight` 4: label + description. Placement right: content primero, control al final.

| Size | Checkbox | Label | Description | Alto |
|---|---|---|---|---|
| xs | 16 | `Type/body-sm` | `Type/caption` | 18 |
| sm | 16 | `Type/body-md` | `Type/caption` | 21 |
| default | 20 | `Type/body-lg` | `Type/body-sm` | 25 |

## Color
Label `Content/primary`, description `Content/secondary`; Disabled ambos `Content/disabled`. Invalid no cambia los textos
(solo el borde del Checkbox). Variant no cambia los textos (tampoco inverse).

## Lo raro del archivo
- Ancho fijo 280 de muestra: en un grupo la fila llena.
- inverse no cambia el texto (sigue `Content/primary`): pensado sobre la superficie normal, se copia.
