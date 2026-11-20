# Contract · ButtonGroup (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ ButtonGroup (✓)`, three sets
read with `use_figma` (read-only):

| Set | Node | Variants | Axes |
|---|---|---|---|
| `ButtonGroup` | `351:8921` | 100 (120 minus `pill × vertical`) | Size · Variant · Shape · Orientation + Item1…5Visible |
| `ButtonGroupItem` | `350:5337` | 400 | Size · State · Variant · IconOnly · Active + Label, iconos, LoadingVisible |
| `ButtonGroupDivider` | `351:410` | 8 | Variant · Orientation |

All three are built in `components/escala-ui/button-group.tsx`, each with its recipe
(`BUTTON_GROUP`, `BUTTON_GROUP_ITEM`, `BUTTON_GROUP_DIVIDER` in `recipes/actions.ts`) and its catalogue
entry. **Figma rules; nothing is corrected.** The items are NOT `Button` instances: the file
draws them as a set of their own (no radius, no border, a different palette per variant), so code does too.

## API

### ButtonGroup

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · lg · xl · default | VARIANT | `default` | `size` (passed to the items through context) |
| `Variant` outline · default · inverse · secondary | VARIANT | `default` | `variant` (items + dividers) |
| `Shape` rounded · pill · square | VARIANT | `rounded` | `shape` |
| `Orientation` horizontal · vertical | VARIANT | `horizontal` | `orientation` |
| `Item1Visible` … `Item5Visible` | BOOLEAN | true · true · true · false · false | the children: one `ButtonGroupItem` per visible item; the divider between two items is added by the group |

`pill × vertical` does not exist in the file (the set's description says so): the component
downgrades it to `rounded` and warns in development.

### ButtonGroupItem

| Figma | Type | Default | React |
|---|---|---|---|
| `Size` xs · sm · default · lg · xl | VARIANT | `default` | group context, or `size` |
| `State` Default · Hover · Pressed · Focused · Disabled | VARIANT | `Default` | CSS + `forceState`; `disabled` |
| `Variant` outline · default · inverse · secondary | VARIANT | `default` | group context, or `variant` |
| `IconOnly` false · true | VARIANT | `false` | `iconOnly` (needs `aria-label`) |
| `Active` false · true | VARIANT | `false` | `active` → `aria-pressed` |
| `Label` | TEXT | "Label" | `children` |
| `IconLeadingVisible` + `IconLeadingIcon` | BOOLEAN + SWAP | false · `Plus` | `leading` |
| `IconTrailingVisible` + `IconTrailingIcon` | BOOLEAN + SWAP | false · `CaretDown` | `trailing` |
| `LoadingVisible` | BOOLEAN | false | `loading` (spinner AFTER the label, as in the file; `aria-busy`) |

### ButtonGroupDivider

`Variant` (default `default`) · `Orientation` (default `horizontal`). Thickness `Stroke/divider` (1px);
the cross axis stretches (FILL). `Orientation=horizontal` = the vertical line between items in a row.

## Geometry

### Group
Auto-layout with no gap or padding (`Spacing/none`), HUG, `clipsContent` true. Radius by Shape:
rounded `Radius/action` (12) · pill `Radius/full` · square `Radius/none`. No fill or stroke of its own.
Effect: `Shadow/xs` style (`DROP_SHADOW 0 0 0 1 Elevation/shadow-ring` + `0 1 2 0 Elevation/shadow-ambient`;
the frame clips, so the spread IS painted).
- Horizontal: items HUG width / FIXED height, dividers FIXED 1 × FILL.
- Vertical: items FILL width, dividers FILL × 1.
- Shape `pill`: the group overrides each item's horizontal padding to `Spacing/inset-surface` (20).
- Variant `outline`: an absolute `border` rectangle (STRETCH) on top of everything: `Border/control` stroke
  1px INSIDE, radius = the group's.

### Item by size

| Size | Height | Padding X | Gap | Icon | Spinner | Text |
|---|---|---|---|---|---|---|
| xs | `Size/control-xs` 24 | `Spacing/inset-control` 12 | `Spacing/gap-tight` 4 | `Size/icon-sm` 16 | 16 | `Type/button` |
| sm | `Size/control-sm` 32 | 12 | `gap-tight` 4 | 16 | 16 | `Type/button` |
| default | `Size/control-md` 40 | 12 | `gap-control` 8 | `Size/icon-md` 20 | 16 | `Type/button` |
| lg | `Size/control-lg` 48 | 12 | `gap-control` 8 | `Size/icon-lg` 24 | 20 | `Type/button` |
| xl | `Size/control-xl` 56 | 12 | `gap-control` 8 | 24 | 20 | `Type/button` |

IconOnly: width = height (`Size/control-*`), padding 0, only the leading icon. No radius (the group clips it),
no stroke.

## Colour by Variant × state (item)

| Variant | Default | Hover | Pressed | Active (Default · Hover · Pressed) | Disabled | Ink |
|---|---|---|---|---|---|---|
| default | `Action/primary/default` | `…/hover` | `…/pressed` | `…/pressed` (all three) | `Surface/page` + `Action/disabled/default` | `Content/on-action` |
| secondary | `Action/secondary/default` | `…/hover` | `…/pressed` | `…/pressed` | same | `Content/on-secondary` |
| inverse | `Surface/inverse` | + `Surface/inverse-muted` ×1 | + ×2 | + ×2 | same | `Content/inverse` |
| outline | — | `Action/ghost/hover` | `Action/ghost/pressed` | `Surface/selected` · `Surface/selected-pressed` · `Surface/selected-pressed` | — | `Content/primary`; active `Content/accent` |

Disabled: ink `Content/disabled` on all, also active. Focused: the Default fill (or the Active one),
plus an absolute `focus-ring` rectangle, 2px INSIDE stroke, radius 0: default · outline
`Border/ring/default`, secondary `Border/subtle`, inverse `Surface/inverse-muted`. No outer halo.

## Divider

default `Action/primary/pressed` · secondary `Border/subtle` · inverse `Border/inverse` · outline `Border/control`.

## What the file does that looks odd (copied as is)
- The visibility of divider N is tied to `ItemNVisible`: if item 1 is hidden, the file leaves a divider
  in front of item 2. In code the divider goes only BETWEEN items, so that case is not reproduced.
- The hidden dividers 4 and 5 of `secondary` carry `Border/accent` (the visible ones `Border/subtle`):
  an old override on hidden layers. The visible ones' value is copied.
- The group's `Size` in the order `xs · sm · lg · xl · default`; the item's `xs · sm · default · lg · xl`.
- The width of an item with a label does not depend on Size (same padding 12 in all).
- `Shape=pill` + `vertical` does not exist.

## Nests
`ButtonGroupItem` and `ButtonGroupDivider` (this file). Icons: `Plus`, `CaretDown` (Phosphor).
