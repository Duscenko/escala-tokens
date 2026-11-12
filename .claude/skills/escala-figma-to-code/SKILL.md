---
name: escala-figma-to-code
description: >
  Build an Escala component in code EXACTLY as the Figma file has it — from a Figma Dev link to a
  recipe, an `escala-ui` React component and a Storybook story whose controls mirror Figma's
  component playground, verified by measurement. Use whenever the owner sends a Figma Dev link of
  a component (figma.com/design/7j5zukN5HpihGVJMmyjA20/...?node-id=…&m=dev), or asks to build,
  rebuild, port or "montar" a component from Figma into the web or Storybook ("de Figma a código",
  "de Figma a Storybook", "tal cual Figma").
---

# Escala · de Figma a código

The Figma file **`Escala Design System (Real)`** (`7j5zukN5HpihGVJMmyjA20`) is curated, reviewed and
production-ready. For components it is the ONLY rule. This skill turns one of its component sets into
code without the owner having to repeat anything. Load alongside: `figma-use` (Plugin API rules) for
every `use_figma` call, `figma-design-to-code` before `get_design_context`, and `escala-architecture`
for role names.

## 1. Rules — never negotiable

1. **Figma is the only rule.** Nothing outranks the file: not the plugin, not the web, not a convention
   in CLAUDE.md, not an older plan. If two sets in the file disagree (IconButton keeps per-intent focus
   rings, Button does not), the code copies BOTH.
2. **Never edit the Figma file.** Not to "fix" it, unify it, or finish its docs — not even for items an
   old plan lists as "pending in Figma". Every `use_figma` call in this skill is READ-ONLY. If something
   looks wrong, say it in one line and build from it as it is.
3. **Never ask "Figma or code?".** Measure, copy, report. Ask only for what widens SCOPE (e.g. bringing
   the file's palette to the web — it is Storybook-only by the owner's call).
4. **Targets: web (`escala-ui` + recipe) and Storybook.** The Figma plugin is frozen for components.
5. **Stop after each component** and show the result. Commit only your own files (another session works
   in the same folder). Never push without asking.

## 2. The pipeline (one component)

### Step 1 · Read the set (read-only)
1. From the Dev link take the node id (`node-id=4-5066` → `4:5066`). `create_session` once per task.
2. Run **`scripts/figma-read-set.js`** with `use_figma` (replace `__SET_ID__`). It returns:
   - `props` in Figma's **panel order** (variant axes first), defaults, options, swap defaults;
   - `sweep`: the default variant and every variant one axis away from it — size, layout, padding, gap,
     radius, fills, strokes (+ weight and ALIGN), effects, children, each with its variable;
   - `colours`: every variant's fill · stroke · ink · ring · effects on one line.
3. `get_design_context` on the default variant (with `figma-design-to-code`) **for the screenshot and the
   structure only**. Its Tailwind is lossy — it dropped a `DROP_SHADOW` spread. Values come from the
   script.
4. If the component nests others (Field → Input), list them; build those first.

### Step 2 · Contract
Write `design-plans/<component>-contract.md` from `references/contract-template.md`: API table
(Figma → React), geometry per size, colour per combination × state, focus, effects, and anything the
file does that looks odd (copied, with one line saying so). Values exactly as the script returned them.

### Step 3 · Recipe + component
- **Recipe** (`src/lib/recipes/*.ts`) is the ONE styling source — no cva, no inline values. Every value
  is a token ref. A prop the recipe language lacks gets a recipe property in `recipes/helpers.ts`
  (`RECIPE_PROPS`), its CSS in `recipeStyles.ts`, its label in `tokenTrace.ts` — as `highlight` was.
- **Component** in `src/components/escala-ui/`: Radix for behaviour, names / axes / values identical to
  Figma (`variant`, `appearance`, `size`, `forceState` for docs), `data-escala` + `data-<axis>` on the root.
- Catalogue entry (`componentCatalogue.ts`) axes = Figma's. Old shadcn values stay only as migration
  aliases, never in the catalogue.

### Step 4 · Storybook
Copy `references/story-template.tsx` into `apps/storybook/stories/<Component>.stories.tsx`:
- args/argTypes = the Figma properties, **same order and same defaults as Figma's component playground**
  (variant axes, then booleans / text / swaps in panel order); swaps use `iconSwapArg` (`stories/iconSwap.ts`);
  select options in Figma's option order.
- Stories: `Playground`, `AllCombinations`, `Sizes`, `States` (only the axes the set has).
- The toolbar already gives Color Semantics (Escala Light / Dark) and Dimension Semantics · Typography
  (Desktop / Tablet / Mobile); Storybook already builds the Figma file's system and palette.

### Step 5 · Verify by measurement — never by eye
1. Start Storybook (`preview_start` name `Storybook`, port 6006).
2. Run **`scripts/storybook-measure.js`** with the Browser pane's `javascript_tool` on Playground and
   States, in Escala Light and Escala Dark (`&globals=theme:dark` on the manager URL).
3. Compare with the script's sweep, row by row: size, fill, ink, border, radius, padding, gap, shadow /
   effects, outline, children offsets. Fix every ✗ in the recipe or the component, re-measure.
4. One zoomed screenshot next to the Figma screenshot for the owner.

### Step 6 · Close
- `npx vitest run` (all green), `npx tsc -b`, `npm run typecheck:storybook`.
- Goldens (`exportAudit`) move when a recipe changes: read the diff, confirm it is only your change,
  then `npx vitest run src/lib/__tests__/exportAudit.test.ts -u`.
- Recipe changed → `node scripts/build-plugin-studio.mjs` (committed bundle).
- Remove the component from `spec/figma-components.status.json` → `pending`;
  `figmaComponentsParity.test.ts` must stay green.
- Commit only your files; report what changed, what was measured, anything odd in the file.

## 3. Known traps (already fixed — don't reintroduce)

Read `references/lessons.md` before step 3. In short:
- Tailwind in Storybook scans `src/` only through `apps/storybook/.storybook/storybook.css` (`@source`).
- Storybook paints the Figma file's system: `buildStudioTokens` + `applyFigmaFilePalette` (palette as data).
- Figma strokes sit INSIDE the frame; the CSS padding gives back `--escala-stroke-width`.
- Focus: a control's edge is 2px inside + a 2px halo outside; a field keeps its 1px edge and the 2px
  halo straddles it (`outline` + negative offset). Copy each set's own focus colours.
- `get_design_context` Tailwind is lossy (shadow spread); trust `figma-read-set.js`.
- The plugin's ground-truth check compares aliases, not hex: verify resolved hex.
