# Contract · SplitButton (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, set `SplitButton` (`2391:2107`, page
"❖ SplitButton (PRO)"), read with `figma-read-set.js` + reads of the nested instances (read-only).
This document is what the recipe, the component and Storybook copy. **Figma rules; nothing is corrected.**
Page sections: Components `2426:940` (set + DocMatrix `2426:1314`), Prototype `2391:2109`
(Light / Dark, 1 · closed, 2 · open), Usage Guideline `2426:1371`.

## What it is

A primary action joined to a menu of related alternatives. **It paints nothing of its own**: it is a
composition of two components that are already built.

- `group` = **ButtonGroup** (`Shape=rounded`, `Orientation=horizontal`, the set's `Variant` and `Size`) with
  two segments: `item-1` = **ButtonGroupItem** with a label and leading icon (action) and `item-2` =
  ButtonGroupItem `IconOnly=true` with the caret (the trigger). The ButtonGroup puts the 1px divider between them.
- `menu` (`Open=true` only) = **DropdownMenu** (`Size` per the set, see table) with three **DropdownMenuItem**s.

The set has 16 variants (2 × 4 × 2). Root: VERTICAL auto-layout, hug; the `menu` is an ABSOLUTE child.

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Variant` `default` · `secondary` | VARIANT | `default` | `variant` |
| `Size` `default` · `xs` · `sm` · `lg` | VARIANT | `default` | `size` |
| `Open` `false` · `true` | VARIANT | `false` | `open` (controlled) · `defaultOpen` · `onOpenChange` |

The set **has no** TEXT, BOOLEAN or INSTANCE_SWAP properties: the label ("Publish"), the leading icon
(`PaperPlaneTilt`) and the menu content are edited "through the exposed ButtonGroupItems" (set
description). In code those are content props that **do not exist in Figma's panel**, added at the end:

| Content (nested instance) | Default in the file | React |
|---|---|---|
| `item-1` → `Label` | `Publish` | `children` |
| `item-1` → `IconLeadingIcon` | `PaperPlaneTilt` | `leading` |
| `item-2` → icon | `CaretDown` (closed) · `CaretUp` (`Open=true`) | the component swaps it with `open`; `caret` / `caretOpen` to replace them |
| `menu` → Content | `Publish and notify` (PaperPlaneTilt) · `Save as draft` (FileText) · `Delete draft` (Trash, `Variant=critical`) | `menu` (DropdownMenuItem[]) |
| accessible name of the caret | "<label> more actions" | `moreLabel` (defaults to `${children} more actions`) |

There are no states of its own: Hover · Pressed · Focused · Disabled come from the nested ButtonGroupItems
(each segment's `forceState` is not exposed on the set). `Open=true` fixes the caret at **Active**.

## Geometry by size

Measured from the set (`Variant=default`; `secondary` the same except for the exception below).

| Size | Group height | Group width (item-1 + 1 + item-2) | Icon (item) | Menu: `Size` · rows · width | Menu: x · y (vs. variant) |
|---|---|---|---|---|---|
| `xs` | 24 (`Size/control-xs`) | 112 (87 + 1 + 24) | `Size/icon-sm` | `sm` · 24 · 256×98 | `−(256 − width)` · 32 |
| `sm` | 32 (`Size/control-sm`) | 120 (87 + 1 + 32) | `Size/icon-sm` | `sm` · 24 · 256×98 | −136 · 40 |
| `default` | 40 (`Size/control-md`) | 136 (95 + 1 + 40) | `Size/icon-md` | `default` · 32 · 256×122 | −120 · 48 |
| `lg` | 48 (`Size/control-lg`) | 148 (99 + 1 + 48) | `Size/icon-lg` | `lg` · 40 · 256×146 | −108 · 56 |

- Group: radius `Radius/action` (12), no stroke, no fill of its own, effects `Shadow/xs`
  (`DROP_SHADOW 0 0 0 1 Elevation/shadow-ring` + `0 1 2 0 Elevation/shadow-ambient`) — it is the ButtonGroup as is.
- Menu: **aligned to the end edge** (x = group width − 256) and **8px below** the group (y = height + 8 =
  `Spacing/gap-control`). `xs` opens the DropdownMenu `Size=sm` (there is no `xs` on the menu). Fill `Surface/layer-2`,
  1px stroke `Stroke/divider` INSIDE `Border/default`, radius `Radius/overlay` (24), `Shadow/md`
  (`0 0 0 1 shadow-ring` + `0 4 6 −1 shadow-key` + `0 2 4 −2 shadow-ambient`) — it is the DropdownMenu as is.
- `item-1` widths by Inter: 95 · 87 · 87 · 99; Chrome measures different fractions (±1.8px), as in ButtonGroup.

## Color by combination and state

Nothing of its own: the ButtonGroupItems paint it. Reading of the set:

| Variant | Primary segment (Default) | Closed caret | Caret `Open=true` (Active) | Ink |
|---|---|---|---|---|
| `default` | fill `Action/primary/default` | fill `Action/primary/default` | fill `Action/primary/pressed` · icon `CaretUp` | `Content/on-action` (label and icons) |
| `secondary` | fill `Action/secondary/default` | fill `Action/secondary/default` | fill `Action/secondary/pressed` · icon `CaretUp` | `Content/on-secondary` |

Divider, hover, pressed, focus: those of ButtonGroup / ButtonGroupItem (`design-plans/button-group-contract.md`).
Menu and rows: those of DropdownMenu (`design-plans/dropdown-menu-contract.md`); `Delete draft` is `Variant=critical`.

## Effects
None of its own. `Shadow/xs` on the group and `Shadow/md` on the menu, both inherited (see above).

## Motion (the page documents it in the Prototype)
- Closed → open: the caret goes to Active and the DropdownMenu opens from a fixed anchor on the end edge
  with **`popover-enter`**; the rows enter with **`use-stagger-in`**. "The primary half-button does not scale."
- Close: `popover-exit`. All by role name (`recipes/motion.ts`, `lib/motion.ts`); the caret swaps
  icon (CaretDown ↔ CaretUp) with no rotation of its own; the segment's fill transitions with `use-hover`.

## Accessibility (set description)
Two native buttons. The caret is named "<label> more actions" with `aria-haspopup="menu"` and
`aria-expanded`; arrows move through the items and wrap around; Escape closes and returns focus to the caret.
The pair never collapses: give it its own row on narrow screens. Radix DropdownMenu provides the behavior
(roles, arrows, typeahead, Escape, focus return). The primary segment is not a toggle button:
it carries no `aria-pressed`.

## What the file does that looks odd (copied as is, except where noted)
- **`Variant=default, Size=xs` (both Open) measures 113 wide**: it carries a visible, ghost `divider-3` to the
  right of the caret (x 112, 1×24, with no third segment); `secondary · xs` measures 112. It is a leftover of the
  instance (the other 14 variants do not have it); **it is not copied** (a divider with no segment behind it is not
  design) — the xs group measures 112 in both variants. Reported to the owner.
- The `xs` menu uses `DropdownMenu Size=sm` (row height 24, same as `sm`).
- The caret swaps icon with `Open` (CaretDown → CaretUp) and the segment stays at Active (`pressed` fill).
- The label, the icon and the menu rows are examples from the file ("Publish"…): they are not set properties.

## Nests
**ButtonGroup** (`Size`, `Variant`, `Shape=rounded`, `Orientation=horizontal`, Item1/Item2 visible) with
**ButtonGroupItem** + **ButtonGroupDivider**, and **DropdownMenu** with **DropdownMenuItem** (`default` ×2,
`critical` ×1). All already built in `escala-ui`.

## Code dependencies
`src/components/escala-ui/split-button.tsx` (uses `button-group`, `dropdown-menu`) · recipe `SplitButton`
(`src/lib/recipes/splitButton.ts`: only the menu–group gap and the menu width) · story
`apps/storybook/stories/SplitButton.stories.tsx` · family `Buttons/SplitButton` (`spec/storybook-families.json`).
