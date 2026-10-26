/** How each component MOVES: which motion ROLE times each property a state
 *  changes, and which choreography plays when it opens or closes. Names only —
 *  `lib/motion.ts` holds the durations and curves a system picked, so a motion
 *  preset retimes every component at once. Merged into the recipes at load
 *  (`componentRecipes.ts`), so the stylesheet, the inspector and tokens.json
 *  read one table. Plan: design-plans/motion-foundation.md (phase 2).
 *
 * Not here, on purpose: Sonner and Drawer (the `sonner` and `vaul` libraries
 * own their motion — vaul ties it to the drag gesture), Spinner and Skeleton
 * (a loop keyed to the library's own keyframes). */
import type { RecipeMotion } from './helpers.js'

/** A state change: colours on `use-hover`, the focus halo on `use-focus`. */
function states(...props: string[]): Record<string, string> {
  return Object.fromEntries(props.map((p) => [p, p === 'box-shadow' ? 'use-focus' : 'use-hover']))
}

const FIELD = states('border-color', 'box-shadow')
const FILL = states('background-color', 'color')

/** A floating panel. `slot` when the panel is not the recipe's root (a
 *  Select's or a Menubar's portaled `content`). */
const popover = (origin: string, slot?: string): RecipeMotion => ({
  enter: { name: 'popover-enter', slot },
  exit: { name: 'popover-exit', slot },
  origin: `var(${origin}, center)`,
})

const disclosure = (heightVar: string): RecipeMotion => ({
  transitions: { icon: { transform: 'use-disclosure-in' } },
  enter: { name: 'accordion-expand', slot: 'content', heightVar },
  exit: { name: 'accordion-collapse', slot: 'content', heightVar },
})

export const RECIPE_MOTION: Record<string, RecipeMotion> = {
  Button: { transitions: { root: states('background-color', 'color', 'border-color', 'box-shadow') } },
  Badge: { transitions: { root: states('background-color', 'color', 'border-color') } },
  Chip: { transitions: { root: states('background-color', 'border-color', 'color') } },
  Toggle: { transitions: { root: FILL } },
  ToggleGroup: { transitions: { item: FILL } },
  Item: { transitions: { root: FILL } },
  Calendar: { transitions: { day: FILL } },
  Pagination: { transitions: { cell: FILL } },
  TabMenu: { transitions: { item: FILL } },
  SegmentedControl: { transitions: { item: FILL } },
  Sidebar: { transitions: { button: FILL } },
  Tabs: { transitions: { trigger: states('color', 'background-color', 'border-color', 'box-shadow') } },
  Table: { transitions: { row: states('background-color') } },
  ScrollArea: { transitions: { scrollbar: states('background-color') } },
  Dropzone: { transitions: { root: states('background-color', 'border-color') } },
  Input: { transitions: { root: FIELD } },
  InputGroup: { transitions: { root: FIELD } },
  InputTag: { transitions: { root: FIELD } },
  InputOTP: { transitions: { slot: FIELD } },
  Select: { transitions: { root: FIELD }, ...popover('--radix-select-content-transform-origin', 'content') },
  NativeSelect: { transitions: { select: FIELD } },
  Checkbox: { transitions: { root: states('background-color', 'border-color', 'box-shadow') } },
  RadioGroup: { transitions: { item: states('background-color', 'border-color', 'box-shadow') } },
  Switch: { transitions: { root: states('background-color', 'box-shadow'), thumb: { transform: 'use-toggle' } } },
  Slider: { transitions: { thumb: { transform: 'use-hover', 'box-shadow': 'use-focus' } } },
  Progress: { transitions: { indicator: { width: 'base-functional-standard' } } },
  Accordion: disclosure('--radix-accordion-content-height'),
  Collapsible: disclosure('--radix-collapsible-content-height'),
  Dialog: { enter: { name: 'dialog-enter' }, exit: { name: 'dialog-exit' } },
  AlertDialog: { enter: { name: 'dialog-enter' }, exit: { name: 'dialog-exit' } },
  Sheet: { enter: { name: 'sheet-enter' }, exit: { name: 'sheet-exit' }, sideAttr: 'side' },
  Popover: popover('--radix-popover-content-transform-origin'),
  Tooltip: popover('--radix-tooltip-content-transform-origin'),
  HoverCard: popover('--radix-hover-card-content-transform-origin'),
  DropdownMenu: popover('--radix-dropdown-menu-content-transform-origin'),
  ContextMenu: popover('--radix-context-menu-content-transform-origin'),
  Menubar: popover('--radix-menubar-content-transform-origin', 'content'),
}
