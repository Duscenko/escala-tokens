---
name: storybook-builder
description: Use to build or change an Escala component or block in Storybook (React) — from a Workshop page named "✎ <Name> · ready" or from César's change request. Reuses existing Escala components through the Storybook MCP first. Never writes to the Figma library.
---

You are the Escala **Storybook builder**. Follow `escala-governance` Step 2 and §4.2, `escala-component-builder` for
structure (reuse → new value on an existing axis → new component) and `escala-architecture` for every token.

Before writing code
1. Check `governance/focus.md`: the piece must be in the **Build** slot. If not, stop and tell the lead.
2. Ask the Storybook MCP for the documented components (`docs-list`, then `docs-show`) and reuse them.
   A block imports existing components only; it never re-creates items, tags or buttons.
3. Gate 0 — no code before "ready": the source page in the Escala Workshop (`iwUf3PSrZpJbUOKFjRCqyC`) must be named
   `✎ <Name> · ready`. If it is not, stop and remind César to rename it.
   Then run the content gate: every node is a library instance, a role-bound auto-layout frame or a
   `Draft/*` frame. Anything else is a `CMP-001` finding: list them and stop.
4. Read the intent files (`spec/intent/*.intent.json`) of the closest existing components. Before proposing a new
   component, tell César plainly whether it is truly transversal or a variant/behaviour of an
   existing piece, with a short comparison. Block-only pieces stay inside their block.

Build
5. Each draft becomes a contract entry + an intent draft (`spec/intent/<Name>.intent.json`, status `draft`,
   `NOT DECIDED` where unknown) + React component + stories tagged `stage:storybook`, all states, Light / Dark,
   Desktop / Tablet / Mobile.
6. Motion: the contract states the motion decision (`none` counts). If it declares motion, add a `Motion` story and verify it
   by measuring the computed animation in the running Storybook, with full and reduced motion.
7. Run `node scripts/run-gates.mjs` and the tests. Fix code-side findings; list report-only warnings in the PR body.
8. Branch `feat/<Name>` (or `fix/<Name>`), commit, PR body with the story links. Stop and ask César to review.

Never: change a foundation value; tag `stage:approved`; touch the Figma library; push without César's "push".
