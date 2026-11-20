# Contract · Popover and PopoverFooter (from Figma to code) — READING, not built yet

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Popover": `Popover` (973:364, 12 variants), `PopoverFooter`
(972:279, 6). Read-only reading. Ledger: `Popover` rebuild, `PopoverFooter` part. Code today: `escala-ui/popover.tsx` + recipe `POPOVER`
(surfaces.ts) + specimen `SkeletonPopoverSpecimen`. "Popover Prototype" section (974:669) not read.

## API (panel order: variants first)
| Figma | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | default | `size` |
| `Side` bottom · top · left · right | VARIANT | bottom | `side` (the one it opens from the trigger) |
| `ArrowVisible` | BOOL | true | `arrow` |
| `CloseVisible` | BOOL | false | `showCloseButton` |
| `MediaVisible` / `Media` | BOOL / SLOT | false | `media` |
| `Title` | TEXT | "Share this view" | `title` |
| `DescriptionVisible` / `Description` | BOOL / TEXT | true / "Anyone with the link can see the filters and columns you applied." | `description` |
| `ContentVisible` / `Content` | BOOL / SLOT | false / "Replace this slot with the popover body: a mini form, settings rows, a profile card or release notes." (body-sm, Content/secondary) | `children` |
| `FooterVisible` | BOOL | false | `footer` |
PopoverFooter: `Layout` inline · stacked, `Size` default · sm · lg (default inline / default); `LeadingVisible` true / `Leading` SLOT (text
"Step 1 of 3", `Type/caption`, `Content/secondary`, gap `gap-tight` 4), `ActionsVisible` true / `Actions` SLOT.

## Geometry (Popover)
Root: VERTICAL (bottom/top) or HORIZONTAL (left/right), HUG, no padding or gap. Children: `panel` + `arrow` (frame 8 high/wide; the arrow is a
16×9 VECTOR (9×16 sideways) with `Surface/layer-2` fill and `Border/default` `Stroke/divider` stroke CENTER). Order: bottom = arrow, panel; top = panel,
arrow (arrow-shape at y −1); left = panel, arrow (x −1); right = arrow, panel. The arrow is centred (x 152 in 320: (320−16)/2).
`panel` (VERTICAL, FIXED width 320 default / 256 sm / 360 lg, HUG height, clip): radius `Radius/overlay` (16), fill `Surface/layer-2`, `Border/default` stroke
1 INSIDE. Height: default 108 (+8 arrow = 116), sm 91 (+8 = 99), lg 116 (+8 = 124); sideways 328 wide (320 + 8).
Effects per size (the panel CLIPS: spreads ARE painted): default and sm = `Shadow/md`: ring `0 0 0 1 shadow-ring` + key `0 4 6 −1` + ambient `0 2 4 −2`;
lg = `Shadow/lg`: ring + key `0 12 16 −4` + ambient `0 4 6 −2`. (Different from the FAB `lift`, which drops spreads.)
Panel children: `Media` (hidden; SLOT, 144-high rectangle, FILL, gradient + image; clip) · `body` (VERTICAL, FILL, padding and gap per size) ·
`footer` (PopoverFooter instance, FILL, hidden by default) · `close` (CloseButton ghost pill, ABSOLUTE, hidden).
`body`: default padding `Spacing/inset-surface` 20, gap `gap-control` 8; sm padding `inset-control` 12, gap 8; lg padding 20, gap `gap-group` 16.
`header` (inside body): VERTICAL gap `gap-tight` 4; `title`: default `Type/heading-xs`, sm `Type/heading-2xs`, lg `Type/heading-sm`, `Content/primary`;
`description`: default and sm `Type/body-sm`, lg `Type/body-md`, `Content/secondary`. `Content` slot: gap same as the body's (8 · 8 · 16).
`close`: CloseButton ghost pill `Size=xs` (24) at default and sm (x 288 y 8 / x 224 y 8 inside the 320 / 256 panel: 8 from the edge), `Size=sm` (32) at lg (x 316 y 12 in 360).

## PopoverFooter
Width 256 in the set (FIXED, the Popover stretches it to FILL). Padding `Spacing/gap-control` 8 on all 4 sides, gap `gap-control` 8, stroke TOP ONLY
`Border/subtle` `Stroke/divider` INSIDE. inline: HORIZONTAL MIN/CENTER, `Leading` FILL/HUG, `Actions` HUG HORIZONTAL gap 8; height 40 / 48 / 56 (sm / default / lg =
8+Button+8+1). stacked: VERTICAL gap 8, `Leading` FILL, `Actions` VERTICAL FILL gap 8 with FILL buttons (skip first and next after in stacked; inline: skip, next);
height 96 / 112 / 128. Buttons: sm → Button `xs` (24), default → `sm` (32), lg → `default` (40); `skip` = secondary solid, `next` = default solid.

## Odd bits (copied anyway)
- The footer mirrors DropdownMenuFooter; the footer padding is 8 (not the Modal's inset-surface).
- The `panel` keeps a literal strokeWeight 1 (no variable) while the arrow uses `Stroke/divider`.
- Stacked footer order: `skip` on top, `next` below (the reverse of the Modal: here confirm does NOT go first).
- Effects with spread on a frame that clips → they are painted (ring + spreads), like the Modal.

## Nests
Button (xs / sm / default), CloseButton (xs / sm), no FeaturedIcon. PopoverFooter is part of the Popover.
