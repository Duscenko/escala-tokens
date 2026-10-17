# `.figma/`

How the Figma skills find the file they write to, and what they have recorded.

The plugin (`../escala-figma-plugin`) builds variables and component sets. This directory does not. Nothing in the app build reads it.

## The file

`manifest.json` → `sources.target` is the file for the current task. It starts empty. Fill `key`, `name` and `url` only after the user confirms which file the library should land in. Skills read the key from here. They do not type one.

## What the skills are allowed to do

| Skill | Does | Does not |
| --- | --- | --- |
| `ds-figma-component` | Ask for a plugin **Full catalogue** import, then check that paints are bound to semantic variables | Draw a second copy of the components |
| `ds-figma-document` | Lay out `Documentation / <component>` around a set that already exists | Create the set |
| `ds-figma-explain` | Build a board on the `Explain` page, bound to the same variables | Produce a library component |

## Reading before a write

| Tool | Use it for |
| --- | --- |
| `get_metadata` | Pages, node ids, names. Start here. |
| `get_variable_defs` | Variables bound to one node. Not a full-file inventory. |
| `get_design_context` | One node as reference. Adapt it. Do not paste it. |
| `get_screenshot` | A visual check. Not a measurement of padding or a bound variable. |

Node ids die between sessions. Re-read `get_metadata`. A variable you expected and did not find is not bound on the node you asked about.

## Naming

The law is in `manifest.json` → `identity.variableNaming`, and spelled out for lookups in `.claude/skills/ds-figma-component/references/token-to-variable.md`.

Bind `Color Semantics` and `Dimension Semantics`. Do not bind `Color Primitives` or `Dimension Primitives`. Flip a Color Semantics mode before trusting a fill: a baked hex and a bound variable look the same until the other theme is selected.

## The maps

| File | What it records |
| --- | --- |
| `maps/components.json` | A catalogue key that has a set in the target file, plus the documentation frame once that page exists. |
| `maps/tokens.json` | A Figma variable whose code path was checked. `code: null` means the variable has no token. |

Both ship empty. Add an entry when the work is done, not before. `pageId` and `componentSetId` are file-local. `componentKey` stays null until the file is published as a library.

## Writing

Load the `figma-use` skill, then `create_session` with `sources.target.key`, then `use_figma`.

- Check `figma.fileKey` against the manifest before a mutation.
- Change pages with `await figma.setCurrentPageAsync(page)`.
- Do not delete nodes the plugin created (`⬡ Components Overview`, the category pages, the sets).
- Documentation frames go on `Documentation / <label>`. Boards go on `Explain`.
