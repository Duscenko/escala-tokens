# Contract · InputTag · InputTagChip · InputTagOption (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ InputTag (✓)`: sets
`InputTag` (`390:744`, 72 variants), `InputTagChip` (`388:235`, 40) and `InputTagOption` (`390:793`, 8),
read with `figma-read-set.js` (read-only). **Figma rules; nothing is corrected.**

> Status: DONE (2026-11-12). Recipe, components, catalogue, Storybook and measurement closed. Measured in Storybook (Light): boxes 360×40 · outside filled 68 · chips 18/20/24/28/32 with the file's widths (+2 in Focused and critical) · placeholder 334 → 310 with Spinner · option 240×32. Axe clean except `InputTagOption.meta` (`Content/subtle` on `Surface/input`: 3:1 Light, 3.16:1 Dark; copied from the file).

## InputTagChip (`388:235`)

Set description: "Removable tag chip used inside InputTag; Variant critical marks tags past the maximum.
When RemoveVisible is on, the remove control needs an accessible name such as Remove plus the label."

### API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default · lg · xl | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `forceState`; `disabled` |
| `Variant` default · critical | VARIANT | `default` | `variant` |
| `Label` | TEXT | "Design" | `children` |
| `RemoveVisible` | BOOLEAN | true | `onRemove` present / `removable` |

### Geometry by size (horizontal root, centred)

| Size | Height | Padding X | Gap | ✕ icon | Text |
|---|---|---|---|---|---|
| xs | 18 (no variable) | 6 (no variable) | `Spacing/gap-tight` 4 | 10 | `Type/caption` |
| sm | 20 (no variable) | `Spacing/gap-control` 8 | `Spacing/gap-tight` 4 | 12 | `Type/label` |
| default | `Size/control-xs` 24 | `Spacing/gap-control` 8 | 6 (no variable) | 14 | `Type/label` |
| lg | 28 (no variable) | 10 (no variable) | 6 (no variable) | `Size/icon-sm` 16 | `Type/body-md` |
| xl | `Size/control-sm` 32 | `Spacing/inset-control` 12 | `Spacing/gap-control` 8 | 18 (no variable) | `Type/body-lg` |

Radius `Radius/control` on all. The ✕ is an instance of `icon/close` (Weight=Regular).
Stroke (Focused and critical only): `Stroke/control` 1 INSIDE.

### Colour

| Variant · State | Fill | Stroke | Ink (text and ✕) | Halo |
|---|---|---|---|---|
| default · Default | `Surface/muted` | — | `Content/primary` | — |
| default · Hover | `Surface/muted-hover` | — | `Content/primary` | — |
| default · Focused | `Surface/muted` | `Border/focus` | `Content/primary` | `Border/ring/default` 2 OUTSIDE (`focus-ring`) |
| critical · Default | `Status/critical/surface` | `Status/critical/border` | `Status/critical/content` | — |
| critical · Hover | `Status/critical/surface-pressed` | `Status/critical/border` | `Status/critical/content` | — |
| critical · Focused | `Status/critical/surface` | `Status/critical/border-strong` | `Status/critical/content` | `Status/critical/border` 2 OUTSIDE |
| * · Disabled | `Action/disabled/default` | — | `Content/disabled` | — |

### What the file does that looks odd (copied as is)
- Height, padding and gap of xs, sm and lg (and several values of default and xl) are numbers with no variable.
- Focused grows 2px in width (76 → 78): the INSIDE stroke counts in the layout (`strokesIncludedInLayout`).
- critical always carries a stroke; the default chip only carries it in Focused.
- The ✕'s accessible name is supplied by the code ("Remove" + label).

## InputTagOption (`390:793`)

Description: "Suggestion row in the InputTag dropdown, either an existing option or a create-new action. Render as
a listbox option with aria-selected and arrow-key navigation."

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Type` option · create | VARIANT | `option` | `type` |
| `State` Default · Hover · Focused · Disabled | VARIANT | `Default` | CSS + `forceState`; `data-disabled` |
| `Label` | TEXT | "Design" (create: "Create “Design”") | `children` |
| `Meta` | TEXT | "12" | `meta` |
| `BadgeVisible` | BOOLEAN | true | `badge` (the dot) |
| `MetaVisible` | BOOLEAN | true | `meta` present |

A single size: 240×32 (width with no variable), horizontal row MIN/centre, gap `Spacing/gap-control` 8, padding X
`Spacing/gap-control` 8, height `Size/control-sm` 32, radius `Radius/control`, text `Type/body-md`.
Option children: `badge` (8×8 circle, `Status/success/content`), `label`, `meta` (`Type/caption`, `Content/subtle`).
Create children: `icon` (instance of `icon/plus`, 14×14, `Content/primary`), `label`.

| State | Fill | Stroke | Ink |
|---|---|---|---|
| Default | `Surface/input` | `Border/control` 1 INSIDE | label `Content/primary` |
| Hover | `Surface/muted-hover` | — | `Content/primary` |
| Focused | `Surface/muted-hover` | `Border/focus` 1 INSIDE + `focus-ring` `Border/ring/default` 2 OUTSIDE | `Content/primary` |
| Disabled | `Action/disabled/default` | `Border/control` 1 INSIDE | label, meta, badge and icon `Content/disabled` |

Odd: at rest the row carries FIELD fill and border (`Surface/input` + `Border/control`), not menu-row ones; Hover
removes the stroke.

## InputTag (`390:744`)

Description: "Multi-value text field that turns entries into removable tag chips, inline or stacked outside the
field. Keep a visible label, announce added and removed tags to screen readers and expose the error text through
aria-describedby."

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Layout` inline · outside | VARIANT | `inline` | `layout` |
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Disabled · Loading | VARIANT | `Default` | CSS (`:hover`, `:focus-within`) + `forceState`; `aria-invalid`; `disabled`; `loading` |
| `Value` placeholder · filled | VARIANT | `placeholder` | none: `value` with or without tags |
| `Placeholder` | TEXT | "Add tag…" | `placeholder` |

The width (360) has no variable: whoever uses it sets it.

### Inline layout (the root is the box)

Horizontal WRAP, MIN/centre, gap and row gap `Spacing/gap-tight` 4, padding Y `Spacing/gap-tight` 4 and X
`Spacing/gap-control` 8, radius `Radius/action`, stroke `Stroke/control` 1 INSIDE **inside the layout**
(`strokesIncludedInLayout`). The height is a MINIMUM with no variable: 32 · 40 · 48 (sm · default · lg).
The text typography is `Type/placeholder`.

| Size | min height | Chip it nests |
|---|---|---|
| sm | 32 | `InputTagChip` Size=xs (18) |
| default | 40 | `InputTagChip` Size=sm (20) |
| lg | 48 | `InputTagChip` Size=default (24) |

### Outside layout (the box and the chips separately)

Vertical root, gap `Spacing/gap-control` 8, no fill or stroke. `field` child: horizontal, centred, FIXED height
`Size/control-sm|md|lg` (32 · 40 · 48), padding X `Spacing/inset-control` 12, gap `Spacing/gap-control`,
radius `Radius/action`, same fill, stroke and halo as the inline box; the placeholder grows (grow 1). Below it
`tags`: horizontal WRAP, gap `Spacing/gap-tight` 4, full width; **only exists with Value=filled**
(height = the chip's: 18 · 20 · 24, same chips as inline).

### Colour by State (identical inline and in outside's `field`)

| State | Fill | Stroke | Halo (2px OUTSIDE, `focus-ring`) | Text |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | placeholder `Content/subtle` |
| Hover | `Surface/input` | `Border/control-hover` | — | `Content/subtle` |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | `Content/subtle` + caret 1×14 `Content/primary` |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | `Content/subtle` |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled`; the chips are State=Disabled |
| Loading | `Surface/input` | `Border/control` | — | no placeholder: `Spinner` instance 16×16 (with tags, the chips are State=Disabled) |

In outside the spinner goes inside the `field`, to the right of the placeholder (which narrows 334 → 310).

### What the file does that looks odd (copied as is)
- With Value=filled the placeholder is STILL drawn behind the chips ("Add tag…" at the end): in code the `<input>`
  keeps its `placeholder` even when there are tags (the old component removed it).
- The halo is a `focus-ring` child with a 2 OUTSIDE stroke (not a shadow): it is the same field halo as the Input.
- Invalid also draws a halo (`Status/critical/border`), like the Input.
- Loading paints the chips as Disabled and replaces the placeholder with the Spinner.
- The inline height is a minimum (it grows when wrapping); in outside the field's height is fixed.
- The default chip uses gap 6 and padding 10 in lg: numbers with no variable (see the chip).

## Nests
`InputTagChip` (the tags), `Spinner` (Loading), and the chip names `icon/close`. `InputTagOption` is the dropdown
row that accompanies the field (built as its own piece, not inside the field).
