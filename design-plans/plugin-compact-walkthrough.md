# Plugin: compact window, walkthrough and Variables editing

Status: **plan, nothing built.** Plugin repo: `../escala-figma-plugin` (0.17.2).
Reference: Tokens Studio for Figma 2.13 (screenshots shared 2026-10-22).

The goal is three changes that go together:

1. **Look and size** like a native Figma plugin: narrow window, Figma's dark grey, Escala's purple.
2. **A walkthrough** that explains what Escala does the first time someone opens the plugin.
3. **Editing tokens like Variables on the web**: open a token, re-point it to another step of a ramp.
   Today this is the biggest gap between the plugin and the web.

---

## 1. Measured starting point

| | Today | Tokens Studio | Source |
|---|---|---|---|
| Window | **960 × 660**, fixed | ~400 × 640, resize grip in the corner, expand button | `code.ts:13473` `figma.showUI(… width: 960, height: 660 …)` |
| Shell | 212px side nav + canvas + studio panel (3 columns) | 1 column: tabs → toolbar → list → footer | `ui.html:1463` `.sys { grid-template-columns: 212px … auto }` |
| Dark background | 4 levels `#0b0b0e · #131317 · #18181c · #1f1f24` | one surface `#2C2C2C` | `ui.html` `--nav/--app/--surface/--elevated` |
| Borders | `#ffffff0d` / `#ffffff1a` (alpha) | `#444444` solid | `--line`, `--line-strong` |
| Primary button | `#7f56d9` + white | blue `#0d99ff` | `--accent-solid` |
| First run | a 4-step IMPORT wizard (Source · What · Review · Import), flag `guideDone` | 5-card tour + "Welcome" screen | `ui.html:3035` |
| Edit a token | **no.** Only theme-level choices: accent, font, radius preset, spacing mode, shadow, icons (`StudioChoices`) | click a token → edit its value / reference | `src/lib/pluginStudio.ts` `StudioChoices` |

Tokens Studio is not better at token logic. It is better at three things we lack: **the window
feels like Figma**, **the first minute is explained**, and **the token is the thing you click**.

### Colour checks on `#2C2C2C` (WCAG 2.x)

| Pair | Ratio | Verdict |
|---|---|---|
| `--fg` `#e3e4e7` | 10.98 | ok |
| `--fg-muted` `#c9ccd1` | 8.67 | ok |
| `--fg-faint` `#9b9ba5` | 5.07 | ok on `#2C2C2C`; **4.26 on `#383838`** → don't use faint text on raised chips |
| `--accent-ui` `#9e77ed` (purple text/links) | **4.20** | **fails AA** → move to `#a98cf0` (5.12) |
| White on `#7f56d9` (button) | 4.96 | ok |
| White on `#6941c6` (button hover) | 6.62 | ok |
| `#444444` border | 1.43 | decorative hairline, same rule as the web's `border.control` decision; controls get a fill, not only a stroke |

---

## 2. Decisions

### 2.1 Colour: use Figma's own theme variables

`#2C2C2C` and `#444444` are exactly Figma's dark UI: `--figma-color-bg` and
`--figma-color-border` (the plugin already runs with `themeColors: true`). So the plugin should
**read those variables** instead of hard-coding the hexes:

- Dark Figma → `#2C2C2C` / `#444444`, as asked.
- Light Figma → Figma's own light values (`#FFFFFF` / `#E6E6E6`), so the plugin never looks
  wrong next to a light Figma. *(Open question 1.)*

The token set gets smaller, not bigger:

| Token | Dark | Job |
|---|---|---|
| `--app` | `var(--figma-color-bg)` = `#2C2C2C` | the one surface |
| `--elevated` | `#383838` | token chips, inputs, hover rows (TS's pill colour) |
| `--line` | `var(--figma-color-border)` = `#444444` | every separator and card edge |
| `--fg / --fg-muted / --fg-faint` | unchanged | measured above |
| `--accent-solid` | `#7f56d9` | primary buttons, selected tab, checkboxes |
| `--accent-hover` | `#6941c6` | button hover (darker, white stays readable) |
| `--accent-ui` | **`#a98cf0`** | purple text, links, focus ring, selected ring |

`--nav`, `--surface`, `--overlay`, `--overlay-card` collapse onto `--app` / `--elevated`. The
"elevation by luminosity" ladder goes away: separation comes from `#444444` lines, like Tokens
Studio and like Figma itself.

### 2.2 Size: 400 × 640, resizable, with an Expand mode

- **Default 400 × 640.** Min 360 × 480, max 960 × 900.
- **Resize grip** bottom-right (the TS corner): UI drags → `postMessage({type:'resize', w, h})` →
  `figma.ui.resize`. Size saved in `figma.clientStorage` (per person, not per file).
- **Expand button** top-right (TS's ⤡): toggles 400 ↔ 840 wide. Wide mode shows the live preview
  beside the editor (today's studio preview). Narrow mode puts the preview behind a "Preview" button.

**One column layout**, top to bottom (each band is one row):

```
┌ Escala · <system name>                       ⤡  ✕ ┐  header
│ Variables   System   Export   Settings            │  tabs
│ [≡] 🔍 Search          Theme: Light ▾      [≣|{}] │  toolbar
│                                                    │
│  list / editor (scrolls)                           │
│                                                    │
│ [Sync ↻]            [ Build in Figma ▸ ]           │  action footer
│ v0.18.0 · Synced 2 min ago        ?  💬            │  status footer
└────────────────────────────────────────────────────┘
```

- The 4-icon rail (Overview · Import · Export · Activity log) becomes the **tab strip**.
  Activity log already moved to Settings (0.17.2). Import becomes an action inside System.
- The 212px side nav becomes a **drawer** (the `[≡]` button, TS's sets list): the collections
  (Color primitives · Color semantics · Dimensions · Typography · Effects) with a check for what
  the next build includes.
- `?` in the footer reopens the walkthrough. That is its only door after the first run.

**Every existing screen has to work at 360–400px.** Audit list (each has a fixed multi-column grid today):
`.sys-cards` (3 columns), `.start-styles` (3), `.start-grid`, `.scope-grid` (2), `.token-meta` (2),
`.ov-grid`, the System matrix (one column per brand), the studio accordion + preview, the brand-add
dialog, the Export hub. Rule: below 520px every grid is one column; the System matrix shows one brand
at a time with a brand switcher.

### 2.3 Walkthrough: 5 cards, then a Welcome screen

Same pattern as Tokens Studio (modal card: picture · title · two lines · Read more · Previous / Next),
but Escala's story. **Five cards maximum, skippable (✕, Esc), shown once per person**
(`tourSeen` in `figma.clientStorage`).

| # | Title | Says | Picture |
|---|---|---|---|
| 1 | Welcome to Escala | A small token system, built from a few choices, kept in sync with this file. | the board |
| 2 | Start from a few choices | Colour, font, radius, spacing, shadow, icons. Or a ready style. | the six-row accordion |
| 3 | Every token is a reference | `status.critical.surface` → `error-a · 3`. Pick another step and every component follows. | Token Details with the ramp |
| 4 | Themes and viewports | Light and Dark are modes. Desktop, Tablet, Mobile change sizes, not colours. | the mode columns |
| 5 | Build and ship | Variables and components in this file. Same tokens as CSS and as context for agents. | a built page |

- **Pictures are real captures**, produced by the same script as the About page
  (`npm run about:shots`, a new `plugin-tour/` set at 2× of 360px wide, webp ≤ 60 KB),
  served from `https://www.escalatokens.com/plugin-tour/*.webp` (already an allowed domain).
  Offline → the card shows without a picture, never broken.
- **"Read more"** opens the matching Docs page on the web.
- **After the tour, a file with no system shows the Welcome screen** (TS screen 4): logo, one
  sentence, three guide links (Getting started · Docs · Changelog), **Create a theme** (primary) and
  **Load example** (secondary = adopt the Core style, the start screen's existing path).
- A file that already has a system skips both and opens on Variables.
- The existing 4-step import wizard stays as the Import action. It is not the tour.

### 2.4 Variables tab: the token is what you click

Two levels, like the web.

**Level 1: the list** (TS's token view, with Escala's model)

- Grouped by collection, each group collapsible: `▾ Color primitives`, `▾ Color semantics`, …
- **Primitives:** one row per family, 12 swatches (1–12), alpha families over a checker. Hover = name + hex.
- **Semantics:** one row per role: swatch · `critical.surface` · ref chip `error-a · 3`. One mode at a
  time, picked in the toolbar (`Theme: Light ▾` lists the file's modes: Light, Dark, other brands).
- **Dimensions / radius / spacing / type:** pills (`xs sm md lg xl`), like TS. Hover = value.
- Search filters every group. `{}` toggle shows the JSON of the selection (read-only).

**Level 2: Token Details** (the web's panel, inside the plugin)

Opens over the list (full width at 400px, as a side panel in Expand mode). Same content as the web:
name · copyable CSS variable · description · **Values** with one collapsible section per mode,
**only the open mode expanded** · family + ramp grid (7 solid families, then 8 alpha) · the
"Only error-a" lock · Reset to schema. For a dimension role: the list of Dimension primitives.

**How an edit lands.** Two writes, in this order:

1. **Instant, in this file:** the Figma variable for that mode is re-aliased to the primitive
   variable (`setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id })`). The canvas repaints at once.
2. **Kept in the system:** the edit is stored as a role override and travels with the system,
   so the next build or sync does not undo it.
   - New field `StudioChoices.roleOverrides: { [role]: { [themeKey]: '{family.tone}' } }`.
   - `buildStudioTokens` applies them after minting, through the **same** store action the web's
     table uses (`architectureOverrides`, keyed by theme key). No second override format.
   - Role descriptions and the list of roles already ship in tokens.json
     (`buildVariableDescriptions`, `colors.architecture.tokens`), so the plugin needs no extra endpoint.

**Systems synced from the web.** The web is their source. *(Open question 2.)* Recommended for the
first version: Token Details opens **read-only** there, with **"Edit on the web"** going to that exact
token (`/?section=variables&token=status.critical.surface`). Two-way editing is a later phase.

---

## 3. Phases

Each phase ships on its own (version bump, `npm run build`, `npm run bundle:plugin` in this repo).

| Phase | What | Size | Done when |
|---|---|---|---|
| **0 · Colour** | Figma theme variables, `#444444` lines, purple fixes (`--accent-ui #a98cf0`, hover `#6941c6`), collapse the luminosity ladder | S | Every screen measured: no text under 4.5:1 on `#2C2C2C` |
| **1 · Compact shell** | 400 × 640, resize grip, Expand, tab strip, drawer, footer. Audit list of §2.2 made one-column | L | Every screen usable at 360px; nothing scrolls sideways |
| **2 · Walkthrough** | 5 cards, Welcome screen, `?` door, `plugin-tour` captures | M | First open shows the tour once; empty file shows Welcome |
| **3 · Variables list** | Read-only browser: groups, swatches, pills, search, mode switch | M | Every variable in the file is findable in 2 clicks |
| **4 · Token Details** | Edit: re-alias in the file + `roleOverrides` on the server | L | An edit survives a rebuild; parity test web ↔ plugin on one override |
| **5 · Synced systems** | Deep link to the web; then two-way | M→L | Decided after phase 4 is used |

Phase 0 and 2 are independent. Phase 3 needs 1 (it is designed for 400px). Phase 4 needs 3.

---

## 4. Rules to keep (from CLAUDE.md)

- **When a web rail row changes, change its plugin row too.** Token Details in the plugin must stay
  the web's Token Details: same sections, same family order, same "only one mode open".
- **One override format.** `roleOverrides` writes `architectureOverrides`; never a plugin-only shape.
- **A recipe holds token references only.** Editing a role never touches component recipes; the
  components follow because they bind the role.
- **Measure, don't eyeball.** Phase 0 ships with the contrast table above re-run on the final values.

## 5. Decisions (owner, 2026-10-22)

1. **Light Figma: follow Figma.** The plugin reads `--figma-color-bg` / `--figma-color-border`;
   dark lands on `#2C2C2C` / `#444444`, light on Figma's own light values.
2. **Synced systems: read-only + a link to the web**, the same way the platform's agent context
   works today (copy / open on the web, never edited in two places).
3. **Tour pictures: real captures** from the server.

Phase 0 done the same day (plugin 0.17.3).

## 6. Phase 1 — done (plugin 0.18.0)

- `code.ts`: opens at **400 × 640**; the size is a per-person preference
  (`clientStorage` `escala-ui-size`), clamped to 360×480 … 1200×1000; `resize` message.
- UI: **Expand** button in the top bar (400 ↔ 880 × ≥700) and a **corner grip**
  (screen coordinates, one write to storage when the drag ends).
- Below **600px** the shell is one column: top bar → foundations strip (the old
  left rail, labels kept) → content → status. The studio's live preview exists
  only in the wide view. Fixed multi-column grids fall to one column; the
  three paste steps stack.
- Measured at 400px: Start, the theme editor, System Matrix, Settings and Export
  all render with no page-level horizontal scroll. The wide view is unchanged.
- Left for later: the System Matrix still scrolls sideways inside its own box
  (the Add-brand column); one brand at a time is part of phase 3's list work.

## 7. Phase 2 — done (plugin 0.19.0)

- **Tour**: 5 cards (Welcome · Start from a few choices · Every token is a reference ·
  Themes and viewports · Build it, then ship it), counter, dots, Previous / Next →
  Get started, Read more → `/about`, `/docs`, `/docs/color`, `/docs/spacing`, `/docs/figma`.
  Esc, ←/→, focus kept inside the card.
- **Shown once per person** (`tourSeen` in the user-scoped settings). Someone who
  already used the plugin (a stored settings blob) is not interrupted — they are
  marked as seen. The **"?"** in the top bar reopens it at any time.
- **Pictures**: `npm run plugin:tour-shots` (also runs after `about:shots`) crops
  the About captures to 16:10 → `public/plugin-tour/*.webp` (9–17 KB). The plugin
  loads them from `https://www.escalatokens.com/plugin-tour/`, so **they appear
  only once the site is deployed**; until then (or offline) a card shows without
  its picture.
- **Welcome screen**: not a new screen. The existing "Set up your design system"
  start already answers "what now" (paste context · Start from blank · Import JSON),
  and the tour sits in front of it on the first open.

## 8. Phase 3 — done (plugin 0.20.0)

- **Variables** is a tab of the shell, second after System (`sysPage = 'variables'`,
  `renderVariables`). Read off the payload stored in the file, so it can't disagree
  with what landed in Figma.
- Sections (collapsible, with counts): **Color primitives** (one ramp per family,
  alpha twins over a checker, the ramp of the selected mode's appearance) ·
  **Color · content / action / surface / status / border** (swatch · role ·
  primitive chip) · **Radius · Spacing · Size · Selector · Border width** (role →
  step · px, Desktop) · **Typography** (families + size / leading) · **Shadow**.
- **The primitive chip** (`error-a · 3`) is found by hex: a role ships as a hex per
  theme column and every one of them is a primitive's hex (asserted on the web by
  `semanticPrimitiveLink.test.ts`). On the Core sample all 134 roles resolve; none
  falls back to a bare hex. Family names drop the theme prefix (`core-gray` →
  `neutral`) to read like the web's Variables.
- **Search** filters every section; **theme select** lists the file's modes
  (`themeOrder`, `themeLabels`). Footer: read-only + "Open Variables on the web".
- Compact strip: Beta info is icon-only below 600px so eight tabs fit 400px.
- Next (phase 4): a row opens Token Details — read-only with a link to that token
  on the web for synced systems (decision 2), editable for plugin-made ones.
