/** How each component MOVES: which motion ROLE times each property a state
 *  changes, and which choreography plays when it opens or closes. Names only —
 *  `lib/motion.ts` holds the durations and curves a system picked, so a motion
 *  preset retimes every component at once. Merged into the recipes at load
 *  (`componentRecipes.ts`), so the stylesheet, the inspector and tokens.json
 *  read one table. Plan: design-plans/motion-foundation.md (phase 2).
 *
 * Not here, on purpose: Drawer (the `vaul` library ties its motion to the drag
 * gesture), Spinner and Skeleton
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
  PaginationLink: { transitions: { root: FILL } },
  TabMenuItem: { transitions: { root: FILL } },
  TabMenuLineItem: { transitions: { root: FILL } },
  NavItem: { transitions: { root: FILL } },
  // The card's edge and lift ease; the position that follows the pointer never does (MOT-005).
  IssueCard: { transitions: { root: { 'border-color': 'use-hover', 'box-shadow': 'use-hover' } } },
  AccountMenuTrigger: { transitions: { root: FILL } },
  SegmentedControlItem: { transitions: { root: FILL } },
  SidebarMenuButton: { transitions: { root: FILL } },
  TableRow: { transitions: { root: states('background-color') } },
  TableHead: { transitions: { root: states('background-color') } },
  TableResizer: { transitions: { handle: states('background-color') } },
  FileUploadDropzone: { transitions: { root: states('background-color', 'border-color') } },
  Input: { transitions: { root: FIELD } },
  // A field's error opens and closes on the disclosure roles: in when it appears, out when it clears (the `[data-open]` rule wins while open).
  Field: {
    transitions: {
      errorRegion: { 'grid-template-rows': 'use-disclosure-out', opacity: 'use-disclosure-out', 'margin-top': 'use-disclosure-out' },
      'errorRegion[data-open]': { 'grid-template-rows': 'use-disclosure-in', opacity: 'use-disclosure-in', 'margin-top': 'use-disclosure-in' },
    },
  },
  DatePickerTrigger: { transitions: { root: FIELD } },
  CalendarDay: { transitions: { cell: states('background-color', 'border-color', 'box-shadow', 'color'), day: states('color') } },
  DatePickerPopover: popover('--radix-popover-content-transform-origin'),
  InputTag: { transitions: { root: FIELD, field: FIELD } },
  InputTagChip: { transitions: { root: FIELD } },
  InputTagOption: { transitions: { root: FIELD } },
  InputOTPSlot: { transitions: { root: FIELD } },
  Combobox: { transitions: { root: FIELD } },
  // A menu row: the highlight crossfades from row to row on `use-hover` (Radix moves it for the pointer and the keys).
  DropdownMenuItem: { transitions: { root: FILL } },
  ComboboxItem: { transitions: { root: states('background-color', 'border-color', 'box-shadow') } },
  Checkbox: { transitions: { root: states('background-color', 'border-color', 'box-shadow') } },
  RadioGroup: { transitions: { item: states('background-color', 'border-color', 'box-shadow') } },
  Switch: { transitions: { root: states('background-color', 'box-shadow'), thumb: { transform: 'use-toggle' } } },
  RatingGroupItem: { transitions: { root: FILL } },
  SliderThumb: { transitions: { root: states('border-color', 'box-shadow') } },
  ProgressLine: { transitions: { indicator: { width: 'use-progress' } } },
  // Sonner keeps the queue, the stack and the live region; the toast itself moves on the system's roles (DEC-2026-11-18-001).
  Toast: {
    enter: { name: 'toast-enter' },
    exit: { name: 'toast-exit' },
    // In the queue, or on a page that shows the toast living in place (`data-toast-state`).
    host: {
      enter: ['[data-sonner-toast][data-removed="false"]', '[data-toast-state="open"]'],
      exit: ['[data-sonner-toast][data-removed="true"]', '[data-toast-state="closing"]'],
    },
    timer: {
      name: 'toast-countdown', slot: 'bar', attr: '[data-countdown]',
      pausedBy: ['[data-sonner-toast][data-expanded="true"]', '[data-sonner-toast][data-swiping="true"]'],
    },
    queue: { item: '[data-slot="toaster"] [data-sonner-toast]', reflow: 'use-reflow', release: 'use-release' },
  },
  // AccordionItem (the Figma file, 2026-11-12): the item owns the trigger and the content, so the chevron
  // and the expand / collapse play on it; the Accordion only stacks items.
  AccordionItem: { ...disclosure('--radix-accordion-content-height'), transitions: { chevron: { transform: 'use-disclosure-in' } } },
  Modal: { enter: { name: 'dialog-enter' }, exit: { name: 'dialog-exit' } },
  Sheet: { enter: { name: 'sheet-enter' }, exit: { name: 'sheet-exit' }, sideAttr: 'side' },
  Popover: popover('--radix-popover-content-transform-origin'),
  TooltipContent: popover('--radix-tooltip-content-transform-origin'),
  DropdownMenu: popover('--radix-dropdown-menu-content-transform-origin'),
}
