# Skills

Agent skills for Escala. Load one when the task is in its territory. A skill is the procedure and the traps, not a second description of the product.

## Figma

Escala already builds the library. The plugin in `../escala-figma-plugin` (`src/code.ts`) imports variables and component sets. These skills do not draw a second Button.

```
Sync now  →  variables in the file (Color Semantics, Dimension Semantics, Typography)
                │
                ▼
Plugin import, Full catalogue  →  every catalogue set, paints bound to semantic variables
                │
                ▼
ds-figma-document  →  the page around each set
ds-figma-explain   →  boards that explain the system (any time)
```

| Skill | What it does | Writes |
| --- | --- | --- |
| [`ds-figma-component`](./ds-figma-component/) | Gets the catalogue into the file the user named, dressed with that file's variables. The plugin builds the sets. | Figma, `.figma/maps/components.json` |
| [`ds-figma-document`](./ds-figma-document/) | Lays out the page around a set that already exists: title, description, labelled cell grid, extension tables. | Figma, `.figma/maps/components.json` |
| [`ds-figma-explain`](./ds-figma-explain/) | Explanatory boards: graphs, spec tables, annotated anatomy, flows. Bound to semantic variables. | Figma |

### Which Figma skill

| You want | Skill |
| --- | --- |
| Every Escala component in a file, wearing this system's tokens | `ds-figma-component` |
| The page around a set: description, labels, states | `ds-figma-document` |
| A state shown without adding a variant axis | `ds-figma-document` — extension tables |
| A board that explains how something works | `ds-figma-explain` |

The file key comes from the user for this task. Read it from `.figma/manifest.json` → `sources.target` after they confirm it. Never type one, and never reuse a key from another design system.

## Not the Escala path

`ds-decide` and `ds-component` came in with the Weave template. They author ADRs and `packages/contracts` files this repo does not have. Do not follow them to create an Escala component. Components are `src/lib/componentCatalogue.ts`, mirrored from the plugin.
