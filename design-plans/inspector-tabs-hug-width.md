# Inspector tabs hug their labels

Written against: working tree (uncommitted)

## Evidence chain

- Surface: Generator · `#workspace-inspector` tab row (Theme · Variables · Code · Docs). Selected node: `div.flex.flex-shrink-0.items-center.px-3` at 287×60 (`INSPECTOR_TABS_H`).
- Problem: The segmented track fills the inspector width. Four equal columns (`grid grid-cols-4`) give “Code” and “Docs” the same cell as “Variables”, so the chip reads as a hole on the right of the shorter labels. User: it is not hug; organize the right-side gap.
- Design evidence: `PlatformSwitch` (`PlatformRail.tsx`) already splits this control: `layout="fill"` uses `w-full` + `flex-1`; the default is hug (`flex-shrink-0`, each segment sized to its content, not `flex-1`). Inspector tabs are a short label set in a fixed 288px column (`INSPECTOR_WIDTH`), same job as the compact platform switch.
- Owner: `src/components/configurator/WorkspaceInspector.tsx` tablist (~line 79) and its tab buttons.
- Scope and affected surfaces: That tablist only. The 60px band, vertical centering, and the portal slot under it stay.
- Uncertainty: Spanish “Documentación” / French “Documentation” are longer than “Docs”. Hug must still fit inside the band’s inner width (inspector 288px minus `px-3`).

## Design decision

Size the track to its labels (hug), left-aligned in the existing 60px band. Drop the equal four-column grid so unused column width is not painted as empty chip on the right.

## Reuse

- `INSPECTOR_TABS_H`, `SEGMENT_INACTIVE`, `SEGMENT_SELECTED_FILL` (`themeWorkspaceLayout.ts`)
- Exemplar: `PlatformSwitch` default (non-fill) — `flex` + `flex-shrink-0`, segments not `flex-1`
- Keep the sliding pill: `motion.span` `absolute inset-0` already follows the button box

## Changes

1. `src/components/configurator/WorkspaceInspector.tsx`
   - Change: On the `role="tablist"` element, replace `grid grid-cols-4 gap-0.5` with `inline-flex w-fit max-w-full shrink-0 gap-0.5`. On each tab `button`, add `px-2.5` (keep `relative h-8 rounded-lg`). Do not add `flex-1` or `w-full`.
   - Preserve: `INSPECTOR_TABS_H` wrapper (`flex items-center px-3`), keyboard roving, `layoutId="workspace-inspector-tab"`, portal slot.
   - Verify: In English the chip ends shortly after “Docs”, with side-panel showing to its right inside the 60px band. Selecting each tab moves the pill to that label’s own width. “Documentación” / “Documentation” stay on one line inside the inspector (no clip). If a locale overflows `max-w-full`, tighten tab padding to `px-2` before any truncation.

## Scope

- Inherit: All four inspector tabs (Theme, Variables, Code, Docs).
- Verify: en, es, fr labels; light and dark chrome.
- Exclude: `PlatformSwitch` fill layout, `ThemePreviewHub` header, `INSPECTOR_WIDTH`, `INSPECTOR_TABS_H`.

## Validation

- Product: Generator → Theme. The tab chip hugs the four words; the right side of the 60px band is panel, not empty track.
- Interface: Click and arrow-key through all four tabs; pill width matches the active label.
- System: Hug matches `PlatformSwitch` compact, not a new segmented style.
- Repository: `npm run build` → green.

## Stop conditions

- Stop if hug width still overflows at `px-2` in es or fr — do not return to `grid-cols-4`; report the overflow instead of truncating a label.

## Design documentation

- After acceptance and validation: none.
