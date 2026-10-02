# Semantic dropdowns: leading variable icon and a chevron off the edge

> **Status: ✅ executed.** `ui/VariableSelect` is in `DimensionSelect`, `LayoutSemantics`
> (Roles) and `GridSemantics`. Measured in 8 tables: icon 11.3px from the left, chevron
> 11.3px from the right (was ~7), `appearance: none`, nothing clipped. One deviation from
> the plan: the Roles Aliases track is `minmax(12.5rem,1fr)`, not 11rem — at 11rem the
> longest option rendered as `full → dimension-` (value cut off). At 1180px the Roles
> table already scrolled horizontally from its own `min-w-[36rem]`; unchanged.

Written against: `3574c7b` (working tree also carries the uncommitted Dimension
primitives work; every path below exists there, none exists at the commit alone).

## Evidence chain

- Surface: Variables → Radius / Spacing / Sizes / Stroke / Grid. **Scale** (each
  step picks a Dimension primitive) and **Roles** (each role picks a step).
  Rendered: the user's screenshot of `radius-none primitive` plus the selected
  element's computed styles.
- Problem: the native dropdown arrow sits against the right border. Computed on
  the selected `<select>`: `padding: 0 6.75px` (Tailwind `px-1.5` at the app's
  18px root), `border-width: 0.5px`, `width: 166px`, so the arrow's right edge is
  ~7px from the border, while the text starts 6.75px from the left. The control
  also carries no mark saying it picks a *variable*, unlike every other place the
  app presents a variable layer.
- Design evidence:
  - `VariablesIcon` (`src/components/configurator/VariableCollectionRail.tsx:72`)
    is the app's one "this is a variable" glyph. Its own comment says semantic
    collections use it "so its collection row uses the same variables mark as the
    workspace tab", rendered as a CSS mask with `currentColor`.
  - `RailSelect` (`src/components/ui/RailSelect.tsx:73-78`) is the app's
    dropdown with a leading icon and an explicit chevron: `pl-2.5`, icon in
    `text-fg-muted`, `gap-2`, 10px chevron in `text-fg-faint`.
  - `StepGradients.tsx:140-150` is the in-app precedent for a **native**
    `<select>` with a leading glyph: `relative` wrapper, absolutely positioned
    `pointer-events-none` icon, `pl-8`, `appearance-none`.
- Owner: `src/components/ui/DimensionSelect.tsx` (Scale) and the inline
  `<select>` at `src/components/configurator/LayoutSemantics.tsx:299-312` (Roles).
  Both resolve to the same chrome (`h-7 px-1.5 rounded-md border border-line
  bg-app text-caption font-mono text-fg-muted`), and both were authored in the
  Dimension primitives work as one control in two places.
- Scope and affected surfaces: `DimensionSelect` reaches Scale through
  `VariablesTable`'s `dimensionScale` prop, passed from `StepRadius`,
  `Step5_Spacing`, `Step9_Sizes`, `StepStroke`, `Step8_Grid`. The Roles select
  reaches Radius/Spacing/Size/Stroke through `LayoutHub` → `LayoutSemantics`.
  `GridSemantics.tsx:42-61` has a third copy of the same chrome (`Select`),
  reached through `LayoutHub`'s `Semantics={GridSemantics}`.
- Uncertainty: none for the padding; for the icon, validate that 12px reads
  inside the 31.5px control (the rail already renders it at 12px).

## Design decision

All semantic-token dropdowns of the Dimension foundations become **one** control:
a native `<select>` (keyboard, screen reader and type-to-jump stay free) with a
leading `VariablesIcon` and an explicit trailing chevron inset to mirror the
leading padding. One shared component, because Scale and Roles are the same
control in two tables and the Grid roles are a third copy; fixing the padding in
three hand-rolled places would leave three things to drift again.

## Reuse

- `VariablesIcon` (exported from `VariableCollectionRail.tsx`), size 12.
- Chevron: copy `RailSelect`'s glyph exactly (`width/height 10`,
  `viewBox 0 0 24 24`, `strokeWidth 2.2`, `path d="M6 9l6 6 6-6"`,
  `text-fg-faint`).
- Exemplar: `StepGradients.tsx:140-150` (native select + absolute leading icon +
  `appearance-none`).

New primitive: `src/components/ui/VariableSelect.tsx`. The existing system cannot
express the decision because the only native-select-with-icon exemplar is inline
in `StepGradients` and bound to a gradient swatch, and `RailSelect` is a custom
listbox (a different component, deliberately: it is the Groups-rail control).
Consumers that share it: `DimensionSelect`, `LayoutSemantics` (Roles),
`GridSemantics` (`Select`).

## Changes

1. `src/components/ui/VariableSelect.tsx` (new)
   - Change: props `value`, `onChange(value: string)`, `ariaLabel`, `children`
     (the `<option>`s), optional `className`. Render
     `<div className="relative w-full min-w-0">` containing:
     - `<span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2
       -translate-y-1/2 text-fg-faint"><VariablesIcon size={12} /></span>`
     - the `<select>` with `appearance-none`, `w-full min-w-0 h-7 pl-7 pr-7
       rounded-md border border-line bg-app text-caption font-mono text-fg-muted
       text-ellipsis cursor-pointer hover:border-line-strong focus:outline-none
       focus-visible:ring-2 focus-visible:ring-fg`
     - the chevron `<svg>` as `pointer-events-none absolute right-2.5 top-1/2
       -translate-y-1/2 text-fg-faint`.
   - Preserve: native `<select>` semantics, `aria-label`, the existing border,
     background, type role and focus ring tokens.
   - Verify: with the select focused, ArrowUp/ArrowDown and typing still change
     the value; clicking the icon or chevron opens the select (both are
     `pointer-events-none`, so the click reaches the select).
2. `src/components/ui/DimensionSelect.tsx`
   - Change: render `<VariableSelect>` instead of the bare `<select>`; keep the
     `min`, `scale`, `sortedDimensions` logic and the `dimension-<key>` labels.
   - Preserve: the `min = 0` filter and the "never drop a value that moved since
     the scale was computed" fallback.
   - Verify: the Scale tables of the five foundations render the icon and the
     chevron; the selected value is still `dimension-0`, `dimension-4`, ….
3. `src/components/configurator/LayoutSemantics.tsx:299-312`
   - Change: replace the inline `<select>` with `<VariableSelect>`; keep the
     `{s} → {stepPrimitive(primitives[s])}` option text and the comment above it.
     Widen the Aliases track in `GRID` (line 26) from `minmax(8rem,0.9fr)` to
     `minmax(12.5rem,1fr)`: the longest option, `2xl → dimension-9999`, is about
     20 monospace characters (~132px at 11px) and the control now spends 56px on
     icon and chevron, which a 144px track cannot hold.
   - Preserve: the Role, Preview and reset columns and their order.
   - Verify: no option text truncates for `xl → dimension-24`; a
     `2xl → dimension-9999` may truncate with an ellipsis but stays legible.
4. `src/components/configurator/GridSemantics.tsx:42-61`
   - Change: render the local `Select` through `VariableSelect`, keeping its
     `label`, `value`, `onChange`, `options` props.
   - Preserve: both Grid role tables (`VIEWPORT_GRID`, `FRAME_GRID`) and their
     column minimums; check the 8rem tracks of `VIEWPORT_GRID` against the new
     56px of chrome.
   - Verify: Grid → Roles renders both tables with the icon and without clipping.

## Scope

- Inherit: Scale in Radius, Spacing, Sizes, Stroke, Grid; Roles in Radius,
  Spacing, Sizes (heights and selector glyphs), Stroke; Roles in Grid.
- Verify: the Dimensions foundation (it has no select) and the Color
  semantics table (its value picker is a different component and must not change).
- Exclude: `TypeSemantics.tsx:71` and its Typography role selects (a different
  collection with its own cell widths; raise it separately if wanted),
  `RailSelect` and the Groups-rail controls, `GitHubConnectView`, `HomeActions`,
  `ContactPage`, `docs/componentArticle.tsx` (all unrelated selects).

## Validation

- Product: in Variables → Radius → Scale, change `radius-lg` to `dimension-20`,
  open Roles, confirm `container` reads `lg → dimension-20`; reset restores 16px.
- Interface: Radius, Spacing, Sizes, Stroke, Grid in Scale and Roles, in dark
  and light chrome, at 1180px and 1440px windows; confirm the arrow is no closer
  than the leading icon is to the left border (both 11.25px, `2.5` at the 18px
  root), and that the icon and chevron follow the theme (`currentColor`).
- System: confirm there is exactly one native-select-with-icon primitive for
  Dimension semantics and that no `<select>` with `h-7 px-1.5` remains in those
  three files.
- Repository: `npx tsc -b` → no errors; `npm test` → all passing (no test covers
  this chrome); `npm run build` → builds.

## Stop conditions

- Stop if `VariablesIcon` cannot be imported from `VariableCollectionRail.tsx`
  without a circular import through `colorControls`; move the glyph to `ui/`
  instead and re-export it from the rail rather than duplicating the mask.
- Stop if widening the Roles Aliases track makes `LayoutSemantics` overflow
  horizontally at 1180px (its table is `min-w-[36rem]`); in that case report the
  measured overflow before changing the table's minimum width.

## Design documentation

- After acceptance and validation: add one line to the "Dimension" note in
  `CLAUDE.md`: a semantic dimension dropdown is `ui/VariableSelect` (leading
  `VariablesIcon`, chevron inset `2.5`, `appearance-none`), never a bare native
  select.
