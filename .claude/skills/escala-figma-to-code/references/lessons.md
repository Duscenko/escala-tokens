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

# Lessons from the CloseButton (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| `figma-read-set.js` output over 48 KB (`use_figma` limit) on a 600-variant set | "Return value exceeds the 48000-byte limit"; edits not committed | Split the read: props + variant count first, then the one-axis sweep (≈10 KB), then colours GROUPED by Appearance · Variant · State with a check that Shape / Size do not change them (one line per group instead of 600) |
| Hover / Pressed drawn as the SAME translucent fill stacked 2–3× (no role of their own) | `fills: [Surface/inverse, Surface/inverse-muted]`; a recipe `fill` takes one ref | Recipe props `overlay` / `overlay2` (colour refs laid over `fill`; CSS gradient layers, `recipeStyles.ts`). `fills[0]` is the BOTTOM layer in the Plugin API |
| A paint `opacity` next to a bound variable | `0.149` on `Surface/inverse-muted` looked like a second multiplier | It is the variable's own alpha (white-a.3). Never copy it as an opacity |
| Focus is a halo OUTSIDE with no edge on soft / solid, an inside stroke + halo on outline / ghost | The `ring`-alone path draws a FIELD halo (straddling the edge) | Recipe prop `halo` (`0 0 0 stroke.focus` outside); outline / ghost keep `focus` + `ring` |
| `get_screenshot` is composited over the page, not transparent | A white overlay over a near-white page reads as the page | Sample the screenshot's pixels (sharp, from a copy of the script placed in the repo so `sharp` resolves) at a point off the glyph; compare with the alpha composite of the Storybook layers. Focused variants export 2px larger on each side (the outside ring) |
| Plugin parity test demands a builder for every web recipe | `RECIPE_BUILDERS` keys ≠ recipe keys after adding a recipe | The plugin is frozen: add the key to `WEB_ONLY` in `componentRecipesPluginParity.test.ts` (a decision, with the date) |
| Things that move when a catalogue key + recipe are added | 7 failing tests | `npm run gen:registry-sources`; `public/sitemap.xml` line (no generator: the file mirrors `sitemapXml()`); `exportAudit -u` (read the diff: only added lines); store version + migration so existing selections get the key; `node scripts/build-plugin-studio.mjs` |
| A running Storybook from another chat holds port 6006 | `preview_start` refuses | Point the Browser pane at it with `preview_start {url}`: same folder, so HMR serves your files |
