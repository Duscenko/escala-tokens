# Contrato · CalendarPresets (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓) (D)`, set `CalendarPresets`
(`423:988`, 4 variantes), leído en solo lectura. **Figma manda; nada se corrige.**

Descripción del set: «Presets rail for range mode: uppercase label over a list of presets. The preset whose range matches the selection is highlighted with the range tint. Size default | sm × Variant default | secondary (matches CalendarDay Variant).»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Variant` default · secondary | VARIANT | `default` | `variant` (`data-variant`) |

El set no tiene propiedades TEXT / booleanas / swap. Extras de código: `presets` (por defecto los cinco del archivo), `selected` (por defecto «Last 7 days»), `onSelect`, `label` (por defecto «PRESETS»).

## Geometría

| Size | Raíz | Padding | Fila preset | Texto |
|---|---|---|---|---|
| default | 160×226 (ancho fijo sin variable → `spacing.32+spacing.8`) | `Spacing/inset-surface` 20 | 119×32 (`size.compact`) | label 20,20 · presets desde y 38 |
| sm | 140×190 (`spacing.32+spacing.3`) | `Spacing/inset-control` 12 | 115×28 (`spacing.6+spacing.1`) | label 12,12 · presets desde y 30 |

- Raíz VERTICAL, gap 2 (sin variable → `spacing.0_5`), sin relleno, borde SOLO a la derecha: `Stroke/divider` 1 px en `Border/default`, INSIDE (el preset mide 160 − 40 − 1 = 119).
- `rail-label`: el texto «PRESETS» escrito en mayúsculas (textCase ORIGINAL), `Type/caption`, `Content/secondary`.
- Preset: fila que llena el ancho, padding inline 8 (sin variable → `spacing.2`), `Radius/action`, `Type/body-sm` en `Content/primary` (texto en x 8; y 7 en default, 5 en sm).

## Color del preset seleccionado («Last 7 days» en el archivo)
| Variant | Relleno | Texto |
|---|---|---|
| default | `Surface/selected` | `Content/accent` |
| secondary | `Surface/muted` | `Content/primary` |

## Lo raro del archivo
- Ancho del riel, gap 2 y padding del preset no llevan variable: se usan pasos de spacing sumados / el paso exacto.
- La etiqueta está escrita en mayúsculas en el texto, no por textCase.
- Ningún preset tiene hover ni focus: se copia, sin hover.
- Receta: nueva propiedad `strokeRightWidth` (borde de un solo lado), como `strokeTopWidth` / `strokeBottomWidth`. Solo web (el plugin está congelado).
