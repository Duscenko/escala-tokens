---
name: ds-figma-component
description: Bring Escala catalogue components into a Figma file dressed with that file's semantic variables. Use when asked to send components to Figma, sync the library, or generate component sets from this repo. The plugin builds the sets; this skill does not redraw them.
---

# Bring Escala components into Figma

The component sets are built by the plugin (`../escala-figma-plugin/src/code.ts`). This skill gets them into the file the user named and checks that they wear that system's tokens. It does not draw a second library with `use_figma`.

Source of the matrix: `src/lib/componentCatalogue.ts`. Each `key` is a plugin gate. `axes` is the variant matrix. `figmaSets` is the set name in the file (`Button`, `Input`, …). `COMPONENTS` is the full list. `FIGMA_SAMPLE_KEYS` is only the default 9-key overview. **Full catalogue** is what lands every type.

## Paint

Every fill, stroke and radius on a generated set binds to a **semantic** variable. Color roles live in `Color Semantics` (`Action/primary/default`, `Content/on-action`, `Surface/page`). Lengths live in `Dimension Semantics` (`Radius/role/container`, `Spacing/role/gap-tight`). Type lives in text styles `Type/<role>` (`Type/body-md`, `Type/button`).

Bind the role, never the primitive. `Color Primitives` and `Dimension Primitives` are hidden sources. A hex is a failed bind: annotate it, do not ship it as the fill.

Naming, collections and the lookup are in [token-to-variable.md](references/token-to-variable.md). Plugin API traps, if a later `use_figma` call has to touch a node, are in [generation-recipe.md](references/generation-recipe.md).

## Steps

1. **Name the file.** Take the file key from the URL the user gives (`figma.com/design/:fileKey/…`). Confirm it is the file they want the library in. Write that key into `.figma/manifest.json` → `sources.target` only after they confirm. Do not hard-code a key, and do not keep a key from another system.

2. **Variables first.** The sets bind to variables that have to already be in the file. The user publishes from Escala (**Sync now**) and runs the plugin import so `Color Semantics`, `Dimension Semantics` and `Typography` exist. If `Color Semantics` is missing, stop and say so. Do not create a parallel variable collection.

3. **Import the catalogue.** In the plugin, the import that builds every component is **Full catalogue**, not the default overview. The default overview builds only `FIGMA_SAMPLE_KEYS` (Button, Input, Select, Checkbox, Toggle, Badge, StatusBadge, Toast, Avatar). Full catalogue builds every `figmaSets` entry with the whole catalogue matrix (every axis value, every combination: Button 288, Input 168…). The user starts it inside Figma from Overview → Component library → **Build full catalogue** (or Settings → Full catalogue). It can take a few minutes. Tell them that is the step, and wait until it has run.

4. **Check the bind.** Load the `figma-use` skill, `create_session` for that file, then `use_figma`. Confirm `figma.fileKey` is `sources.target.key`. Open `⬡ Components Overview` (and the category pages Full catalogue added). Instantiate one primary Button. Its fill must be bound to `Action/primary/default` and its label to `Content/on-action`, in collection `Color Semantics`. Radius must be a `Radius/role/…` variable in `Dimension Semantics`. A solid hex with no bound variable is a failure. Spot-check one component per `CATEGORIES` group, not only Button.

5. **Record.** After the sets exist, add one entry per finished component to `.figma/maps/components.json` (schema in `.figma/schema/components.schema.json`). `source` is `target`. `codePath` is `src/lib/componentCatalogue.ts#<Key>`. `axes` must match the catalogue entry's `axes`, not a renamed list. `componentKey` stays null until the file is published as a library. Record `pageId` and `componentSetId` as refreshable. Do not write the entry before the import has succeeded.

6. **Hand off.** The page around the set — title, description, cell grid, extension tables — is `ds-figma-document`. Do that next when the user wants the sets documented. Do not restyle the plugin's own overview sheet to serve as that page.

## Do not

- Run `scripts/contract-plan.mjs`. It reads Weave contracts this repo does not have.
- Draw the component again in `use_figma`. A second Button drifts from `code.ts`.
- Treat `FIGMA_SAMPLE_KEYS` as the whole library.
- Invent a token name, a hex, or an axis the catalogue does not list.
