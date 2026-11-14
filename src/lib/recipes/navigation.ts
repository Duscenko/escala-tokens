/**
 * Navigation recipes: Tabs, TabMenu, SegmentedControl, Breadcrumb, Pagination,
 * Stepper, DropdownMenu, ContextMenu, Command, Navbar, Sidebar.
 * Rules as in `componentRecipes.ts`.
 */
import { groupLabelRecipe } from './groupLabel.js'
import { listItemRecipe, listItemHighlightFill, listItemRootPaint, LIST_ITEM_METRICS } from './listItem.js'
import { c, NONE, part, PANEL_RADIUS, PANEL_ROW_RADIUS, type ComponentRecipe, type SlotMap, type SlotProps, FOCUS } from './helpers.js'

// ── Tabs (underline) ───────────────────────────────────────────────────────

// shadcn's TabsList variants: `default` is a muted track whose active trigger
// is raised on the page colour; `line` is an underline under the active one.
// The track is concentric with its trigger: `radius.action` (8) minus the
// `spacing.1` inset (4) is exactly `radius.control` (4) — a 2px inset left the
// trigger's corners visibly squarer than the track around them.
export const TABS: ComponentRecipe = {
  key: 'Tabs',
  slots: ['root', 'trigger'],
  defaults: { Variant: 'default' },
  parts: [
    part({}, () => ({
      trigger: { text: c('content.secondary'), font: 'type.button', paddingX: 'spacing.2', paddingY: 'spacing.1', gap: 'spacing.1_5' },
      'trigger:hover': { text: c('content.primary') },
      'trigger:focus-visible': FOCUS,
    })),
    part({ Variant: ['default', 'line'] as const }, (variant) => variant === 'line'
      ? {
          root: { fill: NONE, gap: 'spacing.1' },
          trigger: { stroke: NONE, strokeBottomWidth: 'stroke.md' },
          'trigger[data-state="active"]': { text: c('content.primary'), stroke: c('content.primary') },
        }
      : {
          root: { fill: c('surface.layer-2'), radius: 'radius.action', paddingX: 'spacing.1', paddingY: 'spacing.1', gap: 'spacing.0_5' },
          trigger: { radius: 'radius.control' },
          'trigger[data-state="active"]': { fill: c('surface.page'), text: c('content.primary'), shadow: 'shadow.xs' },
        }),
  ],
}

// ── TabMenu, TabMenuItem and TabMenuLineItem ───────────────────────────────
// The Figma sets TabMenu (984:1830), TabMenuItem (984:939) and TabMenuLineItem (984:1156)
// (design-plans/tab-menu-contract.md). Four layouts (Variant): a line variant draws a 1px
// `Border/subtle` track along the bottom (horizontal) or the left (vertical) edge and its items
// touch; a button variant spaces them `Spacing/gap-tight` apart and fills the selected one.
export const TAB_MENU_SIZES = ['default', 'sm', 'lg'] as const
export const TAB_MENU_VARIANTS = ['horizontal-line', 'horizontal-button', 'vertical-line', 'vertical-button'] as const
export const TAB_MENU_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Selected', 'Disabled'] as const
export const TAB_MENU_INDICATORS = ['bottom', 'left'] as const

export const TAB_MENU: ComponentRecipe = {
  key: 'TabMenu',
  slots: ['root', 'content', 'track'],
  defaults: { Size: 'default', Variant: 'horizontal-line' },
  parts: [
    part({ Variant: TAB_MENU_VARIANTS }, (variant) => ({
      content: { gap: variant.endsWith('line') ? 'spacing.none' : 'spacing.gap-tight' },
      track: { fill: c('border.subtle'), ...(variant === 'horizontal-line' ? { height: 'stroke.divider' } : variant === 'vertical-line' ? { width: 'stroke.divider' } : {}) },
    })),
  ],
}

const tabMenuSizeSlots = (size: string): SlotMap => {
  const icon = size === 'sm' ? 'icon.small' : size === 'lg' ? 'icon.large' : 'icon.medium'
  return {
    root: {
      height: size === 'sm' ? 'size.sm' : size === 'lg' ? 'size.lg' : 'size.md', radius: 'radius.action', paddingX: 'spacing.inset-control', paddingY: 'spacing.none',
      gap: 'spacing.gap-control', font: 'type.button',
    },
    iconLeading: { width: icon, height: icon },
    iconTrailing: { width: icon, height: icon },
  }
}

function tabMenuItemPaint(state: string, line: boolean): SlotProps {
  switch (state) {
    case 'Hover': return { text: c('content.primary'), fill: line ? NONE : c('action.ghost.hover') }
    case 'Selected': return { text: c('content.accent'), fill: line ? NONE : c('surface.selected') }
    case 'Focused': return { text: c('content.secondary'), fill: NONE, focus: c('border.focus'), ring: c('border.ring.default') }
    case 'Disabled': return { text: c('content.disabled'), fill: NONE }
    default: return { text: c('content.secondary'), fill: NONE }
  }
}

export const TAB_MENU_ITEM: ComponentRecipe = {
  key: 'TabMenuItem',
  slots: ['root', 'iconLeading', 'label', 'badge', 'iconTrailing'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({ Size: TAB_MENU_SIZES }, tabMenuSizeSlots),
    part({ State: TAB_MENU_ITEM_STATES }, (state) => ({ root: tabMenuItemPaint(state, false) })),
  ],
}

export const TAB_MENU_LINE_ITEM: ComponentRecipe = {
  key: 'TabMenuLineItem',
  slots: ['root', 'iconLeading', 'label', 'badge', 'iconTrailing', 'indicator'],
  defaults: { Size: 'default', State: 'Default', Indicator: 'bottom' },
  parts: [
    part({ Size: TAB_MENU_SIZES }, tabMenuSizeSlots),
    part({ State: TAB_MENU_ITEM_STATES }, (state) => ({ root: tabMenuItemPaint(state, true) })),
    // The 2px accent bar of the selected item (`Stroke/focus`), on its bottom or left edge.
    part({ Indicator: TAB_MENU_INDICATORS }, (indicator) => ({
      indicator: { fill: c('border.accent'), ...(indicator === 'bottom' ? { height: 'stroke.focus' } : { width: 'stroke.focus' }) },
    })),
  ],
}

// ── NavItem, Brand and AccountMenuTrigger ──────────────────────────────────
// The Figma sets NavItem (1095:19644), Brand (1098:42) and AccountMenuTrigger (1098:119)
// (design-plans/nav-header-contract.md). NavItem is a TabMenuItem whose selected state is `Current`.
export const NAV_ITEM_SIZES = TAB_MENU_SIZES
export const NAV_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] as const

export const NAV_ITEM: ComponentRecipe = {
  key: 'NavItem',
  slots: ['root', 'iconLeading', 'label', 'badge', 'iconTrailing'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({ Size: NAV_ITEM_SIZES }, tabMenuSizeSlots),
    part({ State: NAV_ITEM_STATES }, (state) => ({ root: tabMenuItemPaint(state === 'Current' ? 'Selected' : state, false) })),
  ],
}

export const BRAND_SIZES = ['default', 'sm'] as const
export const BRAND: ComponentRecipe = {
  key: 'Brand',
  slots: ['root', 'logo', 'name', 'version'],
  defaults: { Size: 'default' },
  parts: [
    part({ Size: BRAND_SIZES }, (size) => ({
      root: { gap: 'spacing.gap-control' },
      name: { text: c('content.primary'), font: size === 'sm' ? 'type.heading-xs' : 'type.heading-sm' },
    })),
  ],
}

export const ACCOUNT_MENU_TRIGGER_SIZES = ['default', 'sm'] as const
export const ACCOUNT_MENU_TRIGGER_STATES = ['Default', 'Hover', 'Pressed', 'Focused'] as const
export const ACCOUNT_MENU_TRIGGER: ComponentRecipe = {
  key: 'AccountMenuTrigger',
  slots: ['root', 'avatar', 'name', 'iconTrailing'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({ Size: ACCOUNT_MENU_TRIGGER_SIZES }, (size) => ({
      root: {
        height: size === 'sm' ? 'size.sm' : 'size.md', radius: 'radius.action', paddingX: 'spacing.inset-control', paddingRight: 'spacing.gap-tight', paddingY: 'spacing.none',
        gap: 'spacing.gap-control', text: c('content.primary'), font: 'type.button',
      },
      iconTrailing: size === 'sm' ? { width: 'icon.small', height: 'icon.small' } : { width: 'icon.medium', height: 'icon.medium' },
    })),
    part({ State: ACCOUNT_MENU_TRIGGER_STATES }, (state) => ({
      root: state === 'Hover' ? { fill: c('action.ghost.hover') }
        : state === 'Pressed' ? { fill: c('action.ghost.pressed') }
        : state === 'Focused' ? { fill: NONE, focus: c('border.focus'), ring: c('border.ring.default') }
        : { fill: NONE },
    })),
  ],
}

// ── SegmentedControl + SegmentedControlItem ────────────────────────────────
// The Figma `SegmentedControl` set (design-plans/segmented-control-contract.md, 1102:5136, 3 variants:
// Size default · sm · lg) and its `SegmentedControlItem` (1102:5087, 30 variants: Size × Checked ×
// State Default · Hover · Pressed · Focused · Disabled). The track is a Surface/muted pill (Radius/
// action) with gap-tight of padding around a `Content` slot of items 4 apart; every item is 8 less than
// the track in height (Size/control-sm 32 · control-xs 24 · control-md 40). A checked item is the raised
// thumb (Surface/input, Shadow/xs, Radius/control); the others are ghost fills on hover / press. Focused:
// a 2px edge inside (not in the layout) + a 2px halo outside.
export const SEGMENTED_CONTROL_SIZES = ['default', 'sm', 'lg'] as const
export const SEGMENTED_CONTROL: ComponentRecipe = {
  key: 'SegmentedControl',
  slots: ['root', 'content'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.muted'), radius: 'radius.action', paddingX: 'spacing.gap-tight', paddingY: 'spacing.gap-tight' },
      content: { gap: 'spacing.gap-tight' },
    })),
  ],
}

export const SEGMENTED_CONTROL_ITEM_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
const SEGMENT_ITEM: Record<string, { box: string; gap: string; icon: string }> = {
  default: { box: 'size.compact', gap: 'spacing.gap-control', icon: 'icon.small' },
  sm: { box: 'size.hit', gap: 'spacing.gap-tight', icon: 'icon.small' },
  lg: { box: 'size.control', gap: 'spacing.gap-control', icon: 'icon.medium' },
}

function segmentPaint(checked: string, state: string): SlotMap {
  const on = checked === 'true'
  // A disabled raised segment keeps the fill but loses Shadow/xs (the file draws no effect on it).
  if (state === 'Disabled') return { root: { fill: on ? c('surface.input') : NONE, text: c('content.disabled'), radius: on ? 'radius.control' : 'radius.action', ...(on ? { highlight: NONE } : {}) } }
  // A `focus` of none would clear the box-shadow the raised segment carries, so only Focused sets it.
  const focus = state === 'Focused' ? { focus: c('border.focus'), ring: c('border.ring.default') } : {}
  if (on) return { root: { fill: c('surface.input'), text: c('content.primary'), radius: 'radius.control', shadow: 'shadow.xs', ...focus } }
  const fill = state === 'Hover' ? c('action.ghost.hover') : state === 'Pressed' ? c('action.ghost.pressed') : NONE
  return { root: { fill, text: c(state === 'Hover' || state === 'Pressed' ? 'content.primary' : 'content.secondary'), radius: 'radius.action', ...focus } }
}

export const SEGMENTED_CONTROL_ITEM: ComponentRecipe = {
  key: 'SegmentedControlItem',
  slots: ['root', 'icon', 'label'],
  defaults: { Size: 'default', Checked: 'false', State: 'Default' },
  parts: [
    part({}, () => ({ root: { font: 'type.button', paddingX: 'spacing.inset-control', paddingY: 'spacing.none' } })),
    part({ Size: SEGMENTED_CONTROL_SIZES }, (size) => ({
      root: { height: SEGMENT_ITEM[size].box, gap: SEGMENT_ITEM[size].gap },
      icon: { width: SEGMENT_ITEM[size].icon, height: SEGMENT_ITEM[size].icon },
    })),
    part({ Checked: ['false', 'true'] as const, State: SEGMENTED_CONTROL_ITEM_STATES }, segmentPaint),
  ],
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────
// The Figma sets Breadcrumb, BreadcrumbItem, BreadcrumbEllipsis and BreadcrumbSeparator
// (design-plans/breadcrumb-contract.md). The item and the ellipsis keep a 1px border in
// every state (transparent when Figma draws none) and the padding gives it back, so
// Focused changes colour only: no layout jump (Figma lays the focus stroke out).

export const BREADCRUMB_SIZES = ['xs', 'sm', 'default'] as const
export const BREADCRUMB_APPEARANCES = ['ghost', 'outline', 'solid'] as const
export const BREADCRUMB_SEPARATORS = ['chevron', 'slash', 'dot'] as const
export const BREADCRUMB_VARIANTS = ['default', 'secondary'] as const
export const BREADCRUMB_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] as const
export const BREADCRUMB_ELLIPSIS_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const

export const BREADCRUMB: ComponentRecipe = {
  key: 'Breadcrumb',
  slots: ['root'],
  defaults: { Appearance: 'ghost', Separator: 'chevron', Size: 'default' },
  parts: [
    part({ Size: BREADCRUMB_SIZES }, (size) => ({ root: { gap: size === 'xs' ? 'spacing.none' : 'spacing.gap-tight' } })),
  ],
}

function breadcrumbPaint(variant: string, appearance: string, state: string): SlotProps {
  const secondary = variant === 'secondary'
  const text = state === 'Disabled' ? 'content.disabled' : state === 'Current' ? 'content.primary' : state === 'Hover' ? (secondary ? 'content.primary' : 'content.accent') : 'content.secondary'
  let fill = NONE
  let stroke = NONE
  if (appearance === 'solid') {
    fill = state === 'Disabled' ? 'action.disabled.default' : state === 'Hover' ? (secondary ? 'surface.muted-hover' : 'surface.accent') : 'surface.muted'
  }
  if (appearance === 'outline') {
    stroke = state === 'Disabled' ? 'border.subtle' : state === 'Current' ? 'border.default' : state === 'Hover' ? (secondary ? 'border.control-hover' : 'border.accent') : 'border.control'
  }
  const root: SlotProps = { text: c(text), fill: fill === NONE ? NONE : c(fill), stroke: stroke === NONE ? NONE : c(stroke) }
  if (state === 'Focused') {
    root.stroke = c(secondary ? 'border.strong' : 'border.focus')
    root.halo = c(secondary ? 'border.subtle' : 'border.ring.default')
  }
  return root
}

export const BREADCRUMB_ITEM: ComponentRecipe = {
  key: 'BreadcrumbItem',
  slots: ['root', 'leading', 'label', 'trailing'],
  defaults: { Variant: 'default', Appearance: 'ghost', Size: 'default', State: 'Default' },
  parts: [
    part({ Size: BREADCRUMB_SIZES }, (size) => {
      const icon = size === 'default' ? 'icon.medium' : 'icon.small'
      return {
        root: { height: size === 'xs' ? 'size.xs' : size === 'sm' ? 'size.sm' : 'size.md', radius: 'radius.control', gap: size === 'default' ? 'spacing.gap-control' : 'spacing.gap-tight', font: size === 'xs' ? 'type.caption' : size === 'sm' ? 'type.body-sm' : 'type.body-md', strokeWidth: 'stroke.control', paddingY: 'spacing.none' },
        leading: { width: icon, height: icon },
        trailing: { width: icon, height: icon },
      }
    }),
    // Outline lays its stroke out (Default 62 = 60 + 2): the padding carries it.
    part({ Size: BREADCRUMB_SIZES, Appearance: BREADCRUMB_APPEARANCES }, (size, appearance) => {
      const x = size === 'xs' ? 'spacing.gap-tight' : size === 'sm' ? 'spacing.gap-control' : 'spacing.inset-control'
      return { root: { paddingX: appearance === 'outline' ? `${x}+stroke.control` : x } }
    }),
    part({ Variant: BREADCRUMB_VARIANTS, Appearance: BREADCRUMB_APPEARANCES, State: BREADCRUMB_ITEM_STATES }, (variant, appearance, state) => ({ root: breadcrumbPaint(variant, appearance, state) })),
  ],
}

export const BREADCRUMB_ELLIPSIS: ComponentRecipe = {
  key: 'BreadcrumbEllipsis',
  slots: ['root', 'icon'],
  defaults: { Variant: 'default', Appearance: 'ghost', Size: 'default', State: 'Default' },
  parts: [
    part({ Size: BREADCRUMB_SIZES }, (size) => {
      const box = size === 'xs' ? 'size.xs' : size === 'sm' ? 'size.sm' : 'size.md'
      const icon = size === 'default' ? 'icon.medium' : 'icon.small'
      return { root: { width: box, height: box, radius: 'radius.control', strokeWidth: 'stroke.control', paddingX: 'spacing.none', paddingY: 'spacing.none' }, icon: { width: icon, height: icon } }
    }),
    part({ Variant: BREADCRUMB_VARIANTS, Appearance: BREADCRUMB_APPEARANCES, State: BREADCRUMB_ELLIPSIS_STATES }, (variant, appearance, state) => ({ root: breadcrumbPaint(variant, appearance, state) })),
  ],
}

export const BREADCRUMB_SEPARATOR: ComponentRecipe = {
  key: 'BreadcrumbSeparator',
  slots: ['root', 'icon'],
  defaults: { Variant: 'chevron', Size: 'default' },
  parts: [
    part({ Variant: BREADCRUMB_SEPARATORS, Size: BREADCRUMB_SIZES }, (variant, size) => {
      const icon = size === 'default' ? 'icon.medium' : 'icon.small'
      return {
        root: variant === 'slash'
          ? { text: c('content.subtle'), font: size === 'xs' ? 'type.caption' : size === 'sm' ? 'type.body-sm' : 'type.body-md' }
          : { text: c('content.subtle'), width: icon, height: icon },
        icon: { width: icon, height: icon },
      }
    }),
  ],
}

// ── Pagination, PaginationLink and PaginationEllipsis ──────────────────────
// The Figma sets Pagination (989:714), PaginationLink (988:330) and PaginationEllipsis (988:343)
// (design-plans/pagination-contract.md). `compact-grouped` is an outline ButtonGroup of ButtonGroupItems
// (the group paints itself); `compact` is IconButtons and PaginationLinks four apart.
export const PAGINATION_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export const PAGINATION_VARIANTS = ['compact', 'compact-grouped'] as const
export const PAGINATION_LINK_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
export const PAGINATION_LINK_ACTIVE = ['false', 'true'] as const

const paginationBox = (size: string) => (size === 'xs' ? 'size.xs' : size === 'sm' ? 'size.sm' : size === 'lg' ? 'size.lg' : 'size.md')
const paginationIcon = (size: string) => (size === 'lg' ? 'icon.large' : size === 'default' ? 'icon.medium' : 'icon.small')

export const PAGINATION: ComponentRecipe = {
  key: 'Pagination',
  slots: ['root', 'content'],
  defaults: { Size: 'default', Variant: 'compact-grouped' },
  parts: [
    part({ Variant: PAGINATION_VARIANTS }, (variant) => ({
      root: { gap: variant === 'compact' ? 'spacing.gap-tight' : 'spacing.none' },
      content: { gap: variant === 'compact' ? 'spacing.gap-tight' : 'spacing.none' },
    })),
  ],
}

export const PAGINATION_LINK: ComponentRecipe = {
  key: 'PaginationLink',
  slots: ['root', 'label'],
  defaults: { Size: 'default', State: 'Default', Active: 'false' },
  parts: [
    part({ Size: PAGINATION_SIZES }, (size) => ({
      root: {
        height: paginationBox(size), minWidth: paginationBox(size), radius: 'radius.action', paddingX: 'spacing.gap-tight', paddingY: 'spacing.none',
        gap: size === 'xs' || size === 'sm' ? 'spacing.gap-tight' : 'spacing.gap-control', font: 'type.button', strokeWidth: 'stroke.control',
      },
    })),
    part({ State: PAGINATION_LINK_STATES, Active: PAGINATION_LINK_ACTIVE }, (state, active) => {
      const edge = active === 'true' ? c('border.control') : NONE
      const root: SlotProps = { text: c(state === 'Disabled' ? 'content.disabled' : 'content.primary'), fill: NONE, stroke: edge }
      if (state === 'Hover') root.fill = c('action.ghost.hover')
      if (state === 'Pressed') root.fill = c('action.ghost.pressed')
      if (state === 'Focused') { root.focus = c('border.focus'); root.ring = c('border.ring.default') }
      return { root }
    }),
  ],
}

export const PAGINATION_ELLIPSIS: ComponentRecipe = {
  key: 'PaginationEllipsis',
  slots: ['root', 'icon'],
  defaults: { Size: 'default' },
  parts: [
    part({ Size: PAGINATION_SIZES }, (size) => ({
      root: { width: paginationBox(size), height: paginationBox(size), text: c('content.secondary') },
      icon: { width: paginationIcon(size), height: paginationIcon(size) },
    })),
  ],
}

// ── Stepper, StepperItem, StepperIndicator and StepperIcon ─────────────────
// The Figma sets Stepper (994:3222), StepperItem (994:1904), StepperIndicator (994:850) and StepperIcon (994:569)
// (design-plans/stepper-contract.md). A step is [marker + connector line | title + description]: side by side in a
// vertical Stepper, stacked in a horizontal one. Status picks the colours, State=Disabled mutes them all.
export const STEPPER_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export const STEPPER_ORIENTATIONS = ['vertical', 'horizontal'] as const
export const STEPPER_STATUSES = ['active', 'completed', 'error', 'locked'] as const
export const STEPPER_STATES = ['Default', 'Disabled'] as const
export const STEPPER_ICON_STATUSES = STEPPER_STATUSES

const stepperBox = (size: string) => (size === 'xs' ? 'size.xs' : size === 'sm' ? 'size.sm' : size === 'lg' ? 'size.lg' : 'size.md')

export const STEPPER: ComponentRecipe = {
  key: 'Stepper',
  slots: ['root'],
  defaults: { Size: 'default', Orientation: 'vertical' },
  parts: [
    part({ Orientation: STEPPER_ORIENTATIONS }, (orientation) => ({ root: { gap: orientation === 'horizontal' ? 'spacing.gap-tight' : 'spacing.none' } })),
  ],
}

export const STEPPER_ITEM: ComponentRecipe = {
  key: 'StepperItem',
  slots: ['root', 'content', 'title', 'description'],
  defaults: { Size: 'default', Status: 'active', State: 'Default', Orientation: 'vertical' },
  parts: [
    part({ Orientation: STEPPER_ORIENTATIONS }, (orientation) => ({
      root: { gap: 'spacing.gap-control' },
      content: { gap: 'spacing.gap-tight', ...(orientation === 'vertical' ? { paddingBottom: 'spacing.gap-section' } : {}) },
      title: { font: 'type.label' },
      description: { font: 'type.helper' },
    })),
    part({ Status: STEPPER_STATUSES, State: STEPPER_STATES }, (status, state) => {
      const off = state === 'Disabled'
      return {
        title: { text: c(off ? 'content.disabled' : status === 'error' ? 'status.critical.content' : status === 'locked' ? 'content.secondary' : 'content.primary') },
        description: { text: c(off ? 'content.disabled' : 'content.secondary') },
      }
    }),
  ],
}

export const STEPPER_INDICATOR: ComponentRecipe = {
  key: 'StepperIndicator',
  slots: ['root', 'line'],
  defaults: { Size: 'default', Status: 'active', State: 'Default', Orientation: 'vertical' },
  parts: [
    part({ Orientation: STEPPER_ORIENTATIONS }, (orientation) => ({
      root: { gap: 'spacing.gap-tight' },
      line: orientation === 'vertical' ? { width: 'stroke.divider' } : { height: 'stroke.divider' },
    })),
    part({ Status: STEPPER_STATUSES, State: STEPPER_STATES }, (status, state) => ({
      line: { fill: c(state === 'Disabled' ? 'border.subtle' : status === 'completed' ? 'border.accent' : status === 'error' ? 'status.critical.border' : 'border.default') },
    })),
  ],
}

export const STEPPER_ICON: ComponentRecipe = {
  key: 'StepperIcon',
  slots: ['root', 'label', 'icon'],
  defaults: { Size: 'default', Status: 'active', State: 'Default' },
  parts: [
    part({ Size: STEPPER_SIZES }, (size) => ({
      root: { width: stepperBox(size), height: stepperBox(size), radius: 'radius.pill' },
      label: { font: size === 'xs' || size === 'sm' ? 'type.caption' : 'type.label' },
      icon: size === 'lg' ? { width: 'icon.large', height: 'icon.large' } : size === 'default' ? { width: 'icon.medium', height: 'icon.medium' } : { width: 'icon.small', height: 'icon.small' },
    })),
    part({ Status: STEPPER_STATUSES, State: STEPPER_STATES }, (status, state) => {
      if (state === 'Disabled') return { root: { fill: c('action.disabled.default'), text: c('content.disabled') } }
      switch (status) {
        case 'completed': return { root: { fill: c('surface.accent'), text: c('content.accent') } }
        case 'error': return { root: { fill: c('status.critical.surface-solid'), text: c('status.critical.on-solid') } }
        case 'locked': return { root: { fill: c('surface.muted'), text: c('content.secondary') } }
        default: return { root: { fill: c('action.primary.default'), text: c('content.on-action') } }
      }
    }),
  ],
}

// ── Menus ──────────────────────────────────────────────────────────────────

// A menu panel is a box: `radius.container` (Boxes), with a `spacing.1` inset.
// Its rows take the panel's radius minus that inset, so the highlighted row is
// concentric with the panel at any Boxes value (16 − 4 = 12). A fixed
// `radius.control` row read as a square tag inside a round panel.
export const MENU_PANEL_RADIUS = PANEL_RADIUS

function menu(key: string): ComponentRecipe {
  const slots: SlotMap = {
    root: {
      fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: MENU_PANEL_RADIUS,
      shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
    },
    item: {
      text: c('content.primary'), font: 'type.body-sm', radius: PANEL_ROW_RADIUS, paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2_5',
    },
    'item[data-highlighted]': { fill: c('action.ghost.hover') },
    'item:hover': { fill: c('action.ghost.hover') },
    'item[data-variant="destructive"]': { text: c('status.critical.content') },
    'item[data-disabled]': { text: c('content.disabled') },
    separator: { fill: c('border.subtle'), height: 'stroke.divider' },
    shortcut: { text: c('content.subtle'), font: 'type.caption' },
  }
  return { key, slots: ['root', 'item', 'separator', 'shortcut'], defaults: {}, parts: [part({}, () => slots)] }
}

// ── DropdownMenu, DropdownMenuLabel, DropdownMenuItem, DropdownMenuFooter ──
// The Figma sets (design-plans/dropdown-menu-contract.md; 947:299, 947:169, 947:161, 949:3290). A 256 wide panel (Radius/overlay,
// Surface/layer-2, a 1px Border/default edge, Shadow/md with ring and spreads) holding an optional header (a search Input),
// the Content (padding 4: labels, items, separators) and an optional footer. Size cascades to every label and item.

export const DROPDOWN_SIZES = ['default', 'sm', 'lg'] as const
export const DROPDOWN_ITEM_STATES = ['Default', 'Focused', 'Selected', 'Disabled'] as const
export const DROPDOWN_ITEM_VARIANTS = ['default', 'destructive'] as const
export const DROPDOWN_FOOTER_LAYOUTS = ['inline', 'stacked'] as const

export const DROPDOWN_MENU: ComponentRecipe = {
  key: 'DropdownMenu',
  slots: ['root', 'header', 'content', 'separator'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-2'), stroke: c('border.default'), strokeWidth: 'stroke.divider', radius: 'radius.overlay',
        lift: 'popover-md', width: 'spacing.32+spacing.32',
      },
      header: { paddingX: 'spacing.gap-tight', paddingY: 'spacing.gap-tight' },
      content: { paddingX: 'spacing.gap-tight', paddingY: 'spacing.gap-tight' },
      // A separator row: 4px above and below a 1px subtle rule.
      separator: { fill: c('border.subtle'), height: 'stroke.divider' },
    })),
  ],
}

export const DROPDOWN_MENU_LABEL: ComponentRecipe = {
  key: 'DropdownMenuLabel',
  slots: ['root'],
  defaults: { Size: 'default' },
  parts: [
    part({ Size: DROPDOWN_SIZES }, (size) => ({ root: groupLabelRecipe(size) })),
  ],
}

export const DROPDOWN_MENU_ITEM: ComponentRecipe = {
  key: 'DropdownMenuItem',
  slots: ['root', 'iconLeading', 'media', 'text', 'label', 'description', 'trailing', 'control', 'iconTrailing', 'indicator'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    // Geometry per Size (the Dropdown file's); the paint is the shared `listItemRecipe`.
    part({ Size: DROPDOWN_SIZES, Variant: DROPDOWN_ITEM_VARIANTS, State: DROPDOWN_ITEM_STATES }, (size, variant, state) => ({
      ...listItemRecipe(size, state, variant, { iconSlot: 'iconLeading' }),
      iconTrailing: { text: c('content.secondary'), width: LIST_ITEM_METRICS[size].icon, height: LIST_ITEM_METRICS[size].icon },
    })),
  ],
}

export const DROPDOWN_MENU_FOOTER: ComponentRecipe = {
  key: 'DropdownMenuFooter',
  slots: ['root', 'leading', 'actions'],
  defaults: { Size: 'default', Layout: 'inline' },
  parts: [
    part({}, () => ({
      root: {
        paddingX: 'spacing.gap-control', paddingY: 'spacing.gap-control', gap: 'spacing.gap-control',
        stroke: c('border.subtle'), strokeTopWidth: 'stroke.divider',
      },
      leading: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
      actions: { gap: 'spacing.gap-control' },
    })),
  ],
}
export const CONTEXT_MENU = menu('ContextMenu')

// ── Command ────────────────────────────────────────────────────────────────

export const COMMAND: ComponentRecipe = {
  key: 'Command',
  slots: ['root', 'search', 'icon', 'input', 'kbd', 'list', 'heading', 'item'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.container', shadow: 'shadow.2xl',
      },
      search: { stroke: c('border.subtle'), strokeBottomWidth: 'stroke.control', paddingX: 'spacing.3', paddingY: 'spacing.2_5', gap: 'spacing.gap-control' },
      icon: { text: c('content.secondary') },
      input: { text: c('content.primary'), font: 'type.placeholder' },
      kbd: { text: c('content.subtle'), font: 'type.caption', stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.control', paddingX: 'spacing.1_5' },
      list: { paddingX: 'spacing.1_5', paddingY: 'spacing.1_5' },
      heading: { text: c('content.subtle'), font: 'type.caption', paddingX: 'spacing.2_5', paddingY: 'spacing.1' },
      item: { text: c('content.primary'), font: 'type.body-sm', radius: 'sub(radius.container,spacing.1_5)', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5' },
      'item[data-highlighted]': { fill: c('action.ghost.hover') },
      'item:hover': { fill: c('action.ghost.hover') },
    })),
  ],
}

// ── Navbar ─────────────────────────────────────────────────────────────────

export const NAVBAR: ComponentRecipe = {
  key: 'Navbar',
  slots: ['root', 'logo', 'nav', 'link', 'avatar'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: PANEL_RADIUS,
        paddingX: 'spacing.4', paddingY: 'spacing.2_5', gap: 'spacing.5',
      },
      logo: { fill: c('action.primary.default'), radius: 'radius.control', width: 'spacing.6', height: 'spacing.6' },
      nav: { gap: 'spacing.3' },
      link: { text: c('content.secondary'), font: 'type.body-sm' },
      'link:hover': { text: c('content.primary') },
      'link[aria-current="page"]': { text: c('content.primary'), font: 'type.button' },
      avatar: { fill: c('surface.selected'), text: c('content.accent'), font: 'type.caption', radius: 'radius.pill', width: 'size.xs', height: 'size.xs' },
    })),
  ],
}

// ── Sidebar ────────────────────────────────────────────────────────────────

// shadcn's Sidebar: `sidebar` sits flush with a hairline, `floating` is a
// rounded raised panel, `inset` drops the edge (the page content is inset
// beside it). A menu button is the ghost hover; the active one keeps it.
// Escala draws the sidebar as a panel, so `sidebar` is rounded too, and the
// buttons are concentric with it: `radius.container` minus the `spacing.2`
// inset lands on `radius.action` (16 − 8 = 8).
export const SIDEBAR: ComponentRecipe = {
  key: 'Sidebar',
  slots: ['root', 'group', 'label', 'menu', 'button'],
  defaults: { Variant: 'sidebar' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.layer-1'), text: c('content.primary'), paddingX: 'spacing.2', paddingY: 'spacing.2', gap: 'spacing.2' },
      group: { gap: 'spacing.1' },
      label: groupLabelRecipe('default'),
      menu: { gap: 'spacing.1' },
      button: {
        text: c('content.primary'), font: 'type.body-sm', radius: 'radius.action',
        height: 'size.compact', paddingX: 'spacing.2', gap: 'spacing.2',
      },
      // The paint of a pointed-at list row is `listItemRecipe`'s: fill on hover, ring on keyboard focus only.
      'button:hover': listItemHighlightFill(),
      'button:focus-visible': { ...listItemHighlightFill(), ...FOCUS },
      'button[data-active="true"]': { ...listItemRootPaint('Selected'), font: 'type.label' },
      'button:disabled': { text: c('content.disabled'), fill: NONE },
      // No fill, as Button's outline: the page colour would patch the sidebar's own surface.
      'button[data-variant="outline"]': { fill: NONE, stroke: c('border.default'), strokeWidth: 'stroke.control' },
      'button[data-size="sm"]': { height: 'size.hit', font: 'type.caption' },
      'button[data-size="lg"]': { height: 'size.touch' },
    })),
    part({ Variant: ['sidebar', 'floating', 'inset'] as const }, (variant) => ({
      root: variant === 'floating'
        ? { stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container', shadow: 'shadow.sm' }
        : variant === 'sidebar'
          ? { stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container' }
          : { stroke: NONE },
    })),
  ],
}

// ── Menubar ────────────────────────────────────────────────────────────────
// shadcn's Menubar: a bordered bar of triggers; each menu is the Dropdown
// panel. The panel portals, so its parts are matched on their own.

export const MENUBAR: ComponentRecipe = {
  key: 'Menubar',
  slots: ['root', 'trigger', 'content', 'item', 'separator', 'shortcut'],
  detachedSlots: ['content', 'item', 'separator', 'shortcut'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.control', radius: PANEL_RADIUS,
        height: 'size.compact', paddingX: 'spacing.1', paddingY: 'spacing.1', gap: 'spacing.0_5',
      },
      trigger: { text: c('content.primary'), font: 'type.label', radius: PANEL_ROW_RADIUS, paddingX: 'spacing.2', paddingY: 'spacing.0_5' },
      'trigger:hover': { fill: c('action.ghost.hover') },
      'trigger[data-state="open"]': { fill: c('action.ghost.hover') },
      'trigger[data-active="true"]': { fill: c('action.ghost.hover') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: MENU_PANEL_RADIUS,
        shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
      },
      item: {
        text: c('content.primary'), font: 'type.body-sm', radius: PANEL_ROW_RADIUS, paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2_5',
      },
      'item[data-highlighted]': { fill: c('action.ghost.hover') },
      'item:hover': { fill: c('action.ghost.hover') },
      'item[data-variant="destructive"]': { text: c('status.critical.content') },
      separator: { fill: c('border.subtle'), height: 'stroke.divider' },
      shortcut: { text: c('content.subtle'), font: 'type.caption' },
    })),
  ],
}

// ── NavigationMenu ─────────────────────────────────────────────────────────
// shadcn's NavigationMenu: ghost triggers over a raised viewport of links.

export const NAVIGATION_MENU: ComponentRecipe = {
  key: 'NavigationMenu',
  slots: ['root', 'trigger', 'viewport', 'content', 'link'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.0' },
      trigger: { text: c('content.primary'), font: 'type.label', radius: 'radius.action', height: 'size.compact', paddingX: 'spacing.2_5', gap: 'spacing.1' },
      'trigger:hover': { fill: c('action.ghost.hover') },
      'trigger[data-state="open"]': { fill: c('action.ghost.hover') },
      viewport: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: PANEL_RADIUS, shadow: 'shadow.lg',
      },
      content: { paddingX: 'spacing.1_5', paddingY: 'spacing.1_5', gap: 'spacing.1' },
      link: { text: c('content.primary'), font: 'type.body-sm', radius: 'sub(radius.container,spacing.1_5)', paddingX: 'spacing.2', paddingY: 'spacing.2', gap: 'spacing.1' },
      'link:hover': { fill: c('action.ghost.hover') },
    })),
  ],
}
