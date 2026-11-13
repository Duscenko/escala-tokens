# Contrato · Popover y PopoverFooter (de Figma a código) — LECTURA, sin construir aún

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Popover»: `Popover` (973:364, 12 variantes), `PopoverFooter`
(972:279, 6). Lectura solo lectura. Ledger: `Popover` rebuild, `PopoverFooter` part. Código hoy: `escala-ui/popover.tsx` + receta `POPOVER`
(surfaces.ts) + specimen `SkeletonPopoverSpecimen`. Sección «Popover Prototype» (974:669) sin leer.

## API (orden del panel: variantes primero)
| Figma | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | default | `size` |
| `Side` bottom · top · left · right | VARIANT | bottom | `side` (el que abre desde el trigger) |
| `ArrowVisible` | BOOL | true | `arrow` |
| `CloseVisible` | BOOL | false | `showCloseButton` |
| `MediaVisible` / `Media` | BOOL / SLOT | false | `media` |
| `Title` | TEXT | "Share this view" | `title` |
| `DescriptionVisible` / `Description` | BOOL / TEXT | true / "Anyone with the link can see the filters and columns you applied." | `description` |
| `ContentVisible` / `Content` | BOOL / SLOT | false / "Replace this slot with the popover body: a mini form, settings rows, a profile card or release notes." (body-sm, Content/secondary) | `children` |
| `FooterVisible` | BOOL | false | `footer` |
PopoverFooter: `Layout` inline · stacked, `Size` default · sm · lg (default inline / default); `LeadingVisible` true / `Leading` SLOT (texto
"Step 1 of 3", `Type/caption`, `Content/secondary`, gap `gap-tight` 4), `ActionsVisible` true / `Actions` SLOT.

## Geometría (Popover)
Raíz: VERTICAL (bottom/top) o HORIZONTAL (left/right), HUG, sin padding ni gap. Hijos: `panel` + `arrow` (frame de 8 de alto/ancho; la flecha es un
VECTOR 16×9 (9×16 lateral) con fill `Surface/layer-2` y trazo `Border/default` `Stroke/divider` CENTER). Orden: bottom = arrow, panel; top = panel,
arrow (arrow-shape en y −1); left = panel, arrow (x −1); right = arrow, panel. La flecha va centrada (x 152 en 320: (320−16)/2).
`panel` (VERTICAL, ancho FIJO 320 default / 256 sm / 360 lg, alto HUG, clip): radio `Radius/overlay` (16), fill `Surface/layer-2`, trazo `Border/default`
1 INSIDE. Alto: default 108 (+8 de flecha = 116), sm 91 (+8 = 99), lg 116 (+8 = 124); lateral 328 ancho (320 + 8).
Efectos por tamaño (el panel CLIPA: spreads SÍ se pintan): default y sm = `Shadow/md`: ring `0 0 0 1 shadow-ring` + key `0 4 6 −1` + ambient `0 2 4 −2`;
lg = `Shadow/lg`: ring + key `0 12 16 −4` + ambient `0 4 6 −2`. (Distinto del `lift` FAB, que quita spreads.)
Hijos del panel: `Media` (oculto; SLOT, rectángulo 144 alto, FILL, gradiente + imagen; clip) · `body` (VERTICAL, FILL, padding y gap por tamaño) ·
`footer` (instancia PopoverFooter, FILL, oculta por defecto) · `close` (CloseButton ghost pill, ABSOLUTE, oculto).
`body`: default padding `Spacing/inset-surface` 20, gap `gap-control` 8; sm padding `inset-control` 12, gap 8; lg padding 20, gap `gap-group` 16.
`header` (dentro de body): VERTICAL gap `gap-tight` 4; `title`: default `Type/heading-xs`, sm `Type/heading-2xs`, lg `Type/heading-sm`, `Content/primary`;
`description`: default y sm `Type/body-sm`, lg `Type/body-md`, `Content/secondary`. `Content` slot: gap igual al del body (8 · 8 · 16).
`close`: CloseButton ghost pill `Size=xs` (24) en default y sm (x 288 y 8 / x 224 y 8 dentro del panel de 320 / 256: 8 del borde), `Size=sm` (32) en lg (x 316 y 12 en 360).

## PopoverFooter
Ancho 256 en el set (FIXED, el Popover lo estira a FILL). Padding `Spacing/gap-control` 8 los 4 lados, gap `gap-control` 8, trazo SOLO ARRIBA
`Border/subtle` `Stroke/divider` INSIDE. inline: HORIZONTAL MIN/CENTER, `Leading` FILL/HUG, `Actions` HUG HORIZONTAL gap 8; alto 40 / 48 / 56 (sm / default / lg =
8+Button+8+1). stacked: VERTICAL gap 8, `Leading` FILL, `Actions` VERTICAL FILL gap 8 con botones FILL (skip primero y next después en stacked; inline: skip, next);
alto 96 / 112 / 128. Botones: sm → Button `xs` (24), default → `sm` (32), lg → `default` (40); `skip` = secondary solid, `next` = default solid.

## Raro (se copia igual)
- El footer espeja a DropdownMenuFooter; el padding del footer es 8 (no el inset-surface del Modal).
- El `panel` guarda strokeWeight 1 literal (sin variable) mientras la flecha usa `Stroke/divider`.
- Orden stacked del footer: `skip` arriba, `next` abajo (al revés que el Modal: aquí confirm NO va primero).
- Efectos con spread en un frame que clipa → se pintan (ring + spreads), como el Modal.

## Anida
Button (xs / sm / default), CloseButton (xs / sm), FeaturedIcon no. PopoverFooter es parte del Popover.
