# Contrato · DatePickerPopover (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ DatePicker (✓)`, set `DatePickerPopover`
(`425:2276`, 4 variantes), leído con `figma-read-set.js` + `get_metadata`/pixels (solo lectura). **Figma manda; nada se corrige.**

Descripción del set: «Popover content for the Date Picker: a Calendar panel with Radius/overlay, opened below
DatePickerTrigger with an 8 px offset. Size default / sm × Mode single / range (range adds the presets rail).»

> Estado: HECHO (2026-11-12). Medido en Storybook (Light y Dark): cáscara con radio 16, sombra `0 12 16 key + 0 4 6 ambient` (Light .1/.05, Dark .4/.2), sin fondo; abierta desde el trigger queda a 8px y alineada a su inicio; `data-size`/`data-mode` en la raíz. Los anchos/altos del panel (322×394, 250×310, 482×394, 390×310) se midieron con el Calendar nuevo: coinciden.

## Qué es (y qué NO es)
El set es una **cáscara delgada**: un frame vertical sin relleno, sin trazo y sin padding, con `Radius/overlay` y el
efecto `Shadow/lg`, que contiene UNA instancia de `Calendar` (`424:4667`). Todo lo visible del panel (relleno
`Surface/layer-1`, borde `Border/default` 1 dentro del layout, radio overlay, cabecera, mes, días, pie Clear/Apply, rail de
presets) es del **Calendar** y de sus partes: CalendarHeader `422:355`, CalendarMonth `422:1713`, CalendarDay `421:309`,
CalendarPresets `423:988` (y `423:963`), Calendar `424:4667` = elementos 3–8 de la cola, cada uno su propia sesión.
Por eso DatePickerPopover NO reconstruye ninguno: el componente acepta el calendario como `children`.
> **HECHO (2026-11-12, sesión del Calendar):** el popover aloja el Calendar del archivo (pie siempre, presets en range)
> y copia el override de su instancia: el cuerpo pasa a `Spacing/inset-surface` (20) en Size default. Medido: 322×394 ·
> 482×394 · 250×310 · 390×310, igual que el archivo (ver `calendar-contract.md`).

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Mode` single · range | VARIANT | `single` | `mode` (`data-mode`) |

Los nombres del tablero de uso son «1:1 con código» (`Size → size`, `Mode → mode`). Sin textos ni swaps.
Ambas props solo se reflejan como `data-*` y eligen qué Calendar va dentro (Size = 322 · 250 de ancho, Mode range añade
el rail de presets: 482 · 390). `inline` dibuja el panel en su sitio (docs); sin él se monta en un Portal Radix.

## Geometría y color (las 4 variantes idénticas)
| | |
|---|---|
| Raíz | frame vertical MIN/MIN, gap 0, sin padding, sin relleno, sin trazo, `clipsContent: false` |
| Radio | `Radius/overlay` (16) |
| Efectos | estilo `Shadow/lg`: DROP_SHADOW `0 0 0 1 Elevation/shadow-ring` · `0 12 16 -4 Elevation/shadow-key` · `0 4 6 -2 Elevation/shadow-ambient` |
| Posición | se abre bajo el trigger con 8px de separación (`sideOffset 8`); cierra al elegir o con Escape |
| Hijo | `calendar` = Calendar (relleno `Surface/layer-1`, `Border/default` 1 INSIDE e incluido en el layout, radio overlay) |

### Sombra: se copia lo que Figma PINTA, no lo que declara
Los tres efectos llevan spread (1 · −4 · −2) sobre un frame que no recorta contenido: Figma no lo pinta. Pixels del render
de `425:200` (346×419, nodo en x 12–334): borde lateral 237 con degradado suave de 12px hasta 254, **sin anillo duro** de 1px,
sin sombra encima y ~24px abajo. Es exactamente el `lift: rest` del FABButton (`0 12 16 key` + `0 4 6 ambient`, sin spread),
que se reutiliza.

## Lo que el archivo hace y parece raro (se copia igual)
- La cáscara declara un anillo `Elevation/shadow-ring` y spreads negativos que Figma no renderiza: no se copian (pixels).
- El estilo `Shadow/lg` lleva 3 capas, pero el sistema web ya tiene su propia rampa `shadow.lg`: el popover no la usa, usa
  `shadow-key` + `shadow-ambient` tal cual el archivo.
- Radius/overlay en la cáscara y otra vez en el Calendar (ambos 16): el calendario cubre toda la cáscara.
- El tablero de uso habla de «Spacing/inset-surface, Spacing/gap-tight»: son tokens del Calendar, no de esta cáscara.

## Anida
`Calendar` (+ `CalendarPresets` en Mode=range, con `PresetsVisible` true). Sus partes son los elementos 3–8 de la cola.
