# Contrato · Breadcrumb, BreadcrumbItem, BreadcrumbEllipsis y BreadcrumbSeparator (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Breadcrumb (✓) WIP»: `Breadcrumb` (402:7814, 27 variantes), `BreadcrumbItem` (402:998, 90),
`BreadcrumbEllipsis` (402:999, 72), `BreadcrumbSeparator` (402:1000, 9). Solo lectura. Ledger: Breadcrumb `rebuild`, las otras tres `part`. Prototipos (868:17264…) sin leer.

## API (variantes primero, luego el resto del panel)
- Breadcrumb: `Appearance` ghost · outline · solid (def ghost) · `Separator` chevron · slash · dot (def chevron) · `Size` xs · sm · default (def default) ·
  `EllipsisVisible` false · `Item2Visible` true · `Item3Visible` true (composición: en código son hijos).
- BreadcrumbItem: `Variant` default · secondary · `Appearance` ghost · outline · solid · `Size` xs · sm · default · `State` Default · Hover · Focused · Current · Disabled ·
  `Label` · `IconLeadingVisible/Icon` (def house) · `IconTrailingVisible/Icon` (def caret-down).
- BreadcrumbEllipsis: `Variant` · `Appearance` · `Size` · `State` Default · Hover · Focused · Disabled (sin Current).
- BreadcrumbSeparator: `Variant` chevron · slash · dot (def chevron) · `Size` xs · sm · default.

## Geometría
Raíz Breadcrumb: HORIZONTAL, hijos (item, sep, [colapsado: ellipsis + sep], item, sep, item, sep, item Current). Gap entre elementos: xs `Spacing/none` (0) · sm y default
`Spacing/gap-tight` (4). Anchos medidos: chevron xs 272 · sm 344 · default 426 (4 items Home/Projects/Escala/Breadcrumb, 3 separadores, con el ellipsis oculto). Slash default 381, xs 236, sm 311.
BreadcrumbItem: HORIZONTAL centro, radio `Radius/control` 8. xs: alto `Size/control-xs` 24, padding X `Spacing/gap-tight` 4, gap 4, icono `Size/icon-sm` 16, label `Type/caption`.
sm: 32 (`control-sm`), padding X `gap-control` 8, gap 4, icono 16, `Type/body-sm`. default: 40 (`control-md`), padding X `inset-control` 12, gap `gap-control` 8, icono `Size/icon-md` 20, `Type/body-md`.
Outline: trazo `Stroke/control` (1) INSIDE y contado en el layout (Default 62 = 60 + 2). Ghost / solid no tienen trazo salvo Focused (trazo 1 literal INSIDE, también en layout: 62).
BreadcrumbEllipsis: caja cuadrada fija `Size/control-xs|sm|md` (24 · 32 · 40), sin padding, radio 8, icono DotsThree 16 · 16 · 20; mismas apariencias (outline: trazo `Stroke/control`).
BreadcrumbSeparator: caja centrada: chevron (CaretRight) y dot (Dot) en 16 · 16 · 20 (`icon-sm`, `icon-sm`, `icon-md`); slash es el texto «/» en `Type/body-md` (5×21 en default; 4 y 5 de ancho en xs y sm por las sumas); tinta `Content/subtle`.

## Color (Variant × Appearance × State; Size no cambia nada)
Tinta (label e iconos): default Default/Focused `Content/secondary`, Hover `Content/accent`, Current `Content/primary`, Disabled `Content/disabled`; secondary: Hover `Content/primary`, el resto igual.
- ghost: sin relleno ni trazo. Focused: trazo `Border/focus` (secondary `Border/strong`) + `focus-ring` (frame absoluto, trazo 2 OUTSIDE) `Border/ring/default` (secondary `Border/subtle`).
- outline: trazo Default `Border/control`; Hover default `Border/accent`, secondary `Border/control-hover`; Focused `Border/focus` / `Border/strong` + ring; Current `Border/default`; Disabled `Border/subtle`.
- solid: relleno `Surface/muted`; Hover default `Surface/accent`, secondary `Surface/muted-hover`; Focused y Current `Surface/muted` (+ trazo y ring en Focused); Disabled `Action/disabled/default`.
- Ellipsis: igual sin Current.

## Raro (se copia igual)
- La variante Focused de ghost / solid crece la caja 2px porque el trazo se cuenta en el layout; en código el trazo es un borde transparente de 1px siempre presente (el padding se lo
  devuelve) y el foco solo cambia el color: sin salto de layout (decisión del encargo). Outline sí lleva el trazo en el layout también en reposo (62).
- El separador `slash` es un texto, no un icono; `dot` es el glifo Dot.
- Hover de un item secondary pasa a `Content/primary`, no a accent.
- El item Current no es interactivo (`aria-current="page"`, sin enlace) pero sí lleva fondo / trazo propio por apariencia.

## Anida
Iconos Phosphor (House, CaretDown, DotsThree, CaretRight, Dot). Items y separadores van en `<li>` dentro de `<ol>`; el ellipsis es un `<button>` con `aria-label`.
