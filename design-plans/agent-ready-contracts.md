# Agent-ready Escala — component contracts v2 and the loop that finishes them

Owner goal (2026-11-20): an agent that reads a Figma frame or a product brief builds UI with
Escala **without guessing** — it finds the component, its anatomy, the role each state binds, how
it behaves and moves, how to import it, and a check that tells it when it got something wrong.

Started 2026-11-16 (`escala-handoff-2026-11-16.md`: CLAUDE.md cut, contracts v1, Code Connect
blocked, DEC-2026-11-16-007/008). This plan picks it up. Branch: `feat/agent-ready-contracts`.

## Where we are (measured 2026-11-20)

| Piece | State |
|---|---|
| `spec/contracts/<Key>.json` v1 | 134 components, generated, drift-tested (`componentContracts.test.ts`) |
| Figma set per contract | 124 / 134 (10 `codeOnly`: Label, Spinner, Card, …) |
| Human contract `design-plans/*-contract.md` | 64 / 134 |
| Role bound per state | **missing** — only a flat token list |
| Motion decision (`MOT-002`) | **missing** in the contract (lives in `recipes/motion.ts`) |
| Behaviour (keyboard, focus, ARIA) | one prose line (`accessibility`) |
| Import line / code entry | **missing** (only file paths) |
| Blocks (9 files, 47 registry pieces) | own `blocks/*.contract.json` format, **not in `index.json`** |
| JSON Schema for the contract | **missing** |
| CI: Storybook argTypes = contract (`PAR-001`) | **missing** |
| Registry stages | 65 pieces, all `storybook`; no component approved or published |

## Phases (each one a commit; each one leaves `npm test` green)

### Phase 1 — Contract v2, everything derivable from code (done 2026-11-20)
Schema `escala-component-contract/2`, additive over v1 (no key renamed or removed).
- [x] `bindings`: the recipe parts as data — which axes a part reads, and per axis combination the
      token each slot paints (fill, ink, border, radius, padding…). Exact, compact (parts factor the
      Figma matrix), resolvable by an agent the same way `resolveRecipe` does.
- [x] `names`: every token ref in the contract → its CSS variable and its Figma variable/style name,
      so an agent never translates `color.action.primary.hover` by hand.
- [x] `motion`: the component's entry in `recipes/motion.ts` (roles by name, choreographies), or
      `null` = no decision yet (a `MOT-002` gap, counted in the index).
- [x] `behaviour`: the Radix primitive the files import, its WAI-ARIA pattern and keyboard map
      (one small authored table per primitive), the `role` / `aria-*` the source sets.
- [x] `code.import`: the exported name(s) and the import path.
- [x] Blocks join `index.json` (`kind: "block"`, pointing at their block contract).
- [x] `spec/contracts/schema.json` (JSON Schema) and `spec/contracts/README.md` (how an agent uses
      them), both generated.

### Phase 2 — Gates (CI) (done 2026-11-20)
- [x] `PAR-001`: every story's `argTypes` / args equal the contract's `api.axes` (names and values).
- [x] `MOT-002`: a component with a State axis or an open/close and `motion: null` fails (with an
      exceptions list seeded from today's gaps, so the gate starts green and only blocks new debt).
- [x] Contract completeness report (`npm run contracts:report`): per component, which sections are
      empty → `governance/findings/latest.json` entries (`DOC-001`).

### Phase 3 — Behaviour authored where derivation is not enough (done 2026-11-20)
- [x] For components with no Radix primitive (custom keyboard: Calendar, InputOTP, Combobox,
      ReactionGroup, Table…), an authored `behaviour` entry in `src/lib/componentBehaviour.ts`
      (Storybook owns behaviour). Each one checked against its story.
- [x] Missing human contracts: generate the 70 from the JSON (a readable view), never hand-copy.

### Phase 4 — The agent's door (done 2026-11-20)
- [x] `AGENTS.md` / `llms.txt` / `escala-figma-to-code` skill: "Figma set name → `index.json` →
      contract → import + bindings"; remove the stale MCP lines (`AGENTS.md` predates its removal).
- [x] Agent package export (`src/lib/agentBundle/`) ships the contracts too.
- [x] Eval: `evals/agent-output/` gains cases that use a wrong role for a state; the checker reads
      `bindings` and fails them.

### Phase 5 — Figma side (needs `use_figma`, owner OK before any write)
- [ ] Inventory script returns the set node id → `figma.setNodeId` + a direct link per contract.
- [ ] Daily review compares Figma's per-state bindings with `bindings` (governance §4.5.2).

## Loop rules
- Work on `feat/agent-ready-contracts` (worktree `.claude/worktrees/agent-ready-contracts`); other
  sessions use the main checkout. Never push; the owner reviews.
- Generated files are never hand-edited: change `src/lib/componentContracts.ts`, run
  `npm run gen:contracts`.
- When a session's context fills, it ticks this file, writes the next step under **Next**, and
  starts a fresh session with this file as the brief.

## Done log
- 2026-11-20 · Phase 1: schema v2 (`bindings`, `names`, `motion`, `behaviour`, `code.import`), blocks in
  `index.json` (`kind`, `figmaNode`, `stage`), `schema.json` + `README.md` generated. Coverage today:
  134 components (51 with a motion decision, 16 registered), 58 blocks. `npm test`: only the 5
  failures already on HEAD 7a08f91 (exportAudit goldens ×3, figmaComponentsParity codeOnly,
  pluginGithubPush size) — not from this work.

- 2026-11-20 · Phase 2: `src/lib/contractGates.ts` + `contractGates.test.ts` — PAR-001 (every story
  playground control = contract axis: name, values, default; booleans and ranges understood) and
  MOT-002 (State / Open / Expanded / Collapsed axis, an open prop or a disclosure primitive, and
  `motion: null`). Debt frozen in `spec/contract-gates.baseline.json` (PAR-001: FABGroup Open default,
  Modal Layout, ModalFooter Surface; MOT-002: 27 components); the gate fails on new debt and on a
  stale baseline line. `npm run contracts:report` writes `source: contracts:report` findings into
  `governance/findings/latest.json` (today 76 DOC-001 — 70 without a human contract, 10 codeOnly,
  6 without behaviour — 27 MOT-002, 3 PAR-001), keeping history, closing what is gone, flagging regressions.

- 2026-11-20 · Phase 3: `src/lib/componentBehaviour.ts` → `behaviour.authored` in every contract (16: the 9
  component files with their own key handling — Calendar/CalendarMonth, Combobox, NumberInput, InputTag,
  RatingGroup, SegmentedControl, ReactionGroup, ActivityHeatmap, Table — plus 6 static ones declared not
  interactive). Checked against each file's handler and the story export it names (not exercised in a
  browser); `componentBehaviour.test.ts` fails when a component file starts handling keys without an entry.
  `spec/contracts/<Key>.md` generated for all 134 (`docs.readable`): axes, props, tokens at the defaults
  with CSS + Figma names, motion, behaviour, files. DOC-001 now 10 (the codeOnly parts only).

- 2026-11-20 · Phase 4 (1/3): `AGENTS.md` gains *Build UI with Escala components* (Figma set →
  `index.json` → `<Key>.json`/`.md` → `code.import` + `bindings` + `behaviour` → `npm run eval`), the
  stale "58 components" line goes; `llms.txt` points at the index; `escala-figma-to-code` Step 2 reads an
  existing contract first; `docs/agent-native/PLAN.md` and `GET-STARTED-PLAN.md` carry a status line that
  the hosted MCP is gone (their MCP sections are history).

- 2026-11-20 · Phase 4 (2/3): `src/lib/contractCore.ts` = the pure core of a contract (catalogue + recipe +
  motion + `componentBehaviour.ts`: api, anatomy, tokens, names, bindings, motion, behaviour.authored, usage,
  accessibility). `componentContracts.ts` builds `spec/contracts/` from it (regenerated output identical byte
  for byte). The agent package (`productDesignSkills.ts`) writes `contracts/<Key>.json` for all
  `designSkillComponents()` + `contracts/index.json` (with `selected` and the catalogue's `figmaSets`): same
  schema and key order, repo-only fields null (Figma snapshot, story, files, ARIA scan), `code.import` =
  the product's `@/components/ui/<file>`. `contractCore.test.ts` holds every shared field equal to the repo file.

- 2026-11-20 · Phase 4 (3/3): `checkers/binding-lint.mjs` in the package (`productBindingChecker.ts`): reads
  CSS rules aimed at `[data-escala="<Key>"]` (variant attributes, `:hover` / `:active` / `:focus-visible` /
  `aria-disabled` / `aria-invalid` / `data-force-state`, `[data-part]`), resolves the slot's role from the
  contract's `bindings` and fails a different `var()` (fill → background, text → color, stroke →
  border-color) or a component with no contract. `evals/agent-output/fail.wrong-state-role.css` (Button
  Hover with `action.primary.default`: token-lint passes, binding-lint fails) + `pass.state-roles.css`, in
  `agentEvals.test.ts` (`npm run eval`). `npm test`: the 5 known failures only; `npx tsc -b` clean.

## Next
Everything automatable is done. What waits for the owner:
1. **Phase 5 — Figma writes** (needs `use_figma` and the owner's OK before any write): the inventory script
   returns each set's node id → `figma.setNodeId` + a direct link per contract; the daily review compares
   Figma's per-state bindings with `bindings` (governance §4.5.2).
2. **MOT-002 `none`**: the gate counts `none` as a decision, but `RecipeMotion` cannot say `none` yet —
   add it when the owner names the first static-state component (27 components in the baseline).
3. **Merge `feat/agent-ready-contracts`** (owner review; never pushed by an agent).
