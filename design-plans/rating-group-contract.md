# Contrato · RatingGroup (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ RatingGroup (✓)`, set `RatingGroup` (`1122:316`, 6 variantes)
y su parte `RatingGroupItem` (`1122:195`, 60 variantes), leído en solo lectura. **Figma manda.** Renombra el `Rating` de código
(estrellas de solo lectura con etiqueta) a `RatingGroup`.

Descripción: «Single-choice scale of 5 RatingGroupItems (role="radiogroup", named by its visible question). Type=star for scores,
emoji for sentiment; Size cascades to every item. One tab stop; arrow keys move and select. Use SegmentedControl for labelled
options and Slider for a continuous value.»

## API
| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Content` | SLOT | cinco items (cuatro marcados en star; el cuarto en emoji) | `children`; sin hijos, los cinco del archivo |
| `Size` default · sm · lg | VARIANT | `default` | `size` (cascada) |
| `Type` star · emoji | VARIANT | `star` | `type` (cascada) |

El valor es `value` / `defaultValue` (4) / `onValueChange`; un grupo de estrellas marca (visualmente) todas hasta el valor, `aria-checked` solo el elegido.

## Geometría
Fila de 5 items en un slot `Content`: gap `Spacing/gap-tight` 4 (star), `Spacing/gap-control` 8 (emoji). Ancho: 176 · 136 · 216 (star) y
192 · 152 · 232 (emoji) para default · sm · lg; alto = item (32 · 24 · 40).
Emoji de muestra: SmileySad, SmileyNervous, SmileyMeh, Smiley (elegido), SmileyWink (Phosphor regular).

## Lo raro del archivo
- La etiqueta «4.0 · 128 reviews» y el modo de solo lectura del `Rating` anterior no existen en el archivo: se pierden.
- El nombre del hijo elegido en emoji es `RatingGroupItem` (los demás `item`): irrelevante.
- Las estrellas ya no son amarillas (`status.warning`) sino `Content/accent`.
