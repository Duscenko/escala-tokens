# Escala — Project Context for Claude Code

This file is the source of truth for Claude Code CLI. Read it before making any change.

---

## What this is

A web configurator that lets product designers build a minimal, custom design token system — no bloat, only what they choose. The output is a `tokens.json`, `variables.css`, and `README.md` that sync directly into Figma via a companion plugin.

**Live URL:** https://scalable-designs.vercel.app
**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Framer Motion + Radix UI

**Platform: desktop/laptop only, not a responsive site.** The user is a design engineer at
a keyboard (see `.impeccable.md`), and the surfaces here — dense token tables, the Export
wizard's collection/component pickers, side-by-side rail + canvas + preview — assume a real
window, not a phone. Below Tailwind's `md` (768px) `App.tsx` renders a static "optimized for
desktop" notice (`DesktopOnlyNotice`) instead of the shell, pure CSS (`md:hidden` /
`hidden md:block`, no JS viewport check). **Don't spend effort making dense editor screens
work on a phone layout** — that's explicitly out of scope. Individual components still adapt
between `md` and `xl` (`SectionRail` becomes a drawer below `md`, `PreviewPanel` hides below
`xl`) — that range is "a smaller laptop window," not a phone, and is as far as responsive
work goes here.

---

## Navigation model — top-nav workspace ("Escala")

The app is a **top-nav workspace**, **not a wizard**. Designers **configure tokens and see
them live at the same time**: tweak the controls on the left, watch the canvas repaint,
then export. **There is no left icon rail** — section switching lives in the top bar.

```
┌ row 1 — TopNav (global, every view) ───────────────────────────────────────┐
│ ◆ Escala          │  Variables · Documentation · Components               │
│   Token controls  │              [Figma] [◆ Connect] [☾/☀]                 │
├── LEFT COLUMN ────┼── CANVAS ──────────────────────────────────────────────┤
│  Variables rail   │ Color │ Quick edit · New · Import JSON · Kits · Export │  ← row 2
│ Color · Font      │  · Export                                             │
│ Radius · Spacing  │  the active foundation's editable token table         │
│ Sizes · Icons …   │                                                       │
└───────────────────┴────────────────────────────────────────────────────────┘
```

The brand block's right border is the same divider as the left column's, so it runs
unbroken from the very top. **Every row-2 header is `h-[52px]`** — `CenterHeader`,
`PreviewPanel`, `SaveSidePanel` — so they line up across every column of every section.
Any new panel header uses that height too. Their actions use the shared `ui/HeaderPill`
(Variables' New · Import JSON · Kits AND Export are the same component — don't hand-roll
another pill).

> **Export is a guided flow, not a dump — and there is only ONE of it.** Variables' Export
> pill opens `ExportWizard` (Source → Format → Export), backed by `lib/exportWizard.ts`.
> A separate **Share** pill used to open the same wizard pre-checked to whole-system
> (`ALL_WIZARD_COLLECTIONS`) instead of the active section — it was retired (`HomeActions`,
> `Configurator.tsx`'s `shareOpen` state and second `ExportWizard` instance all removed)
> because two pills opening the identical flow just read as duplication; Export's own
> Step 1 lets you check every collection manually, so whole-system export is still one
> click away, just not a dedicated button for it. Don't re-add a Share pill that does what
> Export already does — if whole-system-by-default earns its place back, make it an option
> INSIDE the one wizard (e.g. a "select all" affordance in Step 1), not a second entry point.
> Step 1 picks **collections** (primitives · semantics · typography · spacing · radius ·
> opacity · shadow · grid · sizes · icons) and, for semantics, which **theme modes** ship;
> step 2 picks the format (W3C DTCG · Escala JSON · CSS · SCSS · Tailwind · Markdown) and
> single-vs-per-collection files; step 3 summarizes and downloads. Rules that keep it honest:
> - Everything derives from ONE `generateTokenJSON()` call, so wizard output can never
>   disagree with `tokens.json`. Counts on screen are counts in the file.
> - **W3C ships real aliases**: a semantic value sitting on a primitive tone exports as
>   `{color.neutral.900}`, not a loose hex. That's the point of the format — don't
>   "simplify" it back to hex.
> - **Escala JSON is single-file by contract** (it's the plugin payload), so the structure
>   choice is locked there.
> - Tailwind and Markdown delegate to `sectionExport`'s builders — one renderer per format,
>   not two. `SectionExportModal` and the old `ShareModal` were retired into this flow
>   (`FilePreviewCard` lives on in `SaveView`).
> - **Step 3 also carries a "Save this design system" card** — a name field bound straight
>   to `projectName`/`setProjectName`, a Save button calling the SAME `saveCurrentSystem()`
>   the Save & Share hub uses (button reads "Save changes" once `savedSystems` already has
>   an entry for the current id, exactly like `SaveSidePanel`), and a GitHub status row
>   (`StatusDot` + `owner/repo · pushed <time>` or "Not synced"). This exists because the
>   payoff step is also the only natural place to give a first-time system its identity —
>   before it, a user exporting from Variables had NO path to naming/saving/connecting
>   without already knowing Save & Share existed. The GitHub button (`onConnectGithub` prop,
>   wired from `Configurator.tsx`'s one `ExportWizard` call site) closes the wizard and opens
>   the existing `GitHubConnectView` rather than re-implementing PAT auth + repo push inline
>   — there is still only ONE GitHub-connect flow. "Save" always saves the WHOLE current
>   system regardless of which collections this export run scoped to (same as Save & Share's
>   own Save button) — the card says so explicitly so exporting from, say, Typography
>   doesn't read as "only Typography got saved."

- **Shell = `Configurator.tsx`**. `TopNav` is mounted **once**, above the columns, in
  every view. All nav state is **local** there: `tab` (`foundations`|`components`|`docs`),
  `activeFoundation`, `activeComponent`, `exportMode` (`null`|`code`|`md`|`figma`|
  `github`|`save`), `semanticFocus`. None persisted — every reload lands on
  **Variables · Color** (`activeFoundation` defaults to `'color'`) — there is no separate
  landing screen. Leaving a foundation marks it complete (`commitVisit()` →
  `markFoundationComplete`).
- **The three top-nav sections** (`TopNavKey` in `TopNav.tsx`, mapped by `navActive`/
  `handleNav`): **Variables** = the deep token editors (`tab 'foundations'`, entering at
  Color) · **Documentation** (`DocsView`) · **Components** (the catalogue). Export/connect
  views (Figma · GitHub · Export · Save) unlight every item.
- **Generator/Preset is retired** — the old `WorkbenchLayout` workbench (a left "Preset ·
  Quick edit" accordion beside a live component playground) was the former landing view
  and is now unreachable as its own screen (the file is kept for reference only; don't wire
  it back up). Its Presets swatch row + the full quick-edit accordion (Color Family ·
  Typography · Shadow · Radius · Icons · Padding · Panel background) survive as a
  **secondary popover**, not a view: the sliders icon in `CenterHeader`'s rightSlot
  (`QuickEditTrigger` in `Configurator.tsx`) opens `QuickFoundationsPanel` — the same
  popover the Components tab already used. Variables' `CenterHeader` also carries
  `HomeActions` (New · Import JSON · Kits — **no Reset**; the "reset the whole
  system to defaults" action was removed from the UI entirely. Per-token "reset to
  standard" icons in the token tables are unrelated and stay).
- **"New" creates a TOKEN, not a design system** — clicking it opens `NewTokenMenu`
  (`HomeActions.tsx`), a category popover fed by `VARIABLE_FOUNDATIONS` in
  `Configurator.tsx` (`FOUNDATIONS` minus Icons/Opacity/Shadow/Grid — the exact same
  array `FoundationIconRail`'s "Variables" group renders from, so the menu and the
  toolbar can never disagree). Picking a category opens `NewTokenWizard.tsx`: a **guided 2–4 step flow**
  (Name/Target → Value/Scale → Confirm[ → Role, Color only]) that owns the full-screen
  modal for every step, so the long token table is never visible until the flow closes.
  Each category writes through the SAME store actions the Foundations editors use — no
  parallel data model: **Color** mints a real new entity (`addCustomColor`, reusing the
  exact scale-building logic — `detectSeedKind`/`solidFromSeed`/`generateColorScale`/
  `generateFamilyDarkScale` — as `ColorPrimitives`' own "+ Add" popover), memoized once
  as `colorScalePreview` so Confirm's swatch preview and the actual write can never
  disagree, and a color that fails to scale (rare, but the generators can throw)
  disables Confirm instead of silently no-op'ing; **Typography**/**Radius**/**Spacing**/
  **Sizes** are fixed-key foundations, so their "Name" step means picking WHICH existing
  slot you're setting (heading/body font · a named radius personality from
  `RADIUS_PRESETS` · a base unit from `BASE_PRESETS` · which `xs`–`2xl` size token) and
  the wizard writes the whole foundation via `setTypography`/`setRadius`/`setSpacing`/
  `setSizes` on Confirm. "Start a new DESIGN SYSTEM" is a different, unrelated action —
  still reachable via `NewSystemModal`, now only from `SaveView`'s saved-systems grid.
- **Color's 4th step — Role — is Radix's aliasing split, made explicit**: generating a
  scale (Confirm) and giving it a ROLE are two different decisions, so the wizard asks.
  The Primitives nav folders a family by role via `familySlotFor()` (`themeSources.ts`):
  a family only reads as **Accents** once some theme's `brand` slot references it — the
  fixed `accent` family is hardcoded there; nothing else is, by default, which is exactly
  the "new color did nothing" bug this step fixes. Three choices, `ROLE_OPTIONS`:
  **Replace the active Accent** — no new family at all, just `useApplyAccentColor()`
  retinting the global `accent` primitive (same path Quick Edit/Primary Color's dropdown
  use) — updates every semantic token and the sticky preview live, no reload;
  **Add as a secondary accent** — `addCustomColor` THEN `addTheme(key, 'light', { ...
  DEFAULT_THEME_SOURCES, brand: colorSlug })`, i.e. a full theme identical to the
  defaults except its brand slot — multi-brand/multi-tenant is modeled as "another
  theme" here, so this is the minimal honest way to earn an Accents-folder entry;
  **Save as a standalone palette** (default) — today's behavior unchanged, `addCustomColor`
  only, files under Custom until a theme (or a later role assignment) claims it. Whichever
  branch runs, `onDone` passes back the exact family key to focus (`'accent'` or
  `` `custom-${slug}` ``) so `ColorPrimitives.focusFamilyKey` (a `useEffect` keyed on that
  prop) switches the table to show it — the wizard closing was previously silent about
  which family "won," which read as "nothing happened" even though the scale WAS created.
- **`HomeView` is retired** — the old hero/collage hub is unreachable (the file is kept
  for reference only). Don't wire it back up.
- **Color is a three-tab hub** (`ColorHub`, default tab `primary`, labeled **Primitives**):
  **Primitives** / **Semantics** / **Gradients**. The tab pill bar is pinned on top for all
  three tabs (`ColorHub` renders it once, above whichever tab's content scrolls beneath it).
  - **Picker Color is retired** — matching the Figma redesign this whole shell now follows
    (see Navigation model's `FoundationIconRail` note), which merges palette DEFINITION back
    into the usage table instead of keeping them on separate tabs. `PickerColor.tsx` is
    unwired (kept for reference only, same treatment as `WorkbenchLayout`/`HomeView` — don't
    wire it back up); its capabilities moved:
    - The **accent · Gray/Neutral quick bar** → **Primitives**' promoted quick-edit strip
      (below), contextual to whichever family is active in the nav instead of two fixed
      dropdowns.
    - **State Colors' "all five ramps visible at once"** comparison view is a real,
      deliberate loss, accepted for matching Figma exactly: each state (Neutral/Error/
      Success/Warning/Info) is still fully editable, just one at a time now — click it in
      the **Groups** nav and its quick-edit strip + table appear, same as any family.
    - **The Transparency scale** (`TransparencyStrip`, checkerboard-backed) → **Accent-Alpha**,
      a first-class nav entry under Accents (`generateAlphaScale(primaryScale/DarkScale,
      page, appearance)`, same helper the export ships as `accent-a*`) rather than a
      bespoke strip on a different tab. It's **read-only everywhere** — `Family.isAlpha`
      guards `changeFamilyBase`, hides the nav pencil and the per-row Token Details button
      — because an alpha value is SOLVED against its page (see "Alpha twins are solved, not
      eyeballed" below), never independently set. **Its nav chip is checkerboard-backed too**
      (`FamilySwatch`, painting the alpha ramp's step 5 — not the step-9 anchor, which
      composites to a near-opaque chip that reads as just another solid): Accent and
      Accent-Alpha sit adjacent under Accents, and with two identical solid chips nothing on
      screen said which one was the translucent ramp. Its table cells use `AlphaHexCell`
      (swatch over checkerboard + static hex text, no input) instead of `HexCell`: the same
      checkerboard `CHECKER` constant `Step6_Opacity.tsx`'s "Opacity Scale" strip uses,
      now **exported** from `colorControls.tsx` so both call sites share one pattern rather
      than two independently-styled "this is translucent" cues. This is the same
      correctness fix the old `TransparencyStrip` comment already explained: an alpha value
      painted on a flat backdrop silently breaks across light/dark preview, since it's only
      correct against the specific page it was solved for — the checkerboard has no "wrong
      theme" to break against.
    - **The scale-settings gear** (algorithm/naming/contrast shift, `ScaleSettingsModal` +
      `ColorControls` from `Step2_ColorPalette.tsx`) → the same promoted quick-edit strip.
  - **Primitives** (`ColorPrimitives.tsx`) — now BOTH definition and usage: the family nav,
    a per-family quick-edit strip, and the families table, all on one screen, stacked as
    **three full-width rows** (own `motion.div className="h-full flex flex-col"` root — was
    a single `flex` row before this pass, which is what left the quick-edit strip and the
    `Groups` header confined to the table's own column instead of spanning the same width as
    the icon-toolbar row above them, a mismatch caught in review against the Figma reference):
    1. the quick-edit strip, full width; 2. `Groups` + the **tab pill bar + search** sharing
    ONE row (`ColorHub` passes its `tabBar` down as a prop instead of pre-wrapping it, so
    `ColorPrimitives` can place it next to `Groups` — same line, per Figma — rather than each
    owning a separate row); 3. the nav+table split. The family nav itself is **promoted to
    the outer-left position** `SectionRail` used to occupy for Variables — flush, full height,
    `w-[198px]` (was a `w-44` sub-nav nested inside a padded, bordered card) — and that same
    198px width is what row 2's `Groups` + **"+ Add" family trigger** (moved here from the
    table's old top bar; same `addOpen`/`addRef` state and popover, new location — the
    popover itself anchors `left-0` off that trigger, not `right-0`, since right-anchoring a
    288px popover off a trigger sitting at the LEFT edge of the row clips it off-screen) sits
    inside, so it lines up with the nav directly below. It's still **foldered by ROLE, not
    insertion order**: `Accents` (now Accent +
    Accent-Alpha) / `Neutrals` / `States` (Error/Success/Warning/Info + custom families a
    theme aliases to a status slot — kept here too, deliberately: this rail is EVERY
    primitive's usage table — Backgrounds/Interactive/Borders/Solid/Text bands — and a state
    color is a primitive same as Accent/Neutral) / `Custom` for free-standing families no
    theme references yet, derived via `familySlotFor()` (`lib/themeSources.ts`) from which
    theme slot references each family — a family minted by "Add theme" files itself under
    the right folder with zero bookkeeping.
    - **The promoted quick-edit strip** sits above the table, contextual to the active
      family: a `<Family> color` label + hex field in a bordered pill (`HexCell` wrapped in
      a `rounded-[13px] border-line-strong` container — matches the weight of a `ColorSelect`
      dropdown rather than reading as a bare table cell), a **wand button** ("Match Neutral
      and States colors", only wired while Accent is active) running `matchStatesToAccent()`
      — `recommendStateColors(primaryColor)` into every state PLUS `neutralFromBrand()` into
      Neutral, a broader re-harmonize than the old Picker Color "Match to accent" link (which
      only touched states) — a full-size `ScaleRow` of the family's ramp in the previewed
      appearance, and the scale-settings gear. Read-only (hex field + wand hidden, `ScaleRow`
      still shown) for Accent-Alpha.
    - **"Edit in Picker Color" is gone** — with the quick-edit strip living on the same
      screen as the table, selecting a family in the nav already surfaces everything that
      link used to jump to. The `onEditInPicker`/`pickerFocusTarget` prop chain
      (`ColorHub` → `ColorPrimitives`, `Configurator.tsx` state) was removed, not repurposed.
    - Families table: Accent/Accent-Alpha/Neutral/Error/Success/Warning/Info + custom
      families in that side nav, 12 tone rows each with **light/dark** cells (row names are
      the EXACT exported token names — `accent-1`…, matching tokenGenerator's flattenScale
      prefixes — `accent-a-1`… for Accent-Alpha), eye toggles on the column headers driving
      `previewTheme`, a per-row **Token Details** dialog (skipped for Accent-Alpha rows),
      and "+ Add" creating a `customColors` family — EVERY family carries both a light ramp
      and a dark twin (Radix two-scale model), and each column edits its own; **no inversion
      anywhere**, step N means the same role in both.
    - **"+ Add" picks a DESTINATION FOLDER, and that's a role assignment, not a label.**
      The selector (`FAMILY_GROUPS`: Accents · Neutrals · States · Custom) is pre-set from
      the group of the family you opened it on, so adding a second accent while Accent is
      selected lands under Accents instead of Custom. Because folders are derived
      (`familySlotFor`), anything but Custom **mints a theme** identical to
      `DEFAULT_THEME_SOURCES` except the one slot pointing at the new family — the same
      move `NewTokenWizard`'s "secondary accent" makes, and the only non-destructive one
      (re-pointing an existing theme's slot would repaint the user's current accent). The
      popover states that consequence inline rather than hiding it. **States asks which
      intent** (error/warning/success/info) — it's four separate slots, so a single
      "States" destination would be ambiguous.
    - The suggested name follows the destination (`Accent 2`, `Neutral 2`, `Error 2`,
      auto-incrementing past whatever exists) and is fully editable; changing the
      destination re-suggests **only while the user hasn't typed their own** (`addNameDirty`)
      — re-suggesting over a typed name would silently discard it. Custom keeps the empty
      field + "e.g. Teal" placeholder, unchanged.
    - **Consequence worth knowing:** a family created into Accents/Neutrals/States is then
      referenced by that minted theme, so `removeCustomColor` refuses it (the nav's trash
      shows "In use by theme X — remove the theme first"). That's the pre-existing
      in-use rule, not a special case, but it does mean a non-Custom family isn't deletable
      in one click the way a Custom one is. The nav's per-row pencil (hidden for
      Accent-Alpha, see above) is a deliberate SINGLE-family change and never cascades to
      Neutral (`changeFamilyBase` → `applyAccentColor(hex, false, …)`) — the quick-edit
      strip's wand is the "move several together" affordance now, not a usage-table
      side effect.
  - **The "Background" swatch is REMOVED, not disabled.** It used to sit in the quick bar
    as `DerivedBackgroundField` — a read-only readout of `pageBackground`/`darkBackground`
    for calibrating tones 1–2 — but it looked exactly like its interactive `ColorSelect`
    neighbors (same trigger shape) while doing nothing on click, which read as broken. Cut
    entirely rather than left disabled, so the UI doesn't promise interactivity it doesn't
    have; a real background picker is still out of scope (see "Base drives the page" above
    — independent editability there is what caused page/ramp drift before).
  - **Semantics** (`Step3_SemanticTokens`, topped by the
  **architecture picker** — `ArchitecturePicker`: radio cards for Flat /
  Categorical / Vibrancy / Tonal with a live WCAG contrast strip. Flat keeps
  the full editable 89-role matrix; a non-flat choice re-derives the WHOLE
  view from its projection via `buildArchitectureView` — sidebar groups,
  counts and a value table mirror the exported schema exactly. The table is
  **editable in every architecture**, not just Flat, and through the SAME
  affordance: the row's sliders icon expands it (description + CSS var + a ramp
  per mode with the current tone ringed), exactly like the flat matrix — one
  interaction to learn, not two. A family row above each ramp re-points the slot
  to another family. Edits are stored as REFs in
  `architectureOverrides[arch]['category.token'][mode]` (`mode` is a THEME KEY,
  see below) so an edited token still resolves through the ramps. "Reset to
  schema" clears it; the export applies the same overrides, so tokens.json
  can't disagree with the table. Cells whose value isn't a ref (vibrancy
  alphas, blur) stay read-only — there's no primitive to swap. Switching
  architectures resets category/search state.
    - **"+ Theme" works in Flat AND Categorical, not Vibrancy/Tonal.**
      `ArchitectureView.modeKeys` is the authoritative column list per
      architecture: Categorical gets one column per entry in `themeOrder` (so
      adding a theme genuinely grows the table, resolved per-theme via
      `scaleLookup(scales, themePalettes[key], kind)`); Vibrancy and Tonal
      always report `['light','dark']` regardless of `themeOrder`, because
      their math is a fixed binary transform of the GLOBAL primitives with NO
      per-theme concept — Vibrancy's light/dark are two hardcoded calls to one
      opacity-layer formula, Tonal's is a fixed tone-inversion table
      (`TONAL_SCHEME`, 40↔80…). A 3rd theme has no defined meaning for either
      until someone decides what a HIG opacity layer or an M3 tone-inversion
      means for a non-binary theme — that's a schema decision, not an
      engineering gap, so the button stays hidden there rather than faking it.
      Each column's header is the SAME click-to-preview affordance the flat
      matrix's columns use (no drag-reorder/resize for the arch table though —
      it's schema-order, not a user-arranged matrix).
    - **Exports ADDITIVELY.** `colors.architecture.tokens[group][token]` used to
      be a hardcoded `{light, dark}` pair; it's now `{[themeKey]: ref}` with
      `light`/`dark` always present (any consumer reading `.light`/`.dark` sees
      identical values to before) and extra theme keys only when the system
      actually has them — no schema-version bump, no migration needed for the
      2-theme case. Was ALSO fixed in the same pass: `tokenGenerator.ts`'s call
      to `projectArchitecture()` had been omitting `overrides` entirely, so
      table edits in Categorical/Vibrancy/Tonal never reached the actual export
      — only the live preview table. Both `overrides` and `themeOrder` are now
      passed through. ·
  **Gradients** (`StepGradients`). `colorTab` is local `useState` in `Configurator`.
- **Save is the "Save & Share" hub** (`SaveView` → `exportMode 'save'`; no nav entry
  since the rail was removed — Kits in Variables' header and the Export wizard's own
  "Save this design system" card (see above) cover PART of the same ground — naming,
  local-saving, GitHub status — but neither replaces the hub's saved-systems GRID (browse/
  load/delete past systems) or the Figma connect pill, so re-add an entry point before
  relying on either as a substitute):
  the center IS the export surface — a tabbed file-preview card (tokens.json with a
  "Figma plugin" badge · variables.css · README.md, accent-colored active tab, plus an
  "Export all files" action tab) with Copy / Download per file and the live-endpoint
  footer, over the "My design systems" saved-systems grid (+ create/import tile). The
  right aside is `SaveSidePanel` ("Current Design System"): identity (name/description),
  Bring to Figma / Connect-with-GitHub pills with status dots, summary chips and "Save
  design system" (local registry via `saveCurrentSystem`).
- **Multi design system**: `savedSystems` (persisted registry) — two ways in. `saveCurrentSystem()`
  (the store action `SaveSidePanel`'s Save button AND the Export wizard's "Save this design
  system" card both call) upserts a LOCAL entry keyed `` `local:${slugify(projectName)}` ``
  when unconnected, or the repo id once one exists — so saving never requires GitHub. A
  successful push (`GitHubConnectView`) upserts the same shape keyed by `owner/repo`,
  `{ id: repo, name, description, repo, savedAt, snapshot, source }`. `loadSystem(id)`
  restores a deep-cloned `DesignSnapshot`; `startNewSystem()` resets to `makeDesignDefaults()`.
  GitHub (PAT identity) is "the account" for the GitHub-backed half — no separate auth
  backend. Removing an entry is local-only either way.
- **Section sub-rail = `SectionRail.tsx`** — now Components' and Documentation's rail only:
  200px, transparent over the brand gradient, uppercase group caption + `icon · label` rows
  (active = raised white row in the UI accent). Components and Documentation feed it the
  catalogue **Categories** (icons from `CATEGORY_ICONS` in `Configurator`); it still carries
  **no** global nav and no action block — those live in `TopNav`: **Bring to Figma** (icon
  button → `FigmaConnectView`) and **Connect** (black GitHub pill → `GitHubConnectView`: PAT
  connect → pick/create repo → push tokens.json/variables.css/README.md). Below the rail,
  Components and Documentation each add the same 208px master list (search + grouped
  component list) — keep those two in sync too. Don't fork it per section — pass a
  different `groups` array.
  - **Variables no longer uses it.** The outer 200px column reserved for foundation
    switching read as wasted width once a foundation's own content (Color's family tree) also
    wanted a left column, and text labels for 9 well-known icons were redundant once the
    icons themselves were legible. `FoundationIconRail.tsx` replaces it there: a compact
    horizontal row of icon-only buttons (40.5px, `rounded-[13.5px]`, active = filled
    `accent-ui` circle + soft shadow, tooltip carries the name) docked in a `h-[52px]` row
    above `CenterHeader`, together with `HomeActions` (New · Import JSON · Kits) and the
    Export pill — the same row Figma's redesign puts them in. It reads the SAME `groups`
    shape (`VARIABLE_FOUNDATIONS` "Variables" + the rest as "Styles") `SectionRail` used to,
    just rendered as a row instead of a labeled column, so the menu/rail/toolbar data source
    still can't disagree. `Configurator.tsx`'s `outerRailVisible` (≠ `railVisible`) gates
    `TopNav`'s `brandWidth`/divider now — `null` on Variables (no column to align against),
    unchanged on Components/Documentation. Freed width goes to whichever foundation is
    active; only Color has its own sub-nav to spend it on (see below), the other 8 foundations
    just render wider.
- **Center**: a `CenterHeader` (section icon + colored title + subtitle) over the active
  body — a foundation section (`Step2_ColorPalette`…`Step9_Sizes` or
  `IconLibrary` with its live Iconify browser + custom-SVG upload, wrapped in `p-8` —
  **except Color, Typography, Radius and Spacing, which render FLUSH**: each carries a
  198px left column, and `p-8` framed them as floating cards whose column no longer lined
  up with the icon toolbar or `CenterHeader` above. Any foundation that grows one goes
  flush too and adopts the Color tables' row shape — **row 1** = a `w-[198px] … border-r`
  labelled control cell (`<Family> color` · `Gradient type` · `Preset` · `Base unit`)
  beside a right cell showing *what that control produces* (the ramp · the gradient bar ·
  the roundness slider + chip · the spacing scale drawn to scale), `pr-3` clearance on the
  right edge; **row 2** = a `h-[52px]` labelled cell (`Groups` / `Collections`) beside the
  active collection + search; **row 3** = the nav (`py-1.5 px-2`) against the flush table.
  **`VariablesTable` opts in via `railed`** (plus optional `railTop`/`railBody`), so the
  gutter is per-section: Radius uses it with an EMPTY body — the column exists purely so
  its table's left edge lands on the same line as everyone else's — Spacing fills it with
  a real 2-item nav (Spacing scale · Surface paddings, which used to stack in one scroll
  behind sticky sub-headers), and Opacity · Shadow · Grid · Sizes keep the undivided
  full-bleed bar they've always had. Don't make `railed` the default; those four have
  nothing to align against.
  - **The rail cell's dropdown is `ui/RailSelect`, one component.** Gradients' type,
    Radius' preset and Spacing's base unit are the same control, and it was hand-rolled
    three times (identical `h-9 rounded-[13px] border-line-strong` trigger, chevron and
    outside-click listbox) before being extracted. It takes `fallbackLabel` — Radius shows
    **"Custom"** when the ramp matches no preset, where the old Sharp/Soft/Rounded/Pill
    pill row just showed nothing selected, which read as "no preset applied yet".
  - Radius' presets and Spacing's base units moved OUT of `VariablesTable`'s `toolbar`
    into that cell; on a narrow window those pill rows pushed search off the row),
  the component docs (`ComponentDocPane` — interactive playground per component), the
  **Documentation tab** (`DocsView` — createui-style docs site: catalogue sidebar + per-component
  article with hero Preview/Code, Description, Usage, per-axis Examples, Accessibility,
  Ships-in-Figma, Related, API Reference, prev/next + "On this page" TOC; fully data-driven
  from `COMPONENTS` + `SPECIMENS`/`snippetFor`, hides the right preview like Components), `ExportView`
  (opened by Code / MD via an `initialTab`; has a "Back to editor" affordance + editable
  project name), `FigmaConnectView` (opened by Bring to Figma — download the plugin zip +
  live-sync guide), or `GitHubConnectView` (opened by the TopNav GitHub pill / Home's
  Connect; a successful push also upserts the system into `savedSystems`).
- **Theme = one control**: the top bar's single icon button (`ThemeToggle`) shows the
  theme you'd switch TO — a **moon while light**, a **sun while dark**. It calls
  `changePreviewTheme`, so the previewed theme and the app chrome flip together. There is
  no segmented sun|moon pill any more. `previewTheme`'s `useState` in `Configurator.tsx` is
  **initialized from the persisted chrome theme** (`getTheme()`, `sd-theme`), not hardcoded
  to `'light'` — `previewTheme` itself still isn't persisted, but the chrome class is, so a
  reload while dark chrome was active used to start every previewTheme-driven surface
  (Alias/Semantics' theme selector, Picker Color's transparency scale, `PreviewPanel`) back
  on light until the toggle was clicked twice to resync. Any code that needs "is the preview
  dark right now" on first render must go through this init, not assume `previewTheme` starts
  `'light'`.
- **Right = `PreviewPanel.tsx`**: a **persistent, sticky specimen** of whatever foundation
  is being edited — **expanded by default** (`previewCollapsed` starts `false`; the slim
  strip still lets anyone collapse it for width). It's a separate tree from the center
  column's `AnimatePresence`/`motion.div` swap, so switching foundations or editing a token
  never unmounts or closes it — no stale-content risk of the kind the center body's swap
  had (see the FASE 1 desync fix above). A light/dark toggle drives the global theme.
  Renders token-driven atoms (`preview/atoms/*` + `ButtonPreview` + the catalogue's
  `SPECIMENS`) from `usePreviewTokens()`, so editing any foundation updates them **live**.
  Two independent axes of context-awareness, checked in priority order:
  1. **`focus`** — a **`SemanticFocus`** (`content`·`action`·`surface`·`status`·`border`,
     or `'all'`), reported by `Step3_SemanticTokens` via `onFocusChange` and held as
     `semanticFocus` in `Configurator`. Only set while `colorTab === 'semantics'`; each
     value renders its specimen from `SEMANTIC_SPECIMENS`
     (`preview/atoms/SemanticSpecimens.tsx`), which also owns the panel titles so a focus
     can't be half-wired. This replaced four flat-only atoms (`TextSpecimenPreview`,
     `BackgroundSpecimenPreview`, `BorderSpecimenPreview`, `ForegroundSpecimenPreview` —
     the last already dead, it previewed `icon-*` roles the catalogue dropped); they were
     deleted, not kept for reference, since the new module supersedes them entirely.
     Three things make this work that are easy to break again:
     - **Focus is NOT the table's nav selection.** They used to be one shared
       `semanticCategory`, typed to the FLAT catalogue's 3 groups — so a non-flat
       architecture (Categorical's Content·Action·Surface·Status·Border) had nowhere to
       put its selection, `selectNavItem`'s non-flat branch never called up at all, and
       an effect additionally pinned the focus to `'all'`. Net effect: **every non-flat
       architecture showed the generic `ColorCollage` no matter which group you picked.**
       Step3 now owns its nav state (flat + arch, separately) and reports a normalized
       focus; the shell never pushes one down.
     - **`focusForNavKey()` maps every architecture's group keys onto the 5**, and the
       nav row's glyph is derived from the SAME call — icon and specimen can't disagree.
     - **Specimens caption in the ACTIVE architecture's vocabulary.** `slotOf()` prefers
       `tokens.archTokens['category.token']` (Categorical's `action.primary`) and falls
       back to the flat role key (`background-brand-solid`), so the label always names the
       token you'd actually edit in the table in front of you.
  2. **`categoryKey`** (the active Variables foundation key, passed straight from
     `activeFoundation`) — when `focus` isn't set, tailors the panel to a live component
     set for that foundation: **color** → `ColorCollage`, ONE composite surface rather than
     a stack of titled `Group`/`Tile` blocks (Buttons · status tags · Slider ·
     Checkbox+Switch · Badges · Semantic states · Toaster · Dropzone · Select · URL
     `InputGroup` · `PasswordStrength` · TabMenu+Avatar). Titles and per-tile borders ate
     most of the height, so only two or three components were ever on screen — and colour
     is the foundation with the widest blast radius, judged by seeing many components
     repaint TOGETHER. Sharing one surface is what makes that systemic connection legible;
     separate tiles read as unrelated samples. Everything in it is a catalogue `SPECIMENS`
     renderer (never hand-rolled markup) reading the same `radius`/`sizes`/type/semantic
     tokens, so moving Radius or the accent visibly moves every component at once, and the
     collage can't drift from what the plugin ships. Its lead button's icons come from the
     system's own `iconLibrary` prefix. Use ONE Switch, not an on/off pair — each Switch
     specimen renders its own "Notifications" label, so two read as a duplicated row ·
     **typography** → Button + `FontFamilyPreview` (a trigger that opens a modal
     listing Heading/Body family with a "Copy family" clipboard action per row) ·
     **radius** → Button · Card · Input · Modal (the catalogue's `ModalSpecimen`, which
     renders inline — not a real floating dialog) · **spacing**/**sizes** → Button at every
     `Size` (SM–XL, so it reads the `sizes` tokens live) + Card (reads `padding` live) —
     these sit ALONGSIDE the token tables' own comparative bars (`VariablesTable`'s
     `preview` column + Sizes' "Component Sizes" bar block), not replacing them. Any other
     foundation (Icons — which instead swaps via `iconLibraryKey`; Opacity, Shadow, Grid)
     falls back to the original generic Button/Badge/Switch/Form set. **Hidden in the
     Components tab** (docs go full-width) and below `xl`; the rail becomes a drawer below
     `md`.
- **Components ship complete**: `selectedComponents` defaults to every key; a checkbox *removes* one.
- **Foundation progress** (`completedFoundations`) persists; "visited = done" — shown as ✓
  in the Home overview checklist.

**Important:** This is **not a wizard** — no global step counter, no Continue/Back, no locked
steps. `currentStep`, `styleDirection`, `selectedAtoms` stay removed. The old
`FoundationsEditor` (in-Foundations stepper) and `ComponentCatalogue` were **retired** — their
roles moved into the rail + `ComponentDocPane`. Don't reintroduce a persistent top header or a
stepper.

---

## Folder Structure

```
src/
├── components/
│   ├── configurator/       ← TopNav (global nav), SectionRail (Components/Documentation's left rail), FoundationIconRail (Variables' horizontal foundation switcher, replaces SectionRail there), HomeActions (incl. the "New" token-category menu), NewTokenWizard (guided token creation), QuickFoundationsPanel (Quick edit popover), ColorHub + ColorPrimitives (Color's three tabs — Primitives now owns the family nav + quick-edit strip too), ComponentDocPane, IconLibrary, ExportView, FigmaConnectView, GitHubConnectView, VariablesTable (generic filterable token table) + Step2…Step9 + StepGradients (foundation sections). WorkbenchLayout and PickerColor are retired (kept for reference only, see Navigation model)
│   ├── ui/                 ← Shared primitives (Button, Input, Badge, ColorField — the rich HSV+opacity+hex+saved picker…)
│   └── preview/            ← PreviewPanel (sticky, category-aware), ButtonPreview + atoms/ (InputPreview, BadgePreview, TogglePreview, SignUpCardPreview, FontFamilyPreview — the Typography category's family modal + SemanticSpecimens — the five Alias/Semantics per-group specimens, architecture-aware)
├── store/
│   └── useDesignStore.ts   ← Single Zustand store with persist middleware (version 45)
├── lib/
│   ├── colorUtils.ts          ← generateColorScale, checkContrast, isAccessible, accessibleSolidTone (chroma-js)
│   ├── componentCatalogue.ts  ← ComponentDef type, COMPONENTS array, CATEGORIES, COMPONENT_KEYS (pure data)
│   ├── iconLibraries.ts       ← ICON_LIBRARIES (incl. iconifyPrefix for the live Iconify browser), getIconLibrary(), SAMPLE_GLYPHS (pure data)
│   ├── previewTokens.ts       ← resolvePreviewTokens()/usePreviewTokens() — single source for live-preview tokens; ARCHITECTURE-AWARE (see below)
│   ├── gradients.ts           ← GradientDef/GradientAssignments types + gradientToCss()/gradientSlug()/makeDefaultGradients() (pure data)
│   ├── typographyStandard.ts  ← Type-scale/weight/family token standard + categories (pure data)
│   ├── fonts.ts               ← FONT_PRESETS, POPULAR_GOOGLE_FONTS, fontStack(), loadGoogleFont()
│   ├── semanticArchitectures.ts ← the 4 semantic token architectures: metadata (labels/tooltips) + pure projections of the flat role catalogue — projectCategorical() (DTCG-style grouped tree), projectVibrancy() (Apple HIG alpha roles + opaque fallbacks), projectTonal() (M3 0–100 tonal palettes + paired on-color scheme), projectArchitecture() dispatcher used by the export
│   ├── tokenGenerator.ts      ← generateTokenJSON(), downloadTokenJSON()
│   ├── exporters.ts           ← buildCSS()/buildMarkdown() — shared by ExportView + GitHubConnectView
│   ├── github.ts              ← GitHub REST client (PAT in localStorage 'sd-github-token', NEVER in the store): validateToken, listRepos, createRepo, pushFiles (Contents API, sequential)
│   └── utils.ts               ← cn(), slugify(), sanitizeSvg() helpers
├── types/
│   └── tokens.ts           ← TypeScript types for DesignTokens, ColorScale, etc.
└── pages/
    └── Configurator.tsx    ← shell: TopNav over (sub-rail + center editor + PreviewPanel)
api/
└── tokens.ts               ← Vercel serverless: GET returns Blob, POST saves to Blob
scripts/
└── bundle-plugin.mjs       ← zips the sibling Figma plugin → public/scalable-designs-figma-plugin.zip (npm run bundle:plugin)
```

---

## State Shape (useDesignStore)

Key fields — always use the store, never local state for cross-view data:

| Field | Type | Edited in |
|-------|------|-----------|
| `projectName` | string (default `"Escala"`) | Home (hero input) + Export pane (editable pill) |
| `projectDescription` | string (flows into the README intro) | Home |
| `figmaLastPublishAt` / `githubRepo` / `githubLastPushAt` | string \| null — connection status shown on Home; written by the connect views | Home (read-only) |
| `pageBackground` | string (hex, default `#ffffff`) — anchors tone 1 of every generated **light** ramp (`generateColorScale`'s 4th arg) and is the compositing base for the exported alpha ramps (`colors.primitiveAlpha` via `generateAlphaScale`). **DERIVED, never picked** — `backgroundFromBase(grayBaseColor, 'light')`, HeroUI's model: one Base drives every surface | derived (Base) |
| `darkBackground` | string (hex, default `#0c0e12`) — the dark-theme page. Anchors **tone 12** of `grayDarkScale` (dark themes read the gray hierarchy inverted, so `surface-0` → tone 12). Also **DERIVED** — `backgroundFromBase(grayBaseColor, 'dark')` | derived (Base) |
| `grayDarkScale` | ColorScale — dark-appearance neutral ramp, generated by `generateDarkColorScale(grayBaseColor, …, darkBackground)`. Gray roles in a dark theme resolve from **this**, not `grayLightScale` (`sourceScaleFor` → `GlobalScales.grayDark`). Default seed + fallback is `DEFAULT_GRAY_DARK_SCALE` — computed via the real generator at module load, so it can't drift from what editing the gray colour would actually produce (see below); NOT the old fixed `GRAY_DARK_SCALE` constant, which is inverted relative to the current model and is kept ONLY for one legacy migration | derived (accent · neutral · dark background) |
| `primaryColor` | string (hex) | Foundations · Color |
| `primaryScale` | Record<number, string> | Foundations · Color |
| `grayLightScale` | ColorScale | Foundations · Color |
| `errorColor/Scale`, `warningColor/Scale`, `successColor/Scale`, `infoColor/Scale` | ColorScale | Foundations · Color |
| `customColors` | CustomColor[] (`{ key, label, base, scale }` — named families with auto 1–12 scales; keys in `RESERVED_COLOR_KEYS` are blocked) | Foundations · Color |
| `semanticArchitecture` | `'flat' \| 'categorical' \| 'vibrancy' \| 'tonal'` — which shape the export projects the 89-role catalogue into (`lib/semanticArchitectures.ts`). The flat matrix is ALWAYS the editing surface; non-flat choices ship additively as `colors.architecture` in tokens.json (plugin contract untouched) | Color · Alias/Semantics (ArchitecturePicker) |
| `themes` | Record<theme, Record<role, hex>> — `light`/`dark` always exist (protected); user themes via `addTheme(key, base)` duplicate an existing one. Role keys use the **readable taxonomy**: `surface-*` (page/card levels), `action-*` (button/control fills), `status-*` (feedback fills), `text-*`, `icon-*`, `border-*`. Defined once in `ROLE_GROUPS` (`Step3_SemanticTokens.tsx`); `SEMANTIC_KEY_RENAME` (store) migrates old v23 keys | Foundations · Semantic |
| `themeOrder` | string[] (column order, default `['light','dark']`) | Foundations · Semantic |
| `themeKinds` | Record<theme, 'light'\|'dark'> — drives recommended tones + which gray ramp seeds a theme | Foundations · Semantic |
| `typography` | { fontFamily, headingFontFamily, sizes, lineHeights, weights } | Foundations · Typography |
| `spacing` | Record<string, string> | Foundations · Spacing |
| `padding` | Record<'top'\|'right'\|'bottom'\|'left', string> — per-side surface inset for padded surfaces (collage tiles, Card, sign-up card via `paddingOf()`); exported as `padding` in tokens.json + `--padding-*` CSS vars | Quick edit · Padding |
| `gradients` | GradientDef[] (`{ id, name, type: 'linear'\|'radial', angle, stops: {color,pos,tone?}[], linked? }`) — named gradients; `gradientToCss()` builds the CSS. **A linked stop REFERENCES a primitive**: `tone` is the accent-ramp step it reads and `color` is just a cache of `primaryScale[tone]`, re-resolved by `useApplyAccentColor` via `linkedStopsFor(id, scale, prevStops)`. Exported as `gradients` (slug→css) in tokens.json + `--gradient-*` CSS vars + README table | Foundations · Gradients |
| `gradientAssignments` | `{ cover, avatar }` (gradient id or null) — which gradient drives each preview surface: HomeView's card cover (`GlassPanel`) + solid avatars (`AvatarRound`), resolved into `PreviewTokens.coverGradient`/`avatarGradient` | Foundations · Gradients |
| `savedColors` | string[] — the custom `ColorField` picker's "Saved" swatch library (hex, alpha-aware) | any ColorField |
| `radius` | Record<string, string> | Foundations · Border Radius |
| `iconLibrary` | string (default `"lucide"`) | Foundations · Icon Library |
| `customIcons` | { name, svg }[] — uploaded SVGs, sanitized via `sanitizeSvg()` (utils.ts) before storage; exported under `icons.custom` | Foundations · Icon Library |
| `opacity` | Record<string, string> (steps 0–100, `%` values) | Foundations · Opacity |
| `shadows` | Record<string, string> (xs–2xl CSS box-shadows) | Foundations · Shadow |
| `grid` | Record<string, string> (columns/gutter/margin/container + breakpoints) | Foundations · Grid |
| `sizes` | Record<string, string> (component heights xs–2xl) | Foundations · Sizes |
| `selectedComponents` | string[] (defaults to **all** `COMPONENT_KEYS`) | Components |
| `completedFoundations` | string[] (`color`/`semantic`/`typography`/`spacing`; gamified progress) | Rail ✓ |

**Removed fields:** `styleDirection`, `selectedAtoms`, `currentStep` — do not re-add these. Nav state (`tab`, `activeFoundation`, `activeComponent`, `exportMode`, `railOpen`) is local `useState` in `Configurator.tsx`, not the store.

Other key fields: `projectCreated` (gates Home + rail/TopNav pre-creation) and
`savedSystems: SavedSystem[]` (multi-DS registry — `{ id: "owner/repo", name, description,
repo, savedAt, snapshot: DesignSnapshot }`; written only by a successful GitHub push).
`makeDesignDefaults()` is the single source for initial + reset design state;
`captureSnapshot()` deep-clones the design fields. Both exported from the store.

Store uses `persist` middleware with `version: 45`. If you add fields, bump the version and add a migrate function (append-only — never reorder existing migration blocks; to reverse an earlier block, neutralize it in place and add a NEW one, as v42 did to v38's naming force). New design fields also go into `DesignSnapshot`/`makeDesignDefaults()`; global preferences (like `autoSyncFigma`) stay top-level, out of the snapshot.

> **"Linked to accent" means a gradient stop REFERENCES a primitive — not that it's frozen.**
> `GradientStop.tone` is the accent-ramp step the stop reads; `color` is only a cache of
> `primaryScale[tone]`. Linking used to mean stops computed by ad-hoc HSL math off the raw
> accent hex (`brandCoverStops`/`brandAvatarStops`), producing colours that existed nowhere
> in the primitives — so a gradient that claimed to be on-brand shipped loose hex the plugin
> and the CSS could never alias, and the editor could only print that hex because there was
> no primitive to name. Rules that keep this honest:
> - **`linkedStopsFor(id, scale, prevStops)` is the ONE resolver** — the editor's lock, the
>   accent retint (`colorActions`) and the v45 migration all go through it. It takes `prev`
>   so a retint re-resolves the user's OWN tones, positions and stop count rather than
>   resetting to `LINKED_GRADIENT_TONES`' default signature.
> - **Linking constrains COLOUR only.** Position edits, adding a stop and removing a stop
>   all stay live while linked (they used to be disabled, which read as "a linked gradient
>   is frozen"); a stop added while linked is tone-backed and survives the next retint. The
>   colour cell swaps to a tone ramp + the token's name (`accent-9`) instead of a hex field
>   — a linked stop names its primitive, an unlinked one keeps the raw picker.
> - **`derivedStopsFor` is LEGACY and migration-only.** The v35→v36 / v36→v37 blocks must
>   keep producing exactly what they always produced, so it stays untouched. Nothing live
>   may call it.
> - **`lib/gradients.ts` stays dependency-free** (its header says so, and it matters): the
>   default accent ramp is generated in the STORE (`DEFAULT_ACCENT_SCALE`, computed at
>   module load by the real generator, same pattern as `DEFAULT_GRAY_DARK_SCALE`) and passed
>   into `makeDefaultGradients`. Importing `generateColorScale` into gradients.ts instead
>   created a module-init cycle — `makeDesignDefaults()` runs at import time and found the
>   generator undefined. Seeding it this way is also what makes a BRAND-NEW system's linked
>   gradients tone-backed from the first render, rather than waiting for the first accent
>   edit (the same fresh-system-default bug class as the old `GRAY_DARK_SCALE` seed).

> **Deleting a theme is reachable from the Primitives rail, not just Semantics.** The
> family nav's per-family trash is LOCKED while any theme references that family ("remove
> the theme first") — and the only place to remove a theme used to be Semantics' column
> header, a different tab, so a family minted by "+ Theme" was effectively undeletable from
> the screen that shows it. Each THEME folder header (never `BASE_FOLDER`/`CUSTOM_FOLDER`)
> now carries a hover trash opening the SAME `DeleteThemeModal` Semantics uses (shared from
> `colorControls` — one destructive action, one warning, or one entry point would under-state
> what the other destroys). Deleting the theme frees its families into **Custom**, where the
> existing per-family trash already unlocks. No colour data is destroyed — only the theme
> and the semantic values mapped to it.

> **The chrome's accent is DERIVED for contrast, exactly like the tokens it sits next to.**
> Two CSS vars, both written by `Configurator.tsx` and nothing else:
> - **`--accent-ui`** = `chromeAccent(scale, page, fallback)` (`colorUtils.ts`) — walk UP
>   from the anchor (tone 9) until the tone clears **4.5:1 against the chrome page**. This
>   is the same move the token side already makes for `action-primary`
>   (`accessibleSolidTone`), which is why the app chrome and the Color preview's Button now
>   resolve to the identical hex. It was `primaryScale[9]` raw — the ONE tone with no
>   contrast guarantee — so a pale accent (`#c76aff`) gave **3.03:1** section titles and
>   3.03:1 buttons while the preview beside them rendered a correctly-darkened one. Now
>   4.68:1. One upward walk serves both appearances, because every ramp's HIGH tones are
>   its accessible-text end (near-black on a light ramp, near-white on a dark one) — so
>   light chrome reads `primaryScale`, dark chrome reads `primaryDarkScale`, no branching
>   and no hand-brightening.
> - **`--accent-ink`** (`text-accent-ink`) = `readableInk(uiAccent)` — the label ink for
>   any `bg-accent-ui` fill. **Never hardcode `text-white` on an accent fill**; eight call
>   sites did, which is fine for a dark accent and unreadable for a pale one, and inverts
>   entirely in dark chrome (there the accent brightens, so the ink comes out near-black —
>   6.43:1 where `text-white` was 3.03:1).
>
> Consequences worth keeping:
> - **A softened accent fill breaks the ink guarantee.** `--accent-ink` is solved against
>   the accent, not against a composite of it, so `bg-accent-ui/[0.83]` (what
>   `FoundationIconRail`'s active button used) quietly undoes the math. Fills that carry a
>   label use the full accent; the low-alpha variants (`/[0.06]`–`/[0.08]` tints, dots,
>   underlines, connector lines) carry no text and are fine.
> - **The contrast target is `--app`, deliberately** — the same reference the role
>   catalogue uses for every text role (`contrastAgainst: 'background-primary'`). Aiming at
>   `--elevated` would be stricter but forces tone 12 (near-black) for a pale accent, and
>   the chrome stops reading as the user's colour. **Known residual:** accent text sitting
>   ON `bg-elevated` (active table rows) lands ≈3.8:1 — fine as a UI component, short of AA
>   for body text. Fixing it means moving those rows onto an accent tint instead of
>   `bg-elevated`; that's a visual-design change, not a token one.
> - `CenterHeader`'s `accentColor` takes `uiAccent` — it used to re-derive the same
>   expression inline, which is how it drifted into being the most visible 3:1 failure.
>   Anything else needing "the chrome accent" reads the var or that variable, never
>   `primaryScale[9]`.

> **There is ONE "open a token, edit its value" surface in the Color hub:
> `TokenDetailsModal` (`colorControls.tsx`).** Semantics' role rows and Primitives' tone
> rows both open it — same shell (Token Details header + Reset · Name · copyable CSS-var
> chip · Description · "Values"), each caller passing its own editors via **`sections`** so
> the read/write logic stays where it belongs (flat's `TonePicker`, the arch view's
> `ArchModeEditor`, Primitives' light/dark `ColorPickerPanel`). Primitives used to expand
> its rows INLINE instead — two interactions for one job, on two tabs of the same hub —
> so don't reintroduce an inline row editor. It lives in `colorControls` (not Step3)
> precisely so a third caller doesn't fork a copy. Primitives-specific bits: `cssVarName`
> is `color-<token>` because that's what `exporters.ts` actually emits (`--color-accent-9`);
> Description comes from `TONE_DESCRIPTIONS`, keyed off the tone NUMBER like `TONE_BANDS`
> so it survives a naming-scheme change; **Reset means "back to what the generator
> produces for this family's base"**, computed from the SAME generators the family was
> built with (`generateDarkColorScale` for neutral, `generateFamilyDarkScale` otherwise) so
> a reset can never disagree with retinting the family, and it resets BOTH appearances the
> way Semantics' Reset clears every mode. Only one HSV panel renders at a time (both modes
> are listed as selectable rows) — two stacked pickers overflow the dialog for a value you
> edit one at a time.
>
> Three rules the shell itself enforces, so no caller can drift from them:
> - **One `sections` entry per mode, collapsible, and only ONE starts open.** A system with
>   light + dark + two custom themes stacked four full ramp grids in one dialog — the mode
>   you came to edit could be a screen-height of scrolling away. Which one opens is
>   `initialOpenKey`, and every caller passes the **previewed** theme/appearance (not
>   literally the first section), so the dialog opens on the value the user can watch
>   change. The section header owns the mode's name + `KindIcon`; `ArchModeEditor` no
>   longer prints its own, or the label appears twice.
> - **It docks against `anchorRef`'s right edge**, not the viewport centre — callers pass
>   their token table's scroll container, so the dialog opens beside the trailing settings
>   column the row's button lives in instead of covering the values it edits. No anchor =
>   centred fallback. The anchor is the CONTAINER (a fixed column), so it's measured on
>   open + resize only, not on scroll.
> - **Each mode's card is painted in ITS OWN appearance, and shows ITS OWN ramps.** The
>   card carries a `light`/`dark` class (both defined in `index.css`; `.light` exists
>   precisely so a subtree can opt back OUT of dark, which `.dark` alone couldn't) — so a
>   dark mode's swatches are judged on the dark page they ship against, and the light card
>   stays light even while the app chrome is dark. Not a hardcoded colour: it's the same
>   two token sets the whole app uses. The ramps themselves come from **`scaleLookup`**
>   (exported from `semanticArchitectures.ts`), the same resolver the arch table and the
>   export use. `rampsOf` used to read `scales.brand`/`scales.error`/… directly — the LIGHT
>   ramps for every mode — so a dark theme's picker offered light tints and picking one
>   stored a ref that resolves to a completely different dark-twin colour. Every mode
>   rendering an identical grid is what hid it. **If a picker builds ramps without a
>   `kind`, that's the bug back.**
> - **The dialog is 360px (`PANEL_W`), not 256.** At 256 the 12-tone grid had ~136px for
>   twelve cells plus gaps — sub-9px swatches, neither pickable nor readable. Its scrolling
>   body uses `.scrollbar-thin` (also in `index.css`); the platform default bar is about as
>   wide as a token swatch and dominated the panel.
> - **Inside "Values", ramp labels use the platform UI font, not mono.** `accent` /
>   `neutral-dark` are family labels; only genuine code identifiers (the Name row, the
>   CSS-var chip, table token names) stay mono. `SystemRampGrid`'s row labels and 1–12 axis
>   were mono and made the dialog read as two unrelated typefaces stacked.

> **Tall popovers → `usePopoverPlacement`** (`colorControls`). A popover carrying
> `ColorPickerPanel` (HSV + hue + alpha + Palette + Saved) is ~540px — taller than the room
> under a trigger sitting low on the page. The hook measures on open, flips above the
> trigger when there's more room there, and returns `{ up, max }` to cap `maxHeight` to the
> space that actually exists. Pair it with pinned header · scrolling body · pinned footer
> so the primary action can never scroll out of reach. Used by the "+ Add" family popover
> and the per-family edit popover; use it for any new one rather than a fixed max-height.

> **`ScaleRow` is compact by default.** Swatches are `h-8` (`thin` variant `h-4`) with
> `gap-1` — shrunk from an earlier `h-11`/`gap-1.5` because stacking multiple 12-tone ramps
> (the old Picker Color's brand + neutral + 5 state scales) at the old size made the page
> feel heavy. It's the ONE shared component behind every ramp — `ColorPrimitives.tsx`'s
> quick-edit strip (default size — one ramp at a time now, not several stacked, so the
> extra height is affordable again), `AddThemeModal.tsx` — so a size change here is felt
> everywhere; the on-swatch "Anchor" text was already dropped in favor of the ring + dot
> (title tooltip carries the label), which is what keeps this size legible.
>
> **`numbersInside` is the exception, and only the brand ramp uses it.** It moves the tone
> number ONTO its swatch (ink picked by `readableInkOn`), which needs `h-11` to fit — so the
> number doubles as a live contrast check on the tone it labels. That's worth the height for
> the one ramp you're actively picking; the five state ramps keep captions above and stay
> compact, or the tab's density regresses. Corner radius stays `rounded-md` though — SAME as
> every other `ScaleRow` variant. It briefly matched the `ColorSelect` dropdown above it
> instead (`rounded-[13px]`), which looked deliberate in isolation but inconsistent once
> the State Colors ramps (still `rounded-md`) were visible in the same scroll — don't
> special-case this cell's radius again without checking it against the ramps below it.
> `ColorSelect`'s `pill` variant is still `rounded-[13px]` though (unrelated call — that's
> the State Colors hex trigger, not a swatch grid, matching the dropdown it sits beside).

> **Editing a family's color.** Each row of the Color-families nav carries a pencil that
> opens `ColorPickerPanel` for THAT family, routed by `changeFamilyBase()` to whichever
> applier owns it — accent → `useApplyAccentColor`, neutral → `useApplyGrayColor` (so it
> moves the page, see below), status → `useApplyStateColor`, custom → `updateCustomColor`
> with a regenerated ramp. The nav is no longer selection-only; keep new families routed
> there instead of sending users back to the quick bar.

> **Popovers inside the Quick-edit accordion.** `Group`'s content wrapper needs
> `overflow-hidden` for its height animation, and that CLIPS any dropdown opened inside
> it. It therefore clips **only while animating** (`onAnimationStart`/`onAnimationComplete`
> toggle the class); once settled, popovers can escape the group. Keep that pattern for any
> new animated-height container that can hold a popover.

> **Neutral is an intent.** The State Colors control carries **Neutral · Error · Success ·
> Warning · Info** (`IntentRole`). Neutral has no primitive of its own — it IS the Base, so
> its row writes through the Base applier and therefore moves the page with it. Don't add a
> separate `neutralColor` field to "fix" that; one value, two entry points is the point.

> **A theme is a READING of the primitives, never a place to set color.** The Figma model:
> modes reference variables, they don't hold their own values. Enforced at the data model,
> not by discipline: `themeSources[theme]` stores a **family KEY per slot** (`{ brand:
> 'teal', gray: 'teal-gray', error: 'error', … }`) — never a ramp. Everything that needs a
> theme's actual ramps calls `resolveThemePalette()` (`lib/themeSources.ts`), so retinting
> a family in Primitives moves every theme pointing at it; a theme can't drift because it
> never held a copy to drift with.
>
> Consequences to preserve:
> - **Creating a theme creates its families.** `AddThemeModal` mints a `customColors` entry
>   for any slot whose hex isn't already a family (`teal` for the brand, `teal-gray` for the
>   linked neutral) and stores references. A slot matching a global reuses `accent` /
>   `neutral` / `error` / … instead of duplicating it.
> - **A family in use can't be deleted.** `removeCustomColor` refuses while any theme
>   references it (`themesUsingFamily`), and the family nav shows a lock with the list.
> - **The Alias/Semantics columns have an eye and a ✕ — no pencil.** Color is edited in
>   Primary Color; the table only maps roles onto it.
> - **The export ships no per-theme namespaced ramps.** A theme's ramps ARE families,
>   already exported under their own key, so its semantics alias those primitives.

> **Base drives the page (HeroUI model).** There is still no background PICKER.
> `grayBaseColor` — labelled **Gray / Neutral** in the UI (renamed from "Base", which
> collided with the sidebar's own "Neutral" family and with the per-tone "anchor" concept
> below — nothing should say "Base" for two different things) — is the single input the
> page is computed from: `useApplyGrayColor` writes `pageBackground` + `darkBackground` via
> `backgroundFromBase()` and then **re-anchors every ramp** (brand, status, customs) to the
> new light page, because tone 1 grows out of it. While the accent↔base link is on, an
> accent change moves the base and therefore the page too; unlinked, the accent leaves the
> page alone. `ColorPrimitives`' quick bar DOES show a **Background** field now
> (`DerivedBackgroundField`) — but it's a read-only calibration READOUT (no `onChange`,
> `cursor-default`), not a second input: still don't reintroduce an independently-editable
> background — that's what let the page and the ramps grown against it drift apart before.

> **Alpha twins are solved, not eyeballed.** `alphaColorOver` inverts alpha compositing
> — `α = (solid − page)/(overlay − page)`, max across channels, then the overlay is
> re-solved per channel at that α so the TINT survives (pure white/black would wash the
> hue out). The overlay is fixed by appearance: white over a dark page, black over a light
> one. Two gotchas the implementation handles and a rewrite must keep:
> - **α rounds UP** to 2 decimals. Rounding down demands an overlay outside 0–255, which
>   clamps and silently breaks the reconstruction.
> - **α climbs until every channel is in gamut.** A solid whose blue dips BELOW a dark page
>   can't be reached by white at the max-channel α; the loop raises α (α = 1 always works).
>   Without it, red ramps on a blue-ish dark page rebuilt 6/255 off.
> Both appearances ship (`accent-a*` and `accent-dark-a*`) because an alpha value only
> means anything relative to the page it was solved against.

> **Ask what a colour IS, don't assume.** "+ Add family" carries a Light · Dark · Alpha
> choice (`SeedKind`), preselected by `detectSeedKind` and overridable. A **dark** seed
> anchors the dark ramp; an **alpha** seed is composited back to the solid it renders as
> (`solidFromSeed`) before any ramp is built. The detection threshold is deliberately near
> the dark page (`darkL + 0.18`), not the midpoint between pages — a brand solid is
> mid-lightness by nature and the midpoint misreads it as dark.

> **Radix two-scale model — every family ships light AND dark.** Steps are ordered by
> ROLE, not lightness, and mean the same thing in both appearances:
> `1–2` app background · `3–5` component (normal/hover/active) · `6–8` border
> (subtle/normal/hover) · `9` **SOLID = the base hex verbatim, the one hard value** ·
> `10` solid hover · `11` low-contrast text (≈4.5:1, WCAG AA) · `12` high-contrast text.
> The two appearances are mirror images: light runs page→base→dark text, dark runs
> page→base→light text. Consequences:
> - **Step 1 IS the page**, emitted verbatim — a brand background like `#111522` round-trips
>   into `neutral-1` (dark) exactly.
> - **Steps 11–12 are defined by CONTRAST**, not a lightness offset (`lightnessForContrast`
>   binary-searches OKLCH L, then nudges until the 8-bit hex itself clears the target).
> - **`recDarkTone` is the IDENTITY** now: a role reads the same step in both themes and
>   gets the value tuned for that page. Only deliberately-inverted roles (`*-inverse`,
>   `surface-overlay`) mirror. The old tone-remapping was faking a dark ramp that didn't
>   exist — don't reintroduce it.
> - **Nothing inverts for display.** The families table and quick-bar ramps read the dark
>   ramp at the SAME step. An inversion here means a dark ramp is missing somewhere.

> **Tone 9 is ALWAYS the anchor — pinned, not detected.** `BASE_TONE = 9` (`colorUtils.ts`)
> is a hardcoded constant: `generateColorScale` writes the input hex to tone 9 verbatim
> (`if (i === BASE_TONE) { out.push(chroma(baseHex).hex()); continue }`) every time, for
> every algorithm. This is Radix's own model too (their Custom Palette tool does the same).
> The ring/badge marking it in the UI is called **"Anchor"**, not "Base" — that text
> collided with `grayBaseColor`'s "Base" label (see above) and implied a per-color
> computation that doesn't exist; renaming it didn't change the math, tone 9 was always
> where the input color landed. `ScaleRow`'s compact 12-cell strip (`colorControls.tsx`)
> marks it with a ring + a tiny dot only — "anchor" as text doesn't fit any of the 12 cells
> at 7–8px, tried it, it clips; the full word lives in the cell's `title` tooltip and in
> the families table's row badge, which has room.
>
> **Radix numeric (1–12) is THE naming — for every system, not just new ones.** Every ramp
> is stored 1–12 internally regardless of scheme (nothing to migrate); `colorNaming`
> (`'numeric' | 'hundreds' | 'tens'`, `NAMING_SCHEMES` in `colorUtils.ts`) only relabels the
> swatch-strip numbers, the families table's row names (`accent-25` vs `accent-1`) AND the
> exported token names — one scheme drives all three, deliberately, so what's on screen is
> never a lie about what ships. `makeDesignDefaults()` seeds `'numeric'` and **store v42
> converts every persisted + saved system to it**.
>
> This reversed an earlier position ("new systems only, existing keep theirs"), because that
> position was never actually holding: the v37→v38 block force-converted `'numeric'` →
> `'hundreds'` on every upgrade, so the naming a system exported depended on which version
> it happened to upgrade FROM. v42 settles it in one direction and the v38 line is now a
> documented no-op. It IS a rename for anyone who was on hundreds — `accent-700` ships as
> `accent-9` — so a Figma/JSON integration pinned to the old names has to re-sync; that cost
> was taken deliberately over leaving two behaviours in the chain. The scheme picker stays,
> so hundreds/tens remain a deliberate opt-in.
>
> The families table also captions its 12 rows into Radix's 5 role bands (`TONE_BANDS` in
> `ColorPrimitives.tsx`: 1–2 Backgrounds · 3–5 Interactive components · 6–8 Borders ·
> 9–10 Solid colors · 11–12 Accessible text) — keyed off the tone NUMBER, so the grouping
> holds under either naming scheme.

> **Light vs dark ramps.** A ramp always runs 1 (lightest) → 12 (darkest); what differs is **which end grows out of the page**. `generateColorScale(…, appearance: 'light')` anchors tone 1 to `pageBackground`; `generateDarkColorScale()` anchors tone **12** to `darkBackground` *and* re-derives the ramp's base (tone 9) as a dark neutral, so tones 9–12 are the dark surfaces instead of mid-grays. Gray is the **only** ramp with a dark twin — colored ramps (brand/status) keep their hue and just shift tone via `recDarkTone`. Anything that builds a `GlobalScales` **must pass `grayDark`**: it's optional in the type, and omitting it silently falls back to the legacy constant — which would make Step3's resync treat every dark gray as stale and overwrite the generated ramp.

> **Live preview tip:** changing the brand in Foundations · Color re-derives the already-mapped brand semantic tokens (via `BRAND_TOKEN_TONES` + `accessibleSolidTone`) so the right-hand preview and the export track the new brand. Unmapped tokens fall back to `primaryColor` in `resolvePreviewTokens`.

> **`resolvePreviewTokens` never trusts a persisted semantic value blindly.** Its internal
> `resolveRole()` runs every `semanticTokens[key]` through `normalizeThemeValue()`
> (`lib/semanticRoles.ts`) — the same staleness check `Step3_SemanticTokens` already used
> for its own auto-populate/reset — before using it, falling back to the role's recommended
> tone when the stored hex is no longer a genuine tone of the current source scale. This
> matters because that auto-populate effect only runs while Alias/Semantics is mounted: a
> user who edits colors and previews via Components (never visiting Semantics) could
> otherwise carry a stale dark-theme value indefinitely — e.g. the Components-tab preview
> background staying light-gray in dark mode instead of tracking the real dark surface.
> Keep every field in `resolvePreviewTokens` going through `resolveRole()`, not a raw
> `semanticTokens[key] || rec(key)` read.

> **A non-flat architecture stores its edits in `architectureOverrides`, NOT in `themes` —
> so `resolvePreviewTokens` has to project, or the preview is frozen.** `themes[theme]` only
> ever holds the FLAT role map; Categorical/Vibrancy/Tonal edits are refs under
> `architectureOverrides[arch]['category.token'][mode]`. `resolvePreviewTokens` used to read
> `themes` exclusively and carried a comment that 'flat' and 'categorical' "share the same
> resolved values" — so editing e.g. `action.primary` in Categorical repainted **nothing**,
> in any preview, forever. It now rebuilds the same `buildArchitectureView()` the table
> renders (overrides applied), publishes the previewed mode's resolved colours as
> `tokens.archTokens`, and maps the ones with a `PreviewTokens` field onto it — guarded so
> a projection that omits a slot keeps the flat-resolved value instead of blanking the atom.
> Anything new that resolves preview colour must go through this, not a raw `themes` read.

> **The dark-mode "white box" bug had a second, deeper cause: ~30 of 39 semantic roles'
> `darkTone` was just wrong**, not stale. `resolveRole()` above only protects against a
> stored hex that's no longer ANY tone of its scale — it does nothing if the stored (or
> recommended) tone is a VALID tone that's simply the wrong one. `background-primary` (the
> page background) was pinned to `darkScale: 'gray', darkTone: 12` — gray tone 12 is the
> DARK ramp's lightest step (its highest-contrast TEXT tone), not the page. It should have
> been tone 1 (identity — the dark ramp's tone 1 IS `darkBackground`, same as the light
> ramp's tone 1 IS `pageBackground`). This wasn't a one-off typo: nearly every role outside
> the `*-solid` fills carried a leftover Tailwind-scale-style inversion (mirroring roughly
> `13 − tone`) baked in before the per-appearance Radix dark ramp existed — exactly the
> "old tone-remapping... don't reintroduce it" CLAUDE.md already warned about elsewhere, just
> never actually removed from the catalog data itself. Fixed by deleting the hardcoded
> `darkTone` from every role that isn't a genuine opposite-polarity case, so `recDarkTone()`
> computes IDENTITY (same step, dark ramp) the way the type comment on `Role.darkTone`
> already said it should. Only `content-inverse`, `border-brand-alt` (both switch `darkScale`
> entirely, by design) and `background-overlay` (a modal scrim — its light tone borrows
> gray-12's near-black LIGHTNESS as a fixed veil colour, not a step position, so it's in
> `recDarkTone`'s `inverts` list) still carry an explicit override. **A hardcoded `darkTone`
> on any other role is a bug until proven otherwise** — don't add one without checking it
> against `recDarkTone`'s identity default first.
>
> Because a MATERIALIZED stored value (one already written into `themes[darkTheme]` by
> Step3's auto-populate, before this fix) is a *valid* tone of its ramp — just the wrong
> recommendation — `resolveRole()`'s staleness check doesn't catch it or self-heal it; it
> survives indefinitely once written. Store **v43** clears every dark-kind theme's role map
> (same blunt-but-proven approach as v38 and v40's `clearSemantics`) so auto-populate
> re-seeds from the now-correct identity tones. If you ever change a role's recommended
> tone again, ship a matching migration — don't rely on `resolveRole()` alone to propagate it.

> **The same inversion was ALSO baked into `CATEGORICAL_ROLES`** (`semanticArchitectures.ts`),
> and it survived the flat fix because it's a separate table. `neutral-dark` runs
> **1 = darkest** (tone 1 IS `darkBackground`, emitted verbatim) → 12 = lightest, exactly
> like the light ramp runs 1 = page → 12 = text — so a dark ref uses the SAME step as its
> light counterpart. The table mirrored them instead (`surface.page` dark →
> `{neutral-dark.12}`), which rendered Categorical's **entire dark column as a light
> theme**: near-white page, near-black "dark mode" text. Realigned to identity, with
> `surface.inverse` and `surface.overlay` keeping deliberate overrides (an inverse surface
> inverts by definition; a scrim dims rather than inverts, so it stays dark in both). The
> file's own comment always claimed both architectures agree on what a role looks like —
> now they actually do. **If you write `13 − n` in a dark ref, that's the bug.**
>
> One thing deliberately left ALONE, so it doesn't get "fixed" by accident: Categorical's
> `border.subtle` sits on a HIGHER tone than `border.default` (5 vs 3), which reads
> backwards — but that's the shipped LIGHT-mode schema and light mode isn't broken.
> Re-pointing it would silently change exported tokens for no bug.
>
> **UPDATE (N-theme work below): the "coloured families read light-ramp tints in dark
> mode" gap noted above IS now fixed** — `scaleLookup` takes a `kind` param and consults
> `GlobalScales.dark` (the same per-family dark twins `sourceScaleFor` already reads for
> the flat catalogue) whenever no theme palette overrides it. `surface.accent` on the
> built-in dark theme now correctly reads the dark accent twin, not the light one. This
> was NOT a schema change — same refs, same shape, just the resolved HEX.

> **`GRAY_DARK_SCALE` (the hardcoded fallback constant) was ALSO a leftover pre-Radix
> ramp — same bug class, one level lower.** It's `1: '#fafafa' … 12: '#0c0e12'`: light at
> tone 1, `darkBackground` at tone 12 — the OLD mirrored convention, inverted relative to
> what `generateDarkColorScale()` has produced for a long time (tone 1 IS the dark page).
> It's not just an inert fallback: it was `makeDesignDefaults()`'s literal seed for
> `grayDarkScale`, meaning **every brand-new system shipped with an inverted dark neutral
> ramp until the user's first edit to Gray/Neutral regenerated it correctly.** Symptom: a
> fresh system previewed in dark mode before ever touching a colour control rendered
> backwards — near-white "page," near-black "text" — reproducible by clearing storage and
> checking `grayDarkScale[1]` against `darkBackground` before touching anything. Fixed by
> adding **`DEFAULT_GRAY_DARK_SCALE`** — the SAME ramp `generateDarkColorScale()` computes
> for the default accent/gray/darkBackground, computed once at module load so it can't
> drift from the live generator — and switching every "when missing, fall back to X" site
> (`makeDesignDefaults()`, `tokenGenerator.ts`, `previewTokens.ts`, `semanticRoles.ts`) to
> it. **`GRAY_DARK_SCALE` itself is UNTOUCHED and must stay that way** — the v31→v32
> migration explicitly seeds it into pre-v32 localStorage to preserve "the exact dark they
> already had"; changing its values would silently alter what that migration produces for
> anyone still carrying genuinely ancient state. If you ever need "the correct default dark
> neutral ramp," that's `DEFAULT_GRAY_DARK_SCALE` — `GRAY_DARK_SCALE` has exactly one
> remaining job and it isn't that.

---

## Component Catalogue

**The Figma plugin is the source of truth** (`../scalable-designs-figma-plugin/src/code.ts`): each catalogue `key` equals a plugin CATALOG `gate`, `axes` mirrors the plugin's SPECS variant matrix, `figmaSets` lists every component set the key unlocks in Figma, and `category` mirrors the plugin's "❖ Category" divider pages. When the plugin's CATALOG/SPECS change, mirror them here — never the reverse.

The catalogue holds **58 components**. The original plugin families were split into standalone entries (Button Group, Input OTP, Radio, Chip, Alert Banner… each owns the plugin set its parent used to bundle), and ~20 entries are **catalogue-first**: `figmaSets: []` means the plugin gate doesn't exist yet — they document + preview in the app and export in `atoms`, and the doc pane shows a "not in the Figma library yet" note. When a set lands in the plugin, fill in its `figmaSets`. Display-name renames (keys stay stable for plugin gates + export): `Toggle`→"Switch", `Divider`→"Separator", `Breadcrumb`→"Breadcrumbs".

`src/lib/componentCatalogue.ts` contains the `COMPONENTS` array (pure data — imported by the store, the catalogue list, and `ComponentDocPane`). Each definition has:

```ts
interface ComponentDef {
  key: string         // unique ID — plugin gate; matches export key in tokens.json `atoms`
  label: string       // display name
  category: string    // Button & Actions | Form Controls | Indicators | Content & Surfaces | Feedback | Navigation
  description: string // one-liner
  usage: string       // when to use / when not to use
  axes: { name: string; values: string[] }[]  // plugin variant matrix; [] = single component
  figmaSets: string[] // Figma component sets this key unlocks (plugin CATALOG entries)
  props: { name, type, description }[]
  accessibility: string
}
```

**To add a new component:** add its gate + spec in the plugin first, then mirror it in `COMPONENTS`. The catalogue list renders it automatically and it's included by default.

**Docs are an interactive playground** (`ComponentDocPane.tsx` + `docs/specimens.tsx`): a live token-driven specimen on a canvas, per-axis controls (dropdowns / switches driving the exact plugin axes), a usage snippet with Copy, a "Ships in Figma" section (figmaSets + variant count), the prop table, and usage/a11y cards. To support a new component, add its render to the `SPECIMENS` registry and a case to `snippetFor()` in `docs/specimens.tsx`.

---

## Token Export Format

```json
{
  "schemaVersion": 3,
  "project": "my-system",
  "colors": {
    "primitive": { "1": "#f5f0ff", ... "12": "#1a0a3d" },
    "semantic": { "text-primary": "#101828", "surface-0": "#ffffff", "action-primary": "#7f56d9", ... },
    "semanticDark": { ... },
    "themes": { "light": { ... }, "dark": { ... }, "<custom>": { ... } },
    "themeOrder": ["light", "dark", "<custom>"]
  },
  "typography": {
    "fontFamily": "Inter",
    "headingFontFamily": "Inter",
    "sizes": { "text-xs": "12px", "text-sm": "14px", ... "display-2xl": "72px" },
    "lineHeights": { "text-xs": "18px", "text-sm": "20px", ... "display-2xl": "90px" },
    "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }
  },
  "spacing": { "1": "4px", "2": "8px", ... },
  "gradients": { "brand-cover": "linear-gradient(135deg, #7f56d9 0%, #432e73 100%)", "aurora": "...", ... },
  "gradientAssignments": { "cover": "brand-cover", "avatar": "aurora" },
  "radius": { "none": "0px", "sm": "4px", "md": "8px", "lg": "12px", "full": "9999px" },
  "opacity": { "0": "0%", "5": "5%", ... "100": "100%" },
  "shadows": { "xs": "0 1px 2px rgba(10,13,18,0.05)", ... "2xl": "..." },
  "grid": { "columns": "12", "gutter": "24px", "margin": "32px", "container": "1280px", "breakpoint-sm": "640px", ... },
  "sizes": { "xs": "24px", "sm": "32px", "md": "40px", "lg": "48px", "xl": "56px", "2xl": "64px" },
  "icons": { "library": "lucide", "name": "Lucide", "package": "lucide-react", "custom": [{ "name": "star", "svg": "<svg…>" }] },
  "atoms": ["Button", "Input", "Badge", ...]   // ← canonical field name the Figma plugin expects (NOT "components")
}
```

`tokenGenerator.ts` generates this (the README markdown in `ExportView.tsx` mirrors it, incl. an Icons section). If you add fields to the store, also add them to `generateTokenJSON()` and the markdown. `schemaVersion` (`TOKEN_SCHEMA_VERSION` in `tokenGenerator.ts`, now **4**) versions the contract the plugin checks. v4 added the per-family dark primitives (`accent-dark-*`, `error-dark-*`, … alongside `neutral-dark-*`) — additive, so an older plugin ignores them; **the plugin still needs updating to import them as a dark mode**. The plugin also reads optional `copy` / `borders` sections that the configurator does **not** emit yet (plugin-ready forward-compat).

---

## API — /api/tokens

- `GET /api/tokens?project=<id>` → returns that system's tokens (Blob key `tokens/<id>.json`)
- `GET /api/tokens` (no project) → returns the **most recently published** set across the global key + every `tokens/*.json` (so plugins pinned to the bare URL still get "whatever was published last")
- `GET /api/tokens?list=1` → `{ systems: [{ project, updatedAt }] }` — every published system, newest first
- `POST /api/tokens?project=<id>` → saves to `tokens/<id>.json`; `POST /api/tokens` (no project) → legacy global key `design-tokens.json`
- CORS headers allow `*` — required for Figma plugin to fetch cross-origin
- Uses `@vercel/blob` (free tier, 1GB). Do NOT switch to KV — it requires paid plan.
- **Per-system scoping (Fase 2)** — each design system publishes to its own scoped key, derived from `slugify(projectName)`. The plugin syncs one system by pasting its scoped URL; switching systems no longer overwrites another's tokens. The plugin names its Figma variable collection after `project`, so different systems land in different collections.

**Publishing flow** (`src/lib/figmaSync.ts` — the single source for POSTing tokens):
- `syncProjectId()` = `slugify(projectName)`; `syncPath()`/`syncUrl()` build the scoped `/api/tokens?project=<id>` endpoint shown in FigmaConnectView / ExportView / HomeView.
- `publishTokens()` POSTs `generateTokenJSON()` to the scoped endpoint and records `figmaLastPublishAt`. Used by the **TopNav "Sync" pill** (manual push, only rendered when live), the **Figma connect view** (auto-publishes on open), and the auto-sync subscription.
- `useAutoFigmaSync()` (mounted in `Configurator.tsx`): while `autoSyncFigma` is on, debounce-republishes ~1.5s after edits stop. The change signal is the JSON of `generateTokenJSON()`, so the `figmaLastPublishAt` write can't loop. Toggle lives in `FigmaConnectView`.

---

## Figma Plugin

Lives at `../scalable-designs-figma-plugin/`. Separate project, separate `package.json`.

```
src/
├── code.ts    ← Figma Plugin API sandbox (importVariables, importStyles, importComponents)
└── ui.html    ← Self-contained plugin UI (Import tab, Live Sync tab, Log tab)
```

Build with `npm run build` (esbuild). Load in Figma via manifest.json.

**Live sync URL for plugin:** `https://scalable-designs.vercel.app/api/tokens`

---

## Design Principles

1. **No bloat** — every feature should earn its place. If it doesn't help the designer configure tokens, it doesn't belong.
2. **Tokens first** — all visual choices (colors, radius, spacing) come from the store. Never hardcode design values in components. Live previews resolve tokens via `usePreviewTokens()`.
3. **Workspace, not wizard** — the shell (top nav · controls · canvas) has no linear step counter, progress bar, or Continue/Back nav between sections (see Navigation model).
4. **Accessibility** — all interactive elements need keyboard support and ARIA. The component docs we generate should model this.
5. **Light & dark** — both themes are supported; **light is the default**. Use the semantic color utilities (`bg-app`/`bg-surface`/`bg-elevated`, `text-fg`/`text-fg-muted`/`text-fg-faint`, `border-line`/`border-line-strong`) defined in `src/index.css` — NOT raw `neutral-*`. Dark mode = the `.dark` class on `<html>` (toggled in the **preview panel header**, persisted as `localStorage['sd-theme']`, applied pre-paint by the inline script in `index.html`). Keep `text-white` only on colored/accent fills; the user's token colors/previews are theme-independent (atoms render on `tokens.surface`).

---

## Conventions

- Component files: `PascalCase.tsx`
- Step files: `StepN_Name.tsx` where N is the step number (foundation sections, rendered as-is in the center pane)
- Preview atoms: `components/preview/atoms/*Preview.tsx`, each takes `tokens: PreviewTokens` and styles inline from tokens
- Store actions: `set` prefix (`setProjectName`, `setTypography`, `setIconLibrary`)
- CSS: Tailwind utility classes for chrome (use the semantic theme utilities — `bg-app`, `bg-surface`, `text-fg`, `border-line`… — never raw `neutral-*`). Preview atoms are the deliberate exception: they use inline `style` from resolved tokens.
- Animations: Framer Motion (`motion.div`, `AnimatePresence`) for transitions between states
- No `console.log` in production code
- TypeScript strict mode — no `any` unless absolutely necessary

---

## Deploy

```bash
# Configurator
cd ~/sync-ds-platform/scalable-designs
npm run build          # verify
npx vercel --prod      # deploy

# Plugin (after code changes)
cd ~/sync-ds-platform/scalable-designs-figma-plugin
npm run build          # outputs dist/code.js + dist/ui.html
# Reload in Figma: Plugins → Development → Escala DS → ⟳

# Refresh the downloadable plugin zip served by "Bring to Figma"
cd ~/sync-ds-platform/scalable-designs
npm run bundle:plugin  # → public/scalable-designs-figma-plugin.zip (commit it; Vercel only builds this repo)
```

---

## What's next (backlog)

- [x] Components: live component previews rendered with user tokens (starter set: buttons, input, badge, toggle, sign-up card — extend `preview/atoms/` with more)
- [x] Export: "Bring to Figma" — downloadable plugin zip + guided install + auto-publish to `/api/tokens` (`FigmaConnectView`)
- [x] Export: "Save to GitHub" — PAT connect, repo pick/create, push tokens+css+README (`GitHubConnectView` + `lib/github.ts`)
- [x] Foundations: Opacity / Shadow / Grid / Sizes token tables (`TokenTable` + Step6–9)
- [x] Color: custom named color families with auto 1–12 scales (`customColors`)
- [x] Semantic: multi-theme matrix (`themes`/`themeOrder`/`themeKinds`, "+ Theme" duplicates an existing one)
- [x] Home: onboarding view — name/description, connection status, share endpoint
- [x] Icons: live Iconify browser per library + sanitized custom SVG upload (`customIcons`)
- [x] Gradients: `Foundations · Gradients` — named linear/radial gradients with a rich HSV `ColorField` picker (opacity + hex + saved swatches), assignable to card covers + avatars, exported as tokens (`gradients` + `--gradient-*` + README)
- [ ] GitHub: OAuth App flow (popup + serverless token exchange) to replace the manual PAT
- [x] Semantic: `themePalettes` (per-theme ramps) retired for `themeSources` (per-theme
      family references) — store v39 migrates old palettes into real Primitives families
- [ ] Semantic: surface custom color families as token sources (needs per-family role generation in Step3)
- [ ] Plugin: import `icons.custom` SVGs as Figma components; import extra `colors.themes` as Variable modes
- [ ] Plugin: consume the new `gradients` map (e.g. Figma gradient paint styles / variables) — the configurator emits it but the plugin ignores it for now
- [ ] Gradients: surface the `ColorField` picker in `ColorSelect`'s custom row + more assignable targets (brand sections, page background)
- [ ] Plugin: publish to Figma Community → replace the zip download with a one-click "Open in Figma" deep link
- [ ] Preview: independent per-theme token preview (render atoms from any `themes[key]`) instead of driving the global theme
- [ ] Components: "Copy usage snippet" button per component
- [ ] Export: Generate per-component CSS with token references
- [ ] Plugin: TextStyle creation for typography tokens
- [ ] Plugin: Two-way sync — read Figma Variables → update configurator
- [ ] Plugin: Diff view before import (show what changed)
