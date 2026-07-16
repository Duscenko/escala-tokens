# Scalable Designs — Project Context for Claude Code

This file is the source of truth for Claude Code CLI. Read it before making any change.

---

## What this is

A web configurator that lets product designers build a minimal, custom design token system — no bloat, only what they choose. The output is a `tokens.json`, `variables.css`, and `README.md` that sync directly into Figma via a companion plugin.

**Live URL:** https://scalable-designs.vercel.app
**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Framer Motion + Radix UI

---

## Navigation model — 3-column workspace ("DS.by.MD")

The app is a **3-column workspace** (Claude Code–style), **not a wizard**. Designers
**configure tokens and see them live at the same time**: pick foundations in the center,
watch the right-hand preview update, then export.

```
┌── LEFT RAIL ────────┬── CENTER (active editor) ──┬── RIGHT (persistent) ──┐
│ (80px icon rail)    │  ✦ <section> | <subtitle>  │ Components Preview  ☀︎☾ │
│ Home · Color ·      │                            │  live token-driven     │
│ Semantic · Font ·   │  active foundation section │  atoms: buttons ·      │
│ Icons · Spacing ·   │  / component doc / export  │  input · badge ·       │
│ Opacity · Shadow ·  │                            │  toggle · sign-up card │
│ Grid · Sizes        │                            │                        │
│ ───── (sticky) ──── │  TopNav: Foundations ·     │                        │
│ Bring to Figma ·    │  Components · Docs ·       │                        │
│ Get MD              │  [Export] [GitHub] pills   │                        │
└─────────────────────┴────────────────────────────┴────────────────────────┘
```

- **Shell = `Configurator.tsx`** (3-column flex). All nav state is **local** there:
  `tab` (`foundations`|`components`), `activeFoundation`, `activeComponent`, `exportMode`
  (`null`|`code`|`md`|`figma`|`github`), `semanticCategory`. None persisted — every reload
  lands on **Home**. Leaving a foundation marks it complete (`commitVisit()` →
  `markFoundationComplete`) for the Home overview checklist.
- **Home is the live hub** (`HomeView`): topped — only once the system is saved to
  GitHub (`githubRepo` set) — by a "Name Design system" input with a Saved pill;
  then the primitives quick bar (Accent · link toggle · Neutral · Background
  `ColorSelect`s + the Scale-settings popover reused from Step2) over the two
  `ScaleRow` ramps, a "Browse components →" link, and the masonry collage of the
  system's own components rendered live from `usePreviewTokens(homeTheme)`
  (sign-up card + `SPECIMENS` registry tiles + collage-only clusters). The right
  panel here is **Quick edit** (`QuickEditPanel` — Theme · Accent swatches +
  custom picker · Font Family · Radius · Panel background · More Foundations),
  not the Components Preview; its sections (`QuickEditSections`) are shared with
  the Components catalogue's quick-edit popover (`QuickFoundationsPanel`).
  `homeTheme` is local `useState` in `Configurator`.
- **Save is the persistence hub** (`SaveView`, rail bottom → `exportMode 'save'`):
  everything the old Home dashboard had — identity (name/description), "Save design
  system" (local registry via `saveCurrentSystem`) + "Download files", the
  "My design systems" strip + saved-systems list, summary chips, connections
  (Figma/GitHub) and the share endpoint.
- **Multi design system**: `savedSystems` (persisted registry) — a system is *saved* only
  by a successful GitHub push (`GitHubConnectView` upserts `{ id: repo, name, description,
  repo, savedAt, snapshot }`). `loadSystem(id)` restores a deep-cloned `DesignSnapshot`;
  `startNewSystem()` resets to `makeDesignDefaults()`. GitHub (PAT identity) is "the
  account" — no separate auth backend. Removing an entry is local-only.
- **Left rail = `Sidebar.tsx`**: an 80px icon rail — scrollable foundations list (Home,
  Color, Semantic, Font, Icons, Spacing, Opacity, Shadow, Grid, Sizes) over a sticky
  bottom block with **Bring to Figma** (→ `FigmaConnectView`) and **Get MD** (→ the
  didactic README). **GitHub lives in `TopNav`** as a black pill next to Export
  (→ `GitHubConnectView`: PAT connect → pick/create repo → push tokens.json/variables.css/README.md).
- **Center**: a `CenterHeader` (section icon + colored title + subtitle) over the active
  body — `HomeView`, a foundation section (`Step2_ColorPalette`…`Step9_Sizes` or
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
- **Right = `PreviewPanel.tsx`**: "Components Preview" + a light/dark toggle (drives the global
  theme). Renders token-driven atoms (`preview/atoms/*` + `ButtonPreview`) from
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
│   ├── configurator/       ← Sidebar, HomeView, ComponentDocPane, IconLibrary, ExportView, FigmaConnectView, GitHubConnectView, TokenTable (generic filterable token table) + Step2…Step9 + StepGradients (foundation sections)
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
│   ├── tokenGenerator.ts      ← generateTokenJSON(), downloadTokenJSON()
│   ├── exporters.ts           ← buildCSS()/buildMarkdown() — shared by ExportView + GitHubConnectView
│   ├── github.ts              ← GitHub REST client (PAT in localStorage 'sd-github-token', NEVER in the store): validateToken, listRepos, createRepo, pushFiles (Contents API, sequential)
│   └── utils.ts               ← cn(), slugify(), sanitizeSvg() helpers
├── types/
│   └── tokens.ts           ← TypeScript types for DesignTokens, ColorScale, etc.
└── pages/
    └── Configurator.tsx    ← 3-column shell: Sidebar | center editor | PreviewPanel
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
| `projectName` | string (default `"DS.by.MD"`) | Home (hero input) + Export pane (editable pill) |
| `projectDescription` | string (flows into the README intro) | Home |
| `figmaLastPublishAt` / `githubRepo` / `githubLastPushAt` | string \| null — connection status shown on Home; written by the connect views | Home (read-only) |
| `pageBackground` | string (hex, default `#ffffff`) — Radix custom-palette "background" input: anchors tone 1 of every generated **light** ramp (`generateColorScale`'s 4th arg) and is the compositing base for the exported alpha ramps (`colors.primitiveAlpha` via `generateAlphaScale`) | Foundations · Color |
| `darkBackground` | string (hex, default `#0c0e12`) — the dark-theme page. Anchors **tone 12** of `grayDarkScale` (dark themes read the gray hierarchy inverted, so `surface-0` → tone 12). Its presets are **derived from the accent** (`darkBackgroundOptions()` in `colorControls`), and `useApplyAccentColor` re-derives the same preset *slot* when the accent changes (Ink stays Ink) — a hand-typed hex is left alone | Foundations · Color / Home (shown when the previewed theme is dark) |
| `grayDarkScale` | ColorScale — dark-appearance neutral ramp, generated by `generateDarkColorScale(grayBaseColor, …, darkBackground)`. Gray roles in a dark theme resolve from **this**, not `grayLightScale` (`sourceScaleFor` → `GlobalScales.grayDark`). Replaces the old fixed `GRAY_DARK_SCALE` constant, which is now only the default seed + fallback | derived (accent · neutral · dark background) |
| `primaryColor` | string (hex) | Foundations · Color |
| `primaryScale` | Record<number, string> | Foundations · Color |
| `grayLightScale` | ColorScale | Foundations · Color |
| `errorColor/Scale`, `warningColor/Scale`, `successColor/Scale`, `infoColor/Scale` | ColorScale | Foundations · Color |
| `customColors` | CustomColor[] (`{ key, label, base, scale }` — named families with auto 1–12 scales; keys in `RESERVED_COLOR_KEYS` are blocked) | Foundations · Color |
| `themes` | Record<theme, Record<role, hex>> — `light`/`dark` always exist (protected); user themes via `addTheme(key, base)` duplicate an existing one. Role keys use the **readable taxonomy**: `surface-*` (page/card levels), `action-*` (button/control fills), `status-*` (feedback fills), `text-*`, `icon-*`, `border-*`. Defined once in `ROLE_GROUPS` (`Step3_SemanticTokens.tsx`); `SEMANTIC_KEY_RENAME` (store) migrates old v23 keys | Foundations · Semantic |
| `themeOrder` | string[] (column order, default `['light','dark']`) | Foundations · Semantic |
| `themeKinds` | Record<theme, 'light'\|'dark'> — drives recommended tones + which gray ramp seeds a theme | Foundations · Semantic |
| `typography` | { fontFamily, headingFontFamily, sizes, lineHeights, weights } | Foundations · Typography |
| `spacing` | Record<string, string> | Foundations · Spacing |
| `padding` | Record<'top'\|'right'\|'bottom'\|'left', string> — per-side surface inset for padded surfaces (collage tiles, Card, sign-up card via `paddingOf()`); exported as `padding` in tokens.json + `--padding-*` CSS vars | Quick edit · Padding |
| `gradients` | GradientDef[] (`{ id, name, type: 'linear'\|'radial', angle, stops: {color,pos}[] }`) — named gradients; `gradientToCss()` builds the CSS. Exported as `gradients` (slug→css) in tokens.json + `--gradient-*` CSS vars + README table | Foundations · Gradients |
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

Store uses `persist` middleware with `version: 32`. If you add fields, bump the version and add a migrate function (append-only — never reorder existing migration blocks). New design fields also go into `DesignSnapshot`/`makeDesignDefaults()`; global preferences (like `autoSyncFigma`) stay top-level, out of the snapshot.

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

`tokenGenerator.ts` generates this (the README markdown in `ExportView.tsx` mirrors it, incl. an Icons section). If you add fields to the store, also add them to `generateTokenJSON()` and the markdown. `schemaVersion` (`TOKEN_SCHEMA_VERSION` in `tokenGenerator.ts`) versions the contract the plugin checks — bump it only on a breaking payload change. The plugin also reads optional `copy` / `borders` sections that the configurator does **not** emit yet (plugin-ready forward-compat).

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
3. **Workspace, not wizard** — the 3-column shell (rail · center · preview) has no linear step counter, progress bar, or Continue/Back nav between Foundations/Components/Export (see Navigation model).
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
# Reload in Figma: Plugins → Development → Scalable Designs Sync → ⟳

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
