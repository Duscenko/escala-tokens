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
  // A day square: no motion on load, none on a data change (the consumer cross-fades a year switch). Only the ring follows `use-focus`.
  ActivityHeatmapCell: { transitions: { root: { 'outline-color': 'use-focus' } } },
  // The card's edge and lift ease; the position that follows the pointer never does (MOT-005).
  IssueCard: { transitions: { root: { 'border-color': 'use-hover', 'box-shadow': 'use-hover' } } },
  AccountMenuTrigger: { transitions: { root: FILL } },
  // SplitBar: a segment widens on hover or focus on `use-hover` (its width is its share of the bar, so it is `width` that moves). Turning
  // a series off reflows the bar: the segments that grow travel on `use-travel-in`, the ones that shrink on `use-travel-out`.
  // The focus ring and the colours do not animate here: the file draws no Hover colour.
  SplitBarSegment: {
    transitions: {
      root: { width: 'use-hover' },
      'root[data-motion="in"]': { width: 'use-travel-in' },
      'root[data-motion="out"]': { width: 'use-travel-out' },
    },
  },
  // The callouts under the bar follow their segment: the same roles, the same direction.
  SplitBar: {
    transitions: {
      leaderLine: { left: 'use-hover' },
      'leaderLine[data-motion="in"]': { left: 'use-travel-in' },
      'leaderLine[data-motion="out"]': { left: 'use-travel-out' },
      leaderText: { left: 'use-hover', right: 'use-hover' },
      'leaderText[data-motion="in"]': { left: 'use-travel-in', right: 'use-travel-in' },
      'leaderText[data-motion="out"]': { left: 'use-travel-out', right: 'use-travel-out' },
    },
  },
  SplitBarLegendItem: { transitions: { swatch: states('background-color'), label: states('color'), value: states('color') } },
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
  // A new value sweeps the fill along the arc on `use-travel-in` (the arc's dash is the value). Reduced motion comes from the role.
  Gauge: { transitions: { arc: { 'stroke-dasharray': 'use-travel-in' } } },
  // The line draws once on mount (`use-reveal`: its dash offset, with the area and the dot fading in); new data cross-fades the old
  // layer into the new one on `use-color`.
  Sparkline: {
    transitions: {
      layer: { opacity: 'use-color' },
      line: { 'stroke-dashoffset': 'use-reveal', opacity: 'use-reveal' },
      area: { opacity: 'use-reveal' },
      dot: { opacity: 'use-reveal' },
    },
  },
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

  // ── MOT-002 closed (owner decision 2026-11-20). An empty `{}` is an explicit decision: the contract carries it
  // (motion is no longer null) and the stylesheet emits nothing for it.
  // Press: sink and colours exactly like Button.
  CloseButton: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  FABButton: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  ButtonGroupItem: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  SocialLoginButton: { transitions: { root: { ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover' } }, press: {} },
  // Fill: colour only, no press.
  TextLink: { transitions: { root: FILL } },
  BreadcrumbItem: { transitions: { root: FILL } },
  BreadcrumbEllipsis: { transitions: { root: FILL } },
  TooltipInfoTrigger: { transitions: { root: FILL } },
  // Field: the edge and the focus halo, like Input.
  Textarea: { transitions: { root: FIELD } },
  NumberInput: { transitions: { root: FIELD } },
  // A child carries the motion; the wrapper itself does not move.
  InputOTP: {}, // InputOTPSlot animates (FIELD).
  CheckboxItem: {}, // Checkbox animates.
  CheckboxGroup: {}, // Checkbox animates.
  SwitchGroup: {}, // Switch animates.
  Slider: {}, // SliderThumb animates; the range follows the pointer and must not lag.
  // Static: Disabled/Loading are not animated.
  TableCell: {},
  TableMediaCell: {},
  TableTrendCell: {},
  TableLoadMore: {}, // Disabled/Loading are not animated; the Spinner has its own loop.
  StepperItem: {},
  StepperIndicator: {},
  StepperIcon: {},

  // ── MOT-002 closed, batch 2 (owner decision 2026-11-20).
  // The menu is the DropdownMenu's own panel (`data-escala="DropdownMenu"`, portaled outside the group), so it already grows out
  // of the caret on `popover-enter` / `popover-exit` (the DropdownMenu entry above) and its rows arrive on `use-stagger-in`
  // (split-button.tsx). A second popover here would play the panel twice: the empty entry records the decision.
  SplitButton: {},
  // Open: the items arrive one after another on `use-travel-in` (opacity + transform, each `--motion-stagger` behind the last,
  // `--escala-index` set by the component); closing fades and travels back on `use-travel-out`, all at once. The item keeps
  // the FABButton's own colour and press timing (a slot's `transition` replaces the button's). Reduced motion: the roles
  // shorten to the fade, the stagger and the travel go to 0 (`--motion-stagger: 0`, neutral transforms).
  FABGroup: {
    transitions: {
      item: {
        ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover',
        opacity: 'use-travel-out', transform: 'use-travel-out', visibility: 'use-travel-out',
      },
      'item[data-open="true"]': {
        ...states('background-color', 'color', 'border-color', 'box-shadow'), scale: 'use-hover',
        opacity: 'use-travel-in', transform: 'use-travel-in', visibility: 'use-travel-in',
      },
    },
    stagger: { slot: 'item', when: '[data-open="true"]' },
  },
  // Collapse: the rail's width (the recipe's two widths, 48 px and 272 px) eases open on `use-disclosure-in` and shut on
  // `use-disclosure-out`. Under reduced motion both roles shorten to the fade.
  Sidebar: {
    transitions: {
      root: { width: 'use-disclosure-out' },
      'root[data-collapsed="false"]': { width: 'use-disclosure-in' },
    },
  },
  // The title and subtitle mount when the rail expands and fade in on `use-disclosure-in` (`appear`); collapsing unmounts
  // them at once, under the rail's `use-disclosure-out`.
  SidebarBrand: { transitions: { text: { opacity: 'use-disclosure-in' } }, appear: ['text'] },
  // The group's heading (SidebarGroupLabel, `SidebarGroup.label`): the same fade as the brand's text, the same roles.
  SidebarGroup: { transitions: { label: { opacity: 'use-disclosure-in' } }, appear: ['label'] },
}
