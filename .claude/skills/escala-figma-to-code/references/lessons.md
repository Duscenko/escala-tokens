# Lessons from the Button (2026-11-12)

Every row cost a round trip with the owner. Check each one before calling a component done.

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Tailwind did not scan `src/` in Storybook (its Vite root is `apps/storybook`) | Button rendered `inline-block`; icons sat on the text baseline | `apps/storybook/.storybook/storybook.css` → `@source "../../../src"` |
| Storybook painted the web's default system | Blue (`#015ef0`) instead of the file's violet | `preview.tsx`: `buildStudioTokens({ accent })` + `applyFigmaFilePalette(brand)` |
| The file's palette is curated, not generated | 99 of 120 solid steps differed (pressed `#6945c1` vs `#7252c9`) | `src/lib/figmaFilePalette.generated.ts` (`npm run gen:figma-palette`), alpha twins pinned (`CustomColor.alpha`) — Storybook only |
| The plugin's `check-ground-truth --values` compares ALIASES | Green while hex values differed | `figmaFilePalette.test.ts` resolves every Color Semantics role and compares hex |
| Figma strokes are INSIDE, CSS borders OUTSIDE the padding | Button 2px wider than its Figma twin | `recipeStyles.ts`: padding minus `--escala-stroke-width` (registered, non-inherited) |
| Focus geometry | 3px edge + 3px halo | Controls: 2px edge inside (border + inset) + 2px halo outside. Fields: 1px edge, 2px halo straddling it (`outline`, negative `outline-offset`) |
| Focus colours differ per set | Code assumed one ring | Copy each set: Button `Border/focus` everywhere; IconButton keeps `Border/strong` / `Status/critical/border-strong` on solids (`focusPair`) |
| Solid fills carry effects | Missing top highlight | Recipe property `highlight` (`inset 0 2px 0 Elevation/highlight`), every solid state but Disabled |
| `get_design_context` Tailwind drops shadow SPREAD | Read as "0 0 0, paints nothing"; the solid Button lacked its 1px edge | `figma-read-set.js` shows `DROP_SHADOW 0 0 0 1 <fill>`; recipe property `outerEdge` (`0 0 0 var(--stroke-control) <fill>`) |
| Story controls drifted from Figma's playground | Wrong order, trailing icon off by default, no icon swap | Same order and defaults as the panel; swaps via `iconSwapArg` |
| An old plan said "fix the focus ring in Figma" | A `use_figma` call rebound focus variables in the file | Rule 2: never edit the file — every call in this skill is read-only |
| Composites nesting a variant the plugin cut left out | Fell back to the default variant | Plugin only (frozen): `NESTED_DEMANDS` + `componentNestedVariants.test.ts` |
