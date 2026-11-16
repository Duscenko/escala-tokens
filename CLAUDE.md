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
| **Escala Figma plugin** | sibling repo `../escala-figma-plugin` (`src/code.ts` + `src/ui.html`) | Imports variables, styles and a base cut of every component into Figma |
| **Escala Design System** | Figma library `7j5zukN5HpihGVJMmyjA20` + `src/components/escala-ui` + Storybook `apps/storybook` (online: https://escala-storybook.vercel.app) | The component library itself |

Stack: React + Vite + TypeScript (strict) + Tailwind v4 + Zustand + Framer Motion + Radix. GitHub
`Duscenko/escala-tokens`. The configurator is **desktop/laptop only**; the one phone surface is
About + the phone generator (`MobileThemeSheet.tsx`, picks only, no free inputs).

## Sources of truth — one owner per domain (DEC-2026-11-16-007)

| Domain | Owner | The other side |
|---|---|---|
| Foundations: variable names, values, modes, aliases, text and effect styles | **Figma library** | Code follows (`src/lib/figmaFilePalette.generated.ts` etc.) |
| Anatomy: component names, layers, variant axes and values, properties, slots, the role each state binds | **Figma library** | Code is the twin; a mismatch is fixed in code |
| Behaviour: keyboard, focus, ARIA, logic, code API, motion (incl. the `Motion` collection) | **Storybook / code** | Figma prototypes copy it |
| Compilation: how a token becomes CSS, recipes | **Code** | Figma never describes it |

- Never edit the Figma file to make it consistent with code. If it looks wrong, say so in one line
  and build from it as it is.
- Process, stages, agents, findings and tickets: the `escala-governance` skill. Data lives in
  `governance/` (`registry.json`, `findings/latest.json`, `ledger/`, `exceptions.yaml`, `runs/`).
- A scheduled **daily review** (weekdays 18:37 Paris, read-only) reports every Figma ↔ Storybook
  difference to the owner with links to both (governance §4.5).

## Repo map (real paths)

| What | Where |
|---|---|
| App shell | `src/pages/Configurator.tsx` (rail · canvas card · right inspector) |
| Store (persisted, **version 151**) | `src/store/useDesignStore.ts` |
| Colour maths (DOM-free) | `src/lib/color/` (`apca.ts`, `gamut.ts`, `cvd.ts`, `audit.ts`), `src/lib/colorUtils.ts` |
| Semantic roles (Categorical, the only architecture) | `src/lib/semanticArchitectures.ts` (`CATEGORICAL_ROLES`), `src/lib/roleNames.ts` |
| Dimensions, radius, spacing, sizes, grid | `src/lib/dimensions.ts`, `src/lib/layoutTokens.ts` |
| Typography, motion, icons | `src/lib/typographyStandard.ts`, `src/lib/motion.ts`, `src/lib/iconSizing.ts`, `src/lib/componentIcons.json` |
| Figma file palette (Storybook only) | `src/lib/figmaFilePalette.ts` + `.generated.ts` |
| Components | `src/components/escala-ui/*.tsx` (Figma twins; Radix for behaviour) |
| Styling of every component | recipes: `src/lib/componentRecipes.ts` + `src/lib/recipes/*.ts` (`motion.ts` for motion) |
| Component contracts | **machine:** `spec/contracts/<Key>.json` + `index.json` (GENERATED, `npm run gen:contracts`: Figma set + axes, API, slots, every token consumed, story id, files); **human:** `design-plans/<component>-contract.md`; blocks also `src/components/escala-ui/blocks/*.contract.json` |
| Catalogue (mirrors the plugin's CATALOG) | `src/lib/componentCatalogue.ts` |
| Figma component snapshot | `spec/figma-components.json` (generated) + `spec/figma-components.status.json` (debt ledger) |
| Storybook | `apps/storybook` (stories, `.storybook`), families in `spec/storybook-families.json` |
| Exports | `src/lib/tokenGenerator.ts` (`TOKEN_SCHEMA_VERSION` **7**), `src/lib/exporters.ts`, `src/lib/figmaCollections/w3cTree.ts`, `src/lib/agentBundle/` |
| Serverless API | `api/` (`tokens.ts`, `plugin-session.ts`, `account-files.ts`, …) |
| Agent router | `AGENTS.md`, `llms.txt`, `docs/agent-native/` |
| Agent skills | `.claude/skills/` (`escala-figma-to-code`, `escala-architecture` — generated, `color-science-core`, …) |

Target layout not built yet: `tokens/`, `packages/ui` (`design-plans/packages-ui-extraction.md`);
until then the per-component contract lives in `spec/contracts/`. Do not report their absence as a bug.

## Commands

```bash
npm test                      # vitest (node env). Not a type check.
npm run build                 # audit:exports + tsc -b (app AND tests) + api typecheck + vite build
npm run storybook             # :6006   · npm run build-storybook
npm run check:story-parity    # every escala-ui component has a story
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
   `.claude/skills/escala-architecture/`. Regenerate with its `npm run gen:*`.
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
- **Motion:** a foundation (24 roles, presets, choreographies, reduced motion); components read it
  through recipes. (`motion-foundation.md`)
- **Icons:** Phosphor, weight per System Style; one component icon list; icon sizes are tokens.
- **Components:** 70 in `escala-ui`, each the twin of a Figma set; contracts in
  `design-plans/*-contract.md`; Storybook grouped by family (one Figma page = one entry).
  (`button-figma-parity.md`, `storybook-families.md`, `figma-components-inventory.md`)
- **Exports:** tokens.json · CSS (both appearances, viewport media blocks) · W3C = the five Figma
  collections · agent package (AGENTS.md, llms.txt, SKILL, references; offline) · Figma payload;
  all checked by the export watchdog. (`export-watchdog.md`)
- **Configurator UI:** top bar About · Generator · Components · Docs; Generator rail
  Home · Board · Variables · Code · Components; right inspector; ship doors CSS · Figma · Agent.
  Open beta: everything open, 5 brands per system (`openBeta.ts`). Accounts keep systems in the cloud.
- **Plugin:** builds a base cut of each component (never the full matrix); names everything after
  the Figma file; reads the published blob.

## Known gaps (2026-11-16)

- No Code Connect yet (`codeConnect: null` for every registry piece).
- 26 catalogue components have no set in the Figma snapshot and 25 have no story (see
  `spec/contracts/index.json`: `figmaSet` / `story` null). Each needs a decision: add to Figma or retire.
- Governance designed, not yet run: every registry piece is at stage `storybook`; no sync has run.
- `AGENTS.md`'s router predates the deleted MCP in places — trust this file first.
