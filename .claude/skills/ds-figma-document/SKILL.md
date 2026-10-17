---
name: ds-figma-document
description: Lay out the Figma page around an Escala component set — title, description from the catalogue, labelled cell grid, and extension tables for properties that are not variant axes. Use when asked to document a component page, add the grid, show states, or reorganise component pages. Works on sets the plugin already imported.
---

# ds-figma-document

Builds the page around a component set the plugin already imported. It does not create the set. That is `ds-figma-component`.

The set on the page is an **instance of the plugin's set**, so it already wears the file's tokens. The page chrome around it (title, labels, cell strokes, table fills) binds to the same semantic variables. Nothing on the page is a hex.

## When this, and when `ds-figma-component`

| You want | Skill |
| --- | --- |
| The sets are not in the file yet | `ds-figma-component` |
| The page around a set: description, labels, states | **this one** |
| To reorganise several documentation pages | **this one** |
| To add a variant axis | the plugin, then re-import — not this skill |
| To show a state without adding an axis | **this one** — extension tables |

## Where the words come from

Read the entry in `src/lib/componentCatalogue.ts` (`COMPONENTS`). Use its `label`, `description`, `usage`, `axes`, `props` and `accessibility`. Do not paraphrase an axis that is not in `axes`. If `figmaSets` is empty, say the set is not in the library yet and do not invent a set name.

## Prerequisites

- The set is already in the file (Full catalogue import). If it is not, stop and run `ds-figma-component` first.
- File key from `.figma/manifest.json` → `sources.target.key`. The user confirmed that file.
- Load the `figma-use` skill before any `use_figma` call. `create_session` with that file key. `await figma.setCurrentPageAsync(page)` to change pages. Never `figma.currentPage =`.
- Variable names and collections: [../ds-figma-component/references/token-to-variable.md](../ds-figma-component/references/token-to-variable.md).

## The anatomy of a documented page

```
Frame "<Component>"            VERTICAL auto-layout, 64 gap, 64 padding
├── Frame                      title + description
├── Frame "component"          an instance of the public set — what a designer drags in
├── GROUP "<set name>"         ← one per figmaSets entry
│   ├── Labels                 axis brackets + one label per column and row value
│   ├── cell grid              dashed cells, one per variant
│   └── COMPONENT_SET          the plugin's set, overlaid on the cell grid
└── ext: <Property>            extension table — locked instances, tinted
```

Put this frame on a page named `Documentation / <label>`. Do not rebuild it inside `⬡ Components Overview` and do not delete nodes the plugin created.

The group and the auto-layout frame do opposite jobs. Layout laws: [references/layout-mechanics.md](references/layout-mechanics.md). Those laws still hold. The calls that write them go through `use_figma`, not `figma_execute`.

One group per name in `figmaSets`, in catalogue order. The public instance sits above the groups.

## The "How to use" companion frame

For a set with more than one axis, add a second frame beside the doc frame, titled `How to use: <label>`.

| Section | Prose answers | The example shows |
| --- | --- | --- |
| Properties | what each catalogue axis does | one row per axis, one cell per value |
| Props | text, boolean and slot props that are not axes | one row per prop from `props` |
| Appearance | values bind, so theme modes cascade | one row per axis, each cell on an explicit Color Semantics mode |

Appearance is worth building because Color Semantics has one mode per brand theme (Light and Dark on a default system). `cell.setExplicitVariableModeForCollection(colorSemantics, modeId)` shows the flip in place. Dimension Semantics modes are viewports (Desktop, Tablet, Mobile), not color. Do not use a viewport mode as the color flip.

Align every table's left edge by giving all row labels one width.

## Read these when you're in their territory

| When | Read |
| --- | --- |
| Placing anything | [references/layout-mechanics.md](references/layout-mechanics.md) |
| Building an extension table | [references/extension-tables.md](references/extension-tables.md) |
| Binding a paint or a length | [../ds-figma-component/references/token-to-variable.md](../ds-figma-component/references/token-to-variable.md) |
| Writing the description | The section below |
| Naming an axis or a value | the catalogue entry's `axes` |

## Workflow

### 1. Survey before touching anything

Read the page with `get_metadata` before writing. If a documentation frame for this component already exists, update it. Do not delete the plugin's sets or the overview sheet.

### 2. Title and description

Three short paragraphs, in this order, from the catalogue entry:

1. **What it is** — `description`, plus the axis names.
2. **What it binds** — fills and strokes are semantic variables, which is why a token change repaints the instance. Name the roles you actually measured on the set (for a primary button, `Action/primary/default` and `Content/on-action`). Do not guess a role you did not read off the node.
3. **What the axes are, and what is absent** — list `axes`. A property in `props` that is not an axis is called out as an extension, not as a variant. Quote `accessibility` when it changes how the control is used.

Bind the description to a text style that exists (`Type/body-md` or the closest role already in the file). Do not invent a text style for the title.

### 3. The component group

The plugin's set, the dashed cell grid, and the labels, in one GROUP. Cells must be whole pixels. The grid shows the representative variants the plugin built, not a cartesian product the import deliberately skipped. Say so in the description when the set is a representative cut.

### 4. Extension tables

For every `props` entry that is not a variant axis. See [references/extension-tables.md](references/extension-tables.md).

The test: would modelling it as an axis multiply the whole set? If yes, it is an extension table. If the set already has that axis, do not build a second table that repeats it.

### 5. Verify

- Screenshot the frame. Nothing overlaps. The frame hugs its content.
- Flip `Color Semantics` to the other theme mode. Bound paints repaint. Anything that does not is a baked literal: annotate it on the node. Clear the explicit mode afterwards.
- Confirm every extension instance is `locked`.

### 6. Record

Update `.figma/maps/components.json`. Add the documentation frame id and which extension tables exist. An entry means the page is done.

## Caveats belong in Figma annotations

```js
node.annotations = [{ labelMarkdown: '**Fill does not inherit.** …', categoryId: '1:0' }];
```

| id | Category | Use for |
| --- | --- | --- |
| `1:0` | Development | what could not bind, what is literal |
| `1:1` | Interaction | which states are axes, what a prop means |
| `1:2` | Accessibility | contrast worth checking; quote the catalogue line |
| `1:3` | Content | placeholders someone is expected to replace |

Put annotations on the set the designer clicks.

## The honesty rule

A baked literal is annotated on the node. Exhaust the semantic variable first. A missing role is reported, not replaced with a hex that looks close.

## Housekeeping

Stay inside `Documentation / <label>`. Delete a half-built frame from a failed attempt before retrying. Never delete a node the plugin created unless that is the task.
