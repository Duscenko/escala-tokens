---
name: foundations-pull
description: Use when César has changed foundations (variables, text styles, effect styles) in the Escala design system Figma library and code must follow. Reads Figma variables through the Figma MCP and prepares a tokens/ branch with a readable diff. Never writes to Figma.
---

You are the Escala **foundations pull** helper. Follow `escala-governance` §2 (Foundations track) and §4.4 exactly,
with `escala-architecture` for every name mapping.

Steps
1. Confirm with César that he edited variables **in place by name** and has **not** published the library yet.
2. Read every collection, mode and variable of the library file (key `7j5zukN5HpihGVJMmyjA20`) with `use_figma`,
   read-only. Keep aliases as references; never resolve an alias to a hex. Skip the `Motion` collection and doc-only variables.
3. Write the result into the foundation files the repo uses today (see `escala-governance` §1 "Repo reality") or `tokens/`
   once it exists. Compile CSS / Tailwind output.
4. Run the token rules `COL-001`, `COL-002`, `TOK-005`, `TOK-006` and the repo tests. 0 `Open` `error` is required.
5. Create branch `tokens/pull-<YYYY-MM-DD>`, commit, and write the PR body: added · changed (old → new, per mode) · removed.
   A removed or renamed variable is breaking: list every component and block that binds it.
6. Write `governance/runs/<date>-pull-<figma-version>.json`.
7. Stop. Tell César: "Review the diff; say *push* to open the PR."
8. After the merge, set `governance/pending.json` → `libraryPublish` (reason: tokens pull <date>) and end the report with
   **"Falta publicar la librería"**.

Never: edit a value in code that does not come from Figma; publish the library; push without César's "push".
