# Contract · ScrollArea and ScrollBar (from Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ ScrollArea (✓) WIP": `ScrollArea` (977:572, 18 variants), `ScrollBar` (976:27, 12). Read-only. Ledger: ScrollArea `rebuild`, ScrollBar `part`.

## API (variants first, then the rest of the panel)
- ScrollArea: `Size` default · sm · lg (default default) · `Orientation` vertical · horizontal · both (default vertical) · `Appearance` filled · ghost (default filled) · `FadeVisible` false · `Content` (slot).
- ScrollBar: `Size` · `Orientation` vertical · horizontal · `Appearance` filled · ghost.
Description: scrollable viewport with overlaid ScrollBars and an optional fade at the end; Size and Appearance cascade to the bars; the viewport enters the tab order and scrolls with arrows, PageUp / PageDown, Home / End (accessible name if it carries main content).

## Geometry
- ScrollArea: clipping box (`Radius/container`), `Surface/layer-1` fill, `Border/default` 1 INSIDE stroke (counts in the layout: the content measures 190 of 192). Samples: vertical 192×288, horizontal 384×248, both 288×288 (given by the consumer).
  `Content` (slot): VERTICAL, gap `Spacing/gap-control` (8), padding `Spacing/inset-control` (12) on all four sides; vertical fills the width, horizontal and both are wider than the box (776 · 438) and scroll.
- ScrollBar (absolute, 4px from the edge): vertical x = width − thickness − 4, y 4, height = box − 8 (280); horizontal x 4, y = height − thickness − 4, width = box − 8 (376). With `both` each bar leaves 16 (4 + 8 + 4) for the other (268). Thickness 8 · 6 · 12 (default · sm · lg), radius `Radius/full`.
  Filled track `Surface/muted`; ghost has no track. Thumb `Surface/muted-hover`, `Radius/full`, fills the whole cross axis (64 of 160 in the sample).
- Fade: `fade-bottom` (height 32, at the bottom, full width) and `fade-end` (width 32, on the right, full height): gradient from transparent to `Surface/layer-1`, visible with `FadeVisible` (hidden by default in the file).

## Odd bits (copied anyway)
- The sample content carries Separator instances (tone subtle) between the lines of the tag list.
- The container stroke is `Border/default` (the earlier code drew `Border/subtle` with 6 padding).
- The bars are always visible (track included) instead of appearing on hover.
