# Contrato · CalendarHeader (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓)`, set `CalendarHeader`
(`422:355`, 6 variantes), leído con `figma-read-set.js` (adaptado) + una lectura de posiciones (solo lectura). **Figma manda; nada se corrige.**

Descripción del set: «Calendar header. Header=single: one combined month/year chip; multiple: separate month and year chips; plain:
static heading with no picker. Prev/next arrows flank the title. Width = 7 day cells.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Header` single · multiple · plain | VARIANT | `single` | `header` (`data-header`) |
| `Label` | TEXT | `"November 2026"` | `label` (single, plain) |
| `Month` | TEXT | `"November"` | `month` (multiple) |
| `Year` | TEXT | `"2026"` | `year` (multiple) |

Extras de código (no están en el set): `onPreviousMonth`, `onNextMonth`, `onLabelClick`, `onMonthClick`, `onYearClick`.

## Geometría
Raíz: frame HORIZONTAL SPACE_BETWEEN / centrado, sin relleno ni trazo, ancho FIJO = 7 celdas del día, alto = el de los botones.

| Size | Raíz | Botón nav | Glifo nav | Etiqueta |
|---|---|---|---|---|
| default | 280×32 (7 × `Size/control`) | 32×32 (`Size/compact`) | 20×20 (`icon.medium`), vector 8×14 | `Type/body-md` |
| sm | 224×28 (7 × `Size/compact`) | 28×28 (no hay token: `Spacing/6 + Spacing/1`) | 16×16 (`icon.small`), vector 6×11 | `Type/body-sm` |

- `nav-prev` / `nav-next`: `Radius/action`, trazo `Border/control` 1px **INSIDE**, sin relleno, glifo `Content/secondary`.
- `title` (centrado: x 68.5 en 280): auto-layout HUG, gap `Spacing/gap-tight` 4. Contiene:
  - single: `month-year-chip` (143×29 default · 128×26 sm); multiple: `month-chip` + `year-chip` (105 + 71, gap 4); plain: solo el texto `label` (107×21).
  - chip: HUG, relleno `padding` 4 / 8 (sin variable), gap `Spacing/gap-tight`, `Radius/action`, sin relleno ni trazo.
  - `label`: `Content/primary`, `Type/body-md` (sm: `body-sm`); `icon/down` 16×16 (ambos tamaños), vector 11×6, `Content/secondary`.

## Lo raro del archivo
- No hay estados (hover / focus / pressed) en ninguna pieza: se copia, no se inventan. Los chips y flechas quedan sin hover.
- El botón sm (28) no tiene token de tamaño: se arma con `spacing.6+spacing.1`.
- El chevron-down del chip es 16 en los dos tamaños; las flechas laterales sí bajan 20 → 16.
- Padding del chip sin variable en Figma (4/8): se usa `spacing.1` / `spacing.2`.
