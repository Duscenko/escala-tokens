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
  // A press sinks the button to the `shrink` scale on `use-press` (recipeStyles, `press`) and comes back on `use-hover`, with the colours.
  Button: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  IconButton: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  Badge: { transitions: { root: states('background-color', 'color', 'border-color') } },
  // A pressed chip sinks like a button (`use-press`): the file draws no Pressed state, so the press is motion only (owner decision 2026-11-19).
  Chip: { transitions: { root: { ...states('background-color', 'border-color', 'color'), scale: 'use-hover' } }, press: {} },
  // The row. First render: the pills arrive one after another (`use-stagger-in`, each `--motion-stagger` behind the last). After
  // that a pill that arrives or a neighbour that makes room travels on `use-travel-in`, a pill that leaves on `use-travel-out`,
  // and a count rolls its changed digits on `use-toggle`. Reduced motion comes from the roles themselves.
  ReactionGroup: {
    transitions: {
      item: { opacity: 'use-travel-in', transform: 'use-travel-in' },
      'item[data-motion="enter"]': { opacity: 'use-stagger-in', transform: 'use-stagger-in' },
      'item[data-motion="exit"]': { opacity: 'use-travel-out', transform: 'use-travel-out' },
      digit: { opacity: 'use-toggle', transform: 'use-toggle' },
    },
    stagger: { slot: 'item', when: '[data-motion="enter"]' },
  },
  ReactionGroupTrigger: { transitions: { root: states('background-color', 'color', 'border-color') } },
  ReactionGroupPopover: popover('--radix-popover-content-transform-origin'),
  PaginationLink: { transitions: { root: FILL } },
  TabMenuItem: { transitions: { root: FILL } },
  TabMenuLineItem: { transitions: { root: FILL } },
  NavItem: { transitions: { root: FILL } },
  // The pill fills and the icon and label re-ink on `use-hover`, the same roles as NavItem; becoming Current uses the same
  // transition. No mount animation. TabBar itself: motion none (it does not change state).
  TabBarItem: { transitions: { indicator: FILL, icon: FILL, label: FILL } },
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
  // The track's colour and the thumb's travel share `use-toggle`, so the fill arrives with the thumb (it flipped in 100 ms while the thumb took 360).
  Switch: { transitions: { root: { 'background-color': 'use-toggle', 'box-shadow': 'use-focus' }, thumb: { transform: 'use-toggle' } } },
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
