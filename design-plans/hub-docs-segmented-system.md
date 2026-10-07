# Hub Docs reads the whole system, one foundation at a time

Written against: `9779a76` (working tree also hides the foundation icon rail on Code and Docs)

## Evidence chain

- Surface: Generator inspector **Docs** (`ThemePreviewHub` `docsOpen`, `DocumentationView` → `DocsView` `hubMode`). Desktop only.
- Problem: The page still opens on one foundation (`activeDocKey = docPageOverride ?? contextDocKey`, and `contextDocKey` is `activeFoundation` from the icon rail). That rail is hidden on Docs, so the document looks tied to an aspect the reader can no longer choose. The inspector TOC is only that page’s sections (`foundationToc`), not the system.
- Design evidence: `FOUNDATION_DOCS` is the segment list (Color, Font, Radius, Spacing, Sizes, …). `OVERVIEW_KEY` (`__overview`) is the whole-system sheet (`OverviewArticle`), titled with the previewed theme in the hub. `overviewToc` is one entry per foundation — the comment in `OverviewFoundation` says a TOC of every section of every foundation is unscannable. Color on the themed overview is already collapsed to Accent + Neutral because inlining every section is too long. `FoundationArticle` is the full read of one foundation (lead, why, usage, `sections`, pager). `OnThisPage` jumps anchors inside the open article. Top-nav Docs (`allowReference={false}`) does not render this sheet.
- Owner: `src/components/configurator/ThemePreviewHub.tsx` (`activeDocKey`, `handleDocNavigate`), `src/components/configurator/DocsView.tsx` (hub inspector TOC), `src/components/configurator/docs/foundationArticle.tsx` (`OverviewArticle`)
- Scope and affected surfaces: Generator Docs only. Top-nav Docs, public `/docs`, and the hand-off overview (no theme `title`) stay as they are.
- Uncertainty: none. Do not invent a second article generator.

## Design decision

Hub Docs is the **system**, read as **segments**. Opening the tab lands on the theme reference (`OVERVIEW_KEY`), an index of every foundation — not the foundation the hidden rail last lit. Choosing a foundation mounts the existing `FoundationArticle` (that aspect’s full telling). The inspector keeps the foundation list on every segment, and adds that article’s section TOC underneath so a long page can still be jumped. `activeFoundation` does not choose the page.

## Reuse

- `OVERVIEW_KEY`, `FOUNDATION_DOCS`, `overviewToc`, `foundationToc`
- `OverviewArticle` / `FoundationArticle` / `DocsView` `hubMode`
- `OnThisPage` (`TocEntry`)
- Exemplar: Color’s collapsed peek on the themed overview — proof that inlining every section of every foundation is the wrong read. The full telling stays on the foundation page.

No new primitive. No new prose.

## Changes

1. `src/components/configurator/ThemePreviewHub.tsx`
   - Change: While `docsOpen`, the open page is `docPageOverride ?? OVERVIEW_KEY`. Stop deriving it from `contextDocKey` / `activeFoundation`. Delete the effect that clears `docPageOverride` when `contextDocKey` changes. Keep the effect that clears the override when Docs closes, so the next open is the system index again. `handleDocNavigate` still sets the override; call `onSyncFoundationFromDoc` only for a real foundation key (so a later Variables visit can match), never to decide which doc is showing.
   - Preserve: Theme name as `overviewTitle`. `docScope` (previewed theme / try-on). Pager `onOpen` still flows through `onSelectFoundationKey`.
   - Verify: Open Docs from Theme or from Variables · Font — both land on the theme reference, not Font. Picking Font in the inspector shows the Font article. Closing Docs and reopening returns to the reference.

2. `src/components/configurator/docs/foundationArticle.tsx` — `OverviewArticle` when `hubMode`
   - Change: Do not inline `f.sections` (and do not special-case Color’s Expand). Each foundation is one row: its existing `h3` (`id={`ov-${f.key}`}`), `f.lead` as one muted line, token count from `f.tokenCount(system)`, and the row (or the existing “Read the {foundation} page” control) calls `onOpen(f.key)`.
   - Preserve: The non-hub sheet (`hubMode` unset, including the print/hand-off overview with no theme title) still inlines every section, Color collapse included.
   - Verify: Hub reference is a short index (one block per foundation, no ramp grids). A foundation page still shows ramps, role tables, why, and usage.

3. `src/components/configurator/DocsView.tsx` — hub inspector only
   - Change: Above the current `OnThisPage`, render a segment list from `FOUNDATION_DOCS` plus the overview row (`OVERVIEW_KEY`, label = `overviewTitle` or “Theme reference”). The active row is `pageKey`. Clicking calls `onSelectFoundationKey` (page swap), not `scrollIntoView`. Keep `OnThisPage` for the open article’s own anchors (`foundationToc` / `overviewToc`).
   - Preserve: Non-hub Docs keeps the single right-hand `OnThisPage` column. Get started / changelog / FAQ are not this surface.
   - Verify: On Color, the inspector still lists every foundation, Color is current, and “On this page” jumps Primitives / Why / Usage / role groups. Switching to Radius remounts the Radius article at the top.

## Scope

- Inherit: Hub header label already reads “Theme reference” when `activeDocKey === OVERVIEW_KEY`.
- Verify: Edit tokens on a foundation article still opens Variables for that foundation. Code and Theme tabs unchanged. Top-nav Docs unchanged.
- Exclude: Removing Use it (`design-plans/docs-behavior-not-consumption.md`). Do not merge the eight articles into one scroll. Do not add a left icon rail back onto Docs.

## Validation

- Product: Docs opens as the whole system. Each foundation is one reading segment with its existing long article. The inspector is how you move between them and inside the open one.
- Interface: Generator → Docs, from Theme and from Variables. Open Color (longest) and a short foundation (Shadow or Icons). Prev/next pager still changes segment. Desktop width only.
- System: Same `FOUNDATION_DOCS` order as top-nav Docs and `overviewToc`. No second article component.
- Repository: `npm test` in `escala-tokens` — no new test required unless an existing docs test asserts the hub opens on `activeFoundation`.

## Stop conditions

- Stop if hub Docs is no longer `DocsView` with `hubMode` (the inspector portal is the segment list’s home).
- Stop if `FOUNDATION_DOCS` is no longer the foundation set the top-nav reference uses — do not hand-list foundations in the hub.

## Design documentation

- After acceptance: In `CLAUDE.md` Generator Docs notes, record that hub Docs is the theme’s system reference, one foundation article at a time, chosen from the inspector — not the foundation the icon rail last selected. The hand-off overview (no hub) still inlines every section.
