# Contrato · Separator (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Separator (✓) WIP»: `Separator` (402:9063, 48 variantes, un solo set). Solo lectura. Ledger: `rebuild`.

## API (variantes primero, luego el resto del panel)
`Align` none · start · center · end (def none) · `Orientation` horizontal · vertical (def horizontal) · `Tone` default · subtle · strong (def default) · `Variant` dashed · default (def default) · `Label` «OR».
Descripción: línea fina que divide contenido, horizontal o vertical, continua o discontinua, con etiqueta opcional; decorativa por defecto (`role="separator"` + `aria-orientation` solo si expresa estructura).

## Geometría
Raíz auto-layout (HORIZONTAL; vertical: VERTICAL) con `itemSpacing` `Spacing/gap-group` (16), centrado en el eje cruzado. Horizontal: ancho 320 en la muestra (rellena el contenedor); vertical: alto 112 en la muestra (rellena).
Align none: una sola línea; alto `Stroke/divider` (1) horizontal / ancho 1 vertical. Align start: [etiqueta, línea]; center: [línea, etiqueta, línea]; end: [línea, etiqueta]; la etiqueta (`Type/label`, `Content/secondary`, 17×18 con «OR») solo se ve con Align ≠ none
y las líneas ocupan el resto (`grow 1`: 287 · 136 + 136 · 287 de 320; vertical 78 · 31 + 31). La raíz mide 18 de alto (etiqueta) o 17 de ancho en vertical.
La línea es un trazo de 1px centrado. Variant dashed: patrón de trazo [4, 4]. Tone: default `Border/default`, subtle `Border/subtle`, strong `Border/strong` (la etiqueta no cambia con el Tone).

## Raro (se copia igual)
- El Tone por defecto es `Border/default`, un escalón por encima del `Border/subtle` que dibujaba el código anterior: los separadores sin prop se ven un paso más marcados.
- Las líneas discontinuas son 4 de trazo y 4 de hueco, no el `dashed` del navegador (se pintan con un gradiente repetido).
