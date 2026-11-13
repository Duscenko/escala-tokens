# Contrato · Pagination, PaginationLink y PaginationEllipsis (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Pagination (✓) WIP»: `Pagination` (989:714, 8 variantes), `PaginationLink` (988:330, 40),
`PaginationEllipsis` (988:343, 4). Solo lectura. Ledger: Pagination `rebuild`, las otras `part`.

## API (variantes primero, luego el resto del panel)
- Pagination: `Size` default · xs · sm · lg (def default) · `Variant` compact · compact-grouped (def compact-grouped) · `Content` (slot: PaginationLink y PaginationEllipsis) · `JumpButtonsVisible` false (First y Last).
- PaginationLink: `Size` · `State` Default · Hover · Pressed · Focused · Disabled · `Active` false · true · `Label` «1».
- PaginationEllipsis: `Size`.
Descripción: First/Previous, enlaces numerados y elipsis en el Content, Next/Last; `nav aria-label="pagination"`; deshabilitar First/Prev en la página 1 y Next/Last en la última.

## Geometría
- compact-grouped: la raíz es un grupo de botones OUTLINE (radio `Radius/action`, trazo `Border/control` 1 INSIDE fuera del layout, efectos `Elevation/shadow-ring` spread 1 y `shadow-ambient` 0 1 2 = Shadow/xs): hijos first (oculto) · prev · Content · next · last (oculto),
  todos ButtonGroupItem (outline, IconOnly para first / prev / next / last; los enlaces son ButtonGroupItem con la etiqueta, Active = relleno `Surface/selected`) y `ButtonGroupDivider` (1px `Border/control`) entre cada par,
  también dentro del Content (incluido el elipsis). Gap 0. Alto = alto del item (`Size/control-md|xs|sm|lg` = 40 · 24 · 32 · 48). 258×40 con prev + Content (1, 2 activo, 3, …, 10) + next; xs 210×24, sm 234×32, lg 282×48.
- compact: HORIZONTAL gap `Spacing/gap-tight` (4) sin fondo: first (oculto) y prev / next / last son IconButton (secondary · ghost · mismo Size), Content gap 4 con PaginationLink y PaginationEllipsis. 304×40 (xs 192, sm 248, lg 360).
- PaginationLink: HORIZONTAL centro, alto = `Size/control-*`, ancho mínimo = su alto (40×40 con una cifra), padding X `Spacing/gap-tight` (4) en todos los tamaños, gap `gap-control` (8) (xs: gap-tight), radio `Radius/action`, `Type/button`.
  Active: trazo `Border/control` 1 INSIDE (sin crecer). Tinta `Content/primary` siempre (Disabled `Content/disabled`).
- PaginationEllipsis: caja cuadrada `Size/control-md|xs|sm|lg` (40 · 24 · 32 · 48), icono DotsThree 20 · 16 · 16 · 24 (`icon-md|sm|sm|lg`), tinta `Content/secondary`, sin relleno ni trazo, no interactivo.

## Color del PaginationLink (Size no cambia nada)
Default sin relleno; Hover `Action/ghost/hover`; Pressed `Action/ghost/pressed`; Focused trazo `Border/focus` 2 INSIDE + `focus-ring` 2 OUTSIDE `Border/ring/default` (Active también pierde su trazo control en Focused); Disabled sin relleno.
Active mantiene su trazo `Border/control` en Hover, Pressed y Disabled.

## Raro (se copia igual)
- Las dos variantes de Pagination no comparten componentes: la agrupada reutiliza ButtonGroupItem / ButtonGroupDivider, la compacta IconButton y PaginationLink; por eso el enlace activo es un relleno en una y un trazo en la otra.
- El elipsis de la variante agrupada lleva divisores a ambos lados como cualquier item.
- La tinta del enlace activo no cambia a accent (solo el relleno / trazo lo marca; la descripción pide no usar solo color).
