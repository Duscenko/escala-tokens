# Contrato · Slider (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `Slider` (`447:19`, 36 variantes), página `❖ Slider (✓)`, leído en solo lectura. **Figma manda.**
Reconstruye el Slider de shadcn (etiqueta + valor, un solo thumb).

Descripción: «Slider: single or range value with optional tooltip (TooltipVisible) and tick marks (MarksVisible). Size xs / sm /
default × Range single, range × State Default, Dragging, Disabled × Variant default, secondary. Uses SliderThumb.»

## API
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` |
| `Range` single · range | VARIANT | `single` | `value` / `defaultValue` número o array (o `range`) |
| `State` Default · Dragging · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo el arrastre y `disabled` |
| `Variant` default · secondary | VARIANT | `default` | `variant` |
| `TooltipVisible` | BOOLEAN | false | `tooltipVisible` |
| `MarksVisible` | BOOLEAN | false | `marksVisible`, `marks` |
| `TooltipText` / `TooltipEndText` | TEXT | «40» / «70» | `tooltipText` / `tooltipEndText` (por defecto, el valor) |

Muestra: ancho 320; single en 40, range de 25 a 70 (thumbs en 75/210 de 320).

## Geometría
Columna con gap `Spacing/gap-control` 8: tooltips (28) · control · marcas (24).
| Size | Control | Pista | Thumb |
|---|---|---|---|
| xs | 32 | 4 | 14 |
| sm | 36 | 6 | 16 |
| default | 40 | 8 | 20 |
Pista `Surface/muted`, radio `Radius/control`; el relleno corre entre los CENTROS de los thumbs: centro = mitad del thumb + p × (ancho − thumb).
Tooltip 36×24 centrado en el thumb: `Surface/inverse`, texto `Type/caption` `Content/inverse`, radio control.
Marca 20×20: tick 2×6 `Border/strong` a 50 % de opacidad + etiqueta `Type/caption` `Content/secondary`, gap 4, repartidas con space-between.

## Color del relleno
default `Action/primary/default` · secondary `Content/primary` · Disabled `Action/disabled/default`. Los thumbs son SliderThumb (en Dragging single, el único; en range, el segundo).

## Lo raro del archivo
- La etiqueta + valor de shadcn no existen: se conserva como `label` solo para llamadores heredados (el tablero).
- El tick es `Border/strong` con opacidad de pintura 0,5 (propiedad `opacity` de la receta).
- La marca (20 de alto) contiene tick 6 + gap 4 + etiqueta 16 = 26: se desborda como en Figma.
