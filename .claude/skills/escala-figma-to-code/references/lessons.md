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

# Lessons from the TextLink (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A trimmed copy of `figma-read-set.js` dropped node `opacity` | Underline read as `Content/link/default`; the pixels said ink at 40 % (`(194,180,230)` vs `#6945c1`) | Never trim the script's `describe`; split the READ across calls instead. Pixels caught it — always sample a state with an effect-like detail (underline, edge) |
| A node opacity set by hand in the file (0.4 underline, 1 on Hover / Pressed) | The recipe language has no opacity: refs are tokens | Recipe prop `opacity` (plain number string), listed in `NON_TOKEN_PROPS` so ref tables skip it. Use only where the file does |
| A stroke INSIDE that counts in the layout (`strokesIncludedInLayout`) | Focused root 181×29 vs 177×25: the link grows 4px on focus | Copied: the focused padding adds `stroke.focus` (`spacing.gap-tight+stroke.focus` X, `stroke.focus` Y). Say it in the report: it is a layout jump |
| A text style bound to the scale, not to a role (`Type/body-xl` → `size/text-xl`) | `type.body-xl` does not exist in code; no role in the file either | A type ref may be a scale step (`type.text-xl`): `typeStyleCss` falls back to it, `cssVarOf` reads the scale primitives, `figmaRefsFor` cites `Typography` `size/text-xl`, the registry supplies those vars. No new role |
| Adding a component grows the agent context | `exportAudit` I10-budget 75 631 > 75 000 | Budget 80 000 with a dated note (the Button change set the precedent). Not a runaway loop |
| A skill-doc test with a closed set of Figma collections | `Typography` collection not handled in `agentContextAudit` | Add the branch; the audit still checks every cited name exists in the payload |

# Lessons from the Input (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A Figma set's variant axes outnumber what the code's architecture splits across components | `Input` has FOUR variant axes (Size · State · Type · Value, 114 variants) but the repo already — deliberately — keeps `Type`/`Value` out of `Input` (icons/add-ons are `InputGroup`'s, per CLAUDE.md's shadcn split, predating this audit) | Don't widen the component's API to chase 1:1 axis parity on your own: build the axes that belong to THIS component (`Size`, `State`), document the rest in the contract's own "lo que queda fuera" section, and leave the ledger honest (`status.json` keeps it `pending` — the parity test compares ALL of a set's axes, so partial coverage can never silently read as "done") |
| A pre-existing recipe LOOKED already built to spec | `fieldBox()` (shared by Input/Textarea/InputGroup/Select/InputTag) already had the right shape for Default/Hover/Focused/Error | Still measure it against the real file rather than trusting it on sight — it had a real, measurable bug (next row) |
| Disabled was assumed to repaint the WHOLE box including the stroke | `fieldBox('Disabled')` returned `stroke: action.disabled.default`; the Figma file's Disabled variant keeps `stroke Border/control` — the ordinary neutral edge, only the FILL mutes | Fixed at the shared helper (`forms.ts`), so Textarea/InputGroup/Select/InputTag get the same correction for free — confirmed via their own golden snapshot diffs showing only that one line move |
| Figma's own `State` option wording differs from the code's | The file says `Invalid`; the component, recipe and catalogue all said `Error` | Renamed `Input`'s own `State` literal to `Invalid` (component type, recipe `INPUT_STATES`, catalogue axis, docs specimen, overview); `fieldBox()` itself now accepts EITHER literal, since Textarea/Select/InputOTP haven't had their own ground-truth pass yet and may still legitimately say `Error` |
| A `Value` (placeholder · filled) variant axis existing in Figma can still need NO prop in code | Tempting to add a `value`/`filled` prop to mirror the axis | The browser already renders `::placeholder` differently from typed text — the axis is fully covered by `pseudoSlots: { placeholder: { of: 'root', pseudo: '::placeholder' } }` already splitting `root.text` (typed) from `placeholder.text` (empty) |
| The halo mechanism (`ring`'s `outline-offset: calc(stroke-width - halo)`) was already correct, built for a PRIOR read of Input (a stale node id, `4:10640`, in an existing test) | Looked like new work was needed | Verified by reading computed styles in Storybook (`outline-offset: -1px` at `stroke-width:1px, halo:2px` — exactly the formula) instead of re-deriving it; the existing `recipeStyles.ts` case needed no change, only confirmation against the 2026-11-12 file |

# Lessons from the FABGroup (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A composite that nests another finished component (FABButton) needs no colour recipe of its own | FABGroup paints nothing — the trigger and every item are FABButton instances — but `componentRoles.test.ts` still demands every catalogue key have a `COMPONENT_RECIPES` entry | A minimal recipe covering only what IS a token: `stack`'s 12px gap (= `spacing.inset-control`, exact match, measured). The fan layouts' 100px radius matches no Dimension role (a composition literal) and gets no `root` entry at all |
| `scripts/registrySources.ts` finds a recipe by a REGEX over the literal JSX, `data-escala="X"` | Spreading `{...rootProps}` where `rootProps` held `'data-escala': 'FABGroup'` compiled fine but the generator's `/data-escala="([A-Za-z]+)"/g` never matched it — `registryItemFor('FABGroup')` came back `undefined` | Write `data-escala="FABGroup"` as a literal JSX attribute on the root, never through a spread object, in every component the registry serves |
| Adding a catalogue entry touches far more than the component + recipe | 8 failing tests after the component alone: golden exports (`-u`, additive only), the Figma-parity ledger (remove from `status.json`'s `pending`), `public/sitemap.xml` (`sitemapXml()` is generated, the file isn't — hand-sync it), the registry (`npm run gen:registry-sources`), and `componentOverviews.test.ts` (every component with `axes.length > 0` needs an Overview row) | Run the full suite after the catalogue entry lands, before writing Storybook — fix each failure by its own generator/ledger, never by hand-editing a generated file |
| A store migration is still expected for a component with no stored style field | Nothing to migrate, but the sibling commits (FABButton, TextLink) each bump `version` and splice the new key into `selectedComponents` | Same shape, one more migration block — keeps "selectedComponents defaults to all COMPONENT_KEYS" honest for a system saved before this component existed |
| A demo caption added to a Storybook story (not the component) failed the page's own a11y gate | `opacity: 0.6` on a 12px label under each FAB group measured 3.63:1 against the required 4.5:1 — the SAME instinct the whole token system polices, just in a hand-written story | Use a real ink token (`var(--color-content-secondary)`), never a raw opacity, even in throwaway story chrome — the a11y addon audits the whole canvas, not just the component under test |
| The Storybook canvas can lag a frame or two behind a `theme` global flip (light → dark), rendering the OLD background for a moment | Looked like a FABGroup-specific bug (white canvas under "Escala Dark") until the identical lag was reproduced on FABButton's own Playground right after | Not a component defect — wait a beat and re-screenshot before concluding a theme switch failed to apply; compare against an already-shipped sibling story before chasing it further |

# Lessons from the FABButton (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A NEGATIVE spread on a drop shadow of a frame that does not clip content is ignored too, not only the hard 1px ones | `DROP_SHADOW 0 12 16 spread −4` read as CSS `0 12px 16px −4px`: the shadow came out lighter (side edge 248 vs Figma 237). The render BOUNDS still count the spread (124×73), which is the trap | Drop the spread in CSS. Check by modelling a gaussian (σ = blur/2, offset) at one edge pixel and at the pixel below: with no spread it reproduced 237 and 219 against Figma's 237 and 220. `figma-read-set.js` flags only hard shadows: treat EVERY spread on a non-clipping frame as unrendered |
| Elevation geometry is hand-set per state in the file (not tokens) | Key / ambient offset and blur differ for Default, Hover, Pressed | Recipe prop `lift` (`rest` · `hover` · `pressed`, a plain string like `opacity`); the numbers live in `recipeStyles.ts` `LIFT`, the colours are `Elevation/shadow-key` and `shadow-ambient`, counted as the recipe's refs |
| Screenshot crops from the Browser pane are saved as PNGs | `zoom` returns a path under `tool-results/` | `resize_window` to the screenshot frame (800×600) so one image pixel is one CSS pixel (the default 1024-wide viewport downscales), then sample the file with sharp |
| The Figma export of a node includes its neighbours | The Hover render showed a second button's top rows at the bottom | Only read pixels inside the node's own rows; ignore bands that belong to a sibling variant |
| An inner shadow can be checked exactly | `INNER_SHADOW 0 2 0` highlight at white α.149 over `#874fff` | Composite by hand: (153,105,255) is what Figma shows and what the CSS gives |
