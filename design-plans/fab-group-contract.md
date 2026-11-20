# Contract · FABGroup (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `FABGroup` (`346:448`,
8 variants, page "❖ FABButton & FABGroup"), read with the Plugin API (read-only).
**Figma rules; nothing is corrected.**

Set description: "Speed-dial: one trigger FABButton that opens up to five action items. Open
toggles the menu; Placement sets the direction items fan out (vertical, center, left, right). Give
the trigger and every icon-only item an accessible name." ("Placement" is the prose name of the
panel's `Layout` property.)

## API

| Figma (panel order) | Type | Default | Options | React |
|---|---|---|---|---|
| `Layout` | VARIANT | `stack` | stack · fan-center · fan-left · fan-right | `layout` |
| `Open` | VARIANT | `false` | false · true | internal state (`open`/`defaultOpen`/`onOpenChange`) |

8 variants = 4 `Layout` × 2 `Open`. The set exposes no axes for the trigger or the items — they are
fixed `FABButton` instances (see below). There is no group-level `State` axis: each item is
its own `FABButton` and inherits its Hover/Pressed/Focused/Disabled states from the already-built recipe
(`design-plans/fab-button-contract.md`).

### The trigger (fixed instance in all 8 variants)
`FABButton / Appearance=solid, Shape=pill, Size=lg, Variant=default` — the same in every variant.
The only thing that changes with `Open` is the icon (`IconLeadingIcon`, instance swap): `Plus` when closed,
`X` when open. `LabelVisible` is always `false` (icon only) — the `Label` text ("Create") exists
in the component but is never shown; in React it is the default accessible name.

### Each item (fixed instance)
`FABButton / Appearance=soft, Shape=pill, Size=default, Variant=default` — the same in all layouts
and positions. `LabelVisible` differs by **Layout**, measured:

| Layout | Items' `LabelVisible` | Number of items in the file |
|---|---|---|
| `stack` | `true` (Edit · Photo · Share) | 3 |
| `fan-center` | `false` (icon only) | 5 |
| `fan-left` | `false` (icon only) | 3 |
| `fan-right` | `false` (icon only) | 3 |

Each item's text (`Label`) is its real action when visible ("Edit", "Photo", "Share" in
`stack`); in the three `fan-*` layouts the `Label` stays "Create" (inherited, not visible) — the real
accessible name in code is the `label` the consumer passes per item (`aria-label`).

## Geometry

**`stack`** (Edit · Photo · Share, measured in `Layout=stack, Open=true`, 152×244): the trigger stays
in place (at the bottom), the items stack above it, aligned to the trigger's RIGHT edge (trigger
width: x 92 → 148; each item: x+width = 148 as well). Constant vertical spacing between edges:
12px in all three gaps (item1→trigger, item2→item1, item3→item2) — it matches exactly
`Spacing/inset-control` (12), so that role is used instead of a literal. Order: the item closest
to the trigger is the first in the list (`items[0]` = Edit).

**`fan-center` / `fan-left` / `fan-right`** (icon only, 48×48): each item sits on an **arc of
radius 100px measured from the trigger's centre** (measured in all three: fan-center, fan-left and fan-right
give exactly 100px centre-to-centre for each item, with a rounding error of ±0.4px because of the 45°
angle). **100px does not correspond to any Dimension Primitives token or to an obvious sum of roles — it is
a geometric composition decision of the file, copied as a literal** (`--fab-group-radius: 100px`
in the component, never a ref). Each item's angle (measured in degrees, 0°=right, −90°=up,
180°=left, screen convention with Y+ pointing down):

| Layout | measured count | measured angles | generalised formula (n items, i=0..n−1) |
|---|---|---|---|
| `fan-center` | 5 | 180, −135, −90, −45, 0 | `i·(180/(n−1)) − 180` |
| `fan-left` | 3 | −90, −135, −180(=180) | `−90 − i·(90/(n−1))` |
| `fan-right` | 3 | −90, −45, 0 | `−90 + i·(90/(n−1))` |

`items[0]` is always the closest to the vertical axis (top) in the three `fan-*` layouts: in `fan-center` it is
the LEFT end (angle 180°), not the top one — measured that way in the file (item-1 is on the
left, item-3 on top, item-5 on the right). With `n=1` there is no arc to measure in the file; the single
item is placed on top (`−90°`) in all three layouts, the position common to the three arcs.

Each item's centre = the trigger's centre + `radius·(cos θ, sin θ)`, with θ in the convention
above. The trigger does not move from layout to layout — only its position INSIDE the group's frame changes
(Figma centres the frame differently per layout; in code the trigger is the anchor and the frame adjusts itself).

## Colour and effects

None belongs to the group — each item and the trigger are already-built `FABButton` instances
(`FAB_BUTTON` recipe, `design-plans/fab-button-contract.md`): fill, ink, focus, lift and highlight are already
resolved there. `FABGroup` paints nothing, it only positions. Opening/closing does not change the
trigger's colour (it stays `Action/primary/default` in both states) — only the icon.

## Motion (not in the file; a code-side decision)

The file only has two static variants (`Open` false/true), with no intermediate frames. Opening
uses the motion role `use-stagger-in` / `use-stagger-out` (`lib/motion.ts`: "one of
the children of a staggered reveal") with a small per-index `transition-delay` — it is not a
value from the file, and is documented as such.

## What the file does that looks odd (copied as is)
- The trigger exposes a text `Label` ("Create") and `LabelVisible=false` in all 8 variants: the
  text is never seen, but exists as the component's semantic name. In code it is the default
  value of the trigger's `aria-label`.
- The 100px radius does not derive from any visible Dimension Primitives/Semantics role (nor
  does `trigger.radius + item.size + item.radius` give a meaningful name except by numeric coincidence
  with `Size/control-lg`=48). It is documented, not "fixed".
- `fan-center` distributes 5 items over 180° starting from the LEFT; `fan-left`/`fan-right` distribute
  3 over 90° starting from the TOP. These are two different starting conventions for the same radius —
  both are copied.

## Nests
`FABButton` (`design-plans/fab-button-contract.md`) — built first and the only component
this set uses as an instance, both for the trigger and for each item.
