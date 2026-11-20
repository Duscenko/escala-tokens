# Contract · Chip (Figma to code) — READ (2026-11-12, in progress)

Source: set `Chip` (`390:10982`, 480 variants). **Figma rules.** Description: "Compact tag for filter, selection or input values with an optional leading icon and close action. When CloseVisible is on, the close control needs an accessible name such as Remove plus the label, and the chip must be keyboard operable."

## API (panel order · defaults)
`Label` TEXT `Chip` · `CloseVisible` BOOLEAN false · `IconLeadingVisible` false · `IconLeadingIcon` swap (Plus) · `Variant` info · success · default · critical (default `default`) · `Appearance` outline · soft (default `outline`) · `Size` xs · sm · default · lg · xl (default `default`) · `State` Default · Hover · Focused · Selected · Disabled · Dragging · `Shape` rounded · pill (default `rounded`).

## Geometry (measured; Default · outline · rounded)
| Size | Height | Padding X | Gap | Text | Icon (leading / close frame) | Radius |
|---|---|---|---|---|---|---|
| xs | 24 `Size/control-xs` | 8 `gap-control` | 4 `gap-tight` | `Type/caption` | 16 `icon-sm` | `Radius/control` |
| sm | 32 `control-sm` | 8 | 4 | `Type/label` | 16 | control |
| default | 40 `control-md` | 12 `inset-control` | 4 | `Type/label` | 20 `icon-md` | control |
| lg | 48 `control-lg` | 12 | 8 `gap-control` | `Type/body-md` | 20 | `Radius/action` |
| xl | 56 `control-xl` | 16 `gap-group` | 8 | `Type/body-lg` | 24 `icon-lg` | `Radius/container` |
Pill = `Radius/full`. Layers: `leading` (icon frame, hidden) · `label` · `close` (frame, hidden). Outline: 1px INSIDE stroke that counts in the layout (53 vs 51 wide in default). Focused: 1px stroke + abs `focus-ring` OUTSIDE 2px `Border/ring/default` (halo).

## Colour (invariant of Size and Shape)
| Variant/Appearance | Default | Hover | Focused | Selected | Disabled | Dragging |
|---|---|---|---|---|---|---|
| default · outline | stroke `Border/control`, ink `Content/primary` | fill `Surface/muted`, stroke `Border/control-hover` | stroke `Border/focus`, ring `Border/ring/default` | fill `Surface/selected`, stroke `Border/accent`, ink `Content/accent` | stroke `Border/subtle`, ink `Content/disabled` | fill `Surface/layer-1`, stroke `Border/strong`, `Shadow/sm` |
| default · soft | fill `Surface/muted` | `Surface/muted-hover` | fill muted + stroke `Border/focus` + ring | selected / accent / accent (same) | fill `Action/disabled/default`, ink disabled | fill `Surface/muted-hover`, stroke `Border/strong`, `Shadow/sm` |
| status · outline | stroke `Status/s/border`, ink `Status/s/content` | fill `Status/s/surface`, stroke `border-strong` | stroke `border-strong`, ring `Status/s/border` | fill `surface-pressed`, stroke `border-strong` | stroke `Border/subtle`, ink disabled | fill `surface`, stroke `border-strong`, `Shadow/sm` |
| status · soft | fill `Status/s/surface` | fill `surface-pressed` | fill surface, stroke `border-strong`, ring `Status/s/border` | fill `surface-pressed`, stroke `border-strong` | fill `Action/disabled/default`, ink disabled | fill `surface-pressed`, stroke `border-strong`, `Shadow/sm` |
`Shadow/sm` in Dragging = `0 0 0 1 · 0 1 3 · 0 1 2 −1` (alphas .05 / .10 / .10): the spreads are not painted (frame without clip) → what remains is `0 1 3` + `0 1 2`.

## Status
Contract read; still to build (recipe, component, catalogue, store v136, specimens, parity, story, measurement).

## Update (built)
Status: recipe `CHIP` (4 slots: root · leading · label · close; three parts: geometry Size × Shape, padding + stroke Size × Appearance × State, paint Variant × Appearance × State), component `chip.tsx` (two sibling buttons), catalogue with the file's axes, specimen with opt-in `Interactive` for the board. `Dragging` = `lift: 'drag'` (`0 1 3 + 0 1 2`, no spreads). The old Chip's callers (Selected · Dismissible · sm/default) were moved: `Dismissible` → `CloseVisible`, `Selected` → `State Selected`.
