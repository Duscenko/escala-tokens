# Home replaces the Themes library

Written against: `5b40779` (working tree already contains a partial Home page in `ThemeLibraryPage.tsx`, `themeActivity.ts`, `pinned` on the store, and a confirm-password field on `LoginPage.tsx`. Do not rebuild those. Finish the shell around them.)

Supersedes the **rail-visibility** decision in `design-plans/hide-icon-rail-on-code-and-docs.md`. Account rules in `design-plans/login-funnel.md` and `design-plans/themes-library-accounts.md` stay: the Generator still opens without an account; Home is where a finished login lands.

## Evidence chain

- Surface: Generator canvas (`tab === 'foundations'`). Left `FoundationIconRail` (64px). Right `WorkspaceInspector` (288px). Centre card. Login return via `/?section=library` (`lib/loginReturn.ts`, `lib/workspaceLink.ts`).
- Problem: The file browser is a side page named **Themes**, reached from a folder tile at the **foot** of the rail, and the rail **unmounts** on that page and on Code and Docs. Saved libraries sit beside My themes as a second pile. After login with no pending destination, `pathForNext(null)` is `/`, which opens Theme preview (or About on a first visit), not the library.
- Design evidence:
  - Rendered (2026-10-07): rail foot reads **Themes**; page title **Themes library**; **My themes** and **My libraries** are sibling sections; theme cards have Open / Get code and no updated time or sync marks. Owner annotations on those captures: Home icon at the **top** of the variable rail; rail stays up; Code and Docs keep **only** that icon; My libraries becomes Home and the post-login landing; sections in the spirit of a file browser, not a copy of Figma’s sidebar; the **right panel** holds that menu; each theme shows last update and Figma/GitHub status; Open and double-click both enter; pin is a shortcut, not a second “favorite”; My themes live **inside** the library on screen.
  - `FoundationIconRail` already accepts `header` (above the icons) and `footer` (below). `Configurator` passes the library door as `footer` only (`ThemesLibraryToggle`, label `t('Themes')`, `FolderIcon`).
  - `themeWorkspaceRailVisible` is false for `library`, `code`, and inspector Docs (`preview` + `docsPanelOpen`). `themeWorkspaceCardInset` adds `mx-3` in those cases.
  - `WorkspaceInspector` is not mounted when `themeWorkspaceTab === 'library'` (`Configurator.tsx`). `HomeNav` in `ThemeLibraryPage.tsx` uses `InspectorPortal`; with no slot the portal renders **inline**, so the menu never occupies the right column.
  - `ThemeLibraryPage.tsx` (working tree) already paints the card grid the annotations ask for: Recents (last edited first), System styles, Libraries (the system on screen is the default library and My themes live inside it), Pinned, sync dots, double-click on the cover plus an Open button, Share via GitHub, Pin. Section id stays `library`.
  - `LoginPage.tsx` already asks for the password twice on signup and recovery (`Confirm password`). Leave that field.
- Owner: `src/pages/Configurator.tsx` (rail gate, inspector mount, library door). Tile: `ThemesLibraryToggle` in `ThemeSwitcher.tsx`. Menu host: `WorkspaceInspector.tsx`. Landing: `pathForNext` in `lib/loginReturn.ts`.
- Scope and affected surfaces: Generator Theme, Variables, Code, Docs, Home. Post-login redirect. es/fr strings for any Home label that is still the English key.
- Uncertainty: none for placement. Do not invent Community, Drafts, teams, or Trash — the product has no those objects.

## Design decision

**Home** is the file browser, and it is a workspace destination like Theme and Variables, not a page that hides the chrome.

- The left rail is always on the Generator canvas (still hidden on the Figma and GitHub connect surfaces, which own a different column).
- Its first tile is **Home** (a house, currentColor, same `RailTile` as the foundation icons). It sits in the rail’s `header`, above Color / Font / …. The foot folder goes away.
- On **Theme** and **Variables** the foundation icons stay under Home.
- On **Home**, **Code**, and **Docs** the foundation icons are omitted. Only Home shows. Clicking a foundation icon on those surfaces used to leave the page; omitting the icons is what keeps that from happening. Docs sections stay in the inspector table of contents. Code stays a reading surface.
- On Home the right inspector **is** the file menu (`HomeNav`). The Theme · Variables · Code · Docs tab strip is not drawn there — those tabs are the editor, and this column’s job on Home is the menu. Leaving Home is Open / double-click (Theme preview) or the inspector tabs once you are back on an editor surface.
- Sections, already in `HomeNav`, and they must stay these names (a file browser, not Figma’s sidebar): **Recents**, **System styles**, **Libraries** (the project on screen first, My themes inside it, then other saved libraries, then All libraries), **Pinned**. Pin is the only shortcut. Do not add a star or a Favorites list beside it.
- A finished login with no more specific return opens `/?section=library`. A `next=workspace` return (export, save, the section they left) still goes back there. Opening `/` while already in the app does not reset someone onto Home.

## Reuse

- `FoundationIconRail` `header` slot and `RailTile` (`FoundationIconRail.tsx`)
- `InspectorPortal` + `WorkspaceInspector` slot (`WorkspaceInspector.tsx`)
- `HomeNav` / `ThemeCard` / `syncStateOf` (`ThemeLibraryPage.tsx`)
- `byRecent` (`src/lib/themeActivity.ts`), `pinned` / `togglePinned` (store)
- `/?section=library` (`workspaceLink.ts` `root === 'library'`, `loginReturn.ts` `NEXT_PATH.library`)
- Exemplar: any other Generator side panel that portals into the inspector (quick settings, doc TOC) — same column, same 288px, same `my-3 mr-3` panel. Home fills that column and drops the tab strip.

No new primitive. The house is an inline stroke glyph in the same 18px box `FolderIcon` uses inside `RailTile`, painted with `currentColor`. Do not add a Figma-style mark or a second icon set.

## Changes

1. `src/components/configurator/ThemeSwitcher.tsx` — `ThemesLibraryToggle`
   - Change: Visible label `t('Home')`. Glyph is a house, not `FolderIcon`. `aria-controls` may stay `themes-library` (the page section id does not change). Placement `icon-rail` is the one the shell uses.
   - Preserve: `RailTile` active/inactive treatment. `onToggle` still calls `openLibraryPage`.
   - Verify: The tile reads Home, sits in the header slot, and is lit only while `themeWorkspaceTab === 'library'`.

2. `src/pages/Configurator.tsx` — rail
   - Change: Pass the Home tile as `header`, not `footer`. `themeWorkspaceRailVisible` stays false only for Figma/GitHub connect (`themeHubConnecting`). It is **true** on library, code, and inspector Docs.
   - Change: `groups` is empty when `themeWorkspaceTab` is `library` or `code`, or when inspector Docs is open (`preview` + `docsPanelOpen`). Theme artefacts and Variables keep today’s foundation groups.
   - Change: Drop `themeWorkspaceCardInset` / the extra `mx-3` that existed to replace a missing rail. The rail is present, so the card’s left edge meets it the way Theme and Variables already do. Keep `my-3` and the inspector’s `mr-3`.
   - Preserve: `selectWorkspaceFoundation` on Theme and Variables. Home’s click is `openLibraryPage`, not a foundation key.
   - Verify: Theme and Variables show Home, then Color, Font, and the rest. Code, Docs, and Home show only Home. Figma sync and GitHub still have no icon rail.

3. `src/pages/Configurator.tsx` + `WorkspaceInspector.tsx` — right column on Home
   - Change: Mount `WorkspaceInspector` on `themeWorkspaceTab === 'library'` as well. Add a way to omit the tab strip (a prop such as `showTabs={false}`). On Home, `HomeNav` is the only thing in the slot. On Theme, Variables, Code, and Docs the strip stays.
   - Preserve: `InspectorPortal` behavior. `HomeNav` already portals; once the slot exists it leaves the card. Do not render a second copy of the menu in the card.
   - Verify: On Home the right rounded panel contains Search, Recents, System styles, Libraries, Pinned — and no Theme/Variables/Code/Docs tabs. Switching to Theme brings those tabs back and the quick-settings panel with them.

4. `src/pages/Configurator.tsx` — `ThemeLibraryPage` props
   - Change: Stop passing `onBack`. The Home tile is the door; the page has no back-to-preview link in its props.
   - Preserve: `onOpenPreview`, `onGetCode`, `onSyncFigma`, `onShareGithub`, `onCreateTheme`, `onNewSystem`, `onImport`.
   - Verify: Typecheck. Double-click and Open still call `onOpenPreview` and land on Theme preview with that theme selected.

5. `src/components/configurator/ThemeLibraryPage.tsx`
   - Change: None to the section model. Confirm the rendered page is Recents by default, My themes only inside the open library, updated time + Figma/GitHub dots on each card, Pin in the ⋯ menu and in the Pinned group. If a heading still says “Themes library” or lists My themes beside My libraries, that is the bug — the working-tree header comment is the contract.
   - Preserve: Section id `library`. Create-theme card. Reset and delete confirmations.
   - Verify: With two themes, Recents lists the one edited last first. The library on screen shows those themes inside it. Another saved library is a row in the right menu, not a second “My themes”.

6. `src/lib/loginReturn.ts` + `LoginPage.tsx`
   - Change: When there is no pending `next`, a successful sign-in, sign-up, or “Open the configurator” goes to `/?section=library` (`NEXT_PATH.library`), not `/`.
   - Preserve: `next=workspace` still returns to the stored section. `next=library` unchanged. Anonymous visits to `/` still follow `hasOnboarded()` (About once, then the Generator). Do not put a login screen in front of the Generator (`login-funnel.md`).
   - Verify: Sign in from `/login` with a clean session lands on Home. Sign in from Export (`next=workspace`) returns to the export the intent describes. Reloading a `/?section=variables/...` URL does not jump to Home.

7. `src/lib/i18n.tsx`
   - Change: Add es and fr for every new Home string the page passes to `t()` (Recents, Pinned, Pin to Home, All libraries, the sync words, “Double-click to open”, and the Home tile if it is not already translated). `t('Home')` already maps to Inicio / the French equivalent — reuse it for the tile.
   - Preserve: The English keys. Do not rename `library` in the URL or the tab union.

## Scope

- Inherit: TopNav and the theme sheet already call `openLibraryPage` — they open the same Home. Code’s back control (`openThemeLibraryFromCode`) opens Home.
- Verify: Theme → Code → only Home on the left, code unchanged in the card, inspector tabs still there. Docs → only Home on the left, “On this page” still in the inspector. Home → Open a theme → Theme preview, full rail, inspector tabs. Pin a theme, reload, it is still under Pinned (`pinned` is persisted).
- Exclude: Top-nav Docs and Components (they do not use this rail). Public `/about`, `/docs/*`, `/components`, `/pricing`. Do not copy Figma’s Recents / Community / Drafts / teams / Trash / Starred row. Do not add Favorites next to Pin. Do not remove the confirm-password field. Do not gate the Generator behind login.

## Validation

- Product: From Theme, the top rail tile is Home and opens the file browser. The right panel is the menu. My themes are inside the library on screen. Code and Docs show that same Home tile and no Color/Font/…. Signing in with nowhere else to go opens Home.
- Interface: Desktop Generator only. One theme, many themes, no saved libraries, a pinned theme, unsaved dot on the library on screen. Light and dark chrome. es and fr on the new labels.
- System: One rail, one inspector column, one Home menu. The library section id stays `library` so old links and `loginReturn` tests keep passing.
- Repository: `npm test` → existing `loginReturn` / `workspaceLink` tests still pass; if `pathForNext(null)` changes, update `loginReturn.test.ts` to expect `/?section=library` only for the new default, and keep `pathForNext('workspace')` and `pathForNext('library')` as they are.

## Stop conditions

- Stop if Home’s menu cannot portal because the inspector slot is still unmounted on `library` — fix the mount, do not draw a second menu in the card.
- Stop if “universal rail” gets extended to About, Components, or the public docs. Those destinations are out of scope.
- Stop if a new section would require an object the product does not have (community, trash, teams).

## Design documentation

- After acceptance and validation: In `CLAUDE.md` Generator layout notes, replace “the rail’s foot is the Themes library door” and “library / Code / Docs hide the icon rail” with: the rail is on every Generator surface except Figma and GitHub connect; its top tile is Home; Code, Docs, and Home show only that tile; on Home the inspector has no Theme/Variables/Code/Docs strip and holds the file menu. Note that `hide-icon-rail-on-code-and-docs.md` is superseded.
