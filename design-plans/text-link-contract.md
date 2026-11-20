# Contract · TextLink (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `TextLink` (`358:6494`,
144 variants), read with the Plugin API (read-only). The recipe, the component and
Storybook copy it. **Figma rules; nothing is corrected.**

Set description: "Inline text link for navigation and in-flow actions. Hover and Pressed
always show the underline; UnderlineVisible controls it in the other states. Visited is a
link-only state. Variants critical, success and info use Status roles. Always give the link a
descriptive label; icon-only use needs an accessible name (aria-label)."

## API

| Figma | Type | Default | Options (file order) | React |
|---|---|---|---|---|
| `Size` | VARIANT | `default` | xs · sm · default · lg | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Pressed · Visited · Focused · Disabled | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` | VARIANT | `default` | inverse · success · info · default · secondary · critical | `variant` |
| `Label` | TEXT | "Inline Text Link" | — | `children` |
| `IconLeadingVisible` | BOOLEAN | `true` | — | `leading?: ReactNode` (present = visible) |
| `IconTrailingVisible` | BOOLEAN | `true` | — | `trailing?: ReactNode` |
| `IconLeadingIcon` | INSTANCE_SWAP | `icon/plus` | — | the `leading` node |
| `IconTrailingIcon` | INSTANCE_SWAP | `icon/arrow-right` | — | the `trailing` node |
| `UnderlineVisible` | BOOLEAN | `true` | — | `underline?: boolean` |

144 = 4 · 6 · 6. The order of the non-variant properties is the API's (I could not see
the playground panel; if it differs, the order of the story's controls is adjusted).

`Visited`: the file paints it **the same as Default** in all six variants (there is no "visited" role).
In code `forceState="Visited"` exists, but a real `:visited` paints nothing: giving it its own rule
would make a visited link ignore hover.

## Geometry by size

Root: horizontal, items at the start, vertically centred, width = content, padding X
`Spacing/gap-tight` (4) on both sides, padding Y 0, radius `Radius/control` (8) → `radius.control`.

| Size | Gap | Icon (frame and glyph) | Text style | Text height |
|---|---|---|---|---|
| xs | `Spacing/gap-tight` (4) | `Size/icon-sm` (16) → `icon.small` | `Type/body-sm` 12 | 18 |
| sm | `Spacing/gap-tight` (4) | `Size/icon-sm` (16) | `Type/body-md` 14 | 21 |
| default | `Spacing/gap-control` (8) | `Size/icon-md` (20) → `icon.medium` | `Type/body-lg` 16 | 25 |
| lg | `Spacing/gap-control` (8) | `Size/icon-md` (20) | `Type/body-xl` 18 | 26 |

Measurements from the file (default · Default): 177 × 25. `label-wrap` is a column with the text and the
underline; the underline is an absolute rectangle of `Stroke/divider` (1) height, the text's width,
flush with the text's bottom edge (y = height − 1), filled with the text's colour.

## Colour by Variant and State

The same in all four sizes (measured). Text, underline and icons share a single colour.

| Variant | Default · Visited · Focused | Hover · Pressed | Disabled |
|---|---|---|---|
| default | `Content/link/default` | `Content/link/hover` | `Content/disabled` |
| secondary | `Content/secondary` | `Content/primary` | `Content/disabled` |
| inverse | `Content/inverse` | `Content/inverse` | `Content/disabled` |
| critical | `Status/critical/content` | same | `Content/disabled` |
| success | `Status/success/content` | same | `Content/disabled` |
| info | `Status/info/content` | same | `Content/disabled` |

No fill in any state.

## Underline

Visible in Default, Visited, Focused and Disabled according to `UnderlineVisible` (default `true`); **in
Hover and Pressed always visible**, the property does not apply there.

**Opacity of the `underline` node: 0.4 in Default, Visited, Focused and Disabled; 1 in Hover and Pressed**
(measured in the API and in the render's pixels: the underline row in Default is the ink at 40 %
over the page, `(194,180,230)` versus `#6945c1`). It is the only opacity in the file; in the recipe it is
the `opacity` property (a flat value, outside the token references).

## Focus

Only in `Focused`: a `Stroke/focus` (2) stroke **inside** + a `focus-ring` frame the size of the
root with a 2 stroke **outside**.

| Variant | Border (2, inside) | Halo (2, outside) |
|---|---|---|
| default | `Border/focus` | `Border/ring/default` |
| secondary | `Border/strong` | `Border/subtle` |
| inverse | `Border/inverse` | `Surface/inverse-muted` |
| critical · success · info | `Status/<x>/border-strong` | `Status/<x>/border` |

## Effects

None.

## What the file does that looks odd (copied as is)

- **The Focused state is 4 px larger on each axis** (181 × 29 versus 177 × 25): the 2 px stroke
  counts inside the layout (`strokesIncludedInLayout`) and pushes the content 2 px. In code the
  Focused padding adds the stroke (`gap-tight + stroke.focus` on X, `stroke.focus` on Y), so the
  link grows the same way when it receives focus. It is a layout shift; the file says so.
- **`Type/body-xl` is not a role**: the file's style is bound to the scale's primitives
  (`size/text-xl` 18, `line-height/text-xl` 26, `letter-spacing/text-xl` −0.2, `weight/regular`), not
  to `role/body-xl/*` like the other three. In code the recipe references it as the scale's `text-xl`
  step, without inventing a role.
- Hover and Pressed paint the same (they do not even change in critical / success / info / inverse).
- The first read of the set missed the node opacity (a trimmed version of the script); the pixel
  comparison caught it. The full `figma-read-set.js` now lists it.

## Nests

The icons are instances of `icon/<name> / Weight=Regular` (the file's icon set, already in
code). It does not nest other components.
