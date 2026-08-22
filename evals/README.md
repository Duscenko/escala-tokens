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

Axe / Playwright stays out of this folder (Vitest is `environment: 'node'`).
