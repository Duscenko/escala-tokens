# Contrato · Field (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Field (✓)`, set `Field`
(`1003:102`, 9 variantes), leído con `use_figma` (solo lectura). **Figma manda; nada se corrige.**

> La foto `spec/figma-components.json` (exportada antes) tiene Field con 6 variantes y
> `State Default|Invalid`; el archivo vivo tiene 9, con `Disabled`. Se construye el archivo vivo,
> así que Field sigue en `pending` hasta que se refresque la foto (que arrastra decenas de cambios
> más del archivo: tarea aparte).

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` → el `size` del control (Input default · sm · lg) y del enlace |
| `State` Default · Invalid · Disabled | VARIANT | `Default` | `state` → `aria-invalid` / `disabled` en el control |
| `Label` | TEXT | "Email address" | `label` (un `<label htmlFor>`) |
| `RequiredVisible` | BOOLEAN | false | `required` (el `*`) |
| `TrailingVisible` | BOOLEAN | false | `trailing` (un TextLink, "Forgot password?") |
| `DescriptionVisible` + `Description` | BOOLEAN + TEXT | false · "We will never share your email." | `description` |
| `Error` | TEXT | "Enter a valid email address." | `error`, visible solo con `state="Invalid"` |
| `control` (instancia expuesta) | — | `Input` | `children`: un control (Input, Textarea, Combobox, NumberInput, InputTag, DatePickerTrigger, InputOTP) |

Field cablea el control: `id` (si falta), `aria-describedby` (descripción y error), `aria-invalid`
con Invalid, `disabled` con Disabled y `size` si el control no lo trae.

## Geometría

| Capa | Layout | Valor |
|---|---|---|
| root | VERTICAL, ancho FIXED 320 en el archivo (en código: el del contenedor), alto HUG | gap `Spacing/gap-control` 8, sin padding |
| label-row | HORIZONTAL, centrado, FILL | gap `Spacing/gap-tight` 4: label · `*` · spacer (FILL) · trailing |
| control | FILL × `Size/control-sm|md|lg` (32 · 40 · 48) | Input de ese Size y State |
| description / error | FILL | — |

Alturas totales del archivo (sin descripción): sm 58 · default 66 · lg 74; Invalid +24 (8 + 16).

## Tipo y color

| Capa | Estilo | Default / Invalid | Disabled |
|---|---|---|---|
| label | `Type/label` | `Content/primary` | `Content/disabled` |
| `*` | `Type/label` | `Content/secondary` | `Content/disabled` |
| trailing | TextLink `Size=xs` (sm y default) · `Size=sm` (lg), Variant default | State Default | State Disabled |
| description | `Type/helper` | `Content/secondary` | `Content/disabled` |
| error | `Type/helper` | `Status/critical/content` | (oculto) |

## Lo que el archivo hace y parece raro (se copia igual)
- En las variantes `Disabled` el label, el `*`, el trailing y la descripción NO están atados a las
  propiedades (`Label`, `RequiredVisible`…): cambiar el texto en Figma no los mueve. En código
  sí se aplican: es lo que dice la descripción del set.
- `error` no tiene propiedad de visibilidad: se ve en Invalid y nada más. Con `DescriptionVisible`
  en Invalid se verían descripción y error a la vez (el archivo lo permite).
- El `*` está en `y` 2 · 0 · 4 según Size dentro de una fila de 18 centrada: ruido de capa; la fila
  lo centra en código.

## Anida
`Input` (hecho), `TextLink` (hecho).
