# Tighten the icon-to-label gap in the vertical foundation rail

Written against: bf54743

Status: applied 2026-10-04 (requested by the owner on 2026-10-04 with a screenshot of the
Theme Preview rail: "más compactos entre el icono y el texto, menos gap").

## Evidence chain

- Surface: Themes workspace → Theme preview, the 64px vertical foundation rail
  (Color · Font · Radius · Grid · Sizes · Stroke …). Rendered by
  `FoundationIconRail` with `orientation="vertical"`.
- Problem: each tile reads as two loosely stacked pieces — the icon and its label
  sit visibly apart. Measured from the selected element: button height 66.5px =
  `py-1` (4.5 + 4.5) + icon box `w-9 h-9` (40.5) + `gap-1` (4.5) + label
  (`text-mini`, `leading-tight`, ≈12.5). The glyph is `h-5 w-5` (22.5px) centred
  in the 40.5px box, so it already carries 9px of the box's own air below it;
  the 4.5px flex gap is added on top of that, ≈13.5px from glyph to label.
- Design evidence: the user's rendered screenshot and request (density is a
  rendered-evidence call, not a source one). Note: this app sets
  `:root { font: 18px }`, so every Tailwind spacing step is 12.5% larger than its
  name (`gap-1` = 4.5px, `gap-0.5` = 2.25px) — see the rhythm note in
  `ThemeQuickSettingsRail.tsx` and CLAUDE.md "`xl:` is 1440px in this app".
- Owner: `src/components/configurator/FoundationIconRail.tsx`, `RailTile`
  (line ~67, the non-compact class string `w-[56px] gap-1 py-1`).
- Scope and affected surfaces: the only non-compact `RailTile` consumer is the
  vertical `FoundationIconRail` (line ~147, `compact={!vertical}`).
  `ThemesLibraryToggle` (`ThemeSwitcher.tsx`) passes `compact`, has no label,
  and is unaffected. The horizontal rail also renders `compact` and is unaffected.
- Uncertainty: none on ownership. The exact amount is a visual call; this plan
  takes one step down the existing scale.

## Design decision

Reduce the flex gap between the icon box and the label from `gap-1` (4.5px) to
`gap-0.5` (2.25px), only in the non-compact branch of `RailTile`. The icon box,
its selection fill, the glyph size and the label type stay as they are; the
tile just stops spending a full spacing step on top of the air the 40.5px box
already provides. Tile height drops 66.5 → ~64.25px, which also lets one more
foundation fit before the rail scrolls on short windows.

Not chosen: shrinking the icon box (`w-9 h-9`). It is the selection target and
the hover/active fill; making it smaller changes the click area and the active
state, which is a different decision than the gap the user pointed at.

## Reuse

- Tailwind spacing step `gap-0.5` (already used across the chrome, e.g.
  `SettingItem` trailing `gap-0.5` in `ThemeQuickSettingsRail.tsx`).
- Exemplar: `RailTile` itself — only the one class changes.

## Changes

1. `src/components/configurator/FoundationIconRail.tsx` — `RailTile`
   - Change: in the button's class string, the non-compact branch
     `'w-[56px] gap-1 py-1'` becomes `'w-[56px] gap-0.5 py-1'`.
   - Preserve: `w-[56px]`, `py-1`, the `w-9 h-9 rounded-[11px]` icon box and its
     `on` / hover colours, the label's `text-mini font-medium leading-tight
     truncate`, and the compact branch (empty string) exactly.
   - Verify: on Theme preview the label sits ~2px under the icon box; the active
     tile's tinted box does not touch or overlap the label text.

## Scope

- Inherit: every tile of the vertical foundation rail (Color, Font, Radius, Grid,
  Sizes, Stroke, and the Styles group below the divider).
- Verify: the vertical rail's group spacing (`gap-1 pt-3`, divider `mt-3`) still
  separates tiles clearly — tiles must not now read as one continuous column.
- Exclude: horizontal `FoundationIconRail` (Variables), `ThemesLibraryToggle`,
  the rail's footer (`gap-1.5`), and the group-to-group gap. Do not change
  `FOUNDATION_ICON_RAIL_WIDTH`.

## Validation

- Product: switch between foundations from the vertical rail on Theme preview;
  every tile still selects its foundation and the active state is obvious.
- Interface: light and dark chrome; active, hover and rest states; the longest
  label in the rail must still truncate cleanly at 56px; a short window height
  where the rail scrolls.
- System: no new spacing value introduced; the change stays inside `RailTile`'s
  non-compact branch.
- Repository: `npx tsc -b` → no errors; `npx vitest run` → all tests pass (no
  test covers this class string, so expect no snapshot changes).

## Stop conditions

- Stop if a second non-compact `RailTile` consumer has appeared since bf54743 —
  re-check `grep -rn "<RailTile" src` and include it in scope or exclude it
  explicitly.
- Stop if the active tile's fill visually collides with its label at `gap-0.5`;
  report back rather than going to `gap-0` or a negative margin.

## Design documentation

- After acceptance and validation: none required. If CLAUDE.md's
  `FoundationIconRail` note is ever updated, record "icon-to-label gap is
  `gap-0.5`; the 40.5px icon box already supplies the air".
