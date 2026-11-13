# Contrato · Modal, ModalHeader, ModalFooter (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Modal», sets `Modal` (967:102),
`ModalHeader` (965:81), `ModalFooter` (966:114), leídos en solo lectura. Figma manda; nada se corrige.
Ledger: `Modal` = rename de `Dialog` (code `Dialog`); `ModalHeader` / `ModalFooter` = parts.

## API

| Set | Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|---|
| Modal | `CloseVisible` | BOOLEAN | true | `showCloseButton` (alias del shadcn) / `closeVisible` |
| Modal | `ContentVisible` | BOOLEAN | true | el hueco de `children` |
| Modal | `Content` | SLOT | cuerpo de ejemplo (`Type/body-md`, `Content/secondary`) | `children` |
| Modal | `FooterVisible` | BOOLEAN | true | `footer` presente |
| Modal | `Size` default · lg | VARIANT | default | `size` |
| ModalHeader | `Title` | TEXT | "System notification" | `title` |
| ModalHeader | `DescriptionVisible` / `Description` | BOOL / TEXT | true / "Review the details and take action." | `description` |
| ModalHeader | `IconVisible` | BOOLEAN | true | `icon` (FeaturedIcon soft circle default) |
| ModalHeader | `TrailingVisible` / `Trailing` | BOOL / SLOT | false | `trailing` |
| ModalHeader | `CloseClearanceVisible` | BOOLEAN | false | `closeClearance` (lo pone el Modal) |
| ModalHeader | `Size` default · lg | VARIANT | default | `size` |
| ModalHeader | `Align` horizontal · vertical-left · vertical-center | VARIANT | horizontal | `align` |
| ModalFooter | `LeadingVisible` / `Leading` | BOOL / SLOT | false | `leading` |
| ModalFooter | `ActionsVisible` / `Actions` | BOOL / SLOT | true | `children` |
| ModalFooter | `Size` default · lg | VARIANT | default | `size` |
| ModalFooter | `Layout` inline · stacked | VARIANT | inline | `layout` |

## Geometría

**Modal** (VERTICAL, ancho fijo, alto HUG, clip): default 480, lg 640. Radio `Radius/overlay`, fill `Surface/layer-2`,
trazo `Border/default` `Stroke/divider` (1) INSIDE. Hijos: `main` (padding `Spacing/inset-surface` 20, gap
`Spacing/gap-group` 16: header + Content) · `footer` (instancia ModalFooter, FILL) · `close` (CloseButton ghost pill,
ABSOLUTE x 427 y 21 default (32), x 579 y 21 lg (40); `Size/control-sm` default, `Size/control-md` lg).
Efectos (Shadow/xl, el frame CLIPA contenido: los spreads SÍ se pintan): `0 0 0 1 Elevation/shadow-ring` +
`0 20 24 -4 Elevation/shadow-key` + `0 8 8 -4 Elevation/shadow-ambient`.
Scrim: `Surface/overlay` (el Modal no lo dibuja; es la descripción).

**ModalHeader**: ancho 440 default / 600 lg (FILL en el Modal). Horizontal: HORIZONTAL, gap `gap-group` 16, centro;
vertical-left: VERTICAL MIN gap 16; vertical-center: VERTICAL centro. Icono = FeaturedIcon (default soft circle,
40 default / 48 lg). `header-content` VERTICAL gap `gap-tight` 4, FILL: título `Type/heading-sm` (default) / `heading-md` (lg),
`Content/primary`; descripción `Type/body-sm` / `body-md`, `Content/secondary`. `Trailing` (oculto): HORIZONTAL gap
`gap-control` 8 (Button secondary ghost sm / default). `close-clearance` (oculto): cuadrado `Size/control-sm` (32) / `control-md` (40).
Sin padding propio (el del Modal).

**ModalFooter**: padding `Spacing/inset-surface` 20 en los 4 lados; trazo SOLO ARRIBA `Border/subtle` `Stroke/divider` INSIDE
(81 alto default / 89 lg: el contenido 40 / 48 + 40 + 1). inline: HORIZONTAL MAX/CENTER gap `gap-control` 8; `Leading` slot
(FIXED, `Type/caption`, `Content/secondary`, gap `gap-tight`) oculto; `Actions` HUG HORIZONTAL gap 8 (cancel Button secondary solid,
confirm Button default solid). stacked: VERTICAL gap 8, Actions VERTICAL FILL, botones FILL (confirm primero, luego cancel).
Botones del tamaño del set (`Size=default` → Button default 40, lg → 48).

## Lo que el archivo hace y parece raro (se copia igual)
- Cancel es secondary solid y Confirm default solid; en `stacked` el orden se invierte (confirm arriba).
- El Modal NO tiene variante Align: el header va siempre `horizontal` dentro del Modal.
- La descripción de ModalHeader dice que `Cancel es un ModalClose en código`.
- Los efectos llevan spread y el frame clipa: se pintan los tres (contrario al caso FAB).

## Anida
FeaturedIcon, CloseButton (ghost pill sm / default), Button (secondary solid / default solid / secondary ghost).
