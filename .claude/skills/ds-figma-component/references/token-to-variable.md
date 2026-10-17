# Escala names to Figma variables

Bind component paint and page chrome to the **semantic** variable. The plugin is what creates these variables. This file is how a skill looks one up. It is not a second token list.

Three spellings of one path:

```
JSON / catalogue     action.primary.default
Figma variable       Action/primary/default
CSS                  var(--color-action-primary-default)
```

A dot in a Figma variable name throws and aborts the import. Slashes only.

## Collections that exist after a plugin import

| Collection | Tier | What binds here |
| --- | --- | --- |
| `Color Semantics` | token | Color roles. One mode per brand theme (Light, Dark, …). |
| `Color Primitives` | primitive | Ramps. Do not bind a component to these. |
| `Dimension Semantics` | token | Length roles, grouped. Modes are Desktop, Tablet, Mobile. |
| `Dimension Primitives` | primitive | The px ladder. Do not bind a component to these. |
| `Typography` | token | Type roles. Modes are viewports. Text styles are `Type/<role>`. |

Groups inside `Dimension Semantics`: `Spacing/`, `Radius/`, `Stroke/`, `Size/`, `Selector/`, `Grid/`.

## Names to look up

Color, in `Color Semantics`:

| Job | Variable |
| --- | --- |
| Page | `Surface/page` |
| Card | `Surface/layer-1` |
| Raised card | `Surface/layer-2` |
| Field fill | `Surface/input` |
| Primary button fill | `Action/primary/default` |
| Primary hover / pressed | `Action/primary/hover`, `Action/primary/pressed` |
| Label on that fill | `Content/on-action` |
| Body text | `Content/primary` |
| Secondary text | `Content/secondary` |
| Link | `Content/link/default` |
| Control stroke | `Border/control` |
| Decorative stroke | `Border/default` |
| Focus ring | `Border/focus` |

Length, in `Dimension Semantics`:

| Job | Variable |
| --- | --- |
| Control radius | `Radius/role/control` |
| Button radius | `Radius/role/action` |
| Card radius | `Radius/role/container` |
| Pill | `Radius/role/pill` |
| Tight gap | `Spacing/role/gap-tight` |
| Control gap | `Spacing/role/gap-control` |
| Section gap | `Spacing/role/gap-section` |
| Page inset | `Spacing/role/inset-page` |
| Control stroke width | `Stroke/role/control` |
| Focus stroke width | `Stroke/role/focus` |

Text styles, not variables: `Type/body-md`, `Type/button`, `Type/label`, `Type/caption`, `Type/heading-md`. Apply the style. Do not set `fontName` and `fontSize` by hand or the style's variable links are dropped.

Shadows are effect styles the plugin imports, not variables. Apply the style.

## Lookup

Scope by collection. `Border/default` in the wrong collection is a miss, and a miss tempts a hex.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const scoped = (colName) => {
  const id = (cols.find((c) => c.name === colName) || {}).id;
  return (n) => vars.find((v) => v.name === n && v.variableCollectionId === id);
};
const color = scoped('Color Semantics');
const dimension = scoped('Dimension Semantics');
const fill = color('Action/primary/default');
const radius = dimension('Radius/role/action');
```

A placeholder paint has to exist before `setBoundVariableForPaint`, or the bind reports success and does nothing.

## What a miss means

If `Color Semantics` itself is absent, the plugin import has not run. Stop. Do not recreate the collection.

If one role is absent, report the name. Do not substitute a primitive (`accent/9`, `dimension/16`) and do not substitute a nearby role. The component's real binding is whatever the plugin wrote on that node. Read `boundVariables` back. The render can look right when the value is a baked literal, because a single mode hides the difference. Flip the Color Semantics mode to see it.
