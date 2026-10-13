# Overview lists every brand as its own column

Written against: 5c3d968

## Evidence chain

- Surface: System tab → Overview, the design system on screen (`ThemeLibraryPage` when `viewing.id === currentId` → `SystemDashboard` `page === 'overview'` → `OverviewPage`).
- Problem: the page draws one grid of foundation cards for the brand on screen (`roles.brand`). Every other saved brand is only a row inside `BrandSelect`, used as the page title. Two brands on one system read as one brand plus a menu. The reference for this page is a left-aligned row of brand columns: each column is that brand’s name and the same foundation cards, and **Add new brand** is the last column.
- Design evidence: `OverviewPage` header comment (“one card per foundation… The brand switcher and Add brand live in the page header”). `CLAUDE.md` dashboard note: Overview is visual, one card per foundation, no KPI row, a number only when a contrast pair fails. `.impeccable.md`: density with clarity; the platform accent is Escala’s violet, never the brand’s own hex, for selection chrome. `foundationFacts(store, brand)` and `themeBrandRamp` already take a brand key.
- Owner: `src/components/configurator/dashboard/OverviewPage.tsx`. The header that currently owns the switcher and the add button is `overviewHeader` in `src/components/configurator/ThemeLibraryPage.tsx`.
- Scope and affected surfaces: that Overview only. Docs, Status board and Integrations keep reading the brand on screen.
- Uncertainty: none. The reference’s dashed holes inside a column are not a product state — every saved brand has Color, Radius, Spacing, Shadow and Typography.

## Design decision

Overview becomes a horizontal row of brand columns, pinned to the left at a fixed width, scrolling sideways when they do not fit. One column per key from `useSavedBrandKeys()`, in that order. The column on screen (`roles.brand`) carries a 2px platform ring (`ring-2 ring-accent-solid`). The ring is the only selected mark. The brand ramp stays inside the Color card; the column stroke does not take the brand hex.

Each column stacks the existing `FoundationCard` in this order: Color, Radius, Spacing, Shadow, Typography. Facts and the ramp are that column’s brand (`foundationFacts`, `themeBrandRamp`, `plannedBrandThemes`), not the brand of the neighbouring column. The contrast tag stays on the on-screen brand’s Color card, from the dashboard already passed in (`dash.contrast`). Other columns do not run a second audit.

The section title is **Design System**. **Add new brand** leaves the page header and becomes the last column: the same primary button, the same `canAddMyTheme` disable and the same full-library title. With no saved brand, there is no scaffold column — only that add column.

The page title is the design system name (`projectName`). `BrandSelect` leaves this header. Choosing a brand is clicking its column.

## Reuse

- `FoundationCard` in `OverviewPage.tsx` — picture, title, line, empty, hover, focus ring. Do not restyle the card.
- `foundationFacts`, `themeBrandRamp`, `brandThemesSummary`, `plannedBrandThemes`, `shippedThemes`, `useSavedBrandKeys`, `themeDisplayName`
- `Tag` for the AA line, already on the Color card
- Add control: `PRIMARY` and `PlusGlyph` in `ThemeLibraryPage.tsx`, `canAddMyTheme`, `MY_THEME_FULL_ERROR`, `onCreateTheme`
- Selected chrome: `ring-accent-solid` (platform), the same accent the rest of the shell uses for selection
- Column width: `10.5rem`, the min the current foundation grid already uses (`minmax(10.5rem, 1fr)`)
- Exemplar: the current `FoundationCard` Color / Radius / Spacing / Shadow / Typography blocks in `OverviewPage.tsx`

No new primitive. A brand column is those cards in a fixed-width stack.

## Changes

1. `src/components/configurator/dashboard/OverviewPage.tsx`
   - Change: replace the `auto-fit` foundation grid with `flex gap-3 overflow-x-auto`. Map `useSavedBrandKeys()`. Each column is `w-[10.5rem] flex-shrink-0 flex flex-col gap-2`. Its header is a button with the brand’s `themeDisplayName`; click calls a new `onSelectBrand(key)` and stays on Overview. The column whose key is `roles.brand` adds `ring-2 ring-accent-solid rounded-xl`. Inside, five `FoundationCard`s in the order above, each built the way the file builds them today, with `foundationFacts(store, key)` and that key’s ramp and theme summary. Color’s line stays `{hex} · {themes}`. Color’s click selects that brand, then calls `onOpenBrand` when it exists, otherwise `onOpenFoundation('color')`. The other four select that brand, then `onOpenFoundation` with `radius` / `spacing` / `shadow` / `typography`. The AA `Tag` renders only when `key === roles.brand` and `contrast.failing.length > 0`. Section `h3` text becomes `t('Design System')`. After the columns, one add column of the same width: dashed `border-line` frame, the primary **Add new brand** button (`onCreateBrand`), disabled with the existing cap title when adding is not allowed. Drop the `brands` ReactNode slot.
   - Preserve: card anatomy, the “See what fails” link, no KPI row, no status counters, the empty rule that a missing brand does not paint the scaffold accent.
   - Verify: two saved brands show two columns of five cards, values differ per column (accent hex, font, radius), the on-screen column has the violet ring, and the rest of the page to the right stays empty. A third brand scrolls; the cards do not shrink.

2. `src/components/configurator/dashboard/SystemDashboard.tsx`
   - Change: pass `onSelectBrand` and `onCreateBrand` through to `OverviewPage`. Stop passing `brands`.
   - Preserve: Docs, Status and Integrations still receive the single `brand` on screen.
   - Verify: opening Docs from a card still lands on that foundation for the brand the click selected.

3. `src/components/configurator/ThemeLibraryPage.tsx` — `overviewHeader` and the `SystemDashboard` call for the system on screen
   - Change: `ViewHeader` title is `store.projectName` (truncate), not `BrandSelect`. Remove the **Add new brand** button from `right`; leave `LibraryOptions`. Pass `onSelectBrand={onSelectTheme}` and `onCreateBrand={onCreateTheme}`. The add column’s disabled state uses `canAddMyTheme(mine.length)` and `MY_THEME_FULL_ERROR`, the same pair the header button uses now.
   - Preserve: token-count detail, delete confirmations, `GuestAccountCard`, and `BrandSelect` everywhere it is not this header.
   - Verify: the header no longer offers a second brand list or a second add button. Options (reset, delete) still open.

## Scope

- Inherit: Overview of the design system on screen, including a system with one brand and a system with none.
- Verify: selecting a column updates the brand the Theme tab and Variables already follow (`onSelectTheme` / `previewTheme`). Color still opens the brand preview; the other cards still open Docs.
- Exclude: the TopNav brand pill, Get code, the inspector menu, Docs / Status / Integrations layouts, and any per-foundation “empty slot” inside a column.

## Validation

- Product: open System → Overview with two brands. Both are visible without opening a menu. Click the second column’s header: it gains the ring and the Theme tab shows that brand. Click its Color card: the brand preview opens on that brand. Add new brand still starts the create studio, and stays disabled at the plan cap with the same explanation.
- Interface: one brand; two brands; enough brands to scroll the row; a long brand name truncates in the column header; the AA tag on the on-screen Color card when a pair fails, and absent on the other columns; zero saved brands shows only the add column. Desktop widths only. Dark chrome.
- System: one `FoundationCard`. Selection is `ring-accent-solid`. No second brand switcher on this page.
- Repository: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

## Stop conditions

- Stop if `foundationFacts` or `themeBrandRamp` cannot take an arbitrary saved brand key. Do not invent a second facts helper.
- Stop if the add action would mint a brand by a path other than the current `onCreateTheme`.

## Design documentation

- After acceptance and validation: in `CLAUDE.md`, the 2026-10-12 Overview sentence (“one card per foundation… then the brands”) becomes: Overview is one column per brand, each column the five foundation cards, Add new brand as the last column. The “don’t add a counter” rule stays.
