# Entry flow — Set · See · Ship

Status (2026-10-21): phases 1, 1b and 2 DONE, phase 3 open. Written after walking the product
as a guest in a clean browser (dev build, accounts on, 1440×900).

Phase 1 landed as:
- `ShipRow` (`ThemeSaveBar.tsx`): CSS · Figma · Agent, three equal buttons under a
  "Ship to" eyebrow. `ThemeSaveBar` shows it wherever Get code used to be its primary
  (a guest, or a kept brand); `CreateStudioFooter` shows it once the brand exists
  (signed in, Save keeps the row above it). `ShipActions` is built once in
  `Configurator` (`shipFor(key)`): CSS/Agent open the Code tab on that format, Figma
  selects the brand as the sync target (`syncFigmaForTheme`).
- The Code tab takes `format` from the door (`codeFormat` in `Configurator`); its
  default is CSS and the rail reads CSS · shadcn · Agent context.
- The Export pill and Home's brand menu both read CSS · Figma · Agent · More formats…
  (the wizard). GitHub left both menus: it is a wizard destination and an
  Integrations row. Export all stays on Home with 2+ brands.
- The Figma page is "Your tokens → Figma". TopNav's Plugin link is off inside the
  Generator (`pluginLink`); the plugin is step 02 of that page.
- `InspectorToggle` reads "Exit inspector" only while something is pinned
  (`pinned`); inspect mode still starts on.
- A guest's board header says "Sample screens drawn from your tokens".
- Measured after: Start → Continue → CSS → Copy = 3 clicks (was 5); Figma 3 (was 6);
  Agent 3 (was 4). Phase 2 removes Continue.

Phase 1b DONE — Ship opens IN the inspector, no navigation:
- `ShipPanel.tsx` is a layer over the inspector slot (`absolute inset-0 z-30`, the same
  move as Token Details at z-20): "Back to editing" (and Esc, handled on the panel so the
  board's token inspector does not also take it) · tabs CSS · Figma · Agent · a short
  preview · **Copy** (icon turns to a check) + **Download** · a link to the long view
  (Code tab on that format, or the Figma page for brands/themes/viewports).
- Content comes from the SAME builders as the pages: `useCodeArtifacts`
  (`codeArtifacts.ts`, extracted from `ThemeCodeFormat`, which now uses it too),
  `brandContext` with the remembered Scope · Theme · Detail, `buildFigmaContext`. Verified:
  Copy CSS hands over the 40,857-char variables.css the Code tab counts; the Figma panel
  reports the same 149 KB as its page.
- Every door opens it: the inspector footer, the create studio (brand kept, lands on the
  Board), Home's brand menu (opens on Home), the top Export pill (from Components it
  lands on the Board). `openShip` in `Configurator` is the one entry; Figma selects the
  brand as the sync target, as the per-brand menu always did.
- The panel belongs to the place it opened on (`shipWhere`): any rail / tab / surface
  change closes it, so coming back never finds a stale one.

Phase 2 DONE — one accordion, no Continue (`ThemeLibraryPage`):
- The brand is MINTED THE MOMENT THE STUDIO OPENS (`mintStart`: a style through
  `adoptPreset`, Scratch through `mintTheme` from the system's accent — the two paths
  the old Continue took). The accordion is on screen from the first frame, Color open;
  `ThemeForm`'s first-step branch, the scratch draft store (`CREATE_DRAFT_KEY`,
  `scratchPreviewStore`) and `submitHandle` / `skipHandle` / `pendingStep` are gone from
  the studio. The brand is a draft (`markBrandUnsaved`) until Save or a Ship door keeps
  it; Cancel and Home's draft sweep drop it. A `mintedRef` guards the dev double-run of
  the mount effect (it minted two brands).
- "Start from style" heads the Color row (`ThemeQuickSettingsRail` `startStyle`, the
  `StylePicker` `ThemeForm` used). Picking one re-mints the draft from it, keeping the
  name. Default: Core (`DEFAULT_START_STYLE`), the style the hero shows.
- Font's Type roles table is a Show/Hide disclosure (closed), like Colour's Fine-tune.
- The canvas header reads `6 foundations · n changed`: rows edited since the studio
  opened, counted off `useEditHistory` (each edit lands in the open row). A count, not
  a stepper.
- `CreateStudioFooter` has no Continue; "Create brand" only shows when the mint failed
  (the brand cap) and retries it.
- Measured after: Start → CSS → Copy = 2 clicks (the target).

Not done (phase 3): "your tokens" copy on first run, Home deferred to a second brand
or an account.

The promise on the About hero is one sentence: *set your foundations, then hand them
to Figma, your code and your AI agent*. The product delivers all three, but the walk
from the hero to any of them is longer and more branched than the sentence, and the
end is never in sight while you set things. This plan folds it into ONE path with three
stages on one screen: **Set** (the foundations) → **See** (the board) → **Ship** (CSS ·
Figma · Agent).

## What a new visitor walks today (measured)

1. `/` → About hero → **Start building**.
2. **Create studio, step 1** (inspector): Name · Start from style (Scratch) · Light/Dark ·
   Accent · Neutral/Success/Critical/Warning/Info → **Continue**. Behind it the board
   already shows artefacts, one of which is a "Create an account — Sign in to continue
   to your workspace" card. It reads as the product's own login wall, not as a sample.
3. **Continue** → the accordion. Color folds, **Font opens** with Body · Display · Text
   scale AND the 15-row Type roles table AND "Go to advanced edition". Radius · Shadow ·
   Spacing · Icons sit below the fold of the rail. Footer: "Not saved · Save with an
   account" + **Get code**. The top-bar nav (About · Generator · Components · Docs) is
   gone here (only "Escala Tokens | Generator"); an **Exit inspector** button sits top
   right with nothing being inspected.
4. **Get code** → the Code tab opens on **Agent context** (621 lines of markdown whose
   first line is "Figma names as the Escala plugin writes them"), not on CSS. The right
   rail lists Agent context · CSS · shadcn. The Export pill appears only now.
5. From there the exits are: the **Export pill** (Export JSON · Sync with Figma · Get
   code) → the **wizard** (11 collections → Where: Figma / Code / AI / GitHub → Export) ·
   the **Figma page** ("Agent context → Figma", three steps, Copy context) · the
   **Plugin** button in the top bar · **Home**'s brand-column menu (Export brand · Export
   all · Sync with Figma · Get code · Connect GitHub) · Docs → **Use in Figma** · the
   **Copy context** split button on Variables and Code.

Clicks from Start building to the artefact in hand, today:

| Destination | Path | Clicks |
|---|---|---|
| CSS | Start → Continue → Get code → CSS (rail) → Copy | 5 |
| Figma | Start → Continue → Get code → Export → Sync with Figma → Copy context | 6 |
| Agent | Start → Continue → Get code → Copy context | 4 |

Seven doors, three destinations, and the shortest one lands on the format you did not
ask for.

## The six problems

- **A. Promise ≠ first screen.** The hero says foundations → three destinations; the
  first screen is a brand form with a fake login behind it. Nothing on screen says where
  this ends or how far away it is.
- **B. Two shapes for one task.** Step 1 is a wizard (Continue); step 2 is an
  accordion. Nothing counts the foundations or says "done". The heaviest foundation
  (Font, with its roles table) opens first.
- **C. The destination is chosen last, in seven places, under crossed names.** Export
  JSON · Export brand · Export all · Get code · Sync with Figma · Copy context · Plugin.
  "Get code" opens Agent context; "Sync with Figma" opens a page titled Agent context.
  The one-shot wizard and the live Figma page both exist, but which one is "the" way to
  Figma is not stated.
- **D. Vocabulary before value.** Generator · Board · Variables · Code · Home · brand ·
  theme · design system · mode · viewport · inspector · context. A guest with one
  colour meets all of them before shipping anything. Home says "Escala · Brands · Add
  brand · Sign in to save these brands" on the first visit.
- **E. Chrome that changes under your feet.** The top nav disappears in the studio and
  on Code; Exit inspector shows with nothing pinned; "Not saved" + Sign up press on every
  screen.
- **F. System vs brand too early.** The second concept (a system that holds brands) is
  introduced before the first (your tokens) has left the building.

## The proposal — one path, three stages, one screen

**Set → See → Ship.** The inspector is the path; the board is the proof; the footer is
the exit. No step counter (this is a workspace, not a wizard — unchanged rule), but the
end is always visible.

### Set — one accordion, from the first click

- Fold step 1 INTO the Color row. Name · accent · Light/Dark · states ARE the Color
  row's quick controls; there is no separate step and no Continue. Start building lands
  on the six rows, Color open.
- Each row opens to its quick controls only. The Type roles table and "Go to advanced
  edition" go behind ONE "Advanced" link per row (the Variables tab is the advanced
  edition; the row says so). Same for Color's Fine-tune / Contrast grid: one link.
- A quiet trace at the top of the rail: `6 foundations · 2 changed` (a count, not a
  stepper). It tells a first-timer how big the job is without ordering it.
- Default to the style the hero demonstrates (Core), not Scratch, so the board is a
  system from the first frame. Scratch stays one click away in the style menu.

### See — the board stays, labelled as a sample

- Keep the board as the live canvas (it already is the See stage).
- The first-run board carries a one-line caption: "Sample screens drawn from your
  tokens". The login-card artefact either gets that caption or leaves the first-run
  set; today it reads as a wall.
- Exit inspector / Stop inspecting renders only while something is pinned.
- The top-bar nav never disappears inside the Generator. Same chrome from About to
  Ship.

### Ship — three equal doors, one footer, always on screen

- The inspector footer becomes **Ship**: three buttons of equal weight, **CSS** ·
  **Figma** · **Agent**, visible on Set, See and Variables alike. "Get code" is retired
  as a label; "Save with an account" moves next to them as the quiet fourth line, not a
  banner on every screen.
- Each door opens ONE page, all three the same shape (the Figma page already has it):
  three numbered steps · the one action (Copy / Download) · a preview.
  - **CSS** → the Code tab ON CSS. Copy · Download · shadcn as a toggle. W3C JSON, Escala
    JSON, per-collection files and GitHub sit under "More formats…" on this page, which
    opens today's wizard. The wizard becomes the engine behind "More", not a door.
  - **Figma** → today's Figma page, retitled "Your tokens → Figma" (not "Agent context →
    Figma"). The Plugin download / install is its step 02, so the top-bar Plugin button
    goes (Docs → Use in Figma keeps the long version).
  - **Agent** → the Code tab on Agent context, with the install rows (Cursor · Claude
    Code · Figma Make) that today only live on the wizard's AI step.
- The top-bar **Export** pill shows the same three items + "More formats…". Home's brand
  column menu shows the same three (per brand) + "Export all" when there are 2+ brands.
  One vocabulary everywhere: CSS · Figma · Agent · More.

### Words

- First run says **your tokens**. "Brand" appears when a second one is added, "design
  system" when a second system is; "mode" only in Figma copy, as today.
- Rail for a guest with one brand: **Board · Variables · Components** + Ship in the
  footer. **Home** appears once there is a second brand or an account (it is the table
  of brands and systems, which a one-brand guest has no use for). Optional, phase 3.

## Target

| Destination | Path | Clicks |
|---|---|---|
| CSS | Start → (set) → CSS → Copy | 2 |
| Figma | Start → (set) → Figma → Copy context | 2 |
| Agent | Start → (set) → Agent → Copy context | 2 |

## Phases

1. **Ship footer + doors** (cheap, biggest effect): the three-button footer in the
   studio and every Generator inspector; Get code → CSS; the Figma page title; the Export
   pill and Home column menus reduced to CSS · Figma · Agent · More; Plugin button into
   the Figma page; Exit inspector only when pinned; first-run board caption.
2. **One accordion**: fold step 1 into Color, remove Continue, Advanced links instead of
   inline tables, the `6 foundations · n changed` trace, Core as the default start.
3. **Vocabulary + guest rail**: "your tokens" copy on first run, Home deferred to a
   second brand / an account.

## Not changed, on purpose

- One wizard, one `generateTokenJSON()` behind every output (it moves behind "More",
  it does not fork).
- No login wall, no step counter, no Continue/Back — the workspace rules in CLAUDE.md
  hold. A count is not a stepper.
- The plugin's accordion mirrors the web's rows (plugin 0.15.0): a row that moves here
  moves there too.
