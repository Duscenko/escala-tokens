# Escala orchestration (kit v3): setup, 2026-11-20

The owner's kit (`~/Downloads/escala-orchestration`) turns the main Claude Code session into a **lead**: it reads
`governance/focus.md` and `pending.json`, routes work to four helpers and checks the result. It complements the
agent-ready contracts (`design-plans/agent-ready-contracts.md`): the contract says what a component **is**, the new
intent file (`spec/intent/<Key>.intent.json`) says what it is **for**. Branch `chore/orchestration-setup`, stacked on
`feat/agent-ready-contracts` (the intents read its v2 contracts and findings).

## What was installed
- `.claude/agents/`: `foundations-pull`, `storybook-builder`, `library-sync`, `escala-auditor`.
- `AGENTS.md`: the *Escala orchestration* section (between `escala-orchestration v3` markers); `CLAUDE.md` points to it.
- `governance/focus.md`, `pending.json`, `gates.json` (none existed before).
- `scripts/check-intent.mjs`, `check-docs-links.mjs`, `run-gates.mjs`; `npm run check:intent · check:docs-links · gates`.
- CI: `npm run gates` added to the `test` job of `.github/workflows/ci.yml` (Node 22, the repo's own). The kit's
  `escala-checks.yml` was not added: Storybook is already built by `web-storybook-parity.yml`.
- Storybook MCP: `@storybook/addon-mcp@10.6.4` (same version as Storybook; 10.6.8 was published today and wants
  Storybook 10.6.8), `features.componentsManifest` in `apps/storybook/.storybook/main.ts`, project server
  `storybook` in `.mcp.json`. Checked 2026-11-20: `/mcp` answers, tools `docs-list · docs-show · docs-show-story ·
  get-storybook-story-instructions · stories-changed · stories-find-by-component · stories-preview`.
- 134 intent drafts (Switch corrected to the contract's states), all `draft`. Readable view:
  `design-plans/intent-drafts-2026-11-20.md`.

## Where the kit was adapted
- `check-intent.mjs` skips `kind: "block"` entries of `spec/contracts/index.json` (intents are for components).
- `check-docs-links.mjs`: skips `docs/history/` and test goldens (records quote old paths), reads the short forms the
  docs use (`lib/x.ts` = `src/lib/x.ts`), and ignores Figma group names (`Spacing/`). 408 → 164 broken.
- The kit's tool name `list-all-documentation` does not exist; the MCP calls it `docs-list`.
- The Preview key is filled in (`X736U9ffkni3gg6rmvEEnJ`, `src/lib/figmaKit.ts`).

## Gates today
| Check | Mode | Today |
|---|---|---|
| `check:story-parity` | gate | passes |
| `figma:inventory:check` | gate | passes |
| `check:intent` | gate | passes (134/134 files; all drafts, which is a note, not a failure) |
| `check:docs-links` | report | 164 broken: 133 moved or renamed, 18 deleted on purpose (MCP, Polar, Untitled icons), 10 planned (`tokens/`, `governance/lock.json`, `governance/rules/`), 3 sibling plugin repo |

## Contradictions found (for the owner)
- ~~Repo skill named like the account skill~~ → decided 2026-11-20: the repo copy is now `escala-platform-roles`
  (generated, says the account `escala-architecture` wins); the portable build keeps the account name.
- `storybook-builder` requires a Workshop page `✎ <Name> · ready` before code, but the last weeks built Blocks
  straight from the library (exceptions `STG-001`). From now on the gate applies.

## Next
- Owner: answer the intent questions (262; grouped by theme in the view), approve intents one by one.
- Owner: the visual decisions (the 15 binding findings) on a decision page in the Workshop file.
- Owner: say *push* to open a PR (none opened).
