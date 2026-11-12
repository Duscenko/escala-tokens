# Contrato · SegmentedControl (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ SegmentedControl (✓)`, set `SegmentedControl`
(`1102:5136`, 3 variantes) y su parte `SegmentedControlItem` (`1102:5087`, 30 variantes). Leído en solo lectura.
**Figma manda.** Reconstruye el SegmentedControl de shadcn (`options`, `size` default · sm).

Descripción: «Single choice between 2 to 5 short options shown as one track (role="radiogroup", each segment role="radio" with
aria-checked). One tab stop; arrow keys move and select. Size cascades to every SegmentedControlItem; exactly one item is
Checked. Use RadioGroup for long labels or more options, TabMenu to switch views, ButtonGroup for independent actions.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Content` | SLOT | Day (checked) · Week · Month | `children` (SegmentedControlItem); atajo `options` |
| `Size` default · sm · lg | VARIANT | `default` | `size` (cascada a los items) |

## Geometría
Pista: relleno `Surface/muted`, radio `Radius/action`, padding `Spacing/gap-tight` 4 por los cuatro lados, un slot `Content` con gap
4 entre items. Alto = item + 8: 40 · 32 · 48 (default · sm · lg). Ancho: hug (182 con Day · Week · Month).

## Lo raro del archivo
- La pista es `Surface/muted`, no `layer-2` como el SegmentedControl de shadcn (test de roles estrechado, fechado).
- `Content/secondary` sobre `Surface/muted` da 4,22:1 en Light (axe lo marca): se copia.
- El pill deslizante desaparece: el item marcado ES la pieza elevada (el item pinta su propio relleno y sombra).
