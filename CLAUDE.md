# Escala — Project Context for Claude Code

This file is the source of truth for Claude Code CLI. Read it before making any change.

---

## What this is

A web configurator that lets product designers build a minimal, custom design token system — no bloat, only what they choose. The output is a `tokens.json`, `variables.css`, and `README.md` that sync directly into Figma via a companion plugin.

**Live URL:** https://scalable-designs.vercel.app
**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Framer Motion + Radix UI

---

## Navigation model — top-nav workspace ("Escala")

The app is a **top-nav workspace**, **not a wizard**. Designers **configure tokens and see
them live at the same time**: tweak the controls on the left, watch the canvas repaint,
then export. **There is no left icon rail** — section switching lives in the top bar.

```
┌ row 1 — TopNav (global, every view) ───────────────────────────────────────┐
│ ◆ Escala          │  Generator · Variables · Documentation · Components    │
│   Token controls  │              [Figma] [◆ Connect] [☾/☀]                 │
│      Full editor  │                                                        │
├── LEFT COLUMN ────┼── CANVAS ──────────────────────────────────────────────┤
│ Preset│Quick edit │ Preview │ Quick edit   New · Import JSON · Share · Kits │  ← row 2
│ Presets           │ BUTTON & ACTIONS                                       │
│ Color Family      │  every included component, rendered across its         │
│ Typography        │  variants from the live tokens                         │
│ Shadow · Radius   │                                                        │
└───────────────────┴────────────────────────────────────────────────────────┘
```

The brand block's right border is the same divider as the left column's, so it runs
unbroken from the very top. **Every row-2 header is `h-[52px]`** — `CenterHeader`,
`WorkbenchLayout`'s `ColumnHeader`, `PreviewPanel`, `SaveSidePanel`, `QuickEditPanel` —
so they line up across every column of every section. Any new panel header uses that
height too. Their actions use the shared `ui/HeaderPill` (Generator's New · Import JSON ·
Share · Kits · Reset AND Variables' Export are the same component — don't hand-roll
another pill).

> **Export is a guided flow, not a dump — and there is only ONE of it.** Variables' Export
> pill AND the Generator's Share pill both open `ExportWizard` (Source → Format → Export),
> backed by `lib/exportWizard.ts`; sharing IS exporting, so they must not diverge into two
> flows. They differ only in what's pre-checked: Export scopes to the section you opened it
> from (`COLLECTIONS_OF`), Share opens whole-system (`ALL_WIZARD_COLLECTIONS`). Step 1 picks **collections**
> (primitives · semantics · typography · spacing · radius · opacity · shadow · grid ·
> sizes · icons) and, for semantics, which **theme modes** ship; step 2 picks the format
> (W3C DTCG · Escala JSON · CSS · SCSS · Tailwind · Markdown) and single-vs-per-collection
> files; step 3 summarizes and downloads. Rules that keep it honest:
> - Everything derives from ONE `generateTokenJSON()` call, so wizard output can never
>   disagree with `tokens.json`. Counts on screen are counts in the file.
> - **W3C ships real aliases**: a semantic value sitting on a primitive tone exports as
>   `{color.neutral.900}`, not a loose hex. That's the point of the format — don't
>   "simplify" it back to hex.
> - **Escala JSON is single-file by contract** (it's the plugin payload), so the structure
>   choice is locked there.
> - Tailwind and Markdown delegate to `sectionExport`'s builders — one renderer per format,
>   not two. Both `SectionExportModal` and `ShareModal` were retired into this flow
>   (`FilePreviewCard` lives on in `SaveView`).

- **Shell = `Configurator.tsx`**. `TopNav` is mounted **once**, above the columns, in
  every view. All nav state is **local** there: `tab` (`foundations`|`components`|`docs`),
  `activeFoundation`, `activeComponent`, `exportMode` (`null`|`code`|`md`|`figma`|
  `github`|`save`), `semanticCategory`. None persisted — every reload lands on
  **Generator**. Leaving a foundation marks it complete (`commitVisit()` →
  `markFoundationComplete`).
- **The four top-nav sections** (`TopNavKey` in `TopNav.tsx`, mapped by `navActive`/
  `handleNav`): **Generator** = the workbench (`activeFoundation === 'home'` →
  `WorkbenchLayout`) · **Variables** = the deep token editors (`tab 'foundations'`,
  entering at Color) · **Documentation** (`DocsView`) · **Components** (the catalogue).
  Export/connect views (Figma · GitHub · Export · Save) unlight every item.
- **Generator = `WorkbenchLayout`** — the live workbench and the app's landing view.
  Left column (356px): `QuickEditSections accordion` — Presets swatch row, then Color
  Family · Typography · Shadow · Radius … It is **controls, not nav**, but it speaks
  `SectionRail`'s grammar so it reads as a wide rail: same 10px uppercase captions
  (PRESETS · QUICK EDIT), same `h-9 · rounded-xl · 13px · icon + label` rows and hover,
  and the same transparent-over-gradient backdrop (only the canvas is `bg-app`). Keep the
  two in sync — restyling one means restyling the other. **A group's two states do
  different jobs**: collapsed = a bare rail row; open = a `bg-surface` card that WRAPS its
  settings (header, hairline, then the controls). The card is load-bearing, not decoration
  — without it Color Family's controls and Typography's below run together and neither
  group owns its settings. The canvas is the design system's living
  documentation: every selected component rendered across its first axis, grouped by
  catalogue category, painted from `usePreviewTokens(previewTheme)`. Its row-2 header
  carries `HomeActions` (New · Import JSON · Share · Kits · Reset).
- **`HomeView` is retired** — the old hero/collage hub is unreachable (the file is kept
  for reference only). Don't wire it back up; the Generator replaced it.
- **Color is a three-tab hub** (`ColorHub`, default tab `primary`). The tab pill bar's
  position is per-tab: on **Primary Color** it renders BELOW the quick bar, directly above
  the families table (passed into `ColorPrimitives` as `tabsSlot`); Alias/Gradients keep it
  pinned on top. **Primary Color** (`ColorPrimitives` — the accent · link · Base · State
  Colors quick bar + Scale-settings popover over the two `ScaleRow` ramps, then a
  Figma-style families table. The family nav is **foldered by ROLE, not insertion order**:
  `Accents` / `Neutrals` / `States` / `Custom`, derived via `familySlotFor()`
  (`lib/themeSources.ts`) from which theme slot references each family — a family minted
  by "Add theme" files itself under the right folder with zero bookkeeping; `Custom` holds
  free-standing families no theme references. Families table: Accent/Neutral/Error/
  Success/Warning/Info + custom families in that side nav, 12 tone rows each with editable
  **light/dark** hex
  cells (row names are the EXACT exported token names — `accent-1`…, matching
  tokenGenerator's flattenScale prefixes and the semantic sources' "accent"
  label), eye toggles on the column headers driving `previewTheme`, a per-row
  inline `ColorPickerPanel`, and "+ Add" creating a `customColors` family — EVERY
  family carries both a light ramp and a dark twin (Radix two-scale model), and
  each column edits its own; **no inversion anywhere**, step N means the same
  role in both · **Alias / Semantics** (`Step3_SemanticTokens`, topped by the
  **architecture picker** — `ArchitecturePicker`: radio cards for Flat /
  Categorical / Vibrancy / Tonal with a live WCAG contrast strip. Flat keeps
  the full editable 89-role matrix; a non-flat choice re-derives the WHOLE
  view from its projection via `buildArchitectureView` — sidebar groups,
  counts and a light/dark table mirror the exported schema exactly. The table is
  **editable in every architecture**, not just Flat, and through the SAME
  affordance: the row's sliders icon expands it (description + CSS var + a ramp
  per mode with the current tone ringed), exactly like the flat matrix — one
  interaction to learn, not two. A family row above each ramp re-points the slot
  to another family. Edits are stored as REFs in
  `architectureOverrides[arch]['category.token'][mode]` so an edited token still
  resolves through the ramps. "Reset to schema" clears it; the export applies the
  same overrides, so tokens.json can't disagree with the table. Cells whose value
  isn't a ref (vibrancy alphas, blur) stay read-only — there's no primitive to
  swap. Switching architectures resets category/search state) ·
  **Gradients** (`StepGradients`). `colorTab` is local `useState` in `Configurator`.
- **Save is the "Save & Share" hub** (`SaveView` → `exportMode 'save'`; no nav entry
  since the rail was removed — Share + Kits in the Generator header cover the same
  ground, so re-add an entry point before relying on it):
  the center IS the export surface — a tabbed file-preview card (tokens.json with a
  "Figma plugin" badge · variables.css · README.md, accent-colored active tab, plus an
  "Export all files" action tab) with Copy / Download per file and the live-endpoint
  footer, over the "My design systems" saved-systems grid (+ create/import tile). The
  right aside is `SaveSidePanel` ("Current Design System"): identity (name/description),
  Bring to Figma / Connect-with-GitHub pills with status dots, summary chips and "Save
  design system" (local registry via `saveCurrentSystem`).
- **Multi design system**: `savedSystems` (persisted registry) — a system is *saved* only
  by a successful GitHub push (`GitHubConnectView` upserts `{ id: repo, name, description,
  repo, savedAt, snapshot }`). `loadSystem(id)` restores a deep-cloned `DesignSnapshot`;
  `startNewSystem()` resets to `makeDesignDefaults()`. GitHub (PAT identity) is "the
  account" — no separate auth backend. Removing an entry is local-only.
- **Section sub-rail = `SectionRail.tsx`** — ONE component for all three sections, so the
  second column is identical everywhere: 200px, transparent over the brand gradient,
  uppercase group caption + `icon · label` rows (active = raised white row in the UI
  accent). Variables feeds it the foundations split into Figma-style **Variables** /
  **Styles** groups; Components and Documentation feed it the catalogue **Categories**
  (icons from `CATEGORY_ICONS` in `Configurator`). Don't fork it per section — pass a
  different `groups` array. It carries **no** global nav and no action block — those live
  in `TopNav`: **Bring to Figma** (icon button → `FigmaConnectView`) and **Connect**
  (black GitHub pill → `GitHubConnectView`: PAT connect → pick/create repo → push
  tokens.json/variables.css/README.md). Below the rail, Components and Documentation each
  add the same 208px master list (search + grouped component list) — keep those two in
  sync too.
- **Center**: a `CenterHeader` (section icon + colored title + subtitle) over the active
  body — a foundation section (`Step2_ColorPalette`…`Step9_Sizes` or
  `IconLibrary` with its live Iconify browser + custom-SVG upload, wrapped in `p-8`),
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
  no segmented sun|moon pill any more.
- **Right = `PreviewPanel.tsx`**: **collapsed by default** (`previewCollapsed` starts
  `true`) — Variables is a token-editing view, so the tables get the width and the
  preview is opt-in via the slim expand strip. "Components Preview" + a light/dark toggle
  (drives the global theme). Renders token-driven atoms (`preview/atoms/*` + `ButtonPreview`) from
  `usePreviewTokens()`, so editing any foundation updates them **live**. **Context-aware in
  Semantic**: it takes a `focus` prop (the active token category) and swaps to a matching live
  specimen — `text`→`TextSpecimenPreview`, `surface`/`action`/`status`→`BackgroundSpecimenPreview`,
  `border`→`BorderSpecimenPreview`, `icon`→`ForegroundSpecimenPreview` (header reads "Text
  preview"… ); `all` and every other foundation show the generic overview. The category comes
  from `Step3_SemanticTokens` (a **controlled** `activeCategory`/`onCategoryChange`, owned as
  `semanticCategory` state in `Configurator`). **Hidden in the Components tab** (docs go
  full-width) and below `xl`; the rail becomes a drawer below `md`.
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
│   ├── configurator/       ← TopNav (global nav), WorkbenchLayout (Generator), SectionRail (the one left rail), HomeActions, ColorHub + ColorPrimitives (Color's three tabs), ComponentDocPane, IconLibrary, ExportView, FigmaConnectView, GitHubConnectView, VariablesTable (generic filterable token table) + Step2…Step9 + StepGradients (foundation sections)
│   ├── ui/                 ← Shared primitives (Button, Input, Badge, ColorField — the rich HSV+opacity+hex+saved picker…)
│   └── preview/            ← PreviewPanel, ButtonPreview + atoms/ (InputPreview, BadgePreview, TogglePreview, SignUpCardPreview + Text/Background/Border/Foreground SpecimenPreview — the Semantic per-category specimens)
├── store/
│   └── useDesignStore.ts   ← Single Zustand store with persist middleware (version 28)
├── lib/
│   ├── colorUtils.ts          ← generateColorScale, checkContrast, isAccessible, accessibleSolidTone (chroma-js)
│   ├── componentCatalogue.ts  ← ComponentDef type, COMPONENTS array, CATEGORIES, COMPONENT_KEYS (pure data)
│   ├── iconLibraries.ts       ← ICON_LIBRARIES (incl. iconifyPrefix for the live Iconify browser), getIconLibrary(), SAMPLE_GLYPHS (pure data)
│   ├── previewTokens.ts       ← resolvePreviewTokens()/usePreviewTokens() — single source for live-preview tokens
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
    └── Configurator.tsx    ← shell: TopNav over (WorkbenchLayout | sub-rail + center editor + PreviewPanel)
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
| `grayDarkScale` | ColorScale — dark-appearance neutral ramp, generated by `generateDarkColorScale(grayBaseColor, …, darkBackground)`. Gray roles in a dark theme resolve from **this**, not `grayLightScale` (`sourceScaleFor` → `GlobalScales.grayDark`). Replaces the old fixed `GRAY_DARK_SCALE` constant, which is now only the default seed + fallback | derived (accent · neutral · dark background) |
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
| `gradients` | GradientDef[] (`{ id, name, type: 'linear'\|'radial', angle, stops: {color,pos}[], linked? }`) — named gradients; `gradientToCss()` builds the CSS. `linked` is an explicit accent lock (Brand Cover/Aurora default true): while on, `useApplyAccentColor` re-derives the stops via `derivedStopsFor(id, accent)` and the editor disables stop editing; the lock chip in StepGradients unlocks (free editing) / re-locks (re-derives from the current accent). Exported as `gradients` (slug→css) in tokens.json + `--gradient-*` CSS vars + README table | Foundations · Gradients |
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

Store uses `persist` middleware with `version: 40`. If you add fields, bump the version and add a migrate function (append-only — never reorder existing migration blocks). New design fields also go into `DesignSnapshot`/`makeDesignDefaults()`; global preferences (like `autoSyncFigma`) stay top-level, out of the snapshot.

> **Tall popovers → `usePopoverPlacement`** (`colorControls`). A popover carrying
> `ColorPickerPanel` (HSV + hue + alpha + Palette + Saved) is ~540px — taller than the room
> under a trigger sitting low on the page. The hook measures on open, flips above the
> trigger when there's more room there, and returns `{ up, max }` to cap `maxHeight` to the
> space that actually exists. Pair it with pinned header · scrolling body · pinned footer
> so the primary action can never scroll out of reach. Used by the "+ Add" family popover
> and the per-family edit popover; use it for any new one rather than a fixed max-height.

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

> **Base drives the page (HeroUI model).** There is no background picker. `grayBaseColor`
> — labelled **Base** in the UI, still exported as the `neutral-*` family — is the single
> input the page is computed from: `useApplyGrayColor` writes `pageBackground` +
> `darkBackground` via `backgroundFromBase()` and then **re-anchors every ramp** (brand,
> status, customs) to the new light page, because tone 1 grows out of it. While the
> accent↔base link is on, an accent change moves the base and therefore the page too;
> unlinked, the accent leaves the page alone. Don't reintroduce an independent background
> input — that's what let the page and the ramps grown against it drift apart.

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

> **Light vs dark ramps.** A ramp always runs 1 (lightest) → 12 (darkest); what differs is **which end grows out of the page**. `generateColorScale(…, appearance: 'light')` anchors tone 1 to `pageBackground`; `generateDarkColorScale()` anchors tone **12** to `darkBackground` *and* re-derives the ramp's base (tone 9) as a dark neutral, so tones 9–12 are the dark surfaces instead of mid-grays. Gray is the **only** ramp with a dark twin — colored ramps (brand/status) keep their hue and just shift tone via `recDarkTone`. Anything that builds a `GlobalScales` **must pass `grayDark`**: it's optional in the type, and omitting it silently falls back to the legacy constant — which would make Step3's resync treat every dark gray as stale and overwrite the generated ramp.

> **Live preview tip:** changing the brand in Foundations · Color re-derives the already-mapped brand semantic tokens (via `BRAND_TOKEN_TONES` + `accessibleSolidTone`) so the right-hand preview and the export track the new brand. Unmapped tokens fall back to `primaryColor` in `resolvePreviewTokens`.

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
