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
| A DROP_SHADOW with SPREAD on a frame that does not clip content | I copied `DROP_SHADOW 0 0 0 spread 1` as a 1px outer edge (`outerEdge`); Figma paints nothing there (it applies spread only to clipping frames / rectangles / ellipses). The export reserves the pixel (121×42) but it is transparent | Removed. `figma-read-set.js` now flags it. **When an effect is in doubt, read the PIXELS of the Figma render** (get_screenshot → PNG → `sharp` raw), never the export size or the Tailwind |
| A transparent CSS border on a control Figma draws WITHOUT stroke | The top highlight sat 1px below the top edge (a band of fill above it) | Stroke width per appearance: only `outline` gets `stroke.control`, the rest `stroke.none`; the padding gives the border back, so widths do not move |
| `recipeVars` resolved `stroke.*` as ROLES only | `stroke.none` (and `stroke.md` steps in Slider / Tabs) previewed as 1px | `previewDimension`: a role, else the ramp step (`t.stroke[name]`) |
| Story controls drifted from Figma's playground | Wrong order, trailing icon off by default, no icon swap | Same order and defaults as the panel; swaps via `iconSwapArg` |
| An old plan said "fix the focus ring in Figma" | A `use_figma` call rebound focus variables in the file | Rule 2: never edit the file — every call in this skill is read-only |
| Composites nesting a variant the plugin cut left out | Fell back to the default variant | Plugin only (frozen): `NESTED_DEMANDS` + `componentNestedVariants.test.ts` |
