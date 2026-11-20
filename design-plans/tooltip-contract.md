# Contract · TooltipContent and TooltipInfoTrigger (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Tooltip": `TooltipContent` (415:773, 180 variants), `TooltipInfoTrigger`
(415:556, 60). Read-only. Ledger: `TooltipContent` = rename of `Tooltip`; `TooltipInfoTrigger` = part. Prototypes (881:1130, 884:1854) not read.

## API (variants first, then the rest of the panel)
TooltipContent: `Size` sm · default · lg (def default) · `Side` top · bottom · left · right (def top) · `Align` start · center · end (def start) ·
`Variant` default · secondary · inverse · critical · info (def default) · `Text` "Used on invoices and receipts. Format: 12-3456789." · `Title` "Tax ID" ·
`TitleVisible` false · `ArrowVisible` true.
TooltipInfoTrigger: `Size` sm · default · lg (def default) · `State` Default · Hover · Open · Focused · `Variant` default · secondary · inverse · critical · info.

## Geometry (TooltipContent)
HUG root: VERTICAL (top/bottom) or HORIZONTAL (left/right) with two children: `bubble` and `arrow`. Side is the edge it opens from; the arrow goes on the opposite edge
(top: bubble, arrow below; bottom: arrow, bubble; left: bubble, arrow on the right; right: arrow, bubble). `bubble`: VERTICAL, gap 2, padding Y/X sm 6/8 ·
default 8/10 · lg 10/12 (steps 1_5/2 · 2/2_5 · 2_5/3), radius `Radius/overlay` 16, clip, Shadow/md effects with ring and spreads (`0 0 0 1 ring`, `0 4 6 −1 key`, `0 2 4 −2 ambient`: the
frame clips, they are painted). Width: sm 200 · default 240 · lg 280 (cap: the text wraps; height sm 44, default 52, lg 62 with the example text on 2 lines).
`title` (hidden) `Type/label`; `text`: sm `Type/caption`, default `Type/body-sm`, lg `Type/body-md`. Same colour for title and text.
`arrow`: 5-thick frame (clip), the arrow 10×5 (5×10 sideways) in the bubble's colour, no stroke. Align: center = centred; start = 16 from the start edge (padding
`Radius/overlay`); end = 16 from the end. Total heights: 49 / 57 / 67.
Colour by Variant (bubble = arrow | text = title): default `Action/primary/default` | `Content/on-action`; secondary `Surface/muted` | `Content/primary`; inverse
`Surface/inverse` | `Content/inverse`; critical `Status/critical/surface-solid` | `Status/critical/on-solid`; info `Status/info/surface-solid` | `Status/info/on-solid`.

## Geometry (TooltipInfoTrigger)
Circular button (`Radius/full`) HORIZONTAL centre, padding 2, `icon/info` icon regular: sm 14, default 16 (`Size/icon-sm`), lg 20 (`icon-md`) → box 18 / 20 / 24. No fill.
Ink by Variant × State: default `Action/primary/default` (Default, Focused) and `Action/primary/hover` (Hover, Open); secondary and inverse `Content/secondary` (Default, Focused) and
`Content/primary` (Hover, Open); critical `Status/critical/content` / `Status/critical/surface-solid`; info `Status/info/content` / `Status/info/surface-solid`.
Focused: 2 INSIDE stroke (`Border/focus` in default; `Border/strong` in secondary and inverse; `Status/critical/border-strong`; `Status/info/border-strong`) and a 2 OUTSIDE
`focus-ring` (`Border/ring/default` in default; the rest was not read: copied by analogy with DropdownMenuItem, `status.*.border` for critical / info).

## Odd (copied as is)
- The Focused variant grows the box 4px (20 → 24) because the stroke counts in the layout; in code the stroke is an inner shadow (no layout jump on focus, a decision from the brief).
- The default Align is `start`, not center.
- The bubble's radius is `Radius/overlay` (16) even in sm.
- The trigger's inverse variant uses the same ink as secondary.

## Nests
Info icon (Phosphor regular). The trigger is a `button` with `aria-label` (accessible name required).
