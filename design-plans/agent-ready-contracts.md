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
- [x] Inventory script returns the set node id → `figma.setNodeId` + a direct link per contract.
- [x] Daily review compares Figma's per-state bindings with `bindings` (governance §4.5.2).

### Phase 6 — Close the Figma ↔ contract binding differences in code (done 2026-11-20)
- [x] Confirm each `figma:bindings` finding in Figma (read-only): real, or the checker's.
- [x] Checker artefacts fixed in the checker (paint stacks, `focus` edge as the stroke, layer-name
      aliases, vector fill/stroke, variant values the contract lacks).
- [x] Real ones fixed in the recipe → `npm run gen:contracts` → re-run → findings closed.
- [ ] Owner decisions (see **Next**): left untouched.

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

- 2026-11-20 · Phase 5 (1/2): `components-inventory.figma.js` returns each set's node `id` (read-only run on
  `7j5zukN5HpihGVJMmyjA20`, checksum `3aa17cb4`, 71 pages, 192 sets). Contracts gain `figma.setNodeId` +
  `figma.setUrl` (direct link to the set; `url` stays the page), `index.json` `figmaNode` = the set id
  (131 of 134 components; the 3 without are codeOnly), the package twin carries both as null, `.md` views and
  governance links open the set. The fresh snapshot also brought Figma's drift since 11-19: 16 new sets
  (Gauge, Sparkline, ActivityHeatmap, SplitBar, Dashboard/Media/CardStack blocks), `ActionButton` gone,
  pages renamed (`SplitButton (PRO)`, `FileUpload (✓)  (D)`, `UserMenu & MorphNav (PRO)`,
  `ReactionGroup (PRO) (1)`): ledger, families manifest and the block-page list follow Figma. `npm test`:
  4 known failures (exportAudit goldens ×3, pluginGithubPush size) — the figmaComponentsParity one is gone.

- 2026-11-20 · Phase 5 (2/2): `scripts/figma/bindings-check.figma.js` (read-only) + `scripts/figma-bindings.ts`:
  `npm run figma:bindings:prepare [-- --only=Key,…]` embeds every contract's per-state colour roles (fill ·
  stroke · text, root and named parts, Figma names, deduplicated to fit `use_figma`) into batches under
  `reports/figma-bindings/`; each batch returns only differences as tuples with a sample variant id;
  `npm run figma:bindings:report -- <results>` writes `source: figma:bindings` findings (PAR-001 wrong role,
  TOK-004 opacity that is not the role's own alpha, TOK-001 unbound paint), closing only components the run
  checked. `mergeFindings` gained `{ source, scope }`. First run on the library (2 batches, raw results in
  `governance/runs/2026-11-20-figma-bindings-*.json`): 119 components, 45 PAR-001 open, 0 TOK-004, 0 TOK-001.
  Two probe artifacts found and fixed on the way (Figma mirrors a translucent role's alpha into
  `paint.opacity` — 137/137 checked; a vector's text colour is its stroke; a part drawn by one nested
  instance is skipped). Not checked: parts with no same-named layer (listed per component in the run file),
  15 components without a Figma set or without colour bindings. `figmaBindingsCheck.test.ts` runs the Figma
  script on a fake file.

- 2026-11-20 · Phase 6: of the 45 `figma:bindings` PAR-001, 30 closed (run `governance/runs/2026-11-20-figma-bindings-3.json`,
  13 components, 0 differences). 26 were the checker's, confirmed on the library: stacked state fills (CloseButton,
  FABButton, ButtonGroupItem — code already draws `overlay`/`overlay2`), the `focus` edge that repaints the border
  (Checkbox ×7 — so the Checkbox "stroke vs ring" question is not a difference —, PaginationLink ×2, CloseButton),
  layer names (CalendarPresets `rail-label`, ComboboxPopover `empty-state`, AvatarGroup `action-surface`: `PART_LAYER`),
  the Popover arrow (fill + edge), AccordionItem `Variant=card` (not built in code; now "not checked"). Real ones fixed
  in the recipe: Textarea Loading spinner Content/subtle, Slider Disabled mark labels Content/disabled (+ the Slider root
  now carries its state, so its Disabled range shows at all), AccordionItem ghost-rounded Open / outline-* Surface/layer-1,
  Alert inverse icon Content/inverse. Checked in Storybook (computed colours). Commits 904e988 · 74ddb74 · dec4d83 · b26dca0.
  `npm test`: 4 known failures (exportAudit goldens ×3 — stale before this, now also carry these recipe changes —,
  pluginGithubPush size). `npx tsc -b` clean.
- 2026-11-20 · Skill text follows Figma (owner, 2026-11-20): `content.inverse-secondary` = body copy and the resting
  dismiss icon on `surface.inverse`; status icons there use `content.inverse` (Figma's Alert). Changed in
  `semanticArchitectures.ts`, skill regenerated (`gen:escala-skill`). `api/_pluginStudio.mjs` keeps the old prose until
  the next `bundle:plugin` from the plugin repo (frozen).

## Next
Everything automatable is done (Phases 1–6). What waits for the owner (César):
1. **15 binding differences that need a decision** (`source: figma:bindings`, each with both values and a node link):
   FeaturedIcon `Appearance=gradient` ×6 (Figma paints a gradient; no gradient colour role exists), Input and
   DatePickerTrigger text in `Value=placeholder` (Content/subtle; the contract has no Value-specific text role),
   Switch `io` ×4 (Figma: Content/on-action when on, nothing when off; code takes the track role), ModalFooter stroke
   (Figma none, code Border/subtle), Sheet content fill + stroke (Figma none, code Surface/layer-2 + Border/default).
2. **AccordionItem `Variant=card`** exists in Figma only (icon box + badge): build it in code (registry debt `rebuild`).
3. **Daily review**: add the bindings step to the scheduled task (account-side prompt; command in CLAUDE.md). The full
   run (2 `use_figma` calls) now compares whole paint stacks, so it may surface stacks the targeted Phase 6 run did not see.
4. **MOT-002 `none`**: the gate counts `none` as a decision, but `RecipeMotion` cannot say `none` yet (27 components).
5. **PAR-001 baseline** (story controls): FABGroup Open default, Modal Layout, ModalFooter Surface.
6. **Figma page name** `ReactionGroup (PRO) (1)` looks accidental; the manifest follows it until it is renamed.
7. **Export goldens** (`exportAudit` ×3) are stale since before Phase 1; refresh them on review.
8. **Merge `feat/agent-ready-contracts`** (owner review; never pushed by an agent).
