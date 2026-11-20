# Generator · the left nav column (Variables, Components)

Status: built on `feat/generator-left-nav` (2026-11-20), waiting for the owner's review. Decision: DEC-2026-11-20-001.
Workshop sketch: Escala Workshop, page "✎ Generator · navegación izquierda 2026-11-20"
(https://www.figma.com/design/iwUf3PSrZpJbUOKFjRCqyC/Escala-Workshop?node-id=53-6663).

## Problem
The navigation of two modes lived inside the right inspector:
- **Variables:** eleven foundations as an unlabelled icon strip down the inspector's edge, then Collections and Groups
  in the inspector, then the edit tools under them. The inspector navigated, sub-navigated and edited at once.
- **Components:** the directory was the right column, and on a component page *Component settings* covered it, so the
  directory was hidden exactly when you were inside a component.

Reference studied: shadcndesign's DS Manager (places on the left, by name; the inspector only edits).

## What changed
Layout (proposal C, chosen 2026-11-20 over A "fused rail" and B "nested rail"): `[mode rail] [card: nav pane | canvas] [inspector]`.
Two islands, not three. The mode rail (Home · Board · Variables · Code · Components) went from 80px labelled tiles to a
56px icon strip on the page chrome (`WORKSPACE_RAIL_WIDTH`, name in the tooltip); the brand mark in the top bar follows it.
The nav column is the card's left pane: rounded on the left only, its border is the divider, the canvas drops its left
edge, and the pane's header is 52px like the canvas header so one rule crosses the card. The pane keeps the platform's
chrome colours; only the canvas side paints the previewed theme (hard rule 11).

- `WorkspaceNavColumn` (new): the left column, 248px, foldable to a 44px strip. Folded/open is per mode and per browser
  (localStorage, `escala.navColumn.folded.<mode>`), never in the store. Below 1360px it starts folded until opened once.
- `NavPortal`: navigation that used to `InspectorPortal` now lands in the column when it is mounted and open, in the
  inspector otherwise — every other surface keeps its old placement.
- **Variables:** the column lists the foundations by name (Foundations · Dimensions, `lib/variablesNav.ts`), then the
  table's Collections + Groups. The inspector keeps only what edits: Color's suggested colours, the token details drawer,
  collection-wide settings (Radius preset, Spacing base unit, Motion preset — `VariableCollectionRail`'s `settings`),
  Icons' settings, and the save bar with CSS · Figma · Agent. Folded, the strip shows the foundation icons and
  Collections + Groups go back to the inspector, so nothing becomes unreachable on a 1280 laptop.
- **Components / Blocks / Screens:** the directory moves to the left (`side="left"`, with a fold button). The open
  family lists its parts under it. Page panels (Component settings, Edit theme, a pinned token list) dock in a right
  inspector that only exists while it holds something — an index page keeps the full width.
- Untouched on purpose: Home, Board, Code. Board keeps the full canvas (it is the brand's showcase); Home and Code had
  no navigation problem worth the width.
- No route, store field or export changed.

## Measuring it
Two events (`lib/analytics.ts`, enums only): `variables_nav { foundation }` (throttled) and
`nav_column { mode, state }`. Caveat: Vercel Web Analytics custom events need a Pro plan; on Hobby they are not
recorded. Until then the signal is qualitative.

## Known costs
- Open, the column takes 248px from the canvas (Variables at 1280px: the token tables scroll sideways). That is why it
  auto-folds below 1360px.
- With the directory on the left and settings on the right, a component page at 1280px has a narrow stage; fold the
  directory there.

## Next, if it works
Code (files by name: variables.css, tokens.json, the five W3C collections, the agent package) and Home (systems,
brands, integrations) can take the same column — see the workshop frames 1 and 4.
