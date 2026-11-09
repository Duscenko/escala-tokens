# Random colours menu: names and swatches, no explanatory copy

Written against: `42d8ec4` (branch `fix/github-empty-repo-save`)

## Evidence chain

- Surface: the board toolbar's Random chevron menu, `RandomLevelPicker`
  (`src/components/configurator/ThemeSaveBar.tsx`, rendered with `chevron` by
  `BoardHistoryControls`, line ~212). Two views:
  - **Levels**: Safe · Free · Bold, then two deck rows (Rich pairs, Soft pairs),
    then a footer paragraph.
  - **Pairs**: back button + deck name, a 5-column grid of `PairTile`s, then a
    footer paragraph.
- Problem (reported by the owner, with screenshots): the menu reads as text-heavy.
  The owner explicitly asked to remove the paragraph under the pairs grid.
  1. Pairs view ends in a two-line paragraph (`PAIR_DECKS[].foot`, rendered at
     line ~740). Each `PairTile` already draws both themes (dark page with the
     accent, light strip with `accentLight`), so the paragraph restates the tiles.
  2. Each deck row ends with the level name (line ~697:
     `t(LEVEL_COPY[d.level].label)` → "Free" / "Bold"). Beside "Rich pairs" it
     reads as a plan or price tag ("Free" is also the product's plan name). The
     level is applied anyway when a pair is picked (`pickPair` →
     `writePaletteLevel(PAIR_DECKS[deckIndex].level)`, line ~503).
  3. Levels view ends in a fixed two-line hint paragraph (line ~707) that swaps
     on hover between `LEVEL_COPY[].hint` and `PAIR_DECKS[].hint`. Each level
     option already exposes its hint to screen readers through
     `aria-describedby` → `<span id="random-level-hint-…" className="sr-only">`
     (line ~672).
- Design evidence: `.impeccable.md:16`, "Trust the user — Avoid over-explaining.
  Labels should be identifiers, not tutorials. When something is obvious from
  context, skip the description." Plus the owner's request.
- Owner: `src/components/configurator/ThemeSaveBar.tsx` (`LEVEL_COPY`,
  `PAIR_DECKS`, `RandomLevelPicker`). Copy entries in `src/lib/i18n.tsx`.
- Scope and affected surfaces: only `RandomLevelPicker`, in both its uses (the
  board toolbar chevron and the non-chevron select trigger that renders the same
  menu).
- Uncertainty: none for the deletions. The menu height changes; placement is
  measured from `menu.current.offsetHeight` on open, so it re-flows on its own.

## Design decision

The menu holds names and swatches only. A level is identified by its name and
its `LevelMeter`; a deck by its name and its `PairStack`; a pair by its tile.
The explanatory sentences go. Screen-reader descriptions for the three levels
stay, because they are not visible copy.

## Reuse

- `SELECT_LIST`, `SELECT_OPTION`, `SELECT_OPTION_OFF` (`themeWorkspaceLayout.ts`),
  unchanged.
- `LevelMeter`, `PairStack`, `PairTile`, unchanged.
- Exemplar of a level-row hint that is announced but not shown: the existing
  `sr-only` span at line ~672.

No new primitive.

## Changes

1. `src/components/configurator/ThemeSaveBar.tsx`, pairs view
   - Change: delete the trailing `<p className="mt-0.5 border-t border-line px-2.5 py-2 …">{t(PAIR_DECKS[deckIndex].foot)}</p>` (line ~740–742).
   - Preserve: the header row (back + deck name), the grid, its `max-h` and
     scroll, keyboard navigation (arrows, Home/End, Esc back to levels).
   - Verify: the pairs view ends at the grid; no empty bordered strip remains.

2. `src/components/configurator/ThemeSaveBar.tsx`, deck rows
   - Change: delete the `<span className="text-mini text-fg-faint">{t(LEVEL_COPY[d.level].label)}</span>` (line ~697) and change the row's grid from
     `grid-cols-[auto_1fr_auto_auto]` to `grid-cols-[auto_1fr_auto]` (stack ·
     name · chevron).
   - Preserve: `PairStack`, the label, the chevron, `onClick` → pairs view,
     `deckRows` refs and arrow-key order. Keep `level` in `PAIR_DECKS`: `pickPair`
     still writes it.
   - Verify: rows read "◐◐◐ Rich pairs ›" and "◐◐◐ Soft pairs ›"; picking a pair
     still moves the toolbar level to Free / Bold respectively.

3. `src/components/configurator/ThemeSaveBar.tsx`, levels footer
   - Change: delete the footer `<p aria-hidden className="mt-0.5 min-h-[calc(2lh+1rem)] …">` (line ~704–709, including its comment). Then remove what
     only fed it: the `hoverDeck` state and every `setHoverDeck` call (lines
     ~488, 649, 666, 667, 691, 692), and the `active` state with its `setActive`
     calls (lines ~484, 498, 649, 666, 667) — confirm with a search that nothing
     else reads them before deleting. Delete the `hint` field from the
     `PAIR_DECKS` type and both entries. Update the `LEVEL_MENU_W` comment
     ("the hint reads at the foot") to drop the foot.
   - Preserve: `LEVEL_COPY[].hint` and the `sr-only` span + `aria-describedby`
     on each level option. The section divider above the deck rows
     (`border-t border-line pt-1`) stays; it separates levels from decks.
   - Verify: the levels view ends at the Soft pairs row; a screen reader still
     reads each level's description.

4. `PAIR_DECKS` type and data
   - Change: the type becomes `{ strength; level; label }[]` (remove `hint`
     and `foot`). Update the block comment above it if it mentions them.

5. `src/lib/i18n.tsx`
   - Change: delete the es and fr entries for the four removed strings (they
     become dead keys):
     - `'Deep, coloured dark pages, as the collection shows them'` (es ~71, fr ~2044)
     - `'A calm dark page and an off-white light one, one accent adapted to both'` (es ~72, fr ~2045)
     - `'Rich dark pages with the pair’s accent. Light keeps the accent, on a coloured paper.'` (es ~73, fr ~2046)
     - `'Each pair ships Dark and Light: one accent, adapted to each page. Switch the board to compare.'` (es ~75, fr ~2048)
   - Preserve: the three `LEVEL_COPY` hints (still used by the `sr-only` spans)
     and the `(random level)` label entries in en/es/fr.

## Scope

- Inherit: both renders of `RandomLevelPicker` (toolbar chevron and select trigger).
- Verify: `ThemePreviewHub` and `CreateBoard` toolbars (both mount
  `BoardHistoryControls`); the menu still opens above the toolbar and is not
  clipped.
- Exclude: the tile design, menu widths (`LEVEL_MENU_W` 220, `PAIRS_MENU_W`
  312), any restyle toward a "more modern" look (needs a reference, not part of
  this plan), and the Random button itself.

## Validation

- Product: open the board, click the chevron next to the die. Pick Free, then
  open Rich pairs and pick a tile; the board takes the pair and the toolbar
  level reads Free. Repeat with Soft pairs → Bold.
- Interface: both views in dark chrome and light chrome; English, Spanish and
  French; keyboard only (↓ through levels and decks, Enter on a deck, arrows in
  the grid, Esc back, Esc/Tab closes); a short window (grid scrolls, menu stays
  on screen).
- System: no new component or class; no remaining reference to `foot`,
  `hoverDeck`, or `PAIR_DECKS[].hint`.
- Repository: `npm run build` → passes (tsc catches any leftover reference);
  `npm test` → passes.

## Stop conditions

- Stop if `active` or `hoverDeck` is read anywhere besides the deleted footer;
  remove only the footer and keep the state.
- Stop if a test asserts the presence of the removed strings; report it instead
  of editing the test's intent.

## Design documentation

- After acceptance and validation: none required. The rule applied is already
  recorded in `.impeccable.md` §2.
