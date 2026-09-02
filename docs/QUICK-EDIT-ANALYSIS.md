# Quick Edit — Phase 4 analysis

Status: implemented first cut (Phase 4). The dock remains a view over the
existing store and canonical actions; it introduces neither a second control
layer nor new persisted fields.

## Product rule

Quick Edit may expose only decisions that already have one canonical write path in Escala. Every control must state whether it changes the previewed theme or the whole system. If that scope cannot be explained in one short label, the control is not ready for the dock.

## Current control inventory

| Candidate | Existing source of truth | Existing write path | Scope today | Phase 4 decision |
|---|---|---|---|---|
| Accent | `themeSources[theme].brand` plus the referenced primitive family | `applyAccentColor(hex, linked, previewTheme)` in `colorActions.ts` | Previewed theme when it owns a family; shared themes when they reference the same family | Eligible after the UI can disclose shared-family impact before committing. |
| Neutral | `themeSources[theme].gray` plus the referenced primitive family | `applyGrayColor(hex, previewTheme)` | Same shared-family caveat as Accent | Eligible with the same impact disclosure. |
| State colors | Error, warning, success and info family references | Existing family/theme editing in `ThemePanel` and Color Primitives | Theme palette, potentially shared by reference | Keep in the full theme editor; four extra color controls make Quick Edit cease to be quick. |
| Font family | `typography.fontFamily` | Typography foundation store actions | Whole system | Candidate only as a clearly labelled system-wide control. |
| Type scale and roles | `typography` primitives and `typography.roles` | Typography Primitives/Semantics | Whole system | Exclude from the first dock; this is a multi-variable editorial decision. |
| Radius personality | `radius` and `radiusRoles` | Radius Primitives/Semantics | Whole system | Candidate if represented by a small number of existing scale recipes; do not add a parallel “roundedness” value. |
| Density / spacing | `spacing`, `spacingRoles`, `sizes`, `sizeRoles`, `padding` | Spacing and Sizes foundations | Whole system | Not ready: “density” currently spans several independent token families. Define an atomic recipe and its undo boundary first. |
| Border weight | `stroke` and `strokeRoles` | Stroke Primitives/Semantics | Whole system | Candidate only if it writes the existing ramp/roles atomically. |
| Shadow / depth | `shadows` and `panelBackground` | Shadow foundation and surface setting | Whole system, appearance-aware output | Not ready: one “depth” control would conflate elevation values with surface treatment. |
| Field treatment | No single canonical token or action | Distributed across color roles, stroke, radius, sizes and component specs | Undefined | Exclude until the token contract defines the decision explicitly. |
| Control size | `sizes` and `sizeRoles` | Sizes foundation | Whole system | Consider with Density after an atomic recipe exists; do not expose an independent shortcut yet. |

## Recommended first cut

The smallest defensible Phase 4 dock is:

1. Accent — previewed theme, with shared-family impact disclosed.
2. Neutral — previewed theme, with shared-family impact disclosed.
3. Font family — labelled “Whole system”.
4. Radius recipe — labelled “Whole system”, built from the existing radius ramp and roles.

Density, fields, depth and control size remain research items. They currently require recipes spanning multiple foundations, so implementing them as isolated controls would create behavior the token model does not actually own.

## Required interaction contract before implementation

- One transaction per change, with a recoverable previous snapshot.
- Immediate repaint through the existing global `previewTheme` and preview token resolver.
- Explicit scope beside every control: `This theme` or `Whole system`.
- Shared-family warning before a theme color edit affects another theme.
- A direct link to the canonical advanced editor for every exposed decision.
- No new persisted field unless the design cannot be represented by current tokens; any such field requires the normal Zustand migration and export review.

## Validation questions

- Can a user predict whether Light, Dark, or both will change?
- Does the control produce the same result as the existing advanced editor?
- Can the exact change be undone as one action?
- Does `generateTokenJSON()` reflect the change without a special Quick Edit branch?
- Is the preview demonstrating the exported value rather than a local visual override?

Quick Edit should not be implemented until all five answers are yes for a candidate.

## Phase 4 implementation

The first dock lives under Theme Preview and is collapsed by default so the
token-driven artefacts remain the central surface. It exposes only Accent,
Neutral, Typeface and Corner recipe.

- Accent and Neutral retain their existing `colorActions.ts` write paths. If
  the family is referenced by more than one theme, the dock names every
  affected theme and requires confirmation before the write.
- Typeface writes `typography.fontFamily`; Corner recipe writes one of the
  existing `RADIUS_PRESETS` ramps. Both are labelled `Whole system`.
- Every dock write captures the current `DesignSnapshot` first, and exposes a
  short-lived Undo that restores that exact snapshot as a single action.
- Each decision links straight to its canonical advanced editor. Custom color
  entry, states, type scales and roles remain there rather than growing the
  dock.

Verified in the production preview: a shared Light/Dark accent warns before
applying, repaints both themes through the existing resolver, and Undo restores
the original token values without console errors.
