# Escala — agent router

A desktop token configurator. Designers pick tokens; the app emits `tokens.json`, CSS, W3C, a Figma Skill zip, and syncs to a companion plugin.

**Name: `escala-tokens`. Public URL: https://www.escalatokens.com.** Vercel is hosting only — never put `*.vercel.app` in user-facing copy. Folder, GitHub repo, and private npm name are `escala-tokens`. CLI stays `@escala/cli`.

**Do not invent token names, hex, or px when a token exists.** Prefer semantic roles over primitive ramps. Bind paints to semantics only.

## Read this, then stop

| Need | File |
|---|---|
| What not to break | `docs/agent-native/CONTRACTS.md` |
| Payload shape | `docs/agent-native/tokens.schema.json` |
| One component or block: API, Figma set, slots, the token each state binds, CSS + Figma names, motion, keyboard, import, story | `spec/contracts/<Key>.json` · readable `<Key>.md` (index + how to use: `spec/contracts/index.json`, `spec/contracts/README.md`); route below |
| Five-layer roadmap | `docs/agent-native/PLAN.md` |
| Current rules, repo map, sources of truth | `CLAUDE.md` (short, current state) |
| Why a rule exists (history, 86 dated notes) | `docs/history/CLAUDE-archive-2026-11-16.md` (search by keyword, never load whole) |
| Brand / user | `.impeccable.md` |
| Color math | `.claude/skills/color-science-core/SKILL.md` |
| Product Brain doctrine (weekly audit agent, read-only) | `PRODUCT-BRAIN.md` |
| Agent copy envelope | `src/lib/aiContext.ts` (`agent-context/v1`) |
| Install recipes (wizard + Docs + CLI) | `src/lib/agentInstall.ts` · `src/lib/cliInstall.ts` · `AgentInstallPanel.tsx` |
| CLI (`npx @escala/cli`) | `src/cli/main.ts` · `cli/package.json` · `npm run build:cli` |
| Skill zip builder | `src/lib/agentBundle/` (pure) · `src/lib/skillExport.ts` (store wrapper) |
| Token resolution helpers (read by the shadcn registry; the hosted MCP was deleted 2026-10-20) | `src/lib/agentAccess/` |
| Evals | `evals/agent-output/` · `npm run eval` |

`CLAUDE.md` is short and current; read it first. Load the archive only for the area you are changing.

## Build UI with Escala components (from a Figma frame or a brief)

Do not guess a component, a prop or a token. Follow the contracts:

1. **Find it.** Figma: the instance's main component set name = `figmaSet` in `spec/contracts/index.json`
   (Code Connect is not available on the library's Figma plan; this index is the bridge). Brief: search
   `label`, `category` and `description` in the same index. `kind: "block"` entries are compositions.
2. **Read its contract**: `spec/contracts/<Key>.json` (machine) or `spec/contracts/<Key>.md` (the same,
   readable). Figma variant values map 1:1 to `api.axes`; the props are in `api.props`.
3. **Import it** from `code.import` (`name`, `module`). Never redraw a component that has a contract.
4. **Paint nothing by hand.** `bindings` says which token each slot paints per state; `names` turns a token
   ref into its CSS variable and Figma name. A value no role covers is a missing role: report it.
5. **Behave like it.** `behaviour.primitives` (the library's keys and focus) + `behaviour.authored` (what
   the component adds, or that it is not interactive); `motion` = the motion roles it plays.
6. **Check yourself**: `npm run eval` (the role and state checker over `evals/agent-output/`) and the
   story at `code.story.url`.

## Hard rules

1. **`/api/tokens` GET is frozen and public.** POST is same-origin plus a per-slug claim — not a user login. There is no hosted MCP (deleted 2026-10-20); agents use the offline package or the Figma MCP. CORS `*` and Blob stay. GitHub holds the editor (`.escala/system.json`); the blob is a live-sync cache. User-facing URLs are `https://www.escalatokens.com`, never the Vercel preview host.
2. **Additive schema only.** `TOKEN_SCHEMA_VERSION` is `7` (v7 = semantic colours may be translucent `#rrggbbaa`). Never rename keys. Canonical component field is `atoms`.
3. **One contrast implementation** — `src/lib/color/apca.ts`. Never `chroma.contrast` on hex. Never emit via channel clipping (`gamut.oklchToHex`).
4. **Color layer is DOM-free.** Vitest is `environment: 'node'`. `npm run build` typechecks tests (`tsconfig.test.json`); a green `npm test` does not.
5. **Store is persisted.** New Zustand fields need a migration. Emit them from `generateTokenJSON()` if consumers should see them.
6. **`*Reference.ts` is generated** (`npm run gen:*`). Do not hand-edit.
7. **Figma names use `/`, CSS uses hyphens + `var()`, JSON architecture uses dots.** `action.primary.default` → `Action/primary/default` → `var(--color-action-primary-default)`.
8. **Plugin lives in** `../escala-figma-plugin`. `code.ts` is authoritative for component sets; `componentCatalogue.ts` mirrors it. The default LIVE import (Overview) renders `FIGMA_SAMPLE_KEYS` (9 keys), each with the same full variant set the Full catalogue gives it; the explicit **Full catalogue** option renders all 58 `figmaSets` with representative variants (not the 1,403-combination cartesian product). Keep `FIGMA_SAMPLE_KEYS` in lockstep with `SAMPLE` and every `figmaSets` entry in lockstep with `CATALOG`.
9. **Desktop/laptop only.** Do not build phone editor layouts. `DesktopOnlyNotice` + About is the one phone surface, and it holds the **phone generator** (`MobileThemeSheet.tsx` + `lib/mobileTheme.ts`): a live preview (six swipe pages of bento), a docked Theme panel (Shuffle · Copy prompt · Controls) whose Controls pages reuse the desktop rail's pieces whose every control is a PICK from a list the desktop ships (curated brand colours, `FONT_PRESETS`, type scale modes, radius presets, spacing modes). Never free inputs (hex, px, names) or token tables there. Export on a phone is only: copy the CSS variables, copy the system as an agent prompt (`systemBrief`, `agent-context/v1`), and the `?remix=` link to a laptop. Plans: `design-plans/mobile-theme-sheet.md`, `design-plans/mobile-bento-action-bar.md`.
10. **No `console.log` in production.** TypeScript strict. No `any` unless forced.

## Where code lives

```
src/store/useDesignStore.ts     state + persist
src/lib/tokenGenerator.ts       store → Escala JSON
src/lib/platformAxis.ts         optional web · ios · android axis (pure; web mirrors root)
src/lib/exportWizard.ts         destinations: escala | w3c | agent-bundle (skill nested)
src/lib/agentBundle/            TokenJSON → Skill + agent-bundle zip (no store)
src/lib/skillExport.ts          store wrappers (buildSkillExport, buildAgentProductExport)
src/lib/agentAccess/            resolve, catalogue, contrast (no hosted MCP)
src/lib/color/                  ramps, APCA, gamut, CVD
src/lib/componentCatalogue.ts   the component catalogue (props, a11y) → spec/contracts/ via npm run gen:contracts
api/tokens.ts                   publish / fetch Blob
```

## Commands

```bash
npm test                 # Vitest, node env — run before build
npm run eval             # generated token-lint vs evals/agent-output
npm run build            # tsc -b && vite
npm run cli -- --help    # @escala/cli (tsx; same code as the published bin)
npm run build:cli        # bundle cli/dist/escala.js for npm publish
npm run color:report     # reports/color-audit.json (gitignored)
npm run bundle:plugin    # refresh public/escala-figma-plugin.zip
```

Plugin: `cd ../escala-figma-plugin && npm run build`.

## Do not invent

- A second token vocabulary (no parallel “primary-500” beside `action.primary.default`)
- A second WCAG/APCA implementation in a skill, tool, or checker
- `components` as the export field name
- Style Dictionary / Terrazzo as the pipeline
- A phone editor layout, or a copy of `CLAUDE.md` into this file

<!-- escala-orchestration v3: begin -->
## Escala orchestration (lead session rules) — v3, 2026-11-20

> It turns the main Claude Code
> session into the **lead**: it receives César's request, picks the right helper, and checks the result.
> The full protocol is the `escala-governance` skill. This section only routes work; it never overrides that skill.

### 0. The three Figma files

| File | Key | Role | Who writes |
|---|---|---|---|
| Escala design system (core library) | `7j5zukN5HpihGVJMmyjA20` | Foundations + official components | César: variables and styles only. `library-sync`: components |
| Escala Workshop | `iwUf3PSrZpJbUOKFjRCqyC` | The only place new things are designed (opens on `◉ Cover`) | César, and Claude when César asks for design help |
| Escala Preview (sold to customers) | `X736U9ffkni3gg6rmvEEnJ` (`src/lib/figmaKit.ts`) | Released, approved versions only, with a changelog | Nobody by hand; updated by César at a release |

### 1. Before any work

1. Read `governance/focus.md`. If the request is about a piece or product that is not in **Now**, say so and ask César
   whether to swap it in (one piece in, one piece out). Never start a paused product (Figma plugin, motion package).
2. Read `governance/pending.json`. If anything is pending, start the reply with it in one line
   (e.g. "Falta publicar la librería" · "El file Preview está desactualizado").
3. Load the Escala skills the task needs: `escala-governance` always; `escala-architecture` for any value or name;
   `escala-component-builder` for structure; `escala-component-docs` for Figma documentation; `escala-rebind` for stale ids.
   If a skill is not available in this session, stop and say which one is missing. Never copy a skill into the repo.

### 2. Routing: who does what

| César says / situation | Helper or action | Governance step |
|---|---|---|
| "I changed variables / styles in Figma" | `foundations-pull` | Foundations track (§4.4) |
| "`✎ <Name> · ready` is ready in the Workshop" | `storybook-builder` | Step 2 (§4.2) |
| "Fix / change <piece> in code" | `storybook-builder` | Step 2 |
| "<Name> is approved and merged" | `library-sync` | Step 4 (§4.1) |
| "Audit", "what is out of date?", end of day | `escala-auditor` | §4.3 / §4.5 |
| "Help me design <idea>" | Lead itself, in the Workshop file only (drafts, no code) | Step 1 |
| "I published the library" | Lead clears `libraryPublish`; if components changed, sets `previewUpdate` | — |
| "I updated Preview" | Lead clears `previewUpdate` | — |

The lead delegates; it does not do a helper's job itself. It runs helpers one after another when one depends on the other
(e.g. `foundations-pull` before `library-sync`), never in parallel on the Figma library file.

### 3. Hard stops (the lead refuses and explains)

- **No code before "ready".** No component, block or story code until the Workshop page is named `✎ <Name> · ready`.
  Design help is allowed; code is not. Remind César of the rename.
- Writing a foundation value in code by hand (Figma owns foundations).
- Building or editing a component directly in the core library outside `library-sync`.
- Designing inside the core library or the Preview file (design happens in the Workshop).
- Editing the Preview file by hand.
- Publishing the core library before the matching `tokens/` PR is merged.
- Marking anything `stage:approved`: only César approves.
- Pushing a branch or opening a PR without César saying "push" in this session.
- Any paid external review or visual-testing service.

### 4. Reminders (`governance/pending.json`)

Figma lets only a person publish a library, so helpers record what César still has to do:

- `foundations-pull` (after merge) and `library-sync` (after a run) set `libraryPublish: true` with the reason.
- When César says "I published the library": clear it; if the change touched components, set `previewUpdate: true`
  with the list of pieces.
- Every helper report and every `César revisa` repeats each pending item until it is cleared:
  **"Falta publicar la librería"** · **"Recuerda: el file Preview está desactualizado, actualízalo"**.

### 5. Component intent (`spec/intent/<Key>.intent.json`)

The generated contract (`spec/contracts/<Key>.json`) says what a component **is**. The intent file says what it is **for**:
purpose, `notFor` (each case pointing to the right component), who sets each state (`user` · `app` · `both` · `component`)
and the accessibility promises. Rules:

- Hand-written, never generated, never merged into `spec/contracts/`. Schema: `spec/intent/intent.schema.json`.
- Agents draft; only César approves (`approval.status: "approved"`, `by`, `date`).
- Unknown is written as `NOT DECIDED` plus an entry in `openQuestions`. Never invent a value to fill a gap.
- Before proposing a new component, read the intents of the closest existing ones. If one already covers the case,
  or its `notFor` points elsewhere, say so to César with that evidence.

### 6. Checks: report first, block later (`governance/gates.json`)

- `node scripts/run-gates.mjs` runs every check; `report` failures warn, `gate` failures block.
- A new check always starts as `report`. Promote to `gate` only after a clean baseline on `main` and César's OK.
- Never demote a gate to make a build green: fix it, or log an `EXC-*` exception.
- Checks: `check:story-parity` · `figma:inventory:check` · `check:intent` · `check:docs-links`.
- Before writing any component, call the Storybook MCP (tool `docs-list`, then `docs-show`; project server `storybook`, needs `npm run storybook` running) and reuse what it documents.

### 7. After every helper run

Report to César in at most 6 lines: what changed, the branch, findings by status (Open · Fixed · Decided · Accepted),
pending reminders, and the one thing he must do next. Links to Figma node and Storybook story always.
<!-- escala-orchestration v3: end -->
