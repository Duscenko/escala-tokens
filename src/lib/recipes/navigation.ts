/**
 * Navigation recipes: Tabs, TabMenu, SegmentedControl, Breadcrumb, Pagination,
 * Stepper, DropdownMenu, ContextMenu, Command, Navbar, Sidebar.
 * Rules as in `componentRecipes.ts`.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap } from './helpers.js'

// ── Tabs (underline) ───────────────────────────────────────────────────────

// shadcn's TabsList variants: `default` is a muted track whose active trigger
// is raised on the page colour; `line` is an underline under the active one.
export const TABS: ComponentRecipe = {
  key: 'Tabs',
  slots: ['root', 'trigger'],
  defaults: { Variant: 'default' },
  parts: [
    part({}, () => ({
      trigger: { text: c('content.secondary'), font: 'type.button', paddingX: 'spacing.2', paddingY: 'spacing.1', gap: 'spacing.1_5' },
      'trigger:hover': { text: c('content.primary') },
    })),
    part({ Variant: ['default', 'line'] as const }, (variant) => variant === 'line'
      ? {
          root: { fill: NONE, gap: 'spacing.1' },
          trigger: { stroke: NONE, strokeBottomWidth: 'stroke.md' },
          'trigger[data-state="active"]': { text: c('content.primary'), stroke: c('content.primary') },
        }
      : {
          root: { fill: c('surface.layer-2'), radius: 'radius.action', paddingX: 'spacing.0_5', paddingY: 'spacing.0_5', gap: 'spacing.0_5' },
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
      'item[aria-selected="true"]': { text: c('content.accent') },
      'item[aria-selected="true"]:hover': { text: c('content.accent') },
    })),
  ],
}

// ── SegmentedControl ───────────────────────────────────────────────────────

const SEGMENT_SIZE: Record<string, { padX: string; padY: string }> = {
  MD: { padX: 'spacing.4', padY: 'spacing.1_5' },
  SM: { padX: 'spacing.2_5', padY: 'spacing.1' },
}

export const SEGMENTED_CONTROL: ComponentRecipe = {
  key: 'SegmentedControl',
  slots: ['root', 'item', 'pill'],
  defaults: { Size: 'MD' },
  parts: [
    // The track is a container on a container: `surface.layer-2`, as the
    // elevation contract says (layer-1 is the card it sits on).
    part({}, () => ({
      root: { fill: c('surface.layer-2'), radius: 'radius.action', paddingX: 'spacing.1', paddingY: 'spacing.1', gap: 'spacing.0_5' },
      pill: { fill: c('surface.input'), radius: 'radius.action', shadow: 'shadow.xs' },
      item: { text: c('content.secondary'), font: 'type.button', radius: 'radius.action' },
      'item:hover': { text: c('content.primary') },
      'item[aria-checked="true"]': { text: c('content.primary') },
    })),
    part({ Size: ['MD', 'SM'] as const }, (size) => ({
      item: { paddingX: SEGMENT_SIZE[size].padX, paddingY: SEGMENT_SIZE[size].padY },
    })),
  ],
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────

export const BREADCRUMB: ComponentRecipe = {
  key: 'Breadcrumb',
  slots: ['root', 'link', 'separator', 'page'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control', font: 'type.body-md' },
      link: { text: c('content.secondary') },
      'link:hover': { text: c('content.primary') },
      separator: { text: c('content.subtle') },
      page: { text: c('content.primary'), font: 'type.label' },
    })),
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
      pill: { fill: c('action.primary.default'), radius: 'radius.action' },
      cell: {
        text: c('content.secondary'), font: 'type.body-sm', radius: 'radius.action',
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
      connector: { fill: c('action.secondary.default'), height: 'spacing.0_5', radius: 'radius.pill' },
      'connector[data-state="done"]': { fill: c('action.primary.default') },
    })),
  ],
}

// ── Menus ──────────────────────────────────────────────────────────────────

function menu(key: string): ComponentRecipe {
  const slots: SlotMap = {
    root: {
      fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.overlay',
      shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
    },
    item: {
      text: c('content.primary'), font: 'type.body-sm', radius: 'radius.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2_5',
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
export const DROPDOWN_MENU = menu('DropdownMenu')
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
      item: { text: c('content.primary'), font: 'type.body-sm', radius: 'radius.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5' },
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
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.action',
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
        text: c('content.primary'), font: 'type.body-sm', radius: 'radius.control',
        height: 'size.compact', paddingX: 'spacing.2', gap: 'spacing.2',
      },
      'button:hover': { fill: c('action.ghost.hover') },
      'button[data-active="true"]': { fill: c('action.ghost.hover'), font: 'type.label' },
      'button[data-variant="outline"]': { fill: c('surface.page'), stroke: c('border.default'), strokeWidth: 'stroke.control' },
      'button[data-size="sm"]': { height: 'size.hit', font: 'type.caption' },
      'button[data-size="lg"]': { height: 'size.touch' },
    })),
    part({ Variant: ['sidebar', 'floating', 'inset'] as const }, (variant) => ({
      root: variant === 'floating'
        ? { stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container', shadow: 'shadow.sm' }
        : variant === 'sidebar'
          ? { stroke: c('border.default'), strokeWidth: 'stroke.control' }
          : { stroke: NONE },
    })),
  ],
}
