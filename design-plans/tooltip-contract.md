# Contrato · TooltipContent y TooltipInfoTrigger (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Tooltip»: `TooltipContent` (415:773, 180 variantes), `TooltipInfoTrigger`
(415:556, 60). Solo lectura. Ledger: `TooltipContent` = rename de `Tooltip`; `TooltipInfoTrigger` = parte. Prototipos (881:1130, 884:1854) sin leer.

## API (variantes primero, luego el resto del panel)
TooltipContent: `Size` sm · default · lg (def default) · `Side` top · bottom · left · right (def top) · `Align` start · center · end (def start) ·
`Variant` default · secondary · inverse · critical · info (def default) · `Text` "Used on invoices and receipts. Format: 12-3456789." · `Title` "Tax ID" ·
`TitleVisible` false · `ArrowVisible` true.
TooltipInfoTrigger: `Size` sm · default · lg (def default) · `State` Default · Hover · Open · Focused · `Variant` default · secondary · inverse · critical · info.

## Geometría (TooltipContent)
Raíz HUG: VERTICAL (top/bottom) u HORIZONTAL (left/right) con dos hijos: `bubble` y `arrow`. Side es el borde desde el que abre; la flecha va en el borde opuesto
(top: burbuja, flecha debajo; bottom: flecha, burbuja; left: burbuja, flecha a la derecha; right: flecha, burbuja). `bubble`: VERTICAL, gap 2, padding Y/X sm 6/8 ·
default 8/10 · lg 10/12 (pasos 1_5/2 · 2/2_5 · 2_5/3), radio `Radius/overlay` 16, clip, efectos Shadow/md con ring y spreads (`0 0 0 1 ring`, `0 4 6 −1 key`, `0 2 4 −2 ambient`: el
frame clipa, se pintan). Ancho: sm 200 · default 240 · lg 280 (tope: el texto envuelve; alto sm 44, default 52, lg 62 con el texto de ejemplo en 2 líneas).
`title` (oculto) `Type/label`; `text`: sm `Type/caption`, default `Type/body-sm`, lg `Type/body-md`. Mismo color para título y texto.
`arrow`: frame de 5 de grosor (clip), la flecha 10×5 (5×10 lateral) del color de la burbuja, sin trazo. Align: center = centrada; start = 16 desde el borde inicial (padding
`Radius/overlay`); end = 16 desde el final. Alturas totales: 49 / 57 / 67.
Color por Variant (burbuja = flecha | texto = título): default `Action/primary/default` | `Content/on-action`; secondary `Surface/muted` | `Content/primary`; inverse
`Surface/inverse` | `Content/inverse`; critical `Status/critical/surface-solid` | `Status/critical/on-solid`; info `Status/info/surface-solid` | `Status/info/on-solid`.

## Geometría (TooltipInfoTrigger)
Botón circular (`Radius/full`) HORIZONTAL centro, padding 2, icono `icon/info` regular: sm 14, default 16 (`Size/icon-sm`), lg 20 (`icon-md`) → caja 18 / 20 / 24. Sin relleno.
Tinta por Variant × State: default `Action/primary/default` (Default, Focused) y `Action/primary/hover` (Hover, Open); secondary e inverse `Content/secondary` (Default, Focused) y
`Content/primary` (Hover, Open); critical `Status/critical/content` / `Status/critical/surface-solid`; info `Status/info/content` / `Status/info/surface-solid`.
Focused: trazo 2 DENTRO (`Border/focus` en default; `Border/strong` en secondary e inverse; `Status/critical/border-strong`; `Status/info/border-strong`) y un `focus-ring`
2 FUERA (`Border/ring/default` en default; el resto no se leyó: se copia por analogía con DropdownMenuItem, `status.*.border` para critical / info).

## Raro (se copia igual)
- La variante Focused crece la caja 4px (20 → 24) porque el trazo se cuenta en el layout; en código el trazo es una sombra interior (sin salto de layout al enfocar, decisión del encargo).
- El Align por defecto es `start`, no center.
- El radio de la burbuja es `Radius/overlay` (16) incluso en sm.
- La variante inverse del trigger usa la misma tinta que secondary.

## Anida
Icono info (Phosphor regular). El trigger es un `button` con `aria-label` (nombre accesible obligatorio).
