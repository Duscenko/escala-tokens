# Copy to Figma: one element, or the whole system

**Status:** plan, nothing built (2026-11-04). Revised the same day after the
owner's call: **copy just this element** has to land as just that element,
the way you copy a component in Framer.

## The ask

Every component the user sees gets a **Copy for Figma** split button:

- **Copy this element** (the default click): the component on screen, as the
  variant selected.
- **Copy whole design system** (in the ⌄ menu): the same paste the Figma page
  already produces.

In Figma the person opens the Escala plugin and presses ⌘V (or the paste
button). The plugin reads what it got and acts:

- **An element** → it builds that one component and drops it on the **current
  page, at the centre of the viewport, selected**. No library pages, no Cover,
  no Docs. Only the variables that element reads are created, so it is still
  bound to tokens, not loose hex.
- **A whole system** → today's import, unchanged.

## What exists today (measured)

- **The paste protocol.** `buildFigmaContext` (`lib/figmaContext.ts`)
  produces Markdown with the brand's full `generateTokenJSON` payload in one
  ` ```json escala-tokens ` fence. The plugin reads it with
  `extractEscalaPayload` + `classifyPaste` (`ui.html`).
- **⌘V only works in two places.** The plugin's paste listener
  (`ui.html`, `document.addEventListener('paste'…)`) acts on Home in an empty
  file or on the Import page. Elsewhere a paste does nothing.
- **What an element reads is already known.** `traceRecipe(t, key, axes)`
  (`lib/tokenTrace.ts`) returns every token a recipe reads, property by
  property: colour roles, radius, spacing, size, stroke, type. This is the same
  trace the inspector shows. A test asserts that every reference resolves.
- **The plugin builds from its own catalogue.** `importSample` (`code.ts`)
  builds the 9-component Overview or every entry. There is no "build only X"
  path. `CATALOG` entries declare `uses` (Button Group uses Button), and
  composites insert the system's Button and Icon.

## The protocol: one field, two kinds

Both copies are the same message shape: envelope, a line of prose, and the
JSON fence. The payload gains one optional key, `copy`:

```json
"copy": {
  "kind": "element",
  "component": "Button",
  "variant": { "Variant": "default", "Size": "default", "State": "Default" },
  "label": "Download all",
  "icons": { "leading": "download", "trailing": null }
}
```

- `kind: "element"` means "build this and place it". With no `copy` key the
  paste is a whole system, which is exactly today's paste, so an older plugin
  still imports it.
- **An element's payload is a cut, not the whole brand.** It carries only the
  tokens `traceRecipe` lists for that variant, plus those of what it is built
  from (Icon, and Button inside a composite), plus the primitives those roles
  alias. It keeps the same shape as `tokens.json`, so the plugin's existing
  variable import reads it with no new parser. The paste is a few KB instead
  of ~120 KB.
- **No `schemaVersion` bump.** `copy` is additive, following the
  `shadowsDark` / `gradientsDark` precedent.

## Web half

1. **Split button** in `ComponentCatalogueHero`'s header, beside Copy
   context: Figma mark + "Copy for Figma", with a ⌄ menu containing Copy this
   element / Copy whole design system. Same split shape as `AIContextButton`.
2. **`buildElementFigmaContext({ key, variant, icons, brand, appearance })`**
   in `lib/figmaContext.ts`. It runs `traceRecipe` over the variant (and its
   dependencies), cuts `generateTokenJSON` down to those tokens and the
   primitives they alias, and adds `copy`. The whole-system item calls the
   existing `buildFigmaContext`.
3. **Where "this element" comes from.** On the page it is the variant shown
   in the stage. In the Overview it is the whole set: one paste, one row.
   Later the same builder serves a right-click on any element on the Board,
   since `traceElement` already resolves a DOM node to its recipe and axes.
4. **Feedback.** A toast "Button copied for Figma — paste it in the Escala
   plugin", plus a link to download the plugin.
5. **Tests.**
   - Every role and primitive the trace names is present in the cut.
   - Nothing the element does not read is present (no other brand, no other
     component's roles).
   - The cut round-trips through `extractEscalaPayload`.
   - Every catalogue key can be copied.

## Plugin half

1. **⌘V anywhere in the plugin.** The paste listener accepts an element
   paste on every screen, not only Home and Import. It still yields to text
   fields.
2. **`classifyPaste` → `element`** when `raw.copy?.kind === 'element'`. There
   is no confirmation card: the element is built straight away and a status
   line says "Button added to this page". This is what makes it feel like
   Framer.
3. **Variables: merge, never replace.**
   - Find the file's Escala collections. Create any role or primitive the
     element needs that is missing.
   - Reuse a variable that already exists with the same name.
   - Never delete, never rebuild pages (`protectPages`).
   - If the file holds a **different** Escala system, its variables win for
     names they share, and the plugin says so.
4. **Build one entry.** `importSample(tokens, { only: [key] })` builds the
   entry plus the closure of its `uses` and Icon. Dependencies are built as
   off-canvas components (or reused if present). The copied element is placed
   as an **instance** of its component, set to `copy.variant`, at the viewport
   centre, and selected and zoomed to. If its component set already exists in
   the file, it is reused and nothing is rebuilt.
5. **Parity test.** Every web catalogue key has a `CATALOG` gate, so every
   element the web lets you copy can be built.

## Open question (owner)

1. **The component it comes from.** An instance needs a main component
   somewhere in the file.
   - (a) Create the set on a quiet `⬡ Escala components` page and place an
     instance on the current page. This is the Figma-correct option: it stays
     editable as a component, and a later full import reuses it.
   - (b) Place a detached frame. This is the most like Framer, but the result
     is no longer a component.
   - Recommendation: (a).

## Order

1. Web builder + the cut + tests.
2. Plugin ⌘V everywhere + `element` kind.
3. Plugin `importSample({ only })` + place-instance.
4. Web split button, shipped last so the button never goes out before the
   plugin can read what it copies.
5. Plugin release, then `npm run bundle:plugin` here.
