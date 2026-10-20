# Generated assets

Written by `npm run gen:phosphor-icons` (also `predev` / `prebuild` / `postinstall`)
from the pinned `@phosphor-icons/core` package. Phosphor is MIT, so these files are
committed. Never edit them by hand.

- `phosphor-icons.ts` — the name/slug index, the regular bodies of the component
  icons (`PHOSPHOR_CORE_BODIES`) and their list (`PHOSPHOR_COMPONENT_ICONS`).
  Always bundled, small.
- `phosphor-body-<weight>.ts` — every icon in one weight, lazy-loaded by the browser.
- `phosphor-component-icons.ts` — the component icon set (`src/lib/componentIcons.json`)
  in all six weights. The Figma plugin bundles this file, so it has no imports.

To add a component icon: add it to `src/lib/componentIcons.json`, run
`npm run gen:phosphor-icons`, then rebuild the plugin and `npm run bundle:plugin`.
