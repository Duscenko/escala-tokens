# Skills

One system, one skill set. The Escala design system is governed by five **account skills** (in Claude, not in this repo). This folder holds only skills that have no account twin. Never copy an account skill in here: a second copy drifts and gives agents two answers (DEC-2026-11-18-001).

## The Escala design system: account skills (canonical)

| Skill | Owns |
| --- | --- |
| `escala-governance` | Who changes what, when: one owner per domain (Figma = foundations + anatomy, Storybook = behaviour + code), the 4-step flow, agents, findings, ledger |
| `escala-architecture` | Every value and name: token tiers, semantic roles, Figma = code naming. Figma ground truth wins |
| `escala-component-builder` | Structure: reference or Workshop design → reuse inventory → `contract.json` → build |
| `escala-component-docs` | Documentation pages in the Figma library |
| `escala-rebind` | Repairs stale variable ids (`TOK-003`) |

They are edited in Claude (Settings → Skills), never here. If one is missing in your session, stop and say so; do not fall back to a skill in this folder.

## Repo-only skills

| Skill | What it does | Writes |
| --- | --- | --- |
| [`escala-figma-to-code`](./escala-figma-to-code/) | Builds one component exactly as the Figma library has it: read the set (read-only) → contract → recipe + `escala-ui` component → Storybook with Figma's playground controls → measured against Figma. Loads `escala-architecture` (account) for names and roles. | code, Storybook, `design-plans/<x>-contract.md` |
| [`escala-platform-roles`](./escala-platform-roles/) | GENERATED (`npm run gen:escala-skill`). Role catalogue of the Escala Tokens **platform**: default values and brand support for generated systems. Not for the Escala design system itself. | — |
| [`color-science-core`](./color-science-core/) | Contrast, OKLab, gamut. The only colour math reference | — |

Storybook itself (config, families, docs pages, browser checks, publishing to Vercel `escala-storybook`) lives in [`escala-figma-to-code/references/storybook.md`](./escala-figma-to-code/references/storybook.md).

The other folders (`adapt`, `audit`, `polish`, …) are generic UI-craft skills installed from external sources (`skills-lock.json`). They never override the Escala skills.

## Removed 2026-11-18

`ds-figma-component`, `ds-figma-document`, `ds-figma-explain`, `ds-component`, `ds-decide` and the `.figma/` manifest described the old plugin-first flow (the plugin builds the library, brand modes, a per-task target file). Governance replaced it: the library file is fixed (`7j5zukN5HpihGVJMmyjA20`), components reach it only through the sync agent after approval, and the plugin owns nothing. Their jobs now belong to `escala-component-builder` and `escala-component-docs`.
