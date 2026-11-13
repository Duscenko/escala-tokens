# Contrato · TabMenu, TabMenuItem y TabMenuLineItem (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ TabMenu (✓) WIP»: `TabMenu` (984:1830, 12 variantes), `TabMenuItem` (984:939, 15),
`TabMenuLineItem` (984:1156, 30). Solo lectura. Ledger: TabMenu `rebuild`, las otras dos `part`.

## API (variantes primero, luego el resto del panel)
- TabMenu: `Size` default · sm · lg (def default) · `Variant` horizontal-line · horizontal-button · vertical-line · vertical-button (def horizontal-line) · `Content` (slot).
- TabMenuItem (botón): `Size` · `State` Default · Hover · Selected · Focused · Disabled · `Label` «Overview» · `IconLeadingVisible/Icon` (def house) · `TrailingVisible` (un Badge) ·
  `IconTrailingVisible/Icon` (def caret-down).
- TabMenuLineItem: igual + `Indicator` bottom · left (def bottom).
Descripción del archivo: grupo de botones reales, `role="group"`, `aria-pressed`, cada item su propia parada de tabulación, Space o Enter activan.

## Geometría
TabMenu raíz: HORIZONTAL (vertical: VERTICAL) sin gap ni padding, hug. Variantes `*-line`: rectángulo `track` absoluto, `Border/subtle`, 1px (`Stroke/divider`): abajo y todo el ancho
(horizontal, y = alto − 1) o a la izquierda y todo el alto (vertical). Slot `Content`: gap 0 en line, `Spacing/gap-tight` (4) en button. Vertical: los items rellenan el ancho (224 en el ejemplo).
Ancho horizontal medido con Overview / Activity / Members+badge / Settings: 325 (line) y 337 (button, 3 gaps de 4); alto = alto del item.
Items (los dos sets): HORIZONTAL centro, alto `Size/control-md|sm|lg` (40 · 32 · 48), radio `Radius/action`, padding X `Spacing/inset-control` (12) en TODOS los tamaños, Y 0,
gap `Spacing/gap-control` (8), `Type/button`. Iconos `Size/icon-md|sm|lg` (20 · 16 · 24). Trailing: instancia de Badge (xs · soft · pill · number · secondary, count 8, 16×16 con `Radius/full`).
Selected: Item rellena `Surface/selected`, tinta `Content/accent`; LineItem sin relleno, tinta accent y `indicator` (rectángulo absoluto 2px = `Stroke/focus`, `Border/accent`): bottom → x0, y = alto − 2, ancho
completo; left → x0 y0, 2 × alto completo; solo visible en Selected.
Colores (Size no cambia nada): Default tinta `Content/secondary`; Hover tinta `Content/primary` y, solo en Item, relleno `Action/ghost/hover`; Selected arriba; Focused tinta secondary + trazo `Border/focus` 2px INSIDE
(no cuenta en el layout) + `focus-ring` 2px OUTSIDE `Border/ring/default`; Disabled `Content/disabled`.

## Raro (se copia igual)
- El padding X no baja con Size (12 en sm y lg).
- El TabMenu ya no desliza una píldora: el archivo pinta la selección fija (sin `SlidingSelection`); el semántico pasa de `tablist/tab` a `group` + `aria-pressed`.
- El foco de LineItem también lleva trazo completo de 2px alrededor aunque el indicador sea una barra.
