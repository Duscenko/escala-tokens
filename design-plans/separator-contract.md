# Contract · Separator (Figma to code)

Date: 2026-11-13 · Source: Figma `Escala Design System (Real)`, page "❖ Separator (✓) WIP": `Separator` (402:9063, 48 variants, a single set). Read-only. Ledger: `rebuild`.

## API (variants first, then the rest of the panel)
`Align` none · start · center · end (default none) · `Orientation` horizontal · vertical (default horizontal) · `Tone` default · subtle · strong (default default) · `Variant` dashed · default (default default) · `Label` "OR".
Description: a thin line that divides content, horizontal or vertical, solid or dashed, with an optional label; decorative by default (`role="separator"` + `aria-orientation` only if it expresses structure).

## Geometry
Auto-layout root (HORIZONTAL; vertical: VERTICAL) with `itemSpacing` `Spacing/gap-group` (16), centred on the cross axis. Horizontal: width 320 in the sample (fills the container); vertical: height 112 in the sample (fills).
Align none: a single line; height `Stroke/divider` (1) horizontal / width 1 vertical. Align start: [label, line]; center: [line, label, line]; end: [line, label]; the label (`Type/label`, `Content/secondary`, 17×18 with "OR") is only visible with Align ≠ none
and the lines take up the rest (`grow 1`: 287 · 136 + 136 · 287 of 320; vertical 78 · 31 + 31). The root measures 18 tall (label) or 17 wide when vertical.
The line is a centred 1px stroke. Variant dashed: dash pattern [4, 4]. Tone: default `Border/default`, subtle `Border/subtle`, strong `Border/strong` (the label does not change with Tone).

## Odd (copied as is)
- The default Tone is `Border/default`, one step above the `Border/subtle` the previous code drew: separators with no prop look one step stronger.
- Dashed lines are 4 of stroke and 4 of gap, not the browser's `dashed` (they are painted with a repeating gradient).
