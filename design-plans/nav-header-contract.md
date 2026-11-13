# Contrato · NavItem, Brand y AccountMenuTrigger (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`: `NavItem` (1095:19644, 15 variantes, «❖ NavItem»), `Brand` (1098:42, 2, «❖ Brand»),
`AccountMenuTrigger` (1098:119, 8, «❖ AccountMenuTrigger»; «Account Manager» del encargo). Solo lectura. Los tres están en el ledger como `new` (sin código previo; `Navbar` es otro componente y no se toca).

## NavItem
Variantes: `Size` default · sm · lg · `State` Default · Hover · Current · Focused · Disabled; luego `Label` «Overview», `IconLeadingVisible/Icon` (house), `TrailingVisible` (Badge xs · soft · pill · number · secondary, count 8),
`IconTrailingVisible/Icon` (caret-down). Es un TabMenuItem cuyo estado seleccionado se llama `Current`: HORIZONTAL centro, alto 40 · 32 · 48 (`Size/control-md|sm|lg`), radio `Radius/action`, padding X `Spacing/inset-control` en
todos los tamaños, gap `Spacing/gap-control`, `Type/button`, iconos 20 · 16 · 24. Default tinta `Content/secondary`; Hover relleno `Action/ghost/hover` y `Content/primary`; Current relleno `Surface/selected` y `Content/accent`;
Focused trazo `Border/focus` 2px INSIDE (fuera del layout) + `focus-ring` 2px OUTSIDE `Border/ring/default`; Disabled `Content/disabled`. Descripción: enlace de navegación de cabecera o disparador de menú; Current = `aria-current="page"`,
con caret abre un NavigationMenu (`aria-expanded`).

## Brand
Variantes: `Size` default · sm; `Logo` (slot), `Name` «Escala», `VersionVisible` true. Fila hug, sin padding, gap `Spacing/gap-control`, centrada. default 139×32: logo = Avatar (icon · sm 32 · rounded · default · solid) con el glifo Stack
(Phosphor), nombre `Type/heading-sm` `Content/primary`, versión = Badge (soft · rounded · xs · default · secondary, «v1.1», 26×16). sm 122×26: Avatar xs 24, nombre `Type/heading-xs`.

## AccountMenuTrigger
Variantes: `Size` default · sm · `State` Default · Hover · Pressed · Focused; `Name` «Ayla», `NameVisible` true. Botón HORIZONTAL centro, alto 40 / 32, radio `Radius/action`, padding izquierdo y derecho `Spacing/inset-control` (12) salvo el
derecho `Spacing/gap-tight` (4), gap `Spacing/gap-control` (8); Avatar (image · sm 32 / xs 24), nombre `Type/button` `Content/primary`, caret 20 / 16. 109×40 y 97×32 con «Ayla». Hover relleno `Action/ghost/hover`, Pressed
`Action/ghost/pressed`, Focused trazo `Border/focus` 2 INSIDE + ring 2 OUTSIDE.

## Raro (se copia igual)
- El avatar del AccountMenuTrigger es CÍRCULO en Default y cuadrado redondeado (`Radius/control`) en Hover · Pressed · Focused.
- El padding derecho del AccountMenuTrigger es 4 y el izquierdo 12.
- El foco de los tres lleva trazo de 2px dentro y halo fuera sin crecer la caja (box-shadow), como los demás controles.
