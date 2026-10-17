# Generation recipe

Plugin API traps for a `use_figma` call. Escala does not build component sets from this recipe. The plugin does. Use this when a documentation page or a board has to create frames, bind a variable, or inspect a set that already exists.

Load the `figma-use` skill first. The code is an async body: top-level `await`, a bare `return`. Do not wrap it in an async IIFE.

## Preflight

Read the key from `.figma/manifest.json` → `sources.target.key` on the agent side, then check it inside the call. The sandbox cannot read the repo.

```js
const EXPECTED = '<from .figma/manifest.json -> sources.target.key>';
if (figma.fileKey !== EXPECTED) return { ABORT: 'wrong file', fileKey: figma.fileKey };
```

Change pages with `await figma.setCurrentPageAsync(page)` after `await page.loadAsync()`.

## Binding

Scope every lookup by collection. Token tier only: `Color Semantics`, `Dimension Semantics`. Never `Color Primitives` or `Dimension Primitives`. Names are in `token-to-variable.md`.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const V = (colName, varName) => {
  const id = cols.find((c) => c.name === colName).id;
  return vars.find((v) => v.variableCollectionId === id && v.name === varName);
};
```

A placeholder paint has to exist before `setBoundVariableForPaint`, or the bind reports success and paints nothing:

```js
node.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
node.fills = [
  figma.variables.setBoundVariableForPaint(
    node.fills[0],
    'color',
    V('Color Semantics', 'Surface/page'),
  ),
];
```

Lengths:

```js
node.setBoundVariable('itemSpacing', V('Dimension Semantics', 'Spacing/role/gap-control'));
node.setBoundVariable('topLeftRadius', V('Dimension Semantics', 'Radius/role/action'));
```

Text uses a style the plugin created (`Type/body-md`), not `fontSize`. `figma.createText()` starts as Inter Regular, so load that font before the first write even when a style is applied next.

```js
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const label = figma.createText();
label.characters = 'Button';
await label.setTextStyleIdAsync(bodyStyle.id);
```

## Gotchas

| Symptom | Cause |
| --- | --- |
| `Cannot call with documentAccess: dynamic-page` | Use `await figma.setCurrentPageAsync(page)` |
| Another page's `children` is empty | `await page.loadAsync()` first |
| Components collapse to 1px | `resize()` called after the sizing modes |
| A frame is stuck wide, children overflow | `resize()` forces both axes FIXED. Restore the one you did not mean to pin |
| `'HUG' is not a valid value` | Hug is `'AUTO'` |
| Variable binding silently does nothing | No placeholder paint before `setBoundVariableForPaint` |
| Bound the wrong colour | Lookup not scoped. `Color Semantics` and `Color Primitives` are both colour collections |
| Text stacks one character per line | `FILL` on a `HEIGHT` node with no width. Set a width, then `layoutSizingHorizontal = 'FILL'`, then `textAutoResize = 'HEIGHT'` |
| Long text overflows | `maxWidth` belongs on the text node, not the frame |
| `textStyleId` setter throws | `await node.setTextStyleIdAsync(id)` |
| `Cannot write to node with unloaded font "Inter Regular"` | Load Inter. `createText()` starts there |
| Whole set ignores a theme switch | An explicit mode is pinned. `clearExplicitVariableModeForCollection` |
| `layoutSizingHorizontal` throws | Node not appended to an auto-layout parent yet |
| Huge or truncated tool response | Returned full `componentPropertyDefinitions`. Return counts and samples |

## Documenting the set once it exists

The page around a set is `ds-figma-document`, not this file.
