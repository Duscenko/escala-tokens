# Flatten Theme Preview edition onto workspace chrome

Written against: `a37d97c` plus uncommitted Theme Preview chrome (`WORKSPACE_CHROME` tab bar).

## Evidence chain

- Surface: Theme Preview → Quick settings rail (`aside[aria-label="Quick settings"]`) for Color / Text / Radius / Size / Stroke / Shadow / Style edition.
- Problem: Each foundation’s widgets sit inside a filled `--app` `rounded-lg` slab (`RailCard` / `EditionCard`) on a `--tab-bar` column. The Name field already sits on chrome without that second page. The result is a nested panel (tab-bar → app card → bordered `bg-surface` tiles), which is what reads as “too heavy.”
- Design evidence:
  - `src/components/configurator/themeWorkspaceLayout.ts` — `--tab-bar` is Quick settings chrome; `--app` recesses chips *on* that plane, and the strip must not be painted `--app`.
  - Same rail: `ThemeIdentityBand` is a single `bg-input-bg` field on `--tab-bar`; `EditionCard` is `bg-app ${RAIL_SURFACE_RADIUS}` filling the scroll body (`ThemeQuickSettingsRail.tsx`).
  - `.impeccable.md` — density with clarity; identifiers, not extra chrome.
  - Color edition already has the house eyebrow for States (`text-micro font-semibold uppercase tracking-wide text-fg-faint`).
  - Reference structure only (not widgets): Omni Brand inspector — one plane, uppercase group captions, hairline separators, fields on the page. Keep Escala’s SpectrumSlider, TintSlider, state chips, Color Agent, Contrast grid, Random, Radius / Type / Size cards.
- Owner: `src/components/configurator/ThemeQuickSettingsRail.tsx` (`EditionCard`; Color edition JSX; other `EditionCard` call sites).
- Scope and affected surfaces: All seven `QUICK_PANEL_FOUNDATIONS` panels in this rail. `RailCard` stays as-is for `IntegrationStatusRail` Connection / Protocol.
- Uncertainty: none on the nested fill. Exact Color Agent / Contrast row chrome after flatten should reuse Name-field / `CHROME_CONTROL_*` rather than invent a third field.

## Design decision

Stop wrapping Theme Preview edition in an `--app` card. The Quick settings column *is* the container (`WORKSPACE_CHROME`). Widgets stay; grouping is captions + `border-line` hairlines, matching States and the Name band.

Do not copy Omni’s HEX rows, Preset/Custom segmented control, or Neutral dropdown. Those are a different product’s widgets.

## Reuse

- `WORKSPACE_CHROME` (`bg-tab-bar`) — rail fill
- `border-b border-line` / `divide-y divide-line` — the same hairline as TopNav, tab bar, identity band
- Existing States caption classes for other group eyebrows if a group needs a name
- `ThemeIdentityBand` field (`bg-input-bg`, `border-line`, `RAIL_SURFACE_RADIUS`) as the exemplar for Color Agent if it remains a full-width control
- `CHROME_CONTROL_SHELL` / `ColorAppearanceSwitch` — appearance sits on chrome; fill must separate from `--tab-bar` (`bg-app` or `bg-chip-rest`), not `border-line` on `--app` on `--app`
- Widgets unchanged: `SpectrumSlider`, `TintSlider`, state / extra chips + `ColorPickerPopover`, `ScaleSettingsModal` / `ColorControls`, Contrast grid toggle, `RandomThemeButton`, `TypeScaleCard`, `RadiusCard`, `ShadowCard`, `BaseUnitCard`, `ContainerInsetCard`, stroke / icon cards
- Exemplar: `ThemeIdentityBand` in the same file (control on chrome, no wrapping page)

If a new primitive is required: none. Split `EditionCard` from `RailCard` rather than restyling `RailCard` globally.

## Changes

1. `src/components/configurator/ThemeQuickSettingsRail.tsx` — `EditionCard`
   - Change: Do not render `bg-app ${RAIL_SURFACE_RADIUS}`. Header (title + trailing) and body sit on the rail. Optional `divide-y divide-line` between `SettingItem` rows stays for Text / Radius / Size / etc. `flush` Color edition uses group hairlines, not a card fill.
   - Preserve: title, Light/Dark trailing, Random vs “Go to advanced edition” footer, all child widgets and store writes.
   - Verify: no `--app` island in the 240px column; Name field and Color edition share one `--tab-bar` plane.

2. `src/components/configurator/ThemeQuickSettingsRail.tsx` — Color edition body
   - Change: Keep the widget order (Color Agent → Accent slider+chip → Neutral tint+chip → States → Add secondary/tertiary → Contrast grid → Random). Drop extra nested `bg-surface` tiles where the parent is no longer `--app`: Color Agent matches the Name field; Contrast grid is a row / `aria-pressed` control on chrome, not a second card. Appearance switch fill must read against `--tab-bar`.
   - Preserve: Color Agent dialog, pickers, solvers, Contrast grid canvas hookup, Random.
   - Verify: widgets still edit the previewed theme; no second fill stacked under the sliders.

3. `src/components/configurator/ThemeQuickSettingsRail.tsx` — Text / Radius / Size / Stroke / Shadow / Style `EditionCard`s
   - Change: Inherit the flattened shell only. Do not redesign `RadiusCard` / `TypeScaleCard` / etc.
   - Preserve: `SettingItem` labels, info hints, advanced footer.
   - Verify: switching FoundationIconRail Color → Font → Radius does not jump column width or reintroduce the `--app` slab.

4. `src/components/configurator/IntegrationStatusRail.tsx`
   - Change: none.
   - Preserve: `RailCard` `bg-app` Connection / Protocol blocks.
   - Verify: Figma / GitHub status rail still looks like cards.

## Scope

- Inherit: every `EditionCard` in Theme Preview Quick settings.
- Verify: Theme Preview artefacts still repaint; Variables via “Go to advanced edition”; Color Agent popover; Contrast grid; Light/Dark appearance; try-on “Add to system” under Name.
- Exclude: Omni widget set; Variables ColorPrimitives table; `RailCard` for IntegrationStatusRail; TopNav; inventing HEX text fields for accent/states.

## Validation

- Product: Open Theme Preview → Color edition; the column is one chrome plane; accent / tint / states / agent / contrast / random still work. Switch Font and Radius; same shell, same widgets.
- Interface: Dark and light chrome; try-on with Add to system; Color Agent open; Contrast grid Show/Hide; overflow scroll fades (`ThemeRailScrollRegion` still `--tab-bar`).
- System: No second `--app` card primitive for edition; integration rail still uses `RailCard`.
- Repository: `npx tsc -b --pretty false` → exit 0.

## Stop conditions

- Stop if flattening `EditionCard` is implemented by changing `RailCard` and that restyles IntegrationStatusRail.
- Stop if the executor replaces sliders/chips with Omni-style HEX inputs.
- Stop if Color edition is restyled without applying the same shell to the other six panels (the icon rail would show two column languages).

## Design documentation

- After acceptance and validation: In `ThemeQuickSettingsRail.tsx` header comments, record that Theme Preview edition sits on `WORKSPACE_CHROME` (no inner `--app` card); `RailCard` remains the integration-rail card. Do not add a DESIGN.md page.
