# Edition switcher steps down under Brand

Written against: a8ee3b8, plus the uncommitted `EditionTitle` in `ThemeQuickSettingsRail.tsx`.

## Evidence chain

- Surface: Brand inspector, Color edition. The selected node is `EditionCard`’s header (`div.px-2.py-1.5`, 287×50). Visible text is “Color”, with the foundation glyphs beside it. Above it, `#workspace-inspector` shows Brand · Variables · System.
- Problem: `EditionTitle` paints a full-width track and stretches the selected step with `flex-1`. That raised key uses the same fill as the inspector tabs, so Color reads as a second primary tab bar.
- Design evidence: `ColorAppearanceSwitch` in the same `EditionCard` (the Light / Dark control under this strip) is the secondary segmented control: `h-8 flex-shrink-0`, `CHROME_CONTROL_SHELL`, segments `h-7 px-2.5`, selected `SEGMENT_ACTIVE`, no `flex-1`. `themeWorkspaceLayout.ts` defines one selected fill for inspector tabs, Light/Dark, and the platform switch. The hierarchy is size, not a second colour. Rendered 2026-10-13: the Color key fills the leftover width of a 287px track.
- Owner: `EditionTitle` in `src/components/configurator/ThemeQuickSettingsRail.tsx`.
- Scope and affected surfaces: Every quick-settings edition that mounts `EditionTitle` (Color, Font, Radius, Spacing, Shadow, Icons).
- Uncertainty: none. A longer locale (“Espaciado”) still hugs its own word; it must not reintroduce `flex-1`.

## Design decision

The edition strip keeps its glyphs and the sliding pill, and takes the Light/Dark control’s metrics. The track hugs the steps. The selected step hugs its name. The fill stays `SEGMENT_SELECTED_FILL`, so the step-down is width, and Brand · Variables · System remains the only full-width tab bar.

## Reuse

- `CHROME_CONTROL_SHELL`, `SEGMENT_SELECTED_FILL`, `SEGMENT_INACTIVE` (`themeWorkspaceLayout.ts`)
- Exemplar: `ColorAppearanceSwitch` in the same file (`h-8 flex-shrink-0`, `h-7 px-2.5`, no `flex-1`)
- `FoundationGlyph` on the resting steps
- `layoutId="edition-step-pill"` on the selected fill

No new fill, weight, or radius.

## Changes

1. `src/components/configurator/ThemeQuickSettingsRail.tsx` — `EditionTitle`
   - Change: On the `role="tablist"`, replace `flex w-full` with `inline-flex h-8 w-fit max-w-full shrink-0 items-center` and use `CHROME_CONTROL_SHELL` (it is `bg-chip-rest`; do not add a second track colour). On the selected `motion.button`, remove `flex-1`. Size it `h-7 px-2.5`, the same as a Light/Dark segment. Keep `font-semibold text-fg` on that step only. Inactive steps stay `w-7` with `FoundationGlyph`. The pill stays `absolute inset-0 rounded-md` with `SEGMENT_SELECTED_FILL` and `layoutId="edition-step-pill"`.
   - Preserve: the six editions, the name on the selected step, the glyphs on the others, arrow / Home / End focus, and the create-studio numbers.
   - Verify: “Color” is only as wide as the word. The track ends after the last glyph. The pill slides and resizes to the next name. Brand · Variables · System is unchanged and still the wider control.

## Scope

- Inherit: the six edition headers that render `EditionTitle`.
- Verify: light and dark chrome; a long label (Spacing / “Espaciado”) stays one line inside `max-w-full`.
- Exclude: `WorkspaceInspector` tabs, `ColorAppearanceSwitch`, `PlatformSwitch`, `CreateStepNav`.

## Validation

- Product: open a brand, Color edition. The edition control sits under Brand · Variables · System and does not span the inspector.
- Interface: click Font, Radius, Spacing, Shadow, Icons. The pill moves and the name replaces the glyph. Arrow keys still move the selection.
- System: selected fill is still `SEGMENT_SELECTED_FILL`. No new segment token.
- Repository: visual check in the running app. No test asserts these class strings.

## Stop conditions

- Stop if `w-fit` clips a translated name inside the inspector. Then use `px-2` on the selected step before any truncation, and do not return to `flex-1`.

## Design documentation

- None. The shared segment fill is unchanged. Record in `CLAUDE.md` only if a later pass documents inspector hierarchy: Brand · Variables · System is the full-width bar; edition and Light/Dark hug.
