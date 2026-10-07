# Docs articles show token behavior, not consumption

Written against: `9779a76`

## Evidence chain

- Surface: Generator inspector **Docs** tab (and the same article in top-nav Docs / public `/docs`), Font foundation page — `#use-it` (`UseItBlock`: Figma · Code · AI + truncated `:root { --font-family-heading… }` plus Edit tokens / Copy). Rendered 2026-10-07 on `?section=…` Docs · Font.
- Problem: The article opens with a destination/code pane. Docs’ job on this shell is to show how the tokens behave (ramps, role tables, specimens). Getting CSS / Figma names / MCP calls already has a home: inspector tab **Code** (`ThemeCodeFormat`) and Get started → Use in code.
- Design evidence: Inspector tabs in `themeWorkspaceLayout.ts` / `WorkspaceInspector` are **Theme · Variables · Code · Docs**. `Configurator.tsx` mounts `ThemeCodeFormat` when `themeWorkspaceTab === 'code'`. `FoundationArticle` still inserts `useItSection` (`UseItBlock` from `docs/blocks.tsx`, data from `docs/useIt.ts`) immediately after the lead (or at the foot for Color). Same `UseItBlock` on `componentArticle.tsx` after the playground. The Code tab of Use it is `cssExcerpt(buildSectionExport(section, 'css'))` — a shorter copy of what Code already ships.
- Owner: `src/components/configurator/docs/foundationArticle.tsx`, `src/components/configurator/docs/componentArticle.tsx`, `src/components/configurator/docs/blocks.tsx` (`UseItBlock`), `src/components/configurator/docs/useIt.ts`
- Scope and affected surfaces: Every foundation article (`FOUNDATION_DOCS` via `DocsView` / `DocumentationView` / `PublicReadingPage`). Every component article (`ComponentsView`). TOC entries labelled “Use it”. Copy Page markdown that concatenates `useItMarkdown`. Hub `trailingActions` Edit tokens on the Use it chrome.
- Uncertainty: Whether Copy Page / agent context should keep the three-destination markdown after the on-screen block is gone. Default in this plan: **drop it from the visible article and from Copy Page**, keep `useIt.ts` builders for tests/MCP until a later pass. Get started **Use in code** stays.

## Design decision

Remove the **Use it** section (Figma · Code · AI pane) from Docs and Components articles. Those pages keep Overview, Why, Usage prose, and the live token/specimen sections. Consumption lives on **Code** (and Get started for install). Do not relocate Use it into the Code tab — Code is already the full artefact, not a per-page install card.

## Reuse

- `DocSection` / `DocTitle` / token `sections` in `foundationDocs.tsx` — unchanged
- `ThemeCodeFormat` — the Code inspector tab
- `GetStartedArticle` / `AgentInstallPanel` — install and MCP copy
- `EditTokensPill` — stays in the article header (non-hub) or hub header band, not on a consumption card
- Exemplar: Color’s palette-first body (`PrimitiveRamp` + semantic tables) without a destination card on top

No new primitive.

## Changes

1. `src/components/configurator/docs/foundationArticle.tsx`
   - Change: Delete `useItSection`, `PALETTE_FIRST` branching that only exists to move Use it, and the `useIt` TOC entry in `foundationToc`. Keep Overview, Why, Usage (prose), `page.sections`, Pager, Edit tokens in the header.
   - Preserve: Color still leads with its first token section (primitives). Hub header actions (`AIContextButton`, Edit tokens) stay.
   - Verify: Font Docs page has no `#use-it`, no Figma/Code/AI tabs, first content after the lead is Why (or Color’s primitives). TOC has no Use it.

2. `src/components/configurator/docs/componentArticle.tsx`
   - Change: Remove the `DocSection` that renders `UseItBlock`. Drop `use-it` from the component TOC. Stop appending `useItMarkdown` to Copy agent context (hero snippet + catalogue markdown remain).
   - Preserve: Catalogue hero (live specimen + its Preview/Code of the **variant on screen**). Usage prose. Examples.
   - Verify: A component article has no Use it heading; playground still works.

3. `src/components/configurator/docs/foundationDocs.tsx` (`foundationMarkdown`)
   - Change: Stop concatenating `useItMarkdown(useItForFoundation(doc))` into Copy Page.
   - Preserve: The rest of the foundation markdown (lead, why, usage, section notes).
   - Verify: Copy Page on a foundation article has no `## Use it`.

4. `src/components/configurator/AboutMenu.tsx` / changelog strings (only if they still claim “a Use it block on every page”)
   - Change: Drop or rewrite that sentence so About/changelog don’t advertise a block the articles no longer show.
   - Preserve: Other changelog history.
   - Verify: About does not promise Use it on every docs page.

5. `src/lib/__tests__/useIt.test.ts`
   - Change: Keep module tests for the builders if they remain; stop asserting that articles/markdown must include Use it. Add or adjust a test that `foundationMarkdown` / component copy context does **not** contain `## Use it`.
   - Preserve: Destination string builders still match export names (for MCP / a future Code-tab excerpt).
   - Verify: `npx vitest run src/lib/__tests__/useIt.test.ts` and any docs markdown tests pass.

Do **not** delete `useIt.ts` or `UseItBlock` in this pass unless nothing imports them after the article/markdown cuts (then delete as dead). Do **not** remove Get started → Use in code. Do **not** restyle `ThemeCodeFormat`.

## Scope

- Inherit: `DocsView` (inspector Docs, top-nav Docs, public reading). `ComponentsView` articles. Theme hub `DocumentationView`.
- Verify: `foundationMarkdown` / Copy Page; hub Edit tokens still reachable; Color palette-first order; i18n keys for Use it unused on those pages.
- Exclude: Get started / MCP install. Export wizard. Code inspector tab. Component playground Preview/Code toggle. Foundation **Usage** CSS `CodeBlock` (`page.usageCode`) — out of this plan; it is a leftover consumption snippet (see audit finding 2) and must not be “fixed” here by inventing a new home.

## Validation

- Product: Open Generator → Font → Docs. After the title/lead, the page shows why + token behavior (families, scale, roles), not a CSS/Figma/AI card. Switch to inspector **Code** and confirm the full CSS is still there.
- Interface: Same check on Color (primitives still first), Radius, a component article, Theme hub Docs, and top-nav Docs. No `#use-it` in the TOC. Copy Page has no Use it heading.
- System: One consumption surface (Code + Get started). No second Use it card elsewhere on these articles.
- Repository: `npx vitest run src/lib/__tests__/useIt.test.ts src/lib/__tests__/useIt.test.ts` plus any `foundationDocs` / article tests that mention Use it → green.

## Stop conditions

- Stop if product still wants a one-line pointer from Docs to Code (a text link is a new decision, not this plan).
- Stop if deleting Use it from Copy Page breaks an agent eval that requires `## Use it` — report, don’t invent a second article body.

## Design documentation

- After acceptance: Update `CLAUDE.md` Docs notes that currently require a Use it block after the lead (Create UI Installation slot). New rule: foundation/component **articles** are behavior (tokens + specimens); consumption is Code / Get started. Destination builders may remain in `useIt.ts` for non-article consumers.
