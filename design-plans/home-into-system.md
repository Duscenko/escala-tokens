# Home merges into System — System becomes "Home"

Status (2026-10-20): ALL STEPS DONE (1–6).
- 1 ✅ sun/moon in the bar (every visitor); ☰ no longer repeats Appearance.
- 2 ✅ rail `Home · Board · Variables · Code · Components`; Home never dimmed.
  Leftovers removed: the "Home /" crumb and "All design systems" back link on the page.
- 3 ✅ `?section=library`, login `next=library`, About's Start building, Random discard,
  leave-with-drafts, Code's library door and the board's Home crumb all open the system
  tab. The empty-system → old Home redirect is gone (the page shows Add brand).
  `/` with no section still opens About (it always did; the old "signed-in `/` opens
  Home" note was stale).
- 4 ✅ (reshaped) no header switcher: the **right panel** lists the design systems
  under the pages (`DesignSystemsNav` in `ThemeLibraryPage`): the one on screen lit,
  another loads in place (asks "Replace what is on screen?" only when the current one
  holds unsaved work), `+` = New design system. The account menu's "Saved design
  systems" entry is gone. The rail's Home asks before throwing away a draft
  (`requestHome`). The `library` tab hosts ONLY the create studio: closing it lands
  on Home, so the old file browser can no longer be reached.
- 5 ✅ the brand column's **Export** opens the wizard scoped to that brand
  (`openThemeExport`, it used to leave for the Code page); **Export all** in Home's
  header opens it with every saved brand checked (`exportAllModes` → `initialModes`).
  Free is still cut by the wizard's own `freeFigmaScope`. Not verified with 2+ brands
  (the test system has one).
- 6 ✅ the old file browser is deleted from `ThemeLibraryPage` (2053 → ~850 lines): Recents,
  System styles view, All design systems, the saved-folder view, `HomeNav`, folder / theme /
  style cards, and their props (`enterFolderTick`, `openStylesRequest`, `onGoHome`,
  `onOpenSystem`, …). Pinned is deleted: store v100 drops `pinned` / `togglePinned`, the ⋯
  menu's "Pin to Home" is gone, parked account files no longer carry it. The cloud record
  still sends `pinned: []` (older builds validate it). CLAUDE.md has the UPDATE note.
- Follow-up: three exports confused (top pill · header Export all · column Export). Home now has
  ONE: the brand column's Export opens a menu (this brand · all N brands · Figma · code ·
  GitHub). Header Export all removed; the top pill is hidden on Home only.

## Why

The top-bar Home (section `library`, `ThemeLibraryPage` without `systemOnly`) and the
Generator's System tab (`SystemDashboard`) are two doors to the same thing, and Home
confuses people: it's a file browser (Recents · Design systems · Pinned) whose main
entry, "the design system on screen", just redirects to System
(`ThemeLibraryPage.tsx:1381`). Everything that matters is already in System:

- **Overview (`OverviewPage`) is the brands table**: one column per brand, `+` Add brand
  (blank or Import JSON, `AddBrandMenu`), Export per brand (`onExportBrand` →
  `openCodeForTheme`).
- Docs, Integrations (GitHub), Status board.

The rule from now on: **one place for the design system, the brands table. Add a
brand, export one, or export them all (bundle) from the same table.**

## What changes

### 1. Top bar: the house becomes the sun/moon
- `ThemeAppearanceControl` (`ThemeSheet.tsx:334`): remove the Home button and the
  `homeOpen` / `onOpenLibrary` props.
- In its place, `AppearanceToggle` (`TopNav.tsx:331`, already used by `AccountPage`
  and `AboutMenu`) with `useTheme()` + `setTheme`. Same 32px footprint, same
  `GLOBAL_ICON_ACTION` shell.
- Check that light/dark isn't duplicated elsewhere in the bar (Workspace settings):
  if it is, the top-bar one wins and the other one goes.

### 2. Left rail: "System" becomes "Home", first item
- `WorkspaceNavRail` items (`Configurator.tsx:2467`):
  `Home · Board · Variables · Code · Components` (was Overview · Variables ·
  System · Code · Components).
- **Only the visible text changes**: the key stays `system`, the URL stays
  `?section=system` / `system/<foundation>` (same rule as Theme preview → Theme).
  `'Back to System'` → `'Back to Home'` (`Configurator.tsx:2623`), and every
  `t('System')` that names this tab. es/fr strings too.
- `Home` must not be dimmed when there are no brands (today `dimmed` includes
  `system`): with no brands, Home is precisely where you create the first one.

### 3. The page (the old System) gains what Home did that's worth keeping
| Old Home | Where it goes |
|---|---|
| Design system on screen | It's this page. |
| Other design systems (Pro, up to 10) + "All design systems" | **Switcher in the page header**: name of the system ▾ → list · New design system · Import. Replaces the "All design systems" back link in the menu (`SystemDashboard.tsx:200`). |
| New design system (`+`) | In the switcher (still behind `useNeedsProForAnotherSystem`). |
| Pin / Recents / Pinned | **Deleted** (decided 2026-10-20): the Pin action, the Pinned list, Recents, and the `pinned` store field (with a migration). |
| System styles | Already hidden (`SYSTEM_STYLES_VISIBLE = false`); "Start from style" lives in the create form. |
| Rename / delete system | Switcher's ⋯ menu. |
| Figma / GitHub status per card | Integrations (already there) + a dot in the switcher. |

**Table export (new):**
- Per brand: the column's `Export` is already there (`OverviewPage.tsx:358`). It
  opens the wizard scoped to that brand (`initialModes`) — check it doesn't open the
  whole system.
- **Export all (bundle)**: one button in the table header → `ExportWizard` with every
  brand checked (`ALL_WIZARD_COLLECTIONS` + every mode). Same pipeline, no new exporter.
- Free: Export all respects `freeFigmaScope` like it does today; on Free the button is
  shown and the wizard says what's left out (we don't hide it).

### 4. The create studio stops calling itself Home
The `library` tab ALSO hosts the brand create studio (`homeCreating`, `guestStudio`,
`openCreateTheme` → `setThemeWorkspaceTab('library')`). That stays as a flow, but:
- Rename the internal tab `library` → `create` (type `ThemeWorkspaceTab`,
  `WorkspaceTabKey`), with a migration in `workspaceLink` parsing: `library` →
  `system` (or `create` if there was a creation intent).
- `homeRailOnly`, `homeFileBrowser`, `homeResetTick`, `requestHome`,
  `sessionAllowsHome`, `onGoHome` disappear with the file browser.

### 5. Entry points that pointed at Home now point at the new Home (System)
- `loginReturn`: `next=library` → System. `LoginNext` keeps accepting `'library'`
  (links already sent / in emails) and treats it as `system`.
- Signed-in visit to `/` with no section (`Configurator.tsx:747`) → `system`.
- `AccountControl.tsx:113-121`, `PluginConnectPage.tsx:106`,
  `ThemeLibraryPage.tsx:529` (sign-in links).
- `workspaceLink.ts:135/181` (`library` → `system`), breadcrumb `['Home']`
  (`loginReturn.ts:174`).
- A first visit without an account (`guestFirstRun` → `library`) → `create`
  (the studio), not the old file browser.

### 6. What gets deleted
From `ThemeLibraryPage`: `HomeSection` (`recents | styles | libraries | library`),
the Home inspector menu (the nav with Recents / Design systems / Pinned, ~line 870),
the Recents grid, the folder cards and `FolderCardFooter`. The file stays for the
studio and for `systemOnly`; if what's left is only the studio + the dashboard
wrapper, consider splitting it (`CreateStudioPage` + `SystemPage`).

## Order (each step leaves the app working)
1. Sun/moon replaces the house; the house's action points to System in the meantime.
2. Rail: System → Home, first position; strings + es/fr.
3. Redirect every `library` entry point to `system`; `library` → `create` for the
   studio.
4. System switcher in the header (systems, New, Import, rename, delete).
5. Export all in the table + verify the per-brand Export is scoped.
6. Delete the file browser and its state; update tests (`loginReturn.test.ts`,
   `libraryStatus.test.ts`, `pluginSession.test.ts`) and CLAUDE.md (an UPDATE note
   that supersedes "Home is the file browser" and "opening the design system on
   screen in Home shows its DASHBOARD").

## Open decisions
- ~~Rail name~~ **Decided**: rail reads `Home · Board · Variables · Code · Components`.
  The brand board's rail item "Overview" is renamed **Board** (label only, key
  `overview` unchanged).
- **Other design systems**: switcher in the header (proposed) or a "Systems" row in
  the left menu.
- ~~Pinned~~ **Decided**: deleted.
