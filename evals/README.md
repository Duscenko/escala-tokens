# Agent-bundle evals

Corpus of *agent-like* snippets. They are not a live model call — CI would
be flaky and the color layer must stay DOM-free.

`src/lib/__tests__/agentEvals.test.ts` builds `checkers/token-lint.mjs` from
`system.json` and runs it on every `pass.*` / `fail.*` file:

| File | Expected |
|---|---|
| `pass.semantic-button.tsx` | exit 0 — only `var(--…)` |
| `fail.hex-button.tsx` | exit 1 — `#7f56d9` is a token |
| `fail.raw-px.tsx` | exit 1 — `16px` / `8px` are tokens |

It also writes the bundle's `contracts/` and `checkers/binding-lint.mjs` to a temp
folder and runs the binding checker, which reads each contract's `bindings`:

| File | Expected |
|---|---|
| `pass.state-roles.css` | exit 0 — Default, Hover and critical Hover paint their bound roles |
| `fail.wrong-state-role.css` | exit 1 — Button Hover painted with `action.primary.default` (the contract binds `action.primary.hover`); token-lint alone passes it |

`npm run eval` runs this file only.

Axe / Playwright stays out of this folder (Vitest is `environment: 'node'`).
