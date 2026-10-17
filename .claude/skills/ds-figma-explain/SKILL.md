---
name: ds-figma-explain
description: Build explanatory boards on an Escala Figma file — node graphs, spec tables, annotated anatomy, flows — with every paint and length bound to semantic variables. Use when asked to explain a component, diagram token tiers, or put a spec table in Figma. Not for producing library components.
---

# ds-figma-explain

Builds boards that are read, not instantiated. Component sets are `ds-figma-component`. The page around a set is `ds-figma-document`.

## When this, and when the other two

| You want | Skill |
| --- | --- |
| A board that explains how something works | **this one** |
| Catalogue components in the file, wearing tokens | `ds-figma-component` |
| The page around a set | `ds-figma-document` |
| An anatomy mock with numbered callouts | **this one** |

Every number on the board comes from the repo or from a live read of a variable. An unmeasured value is drawn as unmeasured.

## The binding rule

Nothing on the board is a literal colour, font size, radius or space.

`assets/diagram-kit.js` resolves paint through `tokens()` to a variable in `Color Semantics`, a length in `Dimension Semantics`, or a text style `Type/<role>`. The `CONFIG` block in that file is the Escala map. Do not point it back at another system's collection names. If a lookup fails it is listed in `T.unresolved`. Put `T.report()` in the reply. A board of fallbacks is a board of literals.

## Before writing

1. File key from `.figma/manifest.json` → `sources.target.key`, confirmed by the user.
2. Load the `figma-use` skill. `create_session` for that file. Then `use_figma`.
3. `await figma.setCurrentPageAsync(page)` to change pages. The code passed to `use_figma` is already async: top-level `await`, bare `return`. Do not wrap it in an async IIFE.
4. Screenshot the target page first. Find clear space. Place the board in a named frame on a page called `Explain`, not on top of `⬡ Components Overview`.
5. Read the source you are explaining. A component's axes and words are its `COMPONENTS` entry. A token's Figma name is the slash path (`action.primary.default` → `Action/primary/default`). Do not invent either.

## Using the kit

Paste the functions you need at the top of the `use_figma` code. The sandbox has no imports.

```js
/* ...kit functions... */
const T = await tokens();
await loadFonts();
/* ...build... */
return { ...summary, unresolved: T.report() };
```

`documentAccess` is dynamic-page. Lookups are async (`getNodeByIdAsync`, `setCurrentPageAsync`, `page.loadAsync()`, `setTextStyleIdAsync`).

## Artefact types

| Type | Use when | Kit entry points |
| --- | --- | --- |
| Node graph | Token tiers, component composition | `frame`, `section`, `elbowPoints` |
| Spec table | Axes and props from the catalogue | `section`, table helpers |
| Annotated anatomy | Parts of one component | `annotate` |
| Flow | A sequence | `elbowPoints` |

Default for one component: a graph of its parts plus a spec table of `axes` and `props`.

## Build in two passes

1. Structure — frames, sections, layout. Screenshot. Fix alignment before adding detail.
2. Detail — text, connectors, annotations. Connectors last. They are positioned from resolved bounds.

## Validate both themes

Color Semantics has a mode per brand theme. Prove the board follows them:

```js
frame.setExplicitVariableModeForCollection(T.colorScheme, otherModeId);
// screenshot
frame.clearExplicitVariableModeForCollection(T.colorScheme);
```

If nothing changes, a paint is a primitive, a hex, or pinned to one mode. Dimension Semantics modes are viewports. Flipping those checks length, not color.

## Guardrails

- Place everything inside a named frame.
- Delete a partial frame before retrying.
- Do not mutate plugin-owned nodes unless that is the task.
- Do not create a page that already exists. Check `figma.root.children` first.
- Return counts and `T.report()`, not a node dump.

## Reporting

Say what you built, which page it is on, what you measured it from, what you could not represent, and what `T.report()` returned.
