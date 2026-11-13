/**
 * Navigation recipes: Tabs, TabMenu, SegmentedControl, Breadcrumb, Pagination,
 * Stepper, DropdownMenu, ContextMenu, Command, Navbar, Sidebar.
 * Rules as in `componentRecipes.ts`.
 */
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

// ── TabMenu (sliding pill) ─────────────────────────────────────────────────

export const TAB_MENU: ComponentRecipe = {
  key: 'TabMenu',
  slots: ['root', 'item', 'pill'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      pill: { fill: c('surface.selected'), radius: 'radius.pill' },
      item: {
        text: c('content.secondary'), font: 'type.button', radius: 'radius.pill', paddingX: 'spacing.4', paddingY: 'spacing.1_5',
      },
      'item:hover': { text: c('content.primary') },
      'item:focus-visible': FOCUS,
      'item[aria-selected="true"]': { text: c('content.accent') },
      'item[aria-selected="true"]:hover': { text: c('content.accent') },
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

// ── Pagination ─────────────────────────────────────────────────────────────

export const PAGINATION: ComponentRecipe = {
  key: 'Pagination',
  slots: ['root', 'cell', 'pill'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.pill',
        paddingX: 'spacing.1', paddingY: 'spacing.1', gap: 'spacing.0_5',
      },
      // A pill track holds pill cells (concentric at any inset).
      pill: { fill: c('action.primary.default'), radius: 'radius.pill' },
      cell: {
        text: c('content.secondary'), font: 'type.body-sm', radius: 'radius.pill',
        height: 'size.compact', minHeight: 'size.compact', paddingX: 'spacing.1_5',
      },
      'cell:hover': { text: c('content.primary') },
      'cell[aria-current="page"]': { text: c('content.on-action') },
      'cell[aria-current="page"]:hover': { text: c('content.on-action') },
      'cell:disabled': { text: c('content.subtle') },
    })),
  ],
}

// ── Stepper ────────────────────────────────────────────────────────────────

export const STEPPER: ComponentRecipe = {
  key: 'Stepper',
  slots: ['root', 'step', 'node', 'label', 'connector'],
  defaults: {},
  parts: [
    part({}, () => ({
      step: { gap: 'spacing.1_5' },
      node: { width: 'size.xs', height: 'size.xs', radius: 'radius.pill', font: 'type.button', fill: NONE, text: c('content.secondary') },
      'node[data-state="done"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      'node[data-state="current"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      label: { text: c('content.secondary'), font: 'type.helper' },
      'label[data-state="done"]': { text: c('content.primary') },
      'label[data-state="current"]': { text: c('content.primary'), font: 'type.label' },
      connector: { fill: c('surface.muted'), height: 'spacing.0_5', radius: 'radius.pill' },
      'connector[data-state="done"]': { fill: c('action.primary.default') },
    })),
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
    part({ Size: DROPDOWN_SIZES }, (size) => ({
      root: {
        paddingX: size === 'lg' ? 'spacing.inset-control' : 'spacing.gap-control', paddingY: 'spacing.gap-tight',
        text: c('content.secondary'), font: 'type.caption',
      },
    })),
  ],
}

function dropdownItemPaint(variant: string, state: string): SlotProps {
  const destructive = variant === 'destructive'
  switch (state) {
    case 'Focused':
      return destructive
        ? { fill: c('status.critical.surface'), focus: c('status.critical.border-strong'), ring: c('status.critical.border') }
        : { fill: c('surface.muted'), focus: c('border.focus'), ring: c('border.ring.default') }
    case 'Selected':
      return { fill: c('surface.selected') }
    case 'Disabled':
      return { fill: NONE }
    default:
      return { fill: NONE }
  }
}

export const DROPDOWN_MENU_ITEM: ComponentRecipe = {
  key: 'DropdownMenuItem',
  slots: ['root', 'iconLeading', 'media', 'text', 'label', 'description', 'trailing', 'control', 'iconTrailing', 'indicator'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({ Size: DROPDOWN_SIZES }, (size) => ({
      root: {
        minHeight: size === 'sm' ? 'size.xs' : size === 'lg' ? 'size.md' : 'size.sm', radius: 'radius.control',
        paddingX: size === 'lg' ? 'spacing.inset-control' : 'spacing.gap-control', paddingY: 'spacing.gap-tight',
        gap: size === 'sm' ? 'spacing.gap-tight' : 'spacing.gap-control',
      },
      iconLeading: size === 'lg' ? { width: 'icon.medium', height: 'icon.medium' } : { width: 'icon.small', height: 'icon.small' },
      iconTrailing: size === 'lg' ? { width: 'icon.medium', height: 'icon.medium' } : { width: 'icon.small', height: 'icon.small' },
      indicator: size === 'lg' ? { width: 'icon.medium', height: 'icon.medium' } : { width: 'icon.small', height: 'icon.small' },
      label: { font: size === 'sm' ? 'type.caption' : size === 'lg' ? 'type.body-md' : 'type.body-sm' },
      description: { font: 'type.caption' },
      trailing: { font: 'type.caption' },
    })),
    part({ Variant: DROPDOWN_ITEM_VARIANTS, State: DROPDOWN_ITEM_STATES }, (variant, state) => {
      const disabled = state === 'Disabled'
      const ink = disabled ? c('content.disabled') : variant === 'destructive' ? c('status.critical.content') : c('content.primary')
      return {
        root: dropdownItemPaint(variant, state),
        label: { text: ink },
        description: { text: disabled ? c('content.disabled') : c('content.secondary') },
        trailing: { text: disabled ? c('content.disabled') : c('content.secondary') },
        iconLeading: { text: disabled ? c('content.disabled') : variant === 'destructive' ? c('status.critical.content') : c('content.primary') },
        iconTrailing: { text: c('content.secondary') },
        indicator: { text: c('content.accent') },
        // A live menu highlights a row on hover or arrow keys: the file's Focused look.
        ...(state === 'Default' ? { 'root[data-highlighted]': dropdownItemPaint(variant, 'Focused') } : {}),
      }
    }),
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
      label: { text: c('content.secondary'), font: 'type.caption', height: 'size.compact', paddingX: 'spacing.2' },
      menu: { gap: 'spacing.1' },
      button: {
        text: c('content.primary'), font: 'type.body-sm', radius: 'radius.action',
        height: 'size.compact', paddingX: 'spacing.2', gap: 'spacing.2',
      },
      'button:hover': { fill: c('action.ghost.hover') },
      'button[data-active="true"]': { fill: c('action.ghost.hover'), font: 'type.label' },
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
