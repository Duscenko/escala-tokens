import { c, NONE, part, type ComponentRecipe, type SlotProps } from './helpers.js'

// ── Table and its parts ────────────────────────────────────────────────────
// The Figma page «❖ Table» (1023:120189; design-plans/table-contract.md): Table (1024:23937) and TableCell,
// TableHead, TableMediaCell, TableTrendCell, TableResizer, TableRow, TableHeader, TableFooter, TableCaption,
// TableDropIndicator, TableEmpty, TableLoading, TableLoadMore. Every row of a table is 48 / 32 / 40 / 56
// tall by Size (no variable on the height in the file: they equal size.lg / sm / md / xl). Cells paint nothing;
// the head carries Surface/muted; a row carries a bottom hairline (Border/subtle) and its own states.

export const TABLE_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export const TABLE_ALIGNS = ['start', 'end'] as const
export const TABLE_PINS = ['none', 'start', 'end'] as const
export const TABLE_CELL_STATES = ['Default', 'Disabled'] as const
export const TABLE_HEAD_STATES = ['Default', 'Hover'] as const
export const TABLE_SORTS = ['none', 'ascending', 'descending'] as const
export const TABLE_ROW_STATES = ['Default', 'Hover', 'Selected', 'Focused', 'Disabled', 'Dragging'] as const
export const TABLE_DIVIDERS = ['rows', 'grid'] as const
export const TABLE_APPEARANCES = ['filled', 'ghost'] as const
export const TABLE_RATIOS = ['square', 'wide'] as const
export const TABLE_TRENDS = ['up', 'down', 'neutral'] as const
export const TABLE_RESIZER_STATES = ['Default', 'Hover', 'Resizing'] as const

/** The height of a row, a head, a footer and a cell, by Size. */
export const TABLE_ROW_HEIGHT: Record<string, string> = { default: 'size.lg', xs: 'size.sm', sm: 'size.md', lg: 'size.xl' }
/** The thumbnail of a media cell (its height; the wide one is twice that). */
const MEDIA_HEIGHT: Record<string, string> = { default: 'size.md', xs: 'size.xs', sm: 'size.sm', lg: 'size.lg' }

/** The box every cell and head shares: the row height, 4 / 12 of padding, 8 between the slots. */
function cellBox(size: string): SlotProps {
  return { height: TABLE_ROW_HEIGHT[size], paddingX: 'spacing.inset-control', paddingY: 'spacing.gap-tight', gap: 'spacing.gap-control' }
}

// A cell of a grid row ends with a hairline, except the last one.
const GRID_EDGE: SlotProps = { stroke: c('border.subtle'), strokeRightWidth: 'stroke.divider' }
const PIN: SlotProps = { fill: c('border.default'), width: 'stroke.divider' }

// A pinned cell is sticky (it stays while the row scrolls under it), so it must be OPAQUE: the table's page with the
// row's own state laid over it — otherwise the scrolled columns show through it and a selected / hovered row loses
// its colour under the pinned column. The overlays are the TableRow states (rowShell), read off the parent row.
const PINNED = '[data-pinned]:not([data-pinned="none"])'
const PINNED_CELL: Record<string, SlotProps> = {
  [`root${PINNED}`]: { fill: c('surface.page') },
  [`root${PINNED}:where(tr:hover:not([data-force-state]) > *, [data-force-state="Hover"] > *)`]: { fill: c('surface.page'), overlay: c('action.ghost.hover') },
  [`root${PINNED}:where([data-force-state="Selected"] > *)`]: { fill: c('surface.page'), overlay: c('surface.selected') },
  [`root${PINNED}:where([data-force-state="Dragging"] > *)`]: { fill: c('surface.page'), overlay: c('surface.layer-2') },
}

// ── TableCell ──────────────────────────────────────────────────────────────
export const TABLE_CELL: ComponentRecipe = {
  key: 'TableCell',
  slots: ['root', 'leading', 'content', 'label', 'description', 'trailing', 'pin'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      label: { font: 'type.body-sm' },
      'label[data-label-type="label"]': { font: 'type.label' },
      description: { font: 'type.helper' },
      pin: PIN,
      'root[data-grid]:not(:last-child)': GRID_EDGE,
      ...PINNED_CELL,
    })),
    part({ Size: TABLE_SIZES }, (size) => ({ root: cellBox(size) })),
    part({ State: TABLE_CELL_STATES }, (state) => ({
      label: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.primary') },
      description: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.secondary') },
    })),
  ],
}

// ── TableHead ──────────────────────────────────────────────────────────────
export const TABLE_HEAD: ComponentRecipe = {
  key: 'TableHead',
  slots: ['root', 'leading', 'content', 'label', 'sortIcon', 'resizer', 'pin'],
  defaults: { Size: 'default', State: 'Default', Sort: 'none' },
  parts: [
    part({}, () => ({
      label: { font: 'type.label' },
      sortIcon: { text: c('content.primary'), width: 'icon.small', height: 'icon.small' },
      content: { gap: 'spacing.gap-tight' },
      pin: PIN,
      'root[data-grid]:not(:last-child)': GRID_EDGE,
    })),
    part({ Size: TABLE_SIZES }, (size) => ({ root: cellBox(size) })),
    part({ State: TABLE_HEAD_STATES, Sort: TABLE_SORTS }, (state, sort) => ({
      root: { fill: c(state === 'Hover' ? 'surface.muted-hover' : 'surface.muted') },
      label: { text: c(sort === 'none' ? 'content.secondary' : 'content.primary') },
    })),
  ],
}

// ── TableMediaCell ─────────────────────────────────────────────────────────
export const TABLE_MEDIA_CELL: ComponentRecipe = {
  key: 'TableMediaCell',
  slots: ['root', 'media', 'content', 'label', 'description', 'pin'],
  defaults: { Size: 'default', Ratio: 'square', State: 'Default' },
  parts: [
    part({}, () => ({
      media: { radius: 'radius.control' },
      label: { font: 'type.body-sm' },
      description: { font: 'type.helper' },
      'root[data-grid]:not(:last-child)': GRID_EDGE,
    })),
    part({ Size: TABLE_SIZES, Ratio: TABLE_RATIOS }, (size, ratio) => ({
      root: cellBox(size),
      media: { height: MEDIA_HEIGHT[size], width: ratio === 'wide' ? `${MEDIA_HEIGHT[size]}+${MEDIA_HEIGHT[size]}` : MEDIA_HEIGHT[size] },
    })),
    part({ State: TABLE_CELL_STATES }, (state) => ({
      label: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.primary') },
      description: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.secondary') },
    })),
  ],
}

// ── TableTrendCell ─────────────────────────────────────────────────────────
const TREND_INK: Record<string, string> = { up: 'status.success.content', down: 'status.critical.content', neutral: 'content.secondary' }

export const TABLE_TREND_CELL: ComponentRecipe = {
  key: 'TableTrendCell',
  slots: ['root', 'value', 'delta', 'trendIcon', 'deltaLabel'],
  defaults: { Size: 'default', Trend: 'up', State: 'Default' },
  parts: [
    part({}, () => ({
      value: { font: 'type.body-sm' },
      delta: { gap: 'spacing.gap-tight' },
      trendIcon: { width: 'icon.small', height: 'icon.small' },
      deltaLabel: { font: 'type.helper' },
      'root[data-grid]:not(:last-child)': GRID_EDGE,
    })),
    part({ Size: TABLE_SIZES }, (size) => ({ root: cellBox(size) })),
    part({ Trend: TABLE_TRENDS, State: TABLE_CELL_STATES }, (trend, state) => {
      const ink = state === 'Disabled' ? 'content.disabled' : TREND_INK[trend]
      return {
        value: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.primary') },
        trendIcon: { text: c(ink) },
        deltaLabel: { text: c(ink) },
      }
    }),
  ],
}

// ── TableResizer ───────────────────────────────────────────────────────────
// Invisible at rest (a 1px handle with no fill), 2px Border/strong on hover, 2px Border/accent while dragging.
export const TABLE_RESIZER: ComponentRecipe = {
  key: 'TableResizer',
  slots: ['root', 'handle'],
  defaults: { State: 'Default' },
  parts: [
    part({ State: TABLE_RESIZER_STATES }, (state) => ({
      root: { paddingX: 'spacing.gap-tight' },
      handle: state === 'Default'
        ? { width: 'stroke.divider', fill: NONE }
        : { width: 'stroke.focus', fill: c(state === 'Hover' ? 'border.strong' : 'border.accent') },
    })),
  ],
}

// ── TableRow ───────────────────────────────────────────────────────────────
function rowShell(state: string): SlotProps {
  switch (state) {
    case 'Hover': return { fill: c('action.ghost.hover') }
    case 'Selected': return { fill: c('surface.selected') }
    case 'Focused': return { fill: NONE, stroke: c('border.focus'), strokeWidth: 'stroke.focus' }
    case 'Dragging': return { fill: c('surface.layer-2'), stroke: c('border.default'), strokeWidth: 'stroke.divider' }
    default: return { fill: NONE }
  }
}

export const TABLE_ROW: ComponentRecipe = {
  key: 'TableRow',
  slots: ['root'],
  defaults: { Size: 'default', State: 'Default', Dividers: 'rows' },
  parts: [
    part({ Size: TABLE_SIZES }, (size) => ({ root: { height: TABLE_ROW_HEIGHT[size] } })),
    // The bottom hairline (Border/subtle); Focused and Dragging trade it for a ring all round.
    part({ State: TABLE_ROW_STATES, Dividers: TABLE_DIVIDERS }, (state) => ({
      root: state === 'Focused' || state === 'Dragging'
        ? rowShell(state)
        : { stroke: c('border.subtle'), strokeBottomWidth: 'stroke.divider', ...rowShell(state) },
    })),
  ],
}

// ── TableHeader ────────────────────────────────────────────────────────────
export const TABLE_HEADER: ComponentRecipe = {
  key: 'TableHeader',
  slots: ['root'],
  defaults: { Size: 'default', Dividers: 'rows', Scrolled: 'false' },
  parts: [
    part({ Size: TABLE_SIZES }, (size) => ({ root: { height: TABLE_ROW_HEIGHT[size] } })),
    part({ Dividers: TABLE_DIVIDERS, Scrolled: ['true', 'false'] as const }, (_d, scrolled) => ({
      root: { stroke: c(scrolled === 'true' ? 'border.default' : 'border.subtle'), strokeBottomWidth: 'stroke.divider' },
    })),
  ],
}

// ── TableFooter ────────────────────────────────────────────────────────────
export const TABLE_FOOTER: ComponentRecipe = {
  key: 'TableFooter',
  slots: ['root'],
  defaults: { Size: 'default', Dividers: 'rows' },
  parts: [
    part({ Size: TABLE_SIZES }, (size) => ({ root: { height: TABLE_ROW_HEIGHT[size] } })),
    part({ Dividers: TABLE_DIVIDERS }, () => ({
      root: { fill: c('surface.muted'), stroke: c('border.subtle'), strokeTopWidth: 'stroke.divider' },
    })),
  ],
}

// ── TableCaption ───────────────────────────────────────────────────────────
export const TABLE_CAPTION: ComponentRecipe = {
  key: 'TableCaption',
  slots: ['root', 'title', 'description'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      title: { font: 'type.heading-2xs', text: c('content.primary') },
      description: { font: 'type.body-sm', text: c('content.secondary') },
    })),
  ],
}

// ── TableDropIndicator ─────────────────────────────────────────────────────
export const TABLE_DROP_INDICATOR: ComponentRecipe = {
  key: 'TableDropIndicator',
  slots: ['root', 'line'],
  defaults: {},
  parts: [part({}, () => ({ line: { height: 'stroke.focus', fill: c('border.accent') } }))],
}

// ── TableEmpty ─────────────────────────────────────────────────────────────
export const TABLE_EMPTY: ComponentRecipe = {
  key: 'TableEmpty',
  slots: ['root', 'icon', 'text', 'title', 'description', 'action'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { paddingX: 'spacing.inset-page', paddingY: 'spacing.inset-page', gap: 'spacing.gap-group' },
      icon: { width: 'icon.large', height: 'icon.large', text: c('content.secondary') },
      text: { gap: 'spacing.gap-tight' },
      title: { font: 'type.label', text: c('content.primary') },
      description: { font: 'type.body-sm', text: c('content.secondary') },
      action: { gap: 'spacing.gap-control' },
    })),
  ],
}

// ── TableLoading ───────────────────────────────────────────────────────────
export const TABLE_LOADING: ComponentRecipe = {
  key: 'TableLoading',
  slots: ['root', 'spinner', 'label'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { paddingX: 'spacing.inset-control', paddingY: 'spacing.inset-surface', gap: 'spacing.gap-control' },
      spinner: { width: 'icon.medium', height: 'icon.medium', text: c('content.secondary') },
      label: { font: 'type.body-sm', text: c('content.secondary') },
    })),
  ],
}

// ── TableLoadMore ──────────────────────────────────────────────────────────
export const TABLE_LOAD_MORE: ComponentRecipe = {
  key: 'TableLoadMore',
  slots: ['root'],
  defaults: { State: 'Default' },
  parts: [part({ State: ['Default', 'Loading'] as const }, () => ({ root: { paddingY: 'spacing.gap-control' } }))],
}

// ── Table ──────────────────────────────────────────────────────────────────
// Filled: Surface/page, a 1px Border/default edge that takes part in the layout (the box is 2px larger than its
// content) and Radius/container; ghost: none of those.
export const TABLE: ComponentRecipe = {
  key: 'Table',
  slots: ['root'],
  defaults: { Size: 'default', Appearance: 'filled', Dividers: 'rows' },
  parts: [
    part({ Size: TABLE_SIZES, Appearance: TABLE_APPEARANCES, Dividers: TABLE_DIVIDERS }, (_s, appearance) => ({
      root: appearance === 'filled'
        ? { fill: c('surface.page'), stroke: c('border.default'), strokeWidth: 'stroke.divider', radius: 'radius.container' }
        : { fill: NONE, radius: 'radius.none' },
    })),
  ],
}
