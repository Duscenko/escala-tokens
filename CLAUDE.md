# Escala — CLAUDE.md (current state)

Short on purpose: this file loads into every session. It states what is true **now**.

- History (the old 6,000-line file, 86 dated UPDATE notes): `docs/history/CLAUDE-archive-2026-11-16.md`.
  Search it by keyword for the reasoning behind a rule; never load it whole. Where it and this file
  disagree, this file wins.
- **Keep it short.** Change a line in place when a rule changes; do not append dated notes. The
  story of a change goes in `governance/ledger/DEC-*.md` or a `design-plans/*.md`, and this file
  gets one line pointing to it. Above ~300 lines, move detail out.

## What this is

Three products in one repo family:

| Product | Where | What |
|---|---|---|
| **Escala Tokens** (web configurator) | this repo · https://www.escalatokens.com | Designers set a token system and ship `tokens.json`, CSS, W3C, an agent package, or a Figma sync |
| **Escala Figma plugin** | sibling repo `../escala-figma-plugin` (`src/code.ts` + `src/ui.html`) | Imports variables and styles, builds Getting started · Token Architecture · Documentation and the core kit (`FIGMA_SAMPLE_KEYS`) |
| **Escala Design System** | Figma library `7j5zukN5HpihGVJMmyjA20` (our source; every PUBLIC link — About, /figma-kit, each component's Figma button, Storybook — goes to the Preview library `X736U9ffkni3gg6rmvEEnJ`, one constant in `lib/figmaKit.ts`; component pages via `lib/figmaPreviewPages.ts`) + `src/components/escala-ui` + Storybook `apps/storybook` (online: https://escala-storybook.vercel.app) | The component library itself |

Stack: React + Vite + TypeScript (strict) + Tailwind v4 + Zustand + Framer Motion + Radix. GitHub
`Duscenko/escala-tokens`. The configurator is **desktop/laptop only**; the one phone surface is
About + the phone generator (`MobileThemeSheet.tsx`, picks only, no free inputs).

## Sources of truth — one owner per domain (DEC-2026-11-16-007)

| Domain | Owner | The other side |
|---|---|---|
| Foundations: variable names, values, modes, aliases, text and effect styles, the `Motion` collection (DEC-2026-11-18-001) | **Figma library** | Code follows (`src/lib/figmaFilePalette.generated.ts` etc.) |
| Anatomy: component names, layers, variant axes and values, properties, slots, the role each state binds | **Figma library** | Code is the twin; a mismatch is fixed in code |
| Behaviour: keyboard, focus, ARIA, logic, code API, how motion plays | **Storybook / code** | Figma prototypes copy it |
| Compilation: how a token becomes CSS, recipes | **Code** | Figma never describes it |

- Never edit the Figma file to make it consistent with code. If it looks wrong, say so in one line
  and build from it as it is.
- Lead-session routing (helpers in `.claude/agents/`, `governance/focus.md`, `pending.json`, `gates.json`, intents in
  `spec/intent/`): the *Escala orchestration* section of `AGENTS.md`. Read it before any work.
- Process, stages, agents, findings and tickets: the `escala-governance` skill. Data lives in
  `governance/` (`registry.json`, `findings/latest.json`, `ledger/`, `exceptions.yaml`, `runs/`).
- A scheduled **daily review** (weekdays 18:37 Paris, read-only) reports every Figma ↔ Storybook
  difference to the owner with links to both (governance §4.5). Per-state bindings (§4.5.2):
  `npm run figma:bindings:prepare` → run each batch with `use_figma` → `npm run figma:bindings:report -- <results>`.

## Repo map (real paths)

| What | Where |
|---|---|
| App shell | `src/pages/Configurator.tsx` (rail · canvas card · right inspector) |
| Store (persisted, **version 155**) | `src/store/useDesignStore.ts` |
| Colour maths (DOM-free) | `src/lib/color/` (`apca.ts`, `gamut.ts`, `cvd.ts`, `audit.ts`), `src/lib/colorUtils.ts` |
| Semantic roles (Categorical, the only architecture) | `src/lib/semanticArchitectures.ts` (`CATEGORICAL_ROLES`), `src/lib/roleNames.ts` |
| Dimensions, radius, spacing, sizes, grid | `src/lib/dimensions.ts`, `src/lib/layoutTokens.ts` |
| Typography, motion, icons | `src/lib/typographyStandard.ts`, `src/lib/motion.ts`, `src/lib/iconSizing.ts`, `src/lib/componentIcons.json` |
| Figma file palette (Storybook only) | `src/lib/figmaFilePalette.ts` + `.generated.ts` |
| Components | `src/components/escala-ui/*.tsx` (Figma twins; Radix for behaviour) |
| Styling of every component | recipes: `src/lib/componentRecipes.ts` + `src/lib/recipes/*.ts` (`motion.ts` for motion) |
| Component contracts | **machine:** `spec/contracts/<Key>.json` schema v2 + `index.json` (components AND blocks) + `schema.json` + `README.md` (GENERATED, `npm run gen:contracts`: Figma set, API, bindings per state, CSS/Figma names, motion, behaviour, import, story); **human:** `design-plans/<component>-contract.md`; block source `src/components/escala-ui/blocks/*.contract.json`. Mission: `design-plans/agent-ready-contracts.md` |
| Catalogue (mirrors the plugin's CATALOG) | `src/lib/componentCatalogue.ts` |
| Figma component snapshot | `spec/figma-components.json` (generated) + `spec/figma-components.status.json` (debt ledger) |
| Storybook | `apps/storybook` (stories, `.storybook`), families in `spec/storybook-families.json` |
| Exports | `src/lib/tokenGenerator.ts` (`TOKEN_SCHEMA_VERSION` **7**), `src/lib/exporters.ts`, `src/lib/figmaCollections/w3cTree.ts`, `src/lib/agentBundle/` |
| Serverless API | `api/` (`tokens.ts`, `plugin-session.ts`, `account-files.ts`, …) |
| Agent router | `AGENTS.md`, `llms.txt`, `docs/agent-native/` |
| Agent skills | `.claude/skills/` (`escala-figma-to-code`, `escala-platform-roles` — generated, `color-science-core`, …); the account skill `escala-architecture` is never copied here |

Target layout not built yet: `tokens/`, `packages/ui` (`design-plans/packages-ui-extraction.md`);
until then the per-component contract lives in `spec/contracts/`. Do not report their absence as a bug.

## Commands

```bash
npm test                      # vitest (node env). Not a type check.
npm run build                 # audit:exports + tsc -b (app AND tests) + api typecheck + vite build
npm run storybook             # :6006   · npm run build-storybook
npm run check:story-parity    # every escala-ui component has a story
npm run check:web-storybook   # the web draws what Storybook documents (needs both builds; exceptions in spec/web-storybook-parity.exceptions.json)
npm run figma:inventory:check # spec/figma-components.json was not hand-edited
npm run audit:exports         # every export agrees with tokens.json, value for value
npm run color:report          # contrast audit → reports/ (gitignored)
node scripts/storybook/apply-families.mjs   # Storybook titles from the families manifest
npm run gen:contracts · gen:escala-skill · gen:figma-palette · gen:phosphor-icons · gen:*-reference · bundle:plugin
```

Deploy: `npx vercel --prod` (web); Storybook is its own Vercel project `escala-storybook`.

## Hard rules

1. **Tokens first.** Components read semantic ROLES only — never a primitive, a hex, a free px or
   opacity for a state. A value no role covers is a missing role: report it, do not hard-code.
   Off-role anatomy snaps to the scale (`spaceOf`, `iconOf`).
2. **Never invent a token name.** Check `roleNames.ts` / the role tables. Naming: Figma `/`
   (`Action/primary/hover`), CSS hyphens (`var(--color-action-primary-hover)`), JSON dots.
3. **Names are identical in Figma, React and Storybook** (PascalCase, no spaces). A rename is a
   breaking change: count instances first.
4. **Recipes are the only styling source**, read by the web and the plugin
   (`componentRecipesPluginParity.test.ts`). No cva, no second renderer. Motion by role name in
   `recipes/motion.ts`; no `duration-*` / `ease-*` / `transition-*` in components.
5. **Colour layer:** one contrast implementation (`color/apca.ts`; never `chroma.contrast` on hex),
   emit via `gamut.oklchToHex` (never channel clipping), report WCAG and APCA, validate categorical
   palettes with `cvd.validateCategorical()`. The colour layer stays DOM-free.
6. **Generated files are never hand-edited:** `*Reference.ts`, `*.generated.ts`, `src/generated/*`,
   `spec/figma-components.json`, `spec/contracts/`, `src/lib/pluginVersion.ts`, `api/_pluginStudio.mjs`,
   `.claude/skills/escala-platform-roles/`. Regenerate with its `npm run gen:*`.
   After changing a role, also re-read Docs · Color's prose (`foundationDocs.tsx`, guarded by
   `colorDocs.test.ts`) — it once shipped a stale translucent-role count and no Elevation section.
7. **Store:** a new persisted field bumps `version` with an append-only migration; design fields
   also go into `DesignSnapshot` / `makeDesignDefaults()`.
8. **tokens.json is additive.** Never rename a key; components field is `atoms`. Bump
   `TOKEN_SCHEMA_VERSION` only when a value domain changes (v7 = translucent semantic colours).
9. **`/api/tokens` GET is public and frozen**; POST is same-origin + a per-slug claim. Published
   systems are read by the plugin; deleted ones answer 410.
10. **Storybook titles come from `spec/storybook-families.json`** (never typed by hand). The
    viewport global is `dimensions`, never `viewport`.
11. **The platform chrome accent is Escala's violet** (`ESCALA_CHROME_ACCENT`), never the previewed
    theme's. The theme paints the canvas; the platform paints its own controls.
12. **UI words:** Design system → Brand → Theme (Light/Dark). In code, `theme` identifiers still
    mean a brand. "Mode" is Figma's word only.
13. **Touching an exporter means running `npm run audit:exports`.** No `console.log`, no `any`.

## Do not bring back (deleted on purpose)

Hosted MCP (`api/mcp.ts`) · a login wall in front of reading/exporting · a wizard / stepper /
Continue in the Generator · a Code tab on component pages · a second markdown/agent-context surface
(extend `contextRequest.ts` instead) · a fourth "ship" door beside CSS · Figma · Agent · a Share pill ·
Pinned · the top-bar Home file browser · architectures other than Categorical (Astryx, shadcn,
Vibrancy, Tonal, Carbon) · the Opacity foundation · a preview aside in Variables · a Roundness
slider for radius · the Themes-library SyncTrack. Each has its reason in the archive.

## Current state by area

One line each. Detail: search the archive or the plan named.

- **Colour:** Radix 12-step ramps, light + dark twin per family, tone 9 = the seed; OKLCH with gamut
  mapping; neutral tint Pure·Subtle·Tinted·Vivid; alpha twins solved per page + fixed
  `black-a`/`white-a`. Roles are solved, not pinned (`{fam.solid}`, `{on:}`, `{ink:}`, `{ui:}`,
  `{ui+:}`, `{step:}` markers). Borders split by job: decorative `subtle·default·strong`, control
  boundary `control·control-hover`. Storybook pins the Figma file's palette and shadows; the web keeps
  the generator. (`alpha-primitives.md`, `border-roles-radix-band.md`, DEC-2026-11-16-004/006)
- **Dimensions:** one global Dimension collection; roles alias primitives. Radius = three axes
  Boxes · Fields · Selectors (+ `item`), ladder 0·4·8·12·20·24·full (DEC-…-001/002). Spacing is
  static · responsive · role; sizes from a base unit; selector ramp separate. Figma modes are
  viewports Desktop · Tablet · Mobile. (`dimension-primitives.md`)
- **Typography:** type scale ×0.875; headings step one rung per viewport; tracking derived;
  roles by viewport mode in Figma. (`typography-three-platforms.md`)
- **Motion:** a foundation (30 roles, presets, choreographies, reduced motion); components read it
  through recipes. The Toast's bar is its clock (DEC-2026-11-18-001). (`motion-foundation.md`)
- **Icons:** Phosphor, weight per System Style; one component icon list; icon sizes are tokens.
- **Components:** the files in `escala-ui`, each the twin of a Figma set; contracts in
  `design-plans/*-contract.md`; Storybook grouped by family (one Figma page = one entry).
  (`button-figma-parity.md`, `storybook-families.md`, `figma-components-inventory.md`)
- **Exports:** tokens.json · CSS (both appearances, viewport media blocks) · W3C = the five Figma
  collections · agent package (AGENTS.md, llms.txt, SKILL, references; offline) · Figma payload;
  all checked by the export watchdog. (`export-watchdog.md`)
- **Components, Blocks & Screens on the platform mirror the Storybook** (`lib/platformCatalogue.ts` reads
  `spec/storybook-families.json`; a family's parts open from its Anatomy section). Blocks and Screens live inside
  Components as the Elements · Blocks · Screens switch (`BlocksView`, `blocks/blockRegistry.tsx`); a new block story needs an entry there
  (`platformBlocks.test.ts`). A screen (Storybook folder `Screens`, `escala-ui/screens/`) keeps its pieces as parts on its own page, never in Elements.
- **Preview canvas:** component and block pages share `docs/PreviewStage.tsx`: opens fitted, zoom reads true pixels, pan, expand; one header row, Elements · Blocks · Screens then find · Storybook · Figma (`docs/stageActions.tsx`); a block's Frame also sets its layout.
- **Configurator UI:** top bar About · Generator · Components · Docs; Generator rail
  Home · Board · Variables · Code · Components; right inspector; ship doors CSS · Figma · Agent.
  Open beta: everything open, 5 brands per system (`openBeta.ts`). Accounts keep systems in the cloud.
- **Plugin (0.35.0):** builds variables, styles, Getting started, Token Architecture, Documentation and
  the core kit (Button, IconButton, Input, Checkbox, Radio, Switch, Badge, Avatar — `FIGMA_SAMPLE_KEYS`),
  each a base cut (never the full matrix); names everything after the Figma file; reads the published blob.
  It no longer offers a Full catalogue: the complete library (70+ components, blocks, pages) is the
  Escala Design System, sold through `/figma-kit` (`lib/figmaKit.ts`). No copy may promise it in the plugin.

## Known gaps (2026-11-16)

- **No Code Connect, and it cannot be added on the current plan**: the library is on Figma Professional and the
  API refuses mappings ("only in Organization or Enterprise plans", measured 2026-11-16). The bridge instead:
  an agent reading a Figma design finds the set name in `spec/contracts/index.json` and uses that contract's files.
- Only Escala components (DEC-2026-11-16-008): the shadcn-only ones with no Figma twin were removed.
  Label · Spinner · Card stay as parts others use, with no Figma set yet (`codeOnly`); the plugin still
  builds the removed sets until it is cleaned.
- Governance designed, not yet run: every registry piece is at stage `storybook`; no sync has run.
- `AGENTS.md`'s router predates the deleted MCP in places — trust this file first.
