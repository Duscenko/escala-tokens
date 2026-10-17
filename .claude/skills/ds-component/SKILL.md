---
name: ds-component
description: SUPERSEDED for Escala. Do not use. Escala components are the catalogue plus the Figma plugin, not packages/contracts. See ds-figma-component.
---

# Not the Escala path

This skill authors Weave contracts under `packages/contracts`. Escala does not have that tree. A component is an entry in `src/lib/componentCatalogue.ts`, and its Figma set is built by the plugin. Follow `ds-figma-component`.

# Contract-first component authoring

Name the governing ADR or proposal before authoring a new contract. If no decision exists,
record the missing decision and resolve it within the user's authorized scope; do not silently
invent an API. Existing contracts and their governing records are sufficient for regeneration.

## Read the applicable contracts

- Always read `packages/contracts/components/README.md` and the selected backend's emitter README.
  Read `packages/react/src/emit/README.md` for the generated-output ownership rules, even when
  choosing another backend; framework-specific mechanics come from that backend.
- Read `packages/contracts/prop-canon.json` before naming an axis. The generated
  `.ai/maps/prop-map.md` attributes API spellings to each backend.
- For authoring, use [authoring-the-contract.md](references/authoring-the-contract.md).
- For anatomy, layout, and regeneration, use [component-anatomy.md](references/component-anatomy.md).
- For paint channels and consumer themes, use [token-policy.md](references/token-policy.md).

## Author, generate, verify

1. Resolve the component, governing decision, backend, and output directory from the request or
   repository context. Only ask for missing information that changes the result.
2. Write or update `packages/contracts/components/<Name>/<Name>.contract.json` and its changelog.
   Intent, axes/defaults, state ownership, anatomy, semantics, and layout come from the decision.
   Unknown accessibility claims remain recorded gaps. Never invent a field to fill a blank.
3. Add the chosen backend binding under `packages/<backend>/bindings/` using its schema and
   adjacent bindings. Shared web facts belong in the platform layer. If a declared feature cannot
   be emitted, report that limitation and fix the emitter within the agreed scope.
4. Read back `pnpm contract <Name> --backend <backend> --pretty`. Review the resulting public API.
5. Generate with `node packages/<backend>/src/emit/emit.mjs <Name> --out <consumer-directory>`.
   The emitter writes a component subdirectory. Regenerate owned source and structure; preserve
   existing consumer theme files. Change emitter templates, never patch generated output by hand.
6. Run `pnpm prop-map`, inspect vocabulary findings, then `pnpm verify`. Exercise changed browser
   behavior with `pnpm test:browser` and a focused fixture when the current lane lacks coverage.
   Test the generated consumer code, not only the emitter's own derived metadata.

Report the governing decision, contract/API changes, generated destination, tests, and limitations.
Do not add a hand-written component to a package barrel: these packages ship emitters and behavior,
and consumer repositories own the generated components.
