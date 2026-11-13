# Contrato · Checkbox (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Checkbox (✓) WIP`, set `Checkbox`
(`1014:686`, 270 variantes), leído en solo lectura. **Figma manda; nada se corrige.** Reconstruye el Checkbox
de shadcn (Checked True/False, sin Variant ni Size).

Descripción: «Single checkbox for an independent boolean or a parent row summarising a partial selection.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (`data-size`) |
| `Checked` false · true · indeterminate | VARIANT | `false` | `checked` / `defaultChecked` (Radix; `data-checked`) |
| `State` Default · Hover · Focused · Disabled · Invalid | VARIANT | `Default` | `forceState` (docs); en vivo `:hover`, `:focus-visible`, `disabled`, `aria-invalid` |
| `Variant` default · secondary · critical · success · info · inverse | VARIANT | `default` | `variant` (`data-variant`) |

## Geometría (no cambia con Variant ni State)

| Size | Caja | Glifo |
|---|---|---|
| xs | `Size/selector-sm` 16 | 12 (sin variable → `spacing.3`) |
| sm | `Size/selector-sm` 16 | 12 |
| default | `Size/selector-md` 20 | 16 (`icon.small`) |

`Radius/control`, trazo `Stroke/control` 1 INSIDE. Glifo `icon/Check` (true) o `icon/Minus` (indeterminate), centrado.
xs y sm son la misma caja: la diferencia está en CheckboxItem (texto). Área táctil `size.hit` como antes.

## Color (idéntico en los tres tamaños — comprobado en las 270 variantes)

| Variant | Vacío (Default · Hover) | Marcado / indeterminado (fill = stroke) · Hover | Glifo | Foco: borde 2 INSIDE · halo 2 OUTSIDE |
|---|---|---|---|---|
| default | `Surface/input` · `Border/control` → `control-hover` | `Action/primary/default` → `hover` | `Content/on-action` | `Border/focus` · `Border/ring/default` |
| secondary | idem | `Content/primary` → `Content/secondary` | `Content/inverse` | `Border/strong` · `Border/subtle` |
| critical | idem | `Status/critical/surface-solid` → `-hover` | `Status/critical/on-solid` | `Status/critical/border-strong` · `Status/critical/border` |
| success | idem | `Status/success/surface-solid` → `-hover` | `Status/success/on-solid` | `Status/success/border-strong` · `Status/success/border` |
| info | idem | `Status/info/surface-solid` → `-hover` | `Status/info/on-solid` | `Status/info/border-strong` · `Status/info/border` |
| inverse | `Surface/inverse` · `Border/inverse` → `Content/inverse-secondary` | `Content/inverse` → `Content/inverse-secondary` | `Content/primary` | `Border/inverse` · `Surface/inverse-muted` |

- Focused: el relleno es el del reposo (vacío o marcado), el borde pasa a 2 px.
- Disabled: relleno y trazo `Action/disabled/default`, glifo `Content/disabled` (todas las Variant).
- Invalid: trazo `Status/critical/border-strong` 1 px, relleno el del reposo (inverse vacío: `Surface/inverse`).

## Lo raro del archivo
- secondary e inverse rellenan con roles de TEXTO (`Content/primary`, `Content/inverse`…): se copia.
- xs y sm dibujan la misma caja (16) y el mismo glifo (12).
- El glifo de 12 px no tiene variable: `spacing.3`.
