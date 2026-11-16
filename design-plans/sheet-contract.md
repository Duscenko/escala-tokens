# Contract · Sheet (Figma → code)

Date: 2026-11-16 · Source: Figma `Escala Design System (Real)`, set `Sheet` (1648:1577, page docs 1652:8), read-only. Figma rules; nothing in the
file was edited. Ledger: `Sheet` = rebuild of the shadcn skeleton (`_skeleton/sheet.tsx`, deleted). Code: `escala-ui/sheet.tsx`, recipe `SHEET`
(`lib/recipes/surfaces.ts`), docs specimen `SkeletonSheetSpecimen`, stories `apps/storybook/stories/Sheet.stories.tsx`.

A Sheet is a Modal with a different shape: the same Radix Dialog (focus trap, Escape, `aria-modal`, focus returns to the trigger), the same
header and footer parts (`SheetHeader` = `ModalHeader`, `SheetFooter` = `ModalFooter`, aliases, no copies), the same Content slot.

## API (panel order: variant axes first)

| Figma | Type | Default | React |
|---|---|---|---|
| `Side` right · left · bottom | VARIANT | right | `side` |
| `Content` | SLOT | "Replace this slot with the sheet body." (`Type/body-md`, `Content/secondary`) | `children` |
| `FooterVisible` | BOOLEAN | true | `footer` present (a `SheetFooter`) |
| `CloseVisible` | BOOLEAN | true | `showClose` |
| `ContentVisible` | BOOLEAN | true | `children` present |

Header: the file nests a `ModalHeader` (Align horizontal, IconVisible false, CloseClearanceVisible true, Title "Sheet title", Description "Short
description of what this panel is for."), passed as `header`. No size prop, no state prop: interaction states are CSS / `data-*`.

## Geometry

`Side=right` / `left`: 400 × 852 (the height of the screen it is drawn on), VERTICAL, no padding / gap on the root. Code: full viewport height,
width 400 clamped between 320 and 480 (`min-width` / `max-width` on the recipe; also `max-width: 100%`).
`Side=bottom`: 393 wide (the phone), height hugs (272 with the sample content), a grabber on top.

- Fill `Surface/layer-2`. Stroke `Border/default` at `Stroke/divider` (1) INSIDE, on the edge that faces the page only: right → left edge, left →
  right edge, bottom → top edge. Radius `Radius/overlay` (24) on the two corners on that edge (right: top-left + bottom-left; left: top-right +
  bottom-right; bottom: top-left + top-right). The recipe got six properties for it (`strokeLeftWidth`, `radiusTop`, `radiusLeft`, `radiusRight`,
  `maxWidth`, `paddingTop`).
- Effects `Shadow/xl`: ring `0 0 0 1`, key `0 20 24 −4`, ambient `0 8 8 −4`. **The Sheet frame does not clip content** (`clipsContent: false`),
  so Figma paints neither the ring nor the negative spreads (the same case as the FAB): `lift: sheet` = key `0 20 24` + ambient `0 8 8`. This is
  the opposite of the Modal, whose frame clips.
- `main` (VERTICAL): padding `Spacing/inset-surface` 20, gap `Spacing/gap-group` 16: header + Content. right / left: FILL (flex 1); bottom: hugs.
  `Content` fills (right / left) and scrolls when taller than the panel.
- `footer`: an instance of ModalFooter, FILL: `Layout=inline` on right / left (81 tall), `Layout=stacked` on bottom (129 tall; confirm first,
  then cancel). In code the Sheet tells its footer (`ModalContext.footerLayout`) so a footer inside a bottom Sheet is stacked by default.
- `close`: CloseButton `Appearance=soft`, `Shape=pill`, `Size=sm` (32), ABSOLUTE. right: x 348 y 20 (20 from the corner); left: x 348 y 20 (the
  edge is on the right, so 19 inside the border); bottom: x 341 y 32 (under the grabber's 12 + the 1px edge). Not the Modal's ghost close.
- `grabber` (bottom only, frame 393 × 12 at y 1): padding-top `Spacing/gap-control` 8, centred `grabber-bar` 40 × 4, fill `Border/strong`,
  `Radius/full`. Fixed geometry with no token of its own: the recipe uses the spacing steps 10 (40) and 1 (4).
- Safe area (not drawn in the file; the description says "handled in code"): `padding-bottom: env(safe-area-inset-bottom)` on the bottom panel,
  under the footer, on the Sheet's own surface. The top safe area is left clear: `max-height = visible height − env(safe-area-inset-top)`.
- Bottom `max-height` follows `window.visualViewport` (height, and how far it ends above the layout viewport: the keyboard), never `100vh`.

## Motion (no new roles)

`sheet-enter` / `sheet-exit` (`lib/motion.ts`, recipe `RECIPE_MOTION.Sheet`, `sideAttr: 'side'`): the scrim fades on `use-overlay-in` /
`use-overlay-out`; the panel crosses in from its own edge on `use-travel-in` / `use-travel-out` (`slide-in-<side>`). Reduced motion: a fade, from
the tokens (the component has no media query). The portal sits inside the motion scope (`container={usePortalContainer()}`) and the context
provider wraps the Portal, never sits between Portal and Content (Radix clones the child into `Presence`).

## What the file does that looks odd (copied)

- ModalHeader now draws the description at `Type/body-md` in both sizes (header 53 / 58 tall); the code had body-sm at `default` since the Modal was
  built on 13 Nov (header 50). The recipe follows the file now; the Modal is 255 tall (was 252).
- The close is soft here and ghost in the Modal.
- The Sheet frame clips nothing, the Modal frame does: different shadow rendering from the same `Shadow/xl`.
- The Sheet has no `Size` axis; the Modal's footer / header Size follows the Modal, a Sheet is always `default`.

## Nests

ModalHeader, ModalFooter, CloseButton, (Button in the footer). The drawer blocks `CartDrawer` and `FilterDrawer` are built on it.

## Measured against the file (Storybook, Escala Light)

right / left 400 × 852, `main` 399 × 771 at (1, 0) / (0, 0), header 359 × 53 at (20, 20) inside `main`, Content 359 × 662, footer 399 × 81 at y 771,
close 32 at (348, 20); bottom 393 × 272, grabber 393 × 12 at y 1, bar 40 × 4 at (176.5, 9), `main` 393 × 130 at y 13, footer 393 × 129 at y 143, close
at (341, 32).
