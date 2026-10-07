# Inspector tab strip — symmetric vertical padding

Written against: working tree (uncommitted)

## Evidence chain

- Surface: Generator · Theme workspace · right inspector (`#workspace-inspector`), tab row Theme · Variables · Code · Docs (`WorkspaceInspector.tsx`).
- Problem: The tab strip wrapper reads top-heavy: ~12px above the segmented control (`pt-3`) and ~8px below (`pb-2`) inside a fixed 60px band (`INSPECTOR_TABS_H`). User-selected node: `div.flex-shrink-0.px-3.pt-3.pb-2` at 287×60px.
- Design evidence: `themeWorkspaceLayout.ts` defines `INSPECTOR_TABS_H` so the inspector tab block and the Theme preview card header share one horizontal rule (“the two rules under them run on ONE line across the card and the inspector”). The card-side owner already centers content in that band: `ThemePreviewHub.tsx` uses `flex … items-center … px-3` with `style={{ height: INSPECTOR_TABS_H }}` and no asymmetric `pt`/`pb`.
- Owner: `src/components/configurator/WorkspaceInspector.tsx` (tab strip wrapper, ~line 78).
- Scope and affected surfaces: Inspector tab strip only; portaled panel content below (`border-t`) unchanged.
- Uncertainty: None — one-line class change aligned to existing exemplar.

## Design decision

Replace asymmetric vertical padding on the 60px inspector tab band with the same layout contract as the Theme preview header: fixed `INSPECTOR_TABS_H`, horizontal `px-3`, and `flex items-center` so the segmented `tablist` is vertically centered. Preserves total band height and alignment with the card header divider.

## Reuse

- Constant: `INSPECTOR_TABS_H` (`themeWorkspaceLayout.ts`)
- Exemplar: `ThemePreviewHub.tsx` — header row at `INSPECTOR_TABS_H` with `flex flex-shrink-0 items-center … px-3`

## Changes

1. `src/components/configurator/WorkspaceInspector.tsx`
   - Change: On the tab strip wrapper (`div` with `style={{ height: INSPECTOR_TABS_H }}`), replace `className="flex-shrink-0 px-3 pt-3 pb-2"` with `className="flex flex-shrink-0 items-center px-3"` (drop `pt-3 pb-2`).
   - Preserve: `INSPECTOR_TABS_H`, inner `tablist` grid, motion pill, portal slot below.
   - Verify: In Generator · Theme (any inspector tab), segmented control sits with equal inset top/bottom within the blue-outlined 60px band; bottom `border-t` on the slot still lines up with the card’s `INSPECTOR_TABS_H` header rule.

## Scope

- Inherit: None (single wrapper).
- Verify: Theme · Variables · Code · Docs on inspector; light and dark chrome.
- Exclude: `ThemePreviewHub` header (already correct), `INSPECTOR_TABS_H` value, other `pt-3 pb-2` usages (e.g. `ColorPrimitives.tsx` groups header).

## Validation

- Product: Open Generator → Theme; inspect `#workspace-inspector` tab row padding visually and in devtools (computed padding-top ≈ padding-bottom; content vertically centered in 60px).
- Interface: All four inspector tabs selectable; keyboard roving tabindex unchanged.
- System: No second tab-strip pattern introduced — matches card header exemplar.
- Repository: `npm run build` (or `tsc -b`) → green.

## Stop conditions

- Stop if centering clips the `tablist` at smaller widths or changes measured band height away from 60px — then use symmetric explicit padding (`py-2.5` both sides) only if math still totals ≤60px with inner track (~40px).

## Design documentation

- After acceptance: none required (implementation matches existing `INSPECTOR_TABS_H` comment and hub header pattern).
