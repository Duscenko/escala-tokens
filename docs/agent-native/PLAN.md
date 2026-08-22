# Agent-native platform — plan

Goal: the design system a user generates in Escala should be consumable by an AI agent without guessing token names, folder structure, or hex/px. The five layers (Context, Knowledge, Access, Generation, Validation) apply first as a **product export** (B). The Escala repo itself gets a thin agent layer (A) only where it unblocks B.

This document is the map. Frozen contracts live in [`CONTRACTS.md`](./CONTRACTS.md). The JSON shape lives in [`tokens.schema.json`](./tokens.schema.json).

## Two surfaces (do not mix)

| Surface | What it is | Who consumes it |
|---|---|---|
| **A — Escala repo** | `AGENTS.md`, `.cursor/rules`, this folder | Agents working *on* Escala |
| **B — Generated system** | Zip / GitHub push / live MCP of a user's tokens | Agents working *in the user's product* |

B is the product. A is scaffolding so B can be built without inventing a second vocabulary.

## What already exists

| Layer | In Escala today | Gap |
|---|---|---|
| **1. Context** | `CLAUDE.md` (~2,400 lines), `.impeccable.md`, `aiContext.ts` (`agent-context/v1`, scopes global / component / variable) | No `AGENTS.md` router. Context lives in a copy button, not on disk. `CLAUDE.md` is too large to be a system prompt. |
| **2. Knowledge** | `.claude/skills/color-science-core/` (SKILL.md + references + `scripts/contrast.mjs` pinned by `no-duplication.test.ts`). Export wizard format `skill` via `skillExport.ts` | Skill is Figma-tuned. No code / a11y-audit / migrate skills in the *output*. |
| **3. Access** | `GET/POST /api/tokens?project=` on Vercel Blob. Catalogue in `componentCatalogue.ts` (58 components, props, a11y) | Whole JSON only. No MCP. No `resolve_token` / `list_components` / `check_contrast`. No published JSON Schema until this folder. |
| **4. Generation** | Reference generators (`gen:radix-reference`, etc.), Figma plugin component sets, wizard formats `w3c` · `escala` · `md` · `skill` | No `templates/` of code. No `WizardFormat: 'agent-bundle'`. |
| **5. Validation** | 23 Vitest files, golden ramps, WCAG + APCA, `color-report.ts` | No agent evals. No axe. No GitHub Actions. |

## Architectural hinge (do this before MCP)

`skillExport.ts` and `generateTokenJSON()` both call `useDesignStore.getState()`. That is correct in the browser and **blocks serverless**. An MCP handler on Vercel cannot boot Zustand.

Extract `src/lib/agentBundle/` as **pure functions** `(json: TokenJSON) => BundleFile[]`. Keep `buildSkillExport()` as a thin wrapper: `getState()` → `generateTokenJSON()` → `buildAgentBundle(json)`.

Parity test: zip bytes (or normalized file map) from the wrapper must match the pure function given the same JSON. Until that test is green, do not add a second generator.

Vitest stays `environment: 'node'`. The bundle builder must not import React, DOM, or the store.

## Frozen contracts (summary)

Full list: [`CONTRACTS.md`](./CONTRACTS.md).

- **`/api/tokens` is frozen.** Distributed plugin zips are pinned to it. New endpoints go elsewhere (`/api/mcp`, `/api/agent/…`).
- **`TOKEN_SCHEMA_VERSION`:** `5` on `main` (HEAD). Working tree is an **additive** bump to `6` (type roles + layout roles + stroke + gridFrame). Plugin `SUPPORTED_SCHEMA_VERSION` is still `5` — it warns on newer, still imports. Additive fields only; never rename.
- **Canonical atom field is `atoms`**, not `components`.
- **One contrast implementation** (`lib/color/apca.ts`). Color layer is DOM-free.
- **Zustand persist:** any new store field needs a migration. Do not reshape existing keys.
- **Do not edit `*Reference.ts` by hand.** `npm run gen:*`.

## Phases

### Phase 0 — Freeze contracts (this folder)

- [x] `CONTRACTS.md` — what must not move, and why
- [x] `tokens.schema.json` — machine-readable Escala JSON (v5 required core + v6 additive)
- [x] Guard test: schema file's documented version tracks `TOKEN_SCHEMA_VERSION`

### Phase 1 — Context on disk (this change)

Repo-only, no runtime. Risk: none.

- [x] `AGENTS.md` — router < 200 lines (hard rules + pointers)
- [x] `.cursor/rules/` — color, store, export/plugin
- [x] `llms.txt` — crawl/routing table
- [ ] Optional later: a 3-line pointer at the top of `CLAUDE.md` once the current WIP lands

### Phase 2 — `agentBundle/` (2–3 days)

1. Move markdown builders in `skillExport.ts` behind `(json: TokenJSON, opts) => files`.
2. Leave `buildSkillExport()` calling the store, then the pure function.
3. Parity test against today's Skill zip.
4. Do **not** change wizard UX yet.

Unblocks Phase 3 and 4 with one generator.

### Phase 3 — Access / MCP (3–5 days)

New handler, never a rewrite of `/api/tokens`.

Suggested tools (all read the Blob JSON + `componentCatalogue.ts`):

| Tool | Returns |
|---|---|
| `get_tokens` | Full Escala JSON for `project` |
| `resolve_token` | One role → CSS / Figma / hex per theme |
| `list_components` | Catalogue keys, categories, axes |
| `get_component` | Props, a11y, semantic bindings |
| `list_icons` | `icons.aiSource` + custom names |
| `check_contrast` | WCAG + APCA via `lib/color/apca.ts` (import, do not reimplement) |

Ship JSON Schema at a stable URL (`/docs/agent-native/tokens.schema.json` or `/api/agent/schema`). `llms.txt` in the **output** bundle points at the user's MCP endpoint, not Escala's.

Auth: start public-read like `/api/tokens` (CORS `*`). Revisit if tokens become private.

### Phase 4 — Five-layer export as product (1–2 weeks)

New `WizardFormat = 'agent-bundle'` beside `w3c | escala | md | skill`. Default zip:

```
AGENTS.md                 # router: do not invent names; bind semantics
llms.txt                  # MCP URL + file index
SKILL.md                  # existing Figma skill (already built)
skills/code/SKILL.md      # implement UI from tokens
skills/a11y-audit/SKILL.md
skills/migrate/SKILL.md   # hex/px → tokens
templates/component/      # scaffolds bound to semantic contract
checkers/token-lint.mjs   # generated from THIS system's token names
```

`templates/` and `checkers/` are generated from the user's `TokenJSON` + catalogue, not generic stubs. A checker that does not know `Action/primary/default` is theatre.

GitHub export (`lib/github.ts`) should grow the same files once the zip is stable — one builder, two sinks.

### Phase 5 — Validation (1 week)

- GitHub Actions: `npm test` + `npm run build` (none exists today).
- Agent evals: given the bundle, does the model emit `var(--color-action-primary-default)` instead of `#7f56d9`?
- Optional axe on specimens — **not** in the color-layer Vitest project (`environment: 'node'` is load-bearing). New project or Playwright job.

## Guardrails while building this

1. **No drive-by refactors** of the store, plugin `code.ts`, or `/api/tokens`.
2. **Additive schema only.** New keys, never renamed keys. Bump `TOKEN_SCHEMA_VERSION` only with a comment in `tokenGenerator.ts` *and* this folder.
3. **Plugin zip** (`public/scalable-designs-figma-plugin.zip`) is a distributed artifact. Do not change the fetch URL.
4. **WIP on `main`:** layout roles / type roles / schema 6 are already in the working tree. Land that as its own commit. This agent-native layer must not be mixed into that diff.
5. **Color math stays in `lib/color/`.** Skills, MCP `check_contrast`, and checkers import it or call `scripts/contrast.mjs`. `no-duplication.test.ts` will fail a third copy.

## Recommended order of work

```
0 freeze  →  1 context on disk  →  2 pure agentBundle  →  3 MCP  →  4 export format  →  5 CI + evals
     ▲                ▲                     │
     └──── you are here (0+1 shipped) ──────┘
```

Do not start Phase 4 templates until Phase 2 exists. Templates generated from a store-bound function cannot run in MCP or CI.

## Out of scope (until someone asks)

- Making Escala itself a component library / Storybook
- Style Dictionary / Terrazzo (the engine is custom on purpose)
- Rewriting `CLAUDE.md` into AGENTS.md (it stays the deep reference)
- Phone layouts for the configurator
- Switching Blob storage to KV
