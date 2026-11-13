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
| I built only Size × State and left the file's `Type` axis to InputGroup, citing the repo's shadcn split | The owner sent it back: "no están todas las variantes". The file draws ONE component with 11 Types, and Figma outranks the shadcn split (CLAUDE.md, 2026-11-12) | Build EVERY variant axis of the set on the component itself. If an older architecture note disagrees, the file wins — don't defer axes to another component. Input is now a box (`root`) with the `<input>` as `text` and `icon` · `addon` · `divider` · `kbd` parts |
| New recipe slots on a component the frozen plugin already builds | `anatomyGaps` failed: the plugin's builder has no `addon`/`divider`/`kbd` layer | `WEB_ONLY_SLOTS` in `componentRecipesPluginParity.test.ts` (a dated decision), never a plugin edit |
| A box root around the real `<input>` | `:focus-visible` on the root never matches; `aria-invalid` / `disabled` live on the inner field | `stateSuffixes` already has `:has(:focus-visible)`; a live disabled / invalid field PINS `data-force-state` on the root, which also stops hover from repainting it. React 19 passes `ref` as a prop: forward it to the inner `<input>` (`useImperativeHandle`) |
| Some variants lay their strokes out (`strokesIncludedInLayout`) | currency-select / url / upload / copy-link content starts at 13, the rest at 12 | Read `strokesIncludedInLayout` per variant; copy it as `spacing.inset-control+stroke.control` |
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

# Lessons from the ButtonGroup (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A page with SEVERAL sets (group + its item + its divider), the parts listed in the ledger as `part` | A part leaves `pending` only when the catalogue has an entry with its axes | Each set is a catalogue entry, a recipe and a component, all in ONE file: `FILE_OF` in `componentFiles.ts` maps the parts to the group's file; the registry finds every literal `data-escala` in it. Store migration adds the parts after the group |
| The items of a group are NOT the file's Button | Tempting to reuse `Button` because the old shadcn group did | Read the nested instances' main component: `ButtonGroupItem` is its own set (no radius, no stroke, its own fills). Reuse Button only where the file nests Button |
| A group OVERRIDES its instances (pill → every item's padding 20) | The item set alone shows 12 | Read the group's instances' own padding / visibility refs, not just the item set. Expressed as a group slot on the item (`item[data-icononly="false"]`, more specific than the item's own rule) |
| An absolute `border` rectangle laid OVER the children (outline variant) | A CSS border on the root would push the items | A `::after` pseudoSlot of the root (`pseudoSlots: { border: { of: 'root', pseudo: '::after' } }`), structure classes on the component (absolute, inset-0, pointer-events-none) |
| The frozen plugin documents slots (`RECIPE_FIGMA_ANATOMY.omit`) the rebuilt recipe no longer has | `ButtonGroup.text: expected [...] to include 'text'` | `STALE_ANATOMY` in `componentRecipesPluginParity.test.ts` (dated), never a plugin edit |
| A pair the FILE binds fails AA | axe: outline · Active · Hover/Pressed = `Content/accent` on `Surface/selected-pressed`, 4.1:1 in Light | Copied (rule 1), reported to the owner in one line. Not a code bug |
| axe on a story in a given theme | Swapping the manager iframe's `src` in a loop measured stale documents | Navigate the pane to `iframe.html?id=<story>&viewMode=story&globals=theme:dark`, wait, then `axe.run(#storybook-root)` (axe is on the preview window) |

# Lessons from the Field (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| The committed snapshot (`spec/figma-components.json`) is older than the live file | Field: snapshot 6 variants `State Default|Invalid`, live file 9 with `Disabled` | Build the LIVE file. The component stays in `pending` (with a `note`) until the snapshot is refreshed — a full refresh drags in every other change in the file (dozens of sets), so it is its own task, never a side effect of one component |
| `components-inventory.figma.js` returns ~29 KB of JSON; as an escaped string inside the result it nears the 48 KB cap | — | Return the pages as OBJECTS in two halves (`pages.slice`) with the checksum; `JSON.stringify` of the joined halves reproduces the checksum |
| A component whose old shadcn parts are still used by components not rebuilt yet (FieldSet, FieldLabel… lay out checkbox / switch rows) | Deleting them breaks Checkbox, Switch, RadioGroup specimens | The Figma API on the component (`label`, `state`…); the legacy parts kept as MIGRATION ONLY, out of the catalogue axes; the legacy path selected by the absence of the Figma prop (`label === undefined`) |
| A Storybook grid wider than the canvas in Dark | axe: 12 contrast failures — dark text measured on the WHITE body, because the `.dark` wrapper is only as wide as the canvas | Stories wrap (`flexWrap`), never a fixed multi-column grid wider than the pane |

# Lessons from the NumberInput (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A `rename` in the ledger (InputStepper → NumberInput) while the frozen plugin still has a builder under the OLD key | Parity test: `RECIPE_BUILDERS` keys ≠ recipe keys, and `RECIPE_FIGMA_ANATOMY.InputStepper` crashed on a recipe that no longer exists | `RENAMED_ON_WEB` (old plugin keys left out of the comparison) + the new key in `WEB_ONLY`; the anatomy loop skips plugin keys with no web recipe. Rename everywhere the key is a string: catalogue, `componentRecipes`, specimens map, snippets, overviews, `SystemCollage`'s `inspectable(...)`, sitemap, and a store migration that renames it in `selectedComponents` |
| A focus ring stroked OUTSIDE (not straddling) on a field-like box | Input's `ring` (outline straddling the 1px edge) would draw it 1px too far in | `stroke` = the edge, `halo` = the outside ring. Read each set's `focus-ring` `strokeAlign` |
| A fixed width with no variable (3 × control height) | — | A summed ref (`size.control+size.control+size.control`): `dim()` turns it into `calc(...)`, still tokens |
| `:focus-visible` checks from script | `el.focus()` from `javascript_tool` gave no ring: the document had no focus | Click into the element in the pane first (`document.hasFocus()` true), then measure |
| A nested component's slot the recipe declared but never sized (IconButton `icon`) | The owner: the − / + of NumberInput "muy exagerados" — an unsized SVG filled the whole 32px button (glyph 24×2 instead of 12×1) | Size the slot in the NESTED component's recipe from its own Figma frame (`Size/icon-sm · sm · md · lg`) and wrap the glyph in the slot (`[&>svg]:size-full`); measure the glyph's box against the file's vector, not just the button's box |

# Lessons from the Textarea (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A glyph the file positions ABSOLUTELY in a box that lays its stroke out | Absolute children ignore padding and stroke in Figma (icon at width − padX − glyph); a CSS absolute child measures from the PADDING edge, 1px inside the border | An overlay slot (`adornment`, `corner`) with `inset: calc(-1 * var(--stroke-control))` so it starts at the border's outer edge, and the file's padding on it — no stroke of its own, so `insetMinusStroke` gives nothing back. `--escala-stroke-width` is NOT inherited: never read it from a child |
| A nested component whose inner frame is anchored MIN | Spinner instance resized to 14 · 18, its 16px glyph stays top-left (overflows / off-centre) | Copied: the spinner slot is the frame size, the glyph a fixed 16px at its top-left. Read the nested vector's box and constraints, not only the instance's size |
| A rebuilt recipe drops slots the frozen plugin documents (`RECIPE_FIGMA_ANATOMY` root `field`, omit label · hint · count) | Parity: `Textarea.label: expected … to include 'label'` | `STALE_ANATOMY` + the new slots in `WEB_ONLY_SLOTS`, dated |
| The file has a prototype board (`DocBoardPrototype`) | — | Read its Textarea instances (props) and captions, and add a "Resting · Focused" story with the same copy |

# Lessons from the InputOTP (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A text layer NOT bound to its TEXT property in some variants | InputOTPSlot `filled` / `underline`: the digit has no `componentPropertyReferences`, so every instance shows "7" | Read `componentPropertyReferences` per variant. A functional value (the typed digit) is not copied as a constant: say it in the contract and the report |
| A composite's State is a PATTERN over its parts | InputOTP Typing = first half Filled, next slot Typing, rest Default | Read every instance's main-component state per variant (one line per variant), then encode the pattern (`pinnedSlotState`) |
| A recipe slot moved to a new catalogue key | `recipeMotion` named `InputOTP.slot`; agent-context and audit tests named InputOTP as the field | Move the motion entry (`lib/recipes/motion.ts`) and the field-like lists to the new key (`InputOTPSlot`) |

# Lessons from the PasswordStrength (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Splicing a recipe file from "the previous `// ──` heading" | The cut took Field and Label with it (PasswordStrength had no heading of its own) | Cut from the recipe's OWN const/comment, then `git diff | grep '^-'` before going on — every removed line must belong to the component you rebuild |
| An axis whose values changed type (weak · fair · strong → 0–5) | Other surfaces (`ColourShowcase`, `PreviewPanel`) passed the old strings | grep every `v={{ <Axis>: … }}` caller and move it; the specimen maps the legacy values for old links |

# Lessons from the InputTag (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| `get_metadata` on a set returns every variant's size and, per variant, its children's boxes | — | Use it (read-only, tiny) to check totals the script does not give: outside filled 68 / 58 / 80 = box + 8 + chip; inline Loading puts the Spinner right after the last chip; a 360×52 inline Invalid is just a sample with four tags that wraps |
| A recipe size ref that is not a spacing step (`spacing.7`) | `shadcnRegistry` test: `--spacing-7` has no value in the published system | Steps are 0 · 0_5 · 1 · 1_5 · 2 · 2_5 · 3 · 4 · 5 · 6 · 8 …; 28 = `spacing.6+spacing.1` |
| A stroke that exists only in some states and is laid out | Chip default has no stroke, Focused / critical have 1px inside the layout (width +2) | One part over Size × Variant × State that sets `strokeWidth` (`stroke.none` or `stroke.control`) AND adds `+stroke.control` to the padding only when the stroke exists |
| One box painted by State, but the box differs per Layout | inline: the root; outside: the `field` child | The paint function takes the layout and writes to `root` or `field`; root state selectors (`:hover`, `:has(:focus-visible)`, `[data-force-state]`) still reach the child |
| `exportAudit` I10 budget | Agent context 86 440 > 85 000 | Raise `contextAllTokens` with a dated note (a catalogue grows by three components) |

# Lessons from the DatePickerTrigger (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Another chat edits the same checkout while you work (a half-done Combobox: catalogue, store, `forms.ts`, goldens, parity test) | Your edits and goldens mix with theirs; `git status` cannot tell whose hunk is whose; their `gen:registry-sources` / `vitest -u` would pick up your files | `git worktree add ../escala-tokens-wt-<x> HEAD` (+ `ln -s` the main `node_modules`, the plugin repo stays a sibling), build and verify there, commit there; land it on the main branch only when the shared files are clean. Never leave untracked component files in the shared tree |
| A story / specimen `aria-label` on a control whose visible text IS the name | axe `label-content-name-mismatch` ×36 (`aria-label="Date"` vs "Select date") | The usage board says «the visible text is the accessible name»: no `aria-label` on the trigger in stories, specimens or snippets |
| The set's own description and usage board disagree with its numbers | «xs 32 / sm 36 / default 40» against measured sm 32 · default 40 · lg 48 | Trust the measured geometry; say it in the report |
| Focused stroke 2px laid out + a `focus-ring` rectangle OUTSIDE | The field `ring` path draws the halo straddling a 1px edge | Focused: `strokeWidth: stroke.focus`, `halo` (outside), padding `inset-control+stroke.focus`. Invalid has NO halo in this set |
| `:focus-visible` read right after `Tab` | Border 2px but the colour still the resting one | The recipe transitions `border-color` / `box-shadow`: wait ~600 ms before measuring |

# Lessons from the DatePickerPopover (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A set that is only a shell around another set (DatePickerPopover = radius + Shadow/lg around a Calendar instance) | Tempting to rebuild the Calendar (header, month, days, presets) inside it | Read the nested instances' main components first (`getMainComponentAsync` per instance): they were queue items 3–8. Build only the shell (`children` = the calendar), note the dependency in the contract |
| A shadow style whose three layers all carry spread on a non-clipping frame | Ring `0 0 0 1` + `-4` / `-2` spreads | Pixels of the render (no hard 1px ring, side edge 237) showed none render: reuse the FAB `lift: rest` (`0 12 16 key + 0 4 6 ambient`) |
| A new popover-like recipe key | `recipeMotion.test` failed | Add the key to the `popover-enter` / `popover-exit` `components` lists in `lib/motion.ts` besides `recipes/motion.ts` |

# Lessons from the CalendarDay (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A cell whose DATA states (Today, Selected, Range…) are not pointer states | The recipe's State axis only knows Hover / Focused / Disabled; the rest fall to `[data-force-state="X"]` | A real `state` prop that writes `data-force-state` (a pinned state also stops `:hover`, as the file has no hover on a selected day) beside `forceState` for docs |
| Two states drawn identically (Disabled · Unavailable) | Tempting to invent a strikethrough for Unavailable | Copy: same ink, both `disabled`; say it in the contract |
| An absolute child 4px from an edge (the dash, x14 y34 in 40) | Tailwind `bottom-1` = 4.5px at this app's 18px root | `bottom-[var(--spacing-1)]` and the recipe's `spacing.3` × `spacing.0_5` for its size; measure x/y against the file |
| Calendar parts import react-day-picker through `calendar.tsx` | An eager specimen would pull it into the main bundle | Register the specimen through `lazySpecimen` (`skeleton/heavy.tsx`) |
| Measuring recipe roles with a probe on `body` | Every `var(--color-…)` resolved to the same fallback | Append the probe INSIDE the component (the vars live in `RecipeScope`) |
| `exportAudit` I10 budget again | Agent context 90 045 > 90 000 | Raise `contextAllTokens` with a dated note |

# Lessons from the CalendarHeader (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A size with no token (nav button 28 in the sm header) | `Size/*` has 24 · 32 · 40, nothing at 28 | A summed ref (`spacing.6+spacing.1`), as InputTag does; say it in the contract |
| A set whose width is "N cells of another set" (header = 7 day cells) | A magic 280 / 224 | `size.control` × 7 / `size.compact` × 7 as a summed ref, so it follows the day cell |
| A set with no hover / focus on any piece (arrows, chips) | Tempting to give the chips a hover wash | Copy: none. No `recipes/motion.ts` entry either |
| `figma.setCurrentPageAsync(set.parent)` | "expects a PageNode" (the set's parent is a section) | Walk up `.parent` until `type === 'PAGE'` (the read script already does) |

# Lessons from the CalendarMonth (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| `use_figma` return over 48 000 bytes (a set whose default variant has 40+ nested instances) | «Return value exceeds the limit», nothing read | Read in two passes: props + default structure with a child cap (`slice(0, 8)`), then one compact line per cell (`Day:State/Variant`) for every variant |
| `componentProperties` keys carry a `#id` suffix (`Day#12:3`) | `cp.Day.value` → undefined | `Object.fromEntries(entries.map(([k, x]) => [k.split('#')[0], x.value]))` |
| A set that is only a grid of another set's instances (Month = weekdays + 5 weeks of CalendarDay) | Tempting to redraw days or put paint in the Month recipe | The recipe holds only the Month's own geometry (7 × day box, weekday cell, Type/caption ink); the days are `<CalendarDay>` with the Figma state per date |
| A sample frame that mixes states (Today next to Selected, Unavailable beside Disabled) | Looks like a bug to "fix" | Copy it as the default data when no `selected` / `range` / `today` / `disabledDays` props arrive; real data overrides it |
| A python edit script with a syntax error | Nothing applied (python compiles the whole heredoc first) except what ran in an earlier script | Check `git status` after a multi-file edit before measuring |

# Lessons from the CalendarPresets (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A border on ONE side (the rail's right divider, `strokeRightWeight` bound to Stroke/divider, the other sides 0) | `strokeWidth` draws all four sides | Recipe property `strokeRightWidth` (`helpers.ts` RECIPE_PROPS, `recipeStyles.ts`, `tokenTrace.ts` label + list), beside `strokeTopWidth` / `strokeBottomWidth`; colour with `stroke`. Not in `figmaRefs` (the frozen plugin does not bind it) |
| `figma.mixed` (a Symbol) inside a template string | `TypeError: cannot convert symbol to string` (a frame with per-side strokes has `strokeWeight` mixed) | Wrap reads in `typeof x === 'symbol' ? 'mixed' : x`, and read `strokeTopWeight` … `strokeLeftWeight` for per-side strokes |
| A fixed width with no variable (160 · 140) | No size token | Summed spacing steps (`spacing.32+spacing.8`, `spacing.32+spacing.3`) |
| A label written in capitals in the text ("PRESETS", textCase ORIGINAL) | Tempting to add `uppercase` | Render the string as written; the default `label` prop is the uppercase text |
| A review that says gaps are wrong everywhere | Ten components "missing gap" | Measure each against the file first (Storybook positions vs Figma `absoluteBoundingBox` relative to the variant): all ten matched to the pixel; ask for screenshots instead of changing code |

# Lessons from the CalendarFooter (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A set made of another set's instances (the footer = three Button instances) | Tempting to give the recipe button paint | Render the system's `<Button variant appearance size>` with the instance's props; the recipe only lays out the bar (size, divider, padding, gap) |
| Padding / gap bound to bare primitives named "16", "12", "8" instead of roles | No role to copy | Use the spacing step of the same px (`spacing.4`, `spacing.3`, `spacing.2`) and say so in the contract |
| Fixed size with no variable that is clearly a sum (312 = 7 cells + 2 × 16; 72 = button + 2 × 16) | A magic number | A summed ref that keeps following the cell and button sizes |
| Children at y 17 in Figma, 16.5 in CSS | Looks like a 0.5px miss | Figma rounds the half pixel a 1px top stroke inside the frame leaves; 16.5 is the same layout |

# Lessons from the Calendar (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A parent set's INSTANCE overrides a nested set (the DatePickerPopover's Calendar pads its body with Spacing/inset-surface 20, the Calendar set pads 16) | Popover 314 wide in code, 322 in Figma | Read the instance in the parent (`findOne` the inner frame, its padding binding) — not only the nested set; copy the override in the parent component (`BODY_INSET` in `date-picker.tsx`) |
| A utility that must beat a recipe rule on a child | The override did nothing: the recipe's `[data-escala][data-size] [data-part]` rule is more specific | Tailwind v4 important suffix (`…:p-[var(--spacing-inset-surface)]!`), with a comment saying why |
| Replacing a recipe the frozen plugin builds (Calendar) | Parity: `{ Calendar: ['column'] }`; motion test: `Calendar.day` slot gone | New slots go in `WEB_ONLY_SLOTS`; drop the old slot's entry in `recipes/motion.ts`; goldens move ONLY in the recipe's own block (check the hunk headers are contiguous) |
| A composite with sample data in its parts (CalendarMonth's November sample) | A real month showed the sample's selection, today and disabled days | The part shows its sample only when it gets no `month`; the composite passes month, today and the selection explicitly |
| A board tile built on the old component (react-day-picker footer, `!w-full` stretch) | The new calendar is seven cells wide and cannot spread | The tile uses Size sm (250, the old width) centred; the event goes in as `children` under the month |

# Lessons from the FileUploadDropzone (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A variant overrides a TEXT layer without its property binding (Invalid: «Upload failed», sm Invalid shows only the limit message) | Copying the Title default everywhere | State-specific default copy when the prop is not passed; say it in the contract |
| A layer hidden in one size and NOT bound to its BOOLEAN (sm description) | Tempting to honour `DescriptionVisible` in sm | Copy: sm never renders it |
| The set nests a component that is not rebuilt yet (Separator «OR») | Reusing the shadcn Separator would draw a different thing | Draw it as slots of the new recipe with the file's roles; note the swap for when Separator is rebuilt |
| A dashed stroke (dash 4·4) | No recipe prop for dashes | `borderStyle: dashed` inline; CSS cannot set the dash length — report it |
| axe in Dark composites a translucent fill over the white `body`, not the `.dark` wrapper (elementsFromPoint shows `.dark` in the stack) | 1.81:1 «failures» on Status/critical/surface | Compute the real composite by hand over the `.dark` page (≈6.5:1 here); only Light flags are real |
| A rename in the ledger (Dropzone → FileUploadDropzone) | Same list as NumberInput | catalogue, recipe key, `FILE_OF`, motion, specimens, snippets, overview, `PreviewPanel` `Live c=`, sitemap, store migration, `RENAMED_ON_WEB` + `WEB_ONLY` |

# Lessons from the FileUploadItem (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A nested ProgressLine instance resized wider than its main component | Its bar stays 120 px (Value=50 of ITS 240) inside a 422 track; the label says 48 % | Draw the bar as the progress % of the track; report the file's artefact |
| Hidden instances (`change`, `download` behind a BOOLEAN) have no children | `findOne(INSTANCE)` returned null | Read their `INSTANCE_SWAP` componentProperties (`Icon → icon/Swap`) instead |
| Glyphs the shared component icon set lacks (FilePdf, CloudArrowUp, Swap…) | No `PreviewIcon` concept for them | Inline the Phosphor regular path (`@phosphor-icons/core/assets/regular/*.svg`) in the component, as calendar.tsx does |

# Lessons from the FileUpload (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A SLOT property (`Content`) whose default content is sample rows | — | `children`; the sample rows render only when no children arrive |
| «Size cascades to every item» | Passing `size` to each row by hand | A context in the parent; the row's own `size` prop still wins |
| Nested sets FILL the parent but carry a fixed specimen width in their recipe | Dropzone 400 / rows 480 inside a 480 column | `w-full!` on the nested root from the parent (important beats the recipe rule) |
| A new story file 404s in a running Storybook («importers[path] is not a function») | The index had not picked it up yet | Reload the iframe once |
| Rebuilt recipe drops the plugin's old slots | Parity `anatomyGaps` | New slots in `WEB_ONLY_SLOTS` (old ones were not demanded here) |

# Lessons from the Checkbox (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A 270-variant set | One read would pass 48 KB | Geometry from 7 picked variants, then colours grouped by Variant · Checked · State with a Size-invariance check (empty here) |
| Axis values changed case (`True` → `true`) | `Live`'s toggle only knew `True / False`; callers passed `Checked: 'True'` | `Live` accepts either pair; grep every `Checked: 'True'` (board, artefacts, RadiusRolesPreview, overview, agent screen patterns) and the specimen maps the old values |
| Per-Variant focus pairs (secondary `Border/strong` + `Border/subtle`, inverse…) | Two tests demanded `border.focus` / "never border.strong" on every Checkbox | Narrow the tests to what the file says (default Variant's focus; the RESTING edge is border.control) with a dated comment |
| Fills bound to TEXT roles (secondary `Content/primary`, inverse `Content/inverse`) | Looks like a binding mistake | Copy; say it in the contract |
| `exportAudit` I10 budget again | 95 762 > 95 000 | 105 000 with a dated note |

# Lessons from the CheckboxItem (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A control frame as tall as the label's FIRST line, centring the box (y 3 in a 25 line) | A fixed offset per size | `h-[1lh]` on the control span with the label's type on it (recipe `control.font`): follows the line height of every Size |
| «The whole row toggles» | A click handler on a div | The row is a `<label htmlFor>` around Radix's button (a labelable element): click anywhere toggles, the label is the name, no aria-label |
| A composite whose nested axes always equal its own (324 variants checked) | — | Pass Size · Checked · State · Variant straight through; check it once with a script over every variant |

# Lessons from the CheckboxGroup (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A group whose axes cascade to its rows (Size · Placement · State · Variant) | Repeating the props on every row | A context in the group; the row's own props win; group State Default leaves rows free |
| A group label that does not scale with Size (Type/label everywhere) | Tempting to scale it with the rows | Copy: one type for all sizes |

# Lessons from the Switch and SwitchGroup (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A recipe `part` over a SUBSET of an axis (State Focused only) | `componentRecipes.test`: parts must cover the full axes (`default|long|Focused` vs 24 combinations) | Cover the whole axis and branch inside the builder (`state === 'Focused' ? …`) |
| A stroke laid out in Focused (thumb 2px further in, travel −4) | The `focus` path draws the edge as an inset shadow: no layout shift | Focused part adds `paddingX/Y: spacing.0_5+stroke.focus` and a shorter `travel` |
| A hidden instance (thumb-icon) with a `fills` override | `children` empty, ink unreadable | Say it in the contract and pick a plausible Content role; no variant draws it |
| Absolute marks hand-placed per Size (not centred in sm / default) | Tempting to centre them | Copy the literal x / y per Size · Thumb · Checked in the component (no variable) |
| A part (SwitchGroup) living in its parent's file | `scripts/registrySources` looks per file | `FILE_OF` in `componentFiles.ts`, literal `data-escala="SwitchGroup"` |
| Footer `Content/subtle` | axe 3:1 in both themes | Copied (rule 1), reported |

# Lessons from the SegmentedControl and SegmentedControlItem (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A recipe slot with `focus: none` in a rule that also carries `shadow` | The checked segment lost Shadow/xs in every state: `focus` none writes `box-shadow: none` after it | Set `focus` / `ring` only for Focused; in `recipeStyles.ts` the `focus` rule now keeps the slot's own `shadow` under the rings (Shadow/xs on a raised segment) |
| A part that must DROP an effect the Default rule paints (checked Disabled) | The state-less rule still applied to Disabled | `highlight: NONE` in that state writes `box-shadow: none` |
| The selection used to slide (SlidingSelection pill) | In the file the checked item IS the raised thumb | Dropped the pill; the item paints its own fill and shadow; background / shadow transition in `recipes/motion.ts` (key `SegmentedControlItem`) |
| A roving radiogroup | One tab stop, arrows move and select | `tabIndex` 0 only on the checked item, the group's `onKeyDown` clicks the next enabled radio |
| Text width 31.49 vs Figma 32 | Every item 1px narrower | Figma rounds the text box; same layout (padding 12 + text) |

# Lessons from the Slider and SliderThumb (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Radix draws the range from 0 to the value's percent of the track | 128px at 40 % vs the file's 130 (the thumb centre) | Own `<span data-part="Slider.range">` positioned by `calc(half-thumb + p × (100% − thumb))`; Radix still gives the thumbs, keyboard and pointer |
| The thumb is a separate set with the states | A Radix thumb has no `dragging` | `SliderThumb` is its own component; `Radix Thumb asChild` wraps it. The Slider pins `Dragging` on the thumb that MOVED (index from `onValueChange`, not from focus) while the pointer is down |
| A flex child squeezed to 0 (tick 2×6 inside a 20px mark that holds 26px) | tick height 0 | `shrink-0` on the tick; the mark overflows like the file's |
| A recipe slot test written for the old slot (`['Slider','thumb']`) | `hitSlots` expected `Slider.thumb` | Point it at `SliderThumb.root` |
| A shadow style with no ring and a 4px halo with spread | Dragging draws nothing | Copy: no effect (spread on a non-clipping frame) |

# Lessons from the RatingGroup and RatingGroupItem (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A rename in the ledger with the file also renamed (`rating.tsx` → `rating-group.tsx`) | Registry, `FILE_OF`, docs imports and every `Rating` string | `git mv` the file; catalogue, recipe key, specimens map, snippets, overviews, `ColourShowcase`, sitemap, motion, store migration (rename inside `selectedComponents` and add the part), parity `RENAMED_ON_WEB` + `WEB_ONLY` |
| A Figma prop called `Type` on a `<button>` | `type` is the button's own attribute | `kind` on the item (documented); the group keeps `type` (a div has none) |
| «In a star group set Checked on every item up to the value; code sets aria-checked on the chosen item only» | One boolean cannot be both | The group computes the visual `checked` (≤ value for stars, == for emoji) and the roving `aria-checked` separately |
| Glyphs the shared component icon set lacks (the five smileys, the filled star) | No `PreviewIcon` concept | Inline Phosphor paths in the component (regular + `star-fill`) |

# Lessons from the Avatar, AvatarStatus and AvatarGroup (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Text styles the file leaves UNBOUND (`Type/avatar-2xs … 2xl`: literal 8 · 10 · 14 · 16 · 18 · 20 px, Medium, line height 100 %) | No role and no scale step matches (weight, leading and the 8 / 10 px) | Recipe prop `fontLiteral` (the px as a plain string, in `NON_TOKEN_PROPS`; `recipeStyles.ts` writes size / weight / leading). Sizes that DO bind a role (sm = `Type/label`) keep `font` |
| A hand-set 0.5px hairline | `stroke.sm` is 1px; no token | Prop `hairline` (px string, non-token) |
| A stroke OUTSIDE a small frame (the status dot, `strokeAlign` OUTSIDE) | A CSS border would grow the box (6 → 8) | Props `outerStroke` (colour) + `outerStrokeWidth` (stroke ref) → `box-shadow: 0 0 0 w c`. Both MUST sit in the SAME recipe part: `outerStroke` reads its width from its own rule, and a part split gave a 1px fallback on the 2px sizes |
| A negative gap (avatar stack, −4 … −16) | CSS `gap` cannot be negative: it silently computed `normal` | Prop `overlap` → `--escala-overlap`; the component lays out `[&>*+*]:ml-[var(--escala-overlap)]`. A size with no role (−6, −12, −16) sets the variable inline from a spacing step |
| A set with 350 variants where colours are invariant of Size × Shape | One line per variant would pass 48 KB | Group by Type · Variant · Appearance and count distinct `fill · stroke · ink` lines: 25 groups of 14, one colour line each |
| A catalogue axis whose values change meaning (old shadcn `sm · default · lg` = 24 · 32 · 40, Figma's = 32 · 40 · 48) | Board and artefacts kept the old strings | grep every `v={{ Size: … }}` caller and move it (`SystemCollage`, `ProfileArtefact`, `PreviewPanel`, `screenPatterns`, `AboutInspectDemo`) |

# Lessons from the FeaturedIcon (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Variants filled with a pasted RASTER (default·solid and secondary·solid: `fills[0].type === 'IMAGE'`, 600×600 and 704×1408, icon with no painted layer) | The grouped colour read gave `fill IMAGE · ink ?` for 16 of 96 variants | Never copy a photo. Read the image size (`figma.getImageByHash(...).getSizeAsync()`) and a `get_screenshot` to confirm it is an artefact, then reuse the sibling set's solid tones (Avatar: `Action/primary/default` + `Content/on-action`, `Surface/inverse` + `Content/inverse`) and say so in the contract and the report |
| A set that shares another's tone table | Same Variant × Appearance colours as Avatar | The recipe reuses `AVATAR_TONE` / `AVATAR_SHAPES` / `AVATAR_APPEARANCES` from the same file |
| A new catalogue key adds `selectedComponents` migration even for a brand-new component | — | Splice it after its sibling (`Icon`) in the store migration (v134) |

# Lessons from the Image (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A rename in the ledger whose old key is also a FILE (`aspect-ratio.tsx` → `image.tsx`) and a plugin builder (`AspectRatio`) | Same checklist as Rating / Dropzone | `git mv` the file; catalogue, recipe key, specimens map, snippets, overview, sitemap, store migration (v135 renames inside `selectedComponents`), parity `RENAMED_ON_WEB` (`AspectRatio`) + `WEB_ONLY` (`Image`) |
| A "Media" swap with a stock photo | No image ships | `src` / `alt` (or `children`); the specimen paints the system's gradient (`avatarFillOf`) in the media slot |
| `Ratio auto` fills its parent | A fixed height in the specimen would lie | The Image is `size-full` for auto; the specimen / story gives it the file's 240 × 160 slot |

# Lessons from the Kbd (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A small component measured 16 wide in a story when its content needs 19 | The story's wrapper was 0 wide (a flex child of Storybook's root), so the `w-fit` key cap SHRANK to its `min-width` | `shrink-0` on the component (a key cap never shrinks). When a box is narrower than its content, test `flex-shrink: 0` and the parent's width before touching the recipe |
| Figma text box 12 wide, browser 11 / 11.9 | xs 20 vs 19.0, default 28 vs 27.9 | Figma rounds the glyph's box up; same layout (padding + text) — as the SegmentedControl note |
| An empty recipe `axes` becoming one axis | Kbd had no axes; the file has Size | Recipe `defaults: { Size: 'default' }` + a Size part; the catalogue axis; the overview row; no store migration (the key did not change) |

# Lessons from the Badge (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A 525-variant set whose colours are invariant of Size × Shape (and mostly of Type) | One line per variant is far over 48 KB | Group by Type · Variant · Appearance and count the distinct `fill · stroke · ink` lines (91 groups of 6, one colour line each); then read geometry for only one Variant × Appearance (success · solid) over Type × Size |
| Some Type values exist for only one Appearance / Shape (`dot` = solid + pill only) | A catalogue axis value with no variant behind it | The builder draws a dot solid whatever Appearance arrives; the story / overview pin Appearance solid + Shape pill for it |
| A stroke that lays out only in `outline` | Outline 63 wide vs 61 for the others | Padding `…+stroke.control` for that Appearance only; every other Appearance has `stroke.none` |
| Old shadcn values on a changed axis (`default · secondary · destructive · outline · ghost · link` → severities × Appearance) | Callers painted the wrong tone silently | Move every caller: old `default` → `Variant default, Appearance solid`; `destructive` → `critical`; `outline` → `Variant secondary, Appearance outline` (Border/control + Content/primary is exactly the old outline); `secondary` stays (soft secondary = the old neutral fill) |
| An `inverse` variant on the default page | axe 1.01:1 in Dark (light ink on the dark page) | Draw it on a `Surface/inverse` slot in the story, as Checkbox / CloseButton do |
| `exportAudit` I10 budget again | 105 000 → 4 findings | 120 000 with a dated note (Avatar, FeaturedIcon, Badge) |

# Lessons from the Chip (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A stroke the file draws only in some states AND lays out (soft Default 51 wide, soft Focused / Selected / Dragging 53) | One part cannot hold both the padding and the paint | Three parts: geometry (Size × Shape), padding (Size × Appearance × State: `inset+stroke.control` when the state has a stroke), paint (Variant × Appearance × State) |
| A focus edge of 1px with the ring OUTSIDE (`focus-ring` frame stroked OUTSIDE, 2px) on a pill / rounded chip | The field `ring` path draws the halo straddling the edge | `stroke` = the 1px edge colour + `halo` = the outside ring colour, both in the Focused paint |
| Non-pointer states in a State axis (Selected, Dragging, Disabled) | The recipe only knows hover / focus from the pointer | The component writes `data-force-state` (Selected from `selected`, Dragging, Disabled + `aria-disabled`); the generated `:hover` rule excludes a forced state, so a selected chip has no hover as in the file |
| `Shadow/sm` whose rings and negative spreads do not paint | Copying `0 0 0 1 · 0 1 3 · 0 1 2 −1` would add a ring Figma does not draw | `lift: 'drag'` (`0 1 3` key + `0 1 2` ambient, spreads dropped) |
| A close control smaller than 24px (16 / 20) | `componentRecipes.test` demanded `size.hit` on the old `remove` slot | `hit: 'size.hit'` on the new `close` slot (test moved to `['Chip', 'close']`) |
| A board tile used `Live toggle="Selected"` on an axis the file no longer has | `Live` only toggles a True / False catalogue axis | The specimen takes an opt-in `v.Interactive: 'True'` (not a catalogue axis) and toggles its own `selected` |

# Lessons from the Accordion and AccordionItem (2026-11-12)

| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A State axis with no pointer state (Closed · Open · Disabled) | The recipe rules for Closed (the default value) had no selector: `stateSuffixes` returns only `[data-force-state="Closed"]` for an unknown state, so the Closed items lost their fill, edge and radius | The component sets `data-force-state` ALWAYS (Closed · Open · Disabled), not only for the non-default values |
| The file's Accordion is a stack of AccordionItem instances; an item alone has no Radix root | An item story would crash (Radix Item outside a Root) | The Accordion owns the open values and the Variant in a context (Radix `type="multiple"` driven by it); an item rendered alone wraps itself in a root |
| The old recipe lived on the container (one rounded panel) | The new look is per item (each item has its own fill / edge / radius) | `ACCORDION` keeps only the gap (0 or 8 by Variant); `ACCORDION_ITEM` paints; `RECIPE_MOTION` moves to the item (chevron transform + content choreography) and the choreography's `components` list gains `AccordionItem` in `lib/motion.ts` |
| Same label on every item of an `AllCombinations` story | axe `landmark-unique`: the open `region`s share one accessible name | Suffix the label with the variant · state in the story |
| `Content/secondary` on `Surface/muted` (ghost-rounded Open, filled-rounded) | axe 4.22:1 in Light | Copied (rule 1), reported |
| `ui/accordion` (About) is a separate shadcn file | Rebuilding `escala-ui/accordion` looked like it would break About | About imports `../ui/accordion`, not escala-ui; untouched |

# Lessons from the Table page (2026-11-12) — Table + 13 parts in one go
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A PAGE of 14 sets, ~400 variants, where every part nests another (Row → Cell, Header → Head, Table → Header · Row) | One read per set would blow the budget | Read each set with the sweep script, but cap the nested instances (`describe` depth 1–2 on Row / Header / Table) and read the instances' `componentProperties`; save every reading in `design-plans/table-contract.md` BEFORE building; build all parts from one recipe file (`recipes/table.ts`) and one component file |
| Heights with no variable (cell 48 · 32 · 40 · 56 and media thumbnails) | No `Size/*` bound on the frame | They equal `size.lg · sm · md · xl` (row) and `size.md · xs · sm · lg` (media): same px, state it in the contract |
| A real `<table>` needs flex rows to match the file's frames | `display: table` cells cannot be 200 / 48 like the frames | Native elements with explicit roles (`table`, `rowgroup`, `row`, `columnheader`, `cell`) and `display: flex`; the header and footer are the `<thead>` / `<tfoot>` strip itself with an inner `<tr>`. A story / specimen that shows ONE cell wraps it in `role="table"` + `rowgroup` + `row` or axe says `aria-required-parent` |
| A cell has a right stroke only in `Dividers: grid` and only if it is not the last | The cell set has no Dividers axis | A context (Table → Row → Cell) and a recipe suffix key on the root: `'root[data-grid]:not(:last-child)': { stroke, strokeRightWidth }` |
| Hover that exists only for some instances (sortable heads, actionable rows) | A State axis whose pointer states must not always fire | `data-force-state="Default"` on the ones that must not hover (a forced state stops `:hover`); leave it unset where hover is real |
| Footer cells use Type/label while the same TableCell set is body-sm | A set cannot know where it sits | A context flag → `data-label-type="label"` on the label and a recipe suffix key `'label[data-label-type="label"]'` |
| Focused row = 2px ring all round and NO bottom hairline; Dragging = 1px all round | The default state's `strokeBottomWidth` would stay | Per-state recipe slot sets `strokeWidth` and omits the bottom divider; the more specific state rule wins over the border shorthand |
| Part recipes for a frozen plugin | Parity test wants the keys in `WEB_ONLY` | Add the 13 keys (the plugin has a `Table` builder that already passes). Ledger: delete all 14 entries together |
| axe `color-contrast` 4.22 | `Content/secondary` on `Surface/muted` (head label, Light) | Copied (rule 1), reported. Same pair as the Accordion note |

# Lessons from the Alert (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| The old Alert is shadcn's (title + description, `default · destructive`) and four callers compose it | Rebuilding on the Figma API would break `AlertTitle` / `AlertDescription` users | `children` keeps the older composition (boxed, no close, no icon unless given); `variant="destructive"` stays as an alias of `critical`; the callers are untouched. The catalogue lists only the file's axes |
| A hairline on ONE side that the file lays out (horizontal outline: 65 = 64 + 1) vs all sides (vertical outline: 320×67) | `strokeWidth` makes the padding give the border back (`--escala-stroke-width`), `strokeBottomWidth` does not | Horizontal: `strokeBottomWidth` and the plain padding; vertical outline: `strokeWidth` and the padding `spacing.inset-surface+stroke.control` |
| An absolute close at x284 y12 in a box with a 1px border | CSS absolute offsets start INSIDE the border | `calc(var(--spacing-inset-control) - var(--stroke-control))` for the outline appearance only (the custom property `--escala-stroke-width` is not inherited by the child) |
| 96 variants, colours invariant of Layout × Size | One line per variant | Grouped read by Variant · Appearance (24 groups of 4); the severity table in the contract |
| `exportAudit` I10 budget again | 120k → 135k with a dated note (Table + Alert) | `src/lib/exportAudit.ts` |

# Lessons from ProgressLine and ProgressCircle (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A rename (Progress → ProgressLine) AND a new sibling (ProgressCircle) on one Figma page | Same checklist as Rating / Image plus a part | `git mv progress.tsx progress-line.tsx` (the circle lives in it: `FILE_OF`), catalogue, recipes, motion, specimens, snippets, overviews, `SystemCollage` `inspectable`, a caller, sitemap, store v138 (rename inside `selectedComponents` + add the part), parity `RENAMED_ON_WEB` (`Progress`) + `WEB_ONLY` |
| The old Progress had a label + percentage header the file does not draw | Keeping it would add a part with no Figma twin | Dropped; the consumer labels it. The specimen / callers lose `label`; an `aria-label` names the bar |
| A ring drawn as two ELLIPSE arcs with an `innerRadius` ratio (0.667 · 0.75 · 0.714) | The thickness is not a token | The ring is an SVG (viewBox 100, `pathLength` 100, `stroke-dasharray`); thickness = `50 × (1 − innerRadius)` (mind the factor: a first pass doubled it to 8px on the 24px ring); measured 4 · 4 · 6 · 8 px |
| Figma's round caps are separate dots at the arc ends | CSS has no such thing | SVG `stroke-linecap: round` is the same shape (a half-thickness past each end); Value 100 uses butt so the ring closes cleanly |
| A gradient fill (default → hover) over a bar and a ring | The recipe has solid fills only | Inline `linear-gradient(to right, var(--color-action-primary-default), var(--color-action-primary-hover))` on the bar and an SVG `<linearGradient>` rotated 90° to undo the arc's −90° rotation; the stops are the same CSS vars the recipe reads |

# Lessons from the Toast (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| The ledger's `Toast` is a rename of `Sonner`, a shadcn skin over the `sonner` library (a real Toaster painted through `recipe.dom`) | The Figma Toast has Appearance × Variant, a progress hairline and its own icon per severity: no DOM of a library carries that | `Toast` is a presentational component with its own recipe; `Toaster` / `toast` stay the library's (unstyled) and `showToast` renders `<Toast>` inside it with `toast.custom`. The old `dom` recipe, `SONNER_*` and the Sonner specimen (library measuring + stacking hacks) are gone. Rename checklist as Rating / Progress, plus the callers: SystemCollage, ColourShowcase, PreviewPanel, `FIGMA_SAMPLE_KEYS`, the `sonner-enter` choreography's `components`, three tests that named Sonner |
| One side of the padding is a different role (left = Spacing/inset-surface 20, the other three 12) and the recipe has no `paddingLeft` | `paddingX` sets both | The component carries `!pl-[var(--spacing-inset-surface)]` (a utility must win over the recipe rule: `!`) |
| A progress hairline ABSOLUTE across the whole frame, over the stroke | A CSS absolute child starts inside the border and `overflow: hidden` clips at the padding box → 358 wide at x 1 | `overflow: clip` + `overflow-clip-margin: border-box` (keeps the radius clip over the border) and `left` / `bottom` of `−stroke.control`, width `100% + 2 × stroke.control` for filled / outline: measured 0,62 360×4 |
| A shadow style with a 1px ring and negative spreads | Same as DatePickerPopover | `lift: rest` |
| The new recipe breaks the inspector's ordering test | `tokenInspector` expected popover roles | Surface, then border, then the icon ink (`content.accent`): the test now says what the set paints |

# Lessons from the Table Prototype (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A Figma «Prototype» section is a COMPOSITION, not a set: no axes, so the catalogue / Overview axis test cannot name it | Adding an `Example` axis would have broken «catalogue axes = Figma's» | A composed component outside `escala-ui` (`docs/skeleton/tablePrototype.tsx`), stories `PrototypePro…`, and an Overview item recognised by its WIDTH (`TABLE_PROTOTYPE_W`, a constant in `componentOverviews.ts`); Dividers rows = the file's Light example, grid = its Dark example (pinned, resizing, scrolled, sorted) |
| The file marks a sorted column but lists the rows in its own order | Sorting on mount reordered the people vs the screenshot | Rows reorder only after the first click (`sorted`) |
| The file's avatars are stock photos from its Media library | Code has none | `lib/avatarGradient.ts`: an opaque gradient SVG data URI through the same `src` the Photo swap uses |
| axe on a composed table | `role="img"` avatars with no name; a focusable `separator` with no `aria-valuenow` | Avatar: unnamed photo = decorative (`aria-hidden`), named = `role=img`; TableResizer reports its column's width (`aria-valuenow`, ResizeObserver on the parent) and has an `aria-label` |

# Lessons from the AvatarGroup fix (2026-11-13)
Source: the file's «AvatarGroup Prototype» (868:28472): four PHOTO avatars + the dark `+3` tile, default circle / rounded, sm and xl, Light and Dark.
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| Soft initials in a stack | A 12 % tint reads as "painted", and the story used it as the group's default | The file's people are photos (opaque). A photo-less image Avatar paints an OPAQUE gradient (`hue` / `fill` props, `avatarGradientCss`); the stories, the AvatarGroup specimen and the Avatar `Image` specimen use it. Soft / solid initials stay as opt-in fills |
| Overlap looked wrong although the margins were the file's (−4 … −16, widths 74 · 106 · 148 · 188 · 212 · 252 · 286) | The left avatar's translucent edge (and its hairline) showed OVER the next item's `Surface/page` ring and over the `+N` tile: a pale sliver on the tile | Stacking, not spacing: the Avatar is `relative`, the item frames were not, so positioned avatars painted above later unpositioned frames. Items are `relative` now (DOM order = z order, as the file's item-1 at the bottom). Measured: page ring cuts every avatar, nothing shows through, widths unchanged |
| `escala-ui` files ship in the shadcn registry | `gen:registry-sources` threw «imports app internals (../../lib/…)» after a helper import | A registry component is self-contained: the gradient helpers live in `avatar.tsx`; `lib/avatarGradient.ts` re-exports them and adds the data-URI form |
| `cmd1 && cat > file <<EOF` | The first command failed, so the file was never rewritten and Storybook's index looked stale | Check the file, not the index |

# Lessons from the Table scroll fix (2026-11-13) — reported from the prototype story
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A table wider than its window scrolls inside `Table`, but the `<table>` was `w-full` of the window | Row fills, the selected / hovered tint and the bottom hairlines stopped where the window ended (1613 of 1953) | `<table>` is `w-max min-w-full`: as wide as its columns, never narrower than the box. An 800 table with flex columns is unchanged (800×242, cells 200) |
| A sticky (pinned) cell with no fill | The scrolled columns showed through the Name column; a selected row lost its colour under it | `PINNED_CELL` in `recipes/table.ts`: a pinned cell is `surface.page` with the ROW's state laid over it (`overlay`), read off the parent row with `:where(tr:hover:not([data-force-state]) > *)`, `[data-force-state="Selected"] > *`, `Dragging`. Never use `:not([data-pinned="none"])` alone: it matches parts that have no `data-pinned` at all |
| A cell at its own height (48) inside a 48 row with a 1px bottom border | The cell ran 1px over the row's hairline; any opaque cell (pinned, head) erased the divider | Inside a row, header and footer the cells stretch to the row's content box (`IN_ROW = [&>*]:!h-auto`); a lone cell keeps the file's height |
| The prototype's rows hover in Figma | Rows were non-interactive (pinned to Default) | `interactive` on the prototype rows; Ethan keeps the file's forced Hover |

# Lessons from the Table polish, second pass (2026-11-13) — measured against the Dark example node by node
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A row's INSIDE stroke as a CSS border | Cells 47 tall, content 0.5px off the file (checkbox y 62.5 vs 63, avatar 52.5 vs 53), a 2px jump of every cell on Focused, an opaque cell covering the hairline | Row, header and footer strokes are recipe keys `root::after` (an overlay laid out by the component: `relative`, `after:absolute after:inset-0 after:z-[2]`). Figma draws inside strokes OVER the children; so does the overlay. After: every box = the file's to the pixel |
| Pin edge in a grid | `right-0` put the 1px pin INSIDE the cell's right hairline: two lines side by side (375 + 376) | The pin sits on the cell's last pixel (`[[data-grid]:not(:last-child)>&]:right-[-stroke]`): one line at 376, as the file |
| The file's last column overruns the table by 2px (264 in 1438) and the file clips it | A full-width table scrolled 2px | The last prototype column takes what is left (262, `flex-grow 1`) |
| A sortable head is a tab stop and the set draws no focus | Keyboard focus invisible on Name / Join date | `'root:focus-visible': { focus: border.focus }` — the row's own Focused treatment, 2px inside |
| Measuring by eye in a scaled Browser pane | The pane scales a 1500 viewport down; "looks right" proved nothing | Compare `getBoundingClientRect` relative to the table with the Figma read (`absoluteBoundingBox` relative to the Table instance) for every leaf |

# Lessons from the Modal, ModalHeader and ModalFooter (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A rename (Dialog → Modal) with two parts on one page; the old file is `dialog.tsx` | Same checklist as Toast / Rating, plus the parts | `git mv dialog.tsx modal.tsx` (parts in it: `FILE_OF`), `Dialog*` names kept as export aliases, catalogue (3 entries), recipes, `recipes/motion.ts` + `lib/motion.ts` (`dialog-enter` components), specimens, snippets, overviews, sitemap, store v140 (`Dialog` → `Modal`, `ModalHeader`, `ModalFooter`), parity (`RENAMED_ON_WEB` `Dialog`, `WEB_ONLY` the three) |
| `use_figma` text read with `slice(0, 80)` | The body looked 2 lines (42px) vs the file's 63 | Never truncate a TEXT you will copy as default copy; read it whole once (`characters`) |
| A frame that CLIPS content with spread shadows (Shadow/xl on the Modal) | The FAB / Toast lesson says "spreads paint nothing" | That holds only for NON-clipping frames: the Modal clips, so ring `0 0 0 1` and the `−4` spreads DO paint. Recipe `lift: modal` (ring + key `0 20 24 −4` + ambient `0 8 8 −4`); the file's numbers beat `elevationTokens` xl (8·16 / 4·8) |
| A close button the card nests at a smaller Size than the card (Modal default → CloseButton `sm` 32, lg → `default` 40) | The CloseButton took the Modal's size name (40 / 48) | Map it in the component, measure x/y against the instance (427,21 · 579,21) |
| A header whose clearance for the close is a hidden frame | Header content 384 standalone, 334 inside the Modal | `closeClearance` comes from a context the Modal provides; the header only draws it for `horizontal` |
| Radix Title outside a Dialog throws | A header alone (specimen / story) crashes | A context flag: inside `ModalContent` the title is Radix's (even `inline`, still a Root), outside it is a plain `h2` / `p` |
| Fixed card widths with no variable (480 / 640) | — | Summed spacing steps (`spacing.32` = 128 px × 3 + `spacing.24`; × 5) |

# Lessons from the Popover and PopoverFooter (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A floating panel with a separate arrow FRAME (8px) per Side, the arrow a 16×9 vector 1px into the panel's edge | Radix's own Arrow rotates and positions itself and had no 1px overlap | The content is a transparent wrapper: `[arrow frame, panel]` with `flex-col` (bottom) · `flex-col-reverse` (top) · `flex-row` (right) · `flex-row-reverse` (left); an own SVG (open path, `Surface/layer-2` fill via `paint`, `Border/default` stroke via `currentColor`); the file draws the arrow UNDER the panel for bottom / right and OVER it for top / left (a `z-[1]` on those). `sideOffset` 0 because the frame is part of the box. Measured 320×116, 256×99, 360×124 and 328×108 sideways, arrow at 152,0 · 152,107 · 319,46 |
| Same Shadow style, different sizes (md at default / sm, lg at lg), and the panel CLIPS | `lift` knows only the FAB / Modal stacks | `lift: popover-md` / `popover-lg` (ring + the file's spread numbers); the ring role is added to the recipe's refs for every `modal` / `popover-*` lift |
| A footer whose top stroke is NOT laid out (48 = 8 + 32 + 8) beside the Modal footer whose stroke is (81 = 20 + 40 + 20 + 1) | A CSS top border added 1px (49) | Read `strokesIncludedInLayout` per set: here the component takes the border out of the top padding (`!pt-[calc(gap-control − stroke-divider)]`) so the box is 48 and the buttons sit at y 8 |
| Literal `data-escala` through a spread (`{...common}`) | `registryItemFor('Popover')` undefined (the FABGroup lesson again) | Write `data-escala="Popover"` as a literal JSX attribute in BOTH the inline and the portaled branch |
| axe `region` on a story that renders a bare popover | «Some page content is not contained by landmarks» ×N in every theme | Story-level best practice, not a component defect (the Modal passes only because `role=dialog` is a landmark); everything else is clean |

# Lessons from the DropdownMenu, Label, Item and Footer (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| The old DropdownMenu recipe came from a shared factory (`menu(key)`) that ContextMenu still uses | Rebuilding it in place would have restyled ContextMenu | Four new recipes beside it (`DROPDOWN_MENU`, `_LABEL`, `_ITEM`, `_FOOTER`); `menu()` stays for ContextMenu / Menubar |
| A row whose Figma States are Default · Focused · Selected · Disabled but a live menu highlights on hover and arrow keys | The recipe has no «highlighted» state | The Default part also emits `'root[data-highlighted]'` with the Focused paint; the component sets `data-force-state` only for non-Default states, so Radix's highlight is never blocked by a pinned state |
| A Focused row's 2px edge + 2px halo inside a clipping panel | A layout jump and a clipped halo | `focus` + `ring` are box-shadows (no layout change); the Content's 4px padding leaves room for the halo inside the panel's clip |
| Selectable rows | `aria-checked` on `role=menuitem` is invalid | `checked` switches to Radix `CheckboxItem` (menuitemcheckbox) with the file's check as the indicator; `inline` draws the same role by hand |
| A part set (Item) measured alone is 256 wide, but inside the menu it is 246 (Content padding 4) | The single-item story / specimen showed 248 | Standalone item wrappers zero the content padding (`[&>[data-part='DropdownMenu.content']]:!p-0`); the menu keeps the file's padding |
| `Content/secondary` on `Surface/muted` (the Focused row's shortcut and description, Light) | axe 4.22:1 ×4 | Copied (rule 1), reported; same pair as the Accordion / Table notes |
| New recipe slots on a plugin-built set | parity `anatomyGaps: DropdownMenu: [header, content]` | `WEB_ONLY_SLOTS` (dated), never a plugin edit |

# Lessons from the TooltipContent and TooltipInfoTrigger (2026-11-13)
| Trap | What it looked like | The fix (where it lives) |
|---|---|---|
| A rename (Tooltip → TooltipContent) with a new part and a 180-variant set | One read per variant is far over 48 KB | Read the geometry for default Size across Side × Align (+ sm / lg at top · center), then ONE line per Variant for bubble · text · title · arrow colours; every Size / Side / Align shares them |
| Bubble paddings with no variable (6/8 · 8/10 · 10/12) and widths 200 · 240 · 280 | `get_metadata` shows raw numbers | Spacing steps of the same px (`1_5/2`, `2/2_5`, `2_5/3`) and summed steps as a max width in the component (`spacing.32 + 16 + 2` …); the bubble hugs, the text wraps at the cap |
| Arrow frame 5px on the OPPOSITE edge of Side, shape aligned by Align with padding `Radius/overlay` | Radix's own Arrow is centred and rotated | DOM order [arrow frame, bubble] reversed by flex per side (as Popover); an own SVG triangle per side (`10×5` / `5×10`); `Align` pads the frame: start 16, end 16, centre auto. Measured arrow at x 16 · 115 · 214 and y 16 · 21 · 26 |
| A trigger state Open that Radix expresses as `data-state="open"` on the button (via asChild Slot) | A recipe state cannot select a child by an ancestor's attribute | The component reads `props['data-state']` and writes `data-open` on the icon; the Default part adds `'icon[data-open]'` with the Open ink |
| Focused trigger grows 20 → 24 in the file (a 2px stroke laid out) | A layout jump on focus | The owner asked for no jumps: `focus` + `ring` as box-shadows (no growth); noted in the contract as a deliberate deviation |
| A snippet edit that cut at the wrong backtick | The previous key (`Tooltip: () =>`) stayed glued to the line above and the Popover snippet became a tagged template (tsc passed at first) | After a scripted splice in a `Record` of template strings, run `tsc` AND read the lines around the cut; fixed in this commit for the PopoverFooter entry too |
