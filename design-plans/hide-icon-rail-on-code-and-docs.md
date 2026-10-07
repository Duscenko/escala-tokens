# Hide the foundation icon rail on Code and Docs

**Superseded** by `design-plans/home-replaces-themes-library.md`. Code and Docs keep the rail, with only the Home tile. Do not implement this plan.

Written against: `9779a76` (working tree may include later local edits)

## Evidence chain

- Surface: Generator left `nav[aria-label="Variable foundations"]` (`FoundationIconRail`, 64px, Color · Font · Radius · Sizes · Shadow · Icons · Themes). Captured while on Code / Docs in the inspector.
- Problem: On **Code** and **Docs** the rail is not the task. Clicking it leaves the tab. Docs already navigates sections from the **right inspector** (`OnThisPage` portaled into `WorkspaceInspector`). Code is a reading/export surface; the rail is a widget/table picker.
- Design evidence:
  - Rail mounts whenever `themeWorkspaceRailVisible` (`Configurator.tsx`): Generator canvas, not Figma/GitHub connect, not Themes library. That includes `themeWorkspaceTab === 'code'` and Theme preview with `docsPanelOpen` (inspector **Docs**).
  - Comment above the rail says Get code is off; implementation still draws it with `active={themeWorkspaceTab === 'code' ? '' : …}` (no selected icon).
  - `selectWorkspaceFoundation`: from Code/library, forces `preview` + artefacts. From Docs (`preview` + non-artefacts / docs panel), `themeHubSurface !== 'artefacts'` sends you to artefacts — leaving the document.
  - Library already omits this column (`themeWorkspaceTab !== 'library'`) and gives the card `mx-3`. Code and Docs should match that page chrome.
  - Docs TOC: `DocsView` `hubMode && inInspector` → `InspectorPortal` → `OnThisPage`.
- Owner: `src/pages/Configurator.tsx` (`themeWorkspaceRailVisible`, card `mx-3`)
- Scope and affected surfaces: Inspector Code (`ThemeCodeFormat`) and Docs (`ThemePreviewHub` `docsOpen` / `DocsView` hubMode). Variables and Theme (artefacts) keep the rail.
- Uncertainty: none for hiding. Themes library door is the rail footer (`ThemesLibraryToggle`); Code/Docs still reach the library via TopNav `onOpenLibrary`. Do not add a replacement door on those tabs.

## Design decision

Treat Code and Docs like the Themes library page: **no 64px foundation rail**. The canvas uses the extra width. Docs section switching stays in the inspector TOC. The rail remains the picker only where it changes the canvas: Theme widgets and Variables tables.

## Reuse

- Existing hide: `themeWorkspaceTab !== 'library'` plus card `mx-3` in `Configurator.tsx`
- Docs navigation: `OnThisPage` in `DocsView.tsx` inspector portal
- Exemplar: Themes library layout (no icon column, card `mx-3`)

No new primitive.

## Changes

1. `src/pages/Configurator.tsx` — `themeWorkspaceRailVisible`
   - Change: Also false when `themeWorkspaceTab === 'code'`, and when inspector Docs is showing (`themeWorkspaceTab === 'preview' && docsPanelOpen`). Keep false for library and Figma/GitHub connect.
   - Preserve: Theme artefacts + Variables still show Color · Font · …
   - Verify: Code and Docs have no left icon column. Variables and Theme still do.

2. `src/pages/Configurator.tsx` — canvas card class
   - Change: Apply the same `mx-3` used on the library whenever the icon rail is hidden on this canvas (library, code, docs), so the card is not flush to the window while the inspector still has `mr-3`.
   - Preserve: With the rail visible, card stays `my-3` without extra left margin (rail sits in the chrome).
   - Verify: Gap between window edge and card on Code/Docs matches library.

3. `src/pages/Configurator.tsx` — comment above `FoundationIconRail`
   - Change: The comment that says Get code is off must match the gate (Code and Docs really omit the rail).
   - Preserve: `selectWorkspaceFoundation` behavior for Theme/Variables (no need to special-case Code if the rail is not mounted).

## Scope

- Inherit: `ThemeCodeFormat` full width; hub Docs article full card width + inspector TOC.
- Verify: Switching Theme → Docs hides rail; Docs → Theme shows it again. Variables unchanged. Library unchanged. TopNav still opens Themes library from Code/Docs.
- Exclude: Top-nav Docs destination (`tab === 'docs'`) — it already has no this rail (`outerRailVisible` is Components only). Do not restyle `OnThisPage`. Do not remove Use it (separate plan `docs-behavior-not-consumption.md`).

## Validation

- Product: Generator → inspector **Code**: no Color/Font/… column; code stays in focus. Inspector **Docs**: no foundation icons; “On this page” in the right inspector still jumps sections. Inspector **Theme** / **Variables**: rail still switches widgets/tables.
- Interface: Desktop Generator only. Click Themes in TopNav from Code still opens the library.
- System: One hide rule shared with library; no second rail component.
- Repository: no unit test required (layout gate). Spot-check the four inspector tabs in the browser.

## Stop conditions

- Stop if Docs in the inspector is not `preview` + `docsPanelOpen` anymore (gate would miss).
- Stop if product still wants the Themes folder glyph on Code/Docs — that is a new door, not this plan.

## Design documentation

- After acceptance: In `CLAUDE.md` Generator layout notes, record: **icon rail is Theme + Variables only**. Code, Docs, and Themes library are full-card pages; Docs sections live in the inspector TOC.
