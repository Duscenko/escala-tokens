# Contract · ReactionGroup, ReactionGroupTrigger and ReactionGroupPopover (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page "❖ ReactionGroup (PRO)" (2381:42): `ReactionGroup` (2381:169, loose component),
`ReactionGroupTrigger` (2381:124, 25 variants) and `ReactionGroupPopover` (2381:130, loose component). Prototype: 2383:114. Read with `use_figma` (read-only) on
2026-11-19; every role below is the one the file binds. Built in the library before Storybook (owner's exception; `STG-001`, EXC-2026-11-19-002).
Behavior reference: uiarc.dev Reactions. The name is singular, like `ButtonGroup`.

## What it is
A light acknowledgment under a post or a comment: a row of reaction pills that wraps, a button that opens the picker and an optional
summary line. **The pills are the `Chip` that already exists** (`appearance="outline"`, `shape="pill"`, icon = the reaction, label = the count, `Selected` when
you have reacted): there is no new pill component.

## 0 · Anatomy (Figma layer → code slot)
| Figma | Code | Note |
|---|---|---|
| `ReactionGroup` root (VERTICAL, gap `Spacing/gap-control`) | `root` | `role="group"`, `aria-label` "Reactions" |
| `Content` (SLOT, HORIZONTAL WRAP, gap and row-gap `Spacing/gap-control`) | `content` | the pills and the trigger |
| `reaction` (Chip instance) | `item` + `Chip` | `item` is an unpainted wrapper: it carries the enter, the exit and the travel |
| `add` (ReactionGroupTrigger instance) | `item` + `ReactionGroupTrigger` | always the last |
| `summary` (TEXT, `Type/body-sm`, `Content/secondary`) | `summary` | |
| — | `digit` | each digit of the count (code only: it rolls on change) |
| `ReactionGroupTrigger` root + `icon` (Smiley) + `focus-ring` | `root` · `icon` · `gapRing` | |
| `ReactionGroupPopover` root + `Content` (SLOT) + `option` ×6 (IconButton) | `root` · `content` | `role="toolbar"` |

## 1 · Properties → props
| Figma | React |
|---|---|
| ReactionGroup `Content` SLOT | `value` / `defaultValue` (`{ id, count, reacted }[]`) + `options` (`{ id, label, icon }[]`) |
| ReactionGroup `Summary` TEXT "27 reactions · You reacted with Celebrate and Like" | `summary` (if omitted, it is written from the value, in that same format) |
| ReactionGroup `SummaryVisible` BOOLEAN true | `summaryVisible` |
| Trigger `Size` default · xs · sm · lg · xl | `size` |
| Trigger `State` Default · Hover · Focused · Open · Disabled | `:hover` · `:focus-visible` · `aria-expanded` (Open) · `disabled`; `forceState` fixes one in docs |
| Popover `Content` SLOT | `options`; `onSelect(id)` |

Code only: `onValueChange(next, { id, reacted, count })`, `label`, `size` (the row's Chip size), `open` / `defaultOpen` / `onOpenChange`, `disabled`.

## 2 · Geometry
| Part | Measured in Figma | Roles |
|---|---|---|
| Trigger xs · sm · default · lg · xl | 24 · 32 · 40 · 48 · 56 (square) | `Size/control-xs … xl`, `Radius/full`, stroke `Stroke/control` INSIDE |
| Trigger icon | 16 · 16 · 20 · 20 · 24 | `Size/icon-sm · sm · md · md · lg` |
| Popover | 238 × 58 (the stroke takes space: 212 + 2×12 + 2×1) | padding `Spacing/inset-control`, gap `Spacing/gap-tight`, `Radius/overlay`, stroke `Stroke/divider` |
| Options | 6 × IconButton 32 (`secondary` · `ghost` · `sm`), radius `Radius/action` | concentric: overlay 24 − 12 = 12 |
| Row | 40-high pills, 8 between them and between lines; summary 8 below (18 high) | `Spacing/gap-control` |
| Picker relative to the trigger | above, 8 px away (code only) | `Spacing/gap-control` |

## 3 · Color by state (ReactionGroupTrigger; the same at all 5 sizes)
| State | Fill | Stroke | Icon | Ring |
|---|---|---|---|---|
| Default | — | `Border/control` | `Content/secondary` | — |
| Hover | `Surface/muted` | `Border/control-hover` | `Content/primary` | — |
| Focused | — | `Border/control` | `Content/secondary` | `Border/ring/default`, `Stroke/focus`, 1 px gap, outside |
| Open | `Surface/selected` | `Border/accent` | `Content/accent` | — |
| Disabled | — | `Border/subtle` | `Content/disabled` | — |

Popover: `Surface/layer-2` + `Border/default` + `Shadow/md`. A pill you have marked: Chip's `State=Selected` (`Surface/selected` + `Border/accent` + `Content/accent`).

## 4 · Behavior (decided by Storybook)
- Each pill is a toggle button (`aria-pressed`); its accessible name is "{reaction}, {n} reactions{, you reacted}" (`Chip.toggleLabel`, new prop).
- A count that reaches 0 removes the pill; focus moves to the neighboring pill or, if none is left, to the trigger.
- Trigger: `aria-label="Add reaction"`, `aria-haspopup`, `aria-expanded`.
- Picker: Radix Popover, `role="toolbar"`, roving tabindex; arrows move and wrap around, Home / End jump, Escape closes and returns focus to the trigger. Choosing
  an option toggles it and closes.
- A `role="status"` region announces each change ("You reacted with Love. 1 reaction.").

## 5 · Motion (only roles that already exist, `RECIPE_MOTION`)
| Moment | Role |
|---|---|
| The pills enter (first render only), one after another | `use-stagger-in`, each `--motion-stagger` behind the previous |
| A new pill arrives; the neighbors make room (FLIP) | `use-travel-in` |
| A pill leaves | `use-travel-out` |
| The count changes: the digits that change roll in the direction of the change | `use-toggle` |
| Pressing a pill | `use-press` (Chip has no `Pressed` in Figma: it is movement only) |
| The picker opens / closes | `popover-enter` / `popover-exit` |
| The highlight between options | `use-hover` (IconButton's) |

Reduced motion: comes from the tokens (the roles get shorter and `--motion-stagger` is 0). No component file names a duration or a curve.

## 6 · File items copied as is / decisions
- The trigger stays in its own family; it will move to `IconButton Shape=pill` when a second consumer appears (decided).
- Chip does not gain a `Pressed` state: the response to a press is movement (decided). Chip does gain `use-press` for all its uses.
- Phosphor has no "smiley-plus": the icon is `Smiley`.
- The width of "13" comes out 63 px in the browser and 64 in Figma (Inter metrics, ±1 px).
- The page also ships `ActionButton` and `SplitButton` (new in the file, outside this brief): noted as pending in `spec/figma-components.status.json`.
