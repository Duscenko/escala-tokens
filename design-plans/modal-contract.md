# Contract · Modal, ModalHeader, ModalFooter (from Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Modal", sets `Modal` (967:102),
`ModalHeader` (965:81), `ModalFooter` (966:114), read-only. Figma rules; nothing is corrected.
Ledger: `Modal` = rename of `Dialog` (code `Dialog`); `ModalHeader` / `ModalFooter` = parts.

## API

| Set | Figma (panel order) | Type | Default | React |
|---|---|---|---|---|
| Modal | `CloseVisible` | BOOLEAN | true | `showCloseButton` (shadcn alias) / `closeVisible` |
| Modal | `ContentVisible` | BOOLEAN | true | the `children` slot |
| Modal | `Content` | SLOT | sample body (`Type/body-md`, `Content/secondary`) | `children` |
| Modal | `FooterVisible` | BOOLEAN | true | `footer` present |
| Modal | `Size` default · lg | VARIANT | default | `size` |
| ModalHeader | `Title` | TEXT | "System notification" | `title` |
| ModalHeader | `DescriptionVisible` / `Description` | BOOL / TEXT | true / "Review the details and take action." | `description` |
| ModalHeader | `IconVisible` | BOOLEAN | true | `icon` (FeaturedIcon soft rounded default) |
| ModalHeader | `TrailingVisible` / `Trailing` | BOOL / SLOT | false | `trailing` |
| ModalHeader | `CloseClearanceVisible` | BOOLEAN | false | `closeClearance` (set by the Modal) |
| ModalHeader | `Size` default · lg | VARIANT | default | `size` |
| ModalHeader | `Align` horizontal · vertical-left · vertical-center | VARIANT | horizontal | `align` |
| ModalFooter | `LeadingVisible` / `Leading` | BOOL / SLOT | false | `leading` |
| ModalFooter | `ActionsVisible` / `Actions` | BOOL / SLOT | true | `children` |
| ModalFooter | `Size` default · lg | VARIANT | default | `size` |
| ModalFooter | `Layout` inline · stacked | VARIANT | inline | `layout` |

## Geometry

**Modal** (VERTICAL, fixed width, HUG height, clip): default 480, lg 640. Radius `Radius/overlay`, fill `Surface/layer-2`,
`Border/default` `Stroke/divider` (1) stroke INSIDE. Children: `main` (padding `Spacing/inset-surface` 20, gap
`Spacing/gap-group` 16: header + Content) · `footer` (ModalFooter instance, FILL) · `close` (CloseButton ghost pill,
ABSOLUTE x 427 y 21 default (32), x 579 y 21 lg (40); `Size/control-sm` default, `Size/control-md` lg).
Effects (Shadow/xl, the frame CLIPS content: the spreads ARE painted): `0 0 0 1 Elevation/shadow-ring` +
`0 20 24 -4 Elevation/shadow-key` + `0 8 8 -4 Elevation/shadow-ambient`.
Scrim: `Surface/overlay` (the Modal does not draw it; it is in the description).

**ModalHeader**: width 440 default / 600 lg (FILL in the Modal). Horizontal: HORIZONTAL, gap `gap-group` 16, centre;
vertical-left: VERTICAL MIN gap 16; vertical-center: VERTICAL centre. Icon = FeaturedIcon (default soft rounded,
40 default / 48 lg). `header-content` VERTICAL gap `gap-tight` 4, FILL: title `Type/heading-2xs` (default) / `heading-xs` (lg),
`Content/primary`; description `Type/body-md` at both sizes, `Content/secondary`. `Trailing` (hidden): HORIZONTAL gap
`gap-control` 8 (Button secondary ghost sm / default). `close-clearance` (hidden): square `Size/control-sm` (32) / `control-md` (40).
No padding of its own (the Modal's).

**ModalFooter**: padding `Spacing/inset-surface` 20 on all 4 sides; stroke TOP ONLY `Border/subtle` `Stroke/divider` INSIDE
(height 81 default / 89 lg: content 40 / 48 + 40 + 1). inline: HORIZONTAL MAX/CENTER gap `gap-control` 8; `Leading` slot
(FIXED, `Type/caption`, `Content/secondary`, gap `gap-tight`) hidden; `Actions` HUG HORIZONTAL gap 8 (cancel Button secondary solid,
confirm Button default solid). stacked: VERTICAL gap 8, Actions VERTICAL FILL, buttons FILL (confirm first, then cancel).
Buttons of the set's size (`Size=default` → Button default 40, lg → 48).

## What the file does that looks odd (copied anyway)
- Cancel is secondary solid and Confirm default solid; in `stacked` the order is reversed (confirm on top).
- The Modal does NOT have an Align variant: the header is always `horizontal` inside the Modal.
- The ModalHeader description says `Cancel is a ModalClose in code`.
- The effects carry spread and the frame clips: all three are painted (the opposite of the FAB case).

## Nests
FeaturedIcon, CloseButton (ghost pill sm / default), Button (secondary solid / default solid / secondary ghost).
