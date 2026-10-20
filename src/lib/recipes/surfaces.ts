import { c, NONE, part, TALL_FIELD_RADIUS, type ComponentRecipe, type SlotProps } from './helpers.js'

// ── Card ───────────────────────────────────────────────────────────────────

// shadcn's Card, `size` default | sm: the card's spacing (`--card-spacing`)
// is the `inset-surface` role at default — the dial a designer moves — and
// one step tighter at sm. No CardLink: a footer link is a link Button.
export const CARD: ComponentRecipe = {
  key: 'Card',
  slots: ['root', 'header', 'title', 'description', 'action', 'content', 'footer'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', text: c('content.primary'),
        radius: 'radius.container', shadow: 'shadow.xs',
      },
      header: { gap: 'spacing.1' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      content: { text: c('content.primary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({
      root: size === 'sm'
        ? { paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.4' }
        : { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.inset-surface' },
      title: { text: c('content.primary'), font: size === 'sm' ? 'type.label' : 'type.heading-sm' },
    })),
  ],
}

// An overlay's title (Dialog, AlertDialog, Sheet, Drawer, Popover) is the
// smallest heading — shadcn's `text-lg` — so it leads the body copy by one
// rung instead of three. `heading-sm` (24 over 14) read as a page headline
// squeezed into a 320px panel.
const OVERLAY_TITLE = 'type.heading-2xs'

// ── Dialog ─────────────────────────────────────────────────────────────────
// shadcn's Dialog: the close control is a ghost icon-sm Button (its recipe).

export const DIALOG: ComponentRecipe = {
  key: 'Dialog',
  slots: ['content', 'overlay', 'header', 'title', 'description', 'footer'],
  detachedSlots: ['overlay'],
  defaults: {},
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.overlay', paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface',
        gap: 'spacing.gap-group', shadow: 'shadow.2xl',
      },
      header: { gap: 'spacing.1_5' },
      title: { text: c('content.primary'), font: OVERLAY_TITLE },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
    })),
  ],
}

// ── Separator ──────────────────────────────────────────────────────────────

export const SEPARATOR: ComponentRecipe = {
  key: 'Separator',
  slots: ['root'],
  defaults: { Orientation: 'horizontal' },
  parts: [
    part({ Orientation: ['horizontal', 'vertical'] as const }, (o) => ({
      root: o === 'horizontal'
        ? { fill: c('border.subtle'), height: 'stroke.divider' }
        : { fill: c('border.subtle'), width: 'stroke.divider', height: 'size.2xl' },
    })),
  ],
}

// ── Accordion ──────────────────────────────────────────────────────────────

export const ACCORDION: ComponentRecipe = {
  key: 'Accordion',
  slots: ['root', 'item', 'trigger', 'icon', 'content'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.container',
      },
      'item:not(:first-child)': { stroke: c('border.subtle'), strokeTopWidth: 'stroke.divider' },
      trigger: {
        // A row label, not a section heading: shadcn's `text-sm font-medium`.
        // `heading-xs` (20/600) made three questions outweigh the answer.
        text: c('content.primary'), font: 'type.label', paddingX: 'spacing.4', paddingY: 'spacing.3', gap: 'spacing.2_5',
      },
      'trigger:hover': { fill: c('action.ghost.hover') },
      icon: { text: c('content.secondary') },
      // The answer hugs its question: no top inset (shadcn's `pt-0`), so the
      // trigger's own bottom padding is the only gap between them.
      content: { text: c('content.secondary'), font: 'type.body-sm', paddingX: 'spacing.4', paddingBottom: 'spacing.3' },
    })),
  ],
}

// ── AspectRatio ────────────────────────────────────────────────────────────

export const ASPECT_RATIO: ComponentRecipe = {
  key: 'AspectRatio',
  slots: ['root'],
  defaults: { Ratio: '16:9' },
  parts: [
    part({ Ratio: ['16:9', '4:3', '1:1'] as const }, () => ({
      root: {
        fill: c('surface.selected'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        text: c('content.accent'), radius: 'radius.action', font: 'type.button',
      },
    })),
  ],
}

// ── Popover ────────────────────────────────────────────────────────────────

export const POPOVER: ComponentRecipe = {
  key: 'Popover',
  slots: ['root', 'title', 'body', 'arrow'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.overlay',
        shadow: 'shadow.xl', paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.1_5', text: c('content.primary'),
      },
      title: { text: c('content.primary'), font: OVERLAY_TITLE },
      body: { text: c('content.secondary'), font: 'type.body-sm' },
      arrow: { paint: c('surface.layer-2') },
    })),
  ],
}

// ── Tooltip ──────────────────────────────────────────────────────────

const TIP: SlotProps = {
  fill: c('surface.inverse'), text: c('content.inverse'), radius: 'radius.action',
  font: 'type.caption', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5',
}

export const TOOLTIP: ComponentRecipe = {
  key: 'Tooltip',
  slots: ['root', 'arrow'],
  defaults: {},
  parts: [part({}, () => ({ root: TIP, arrow: { paint: c('surface.inverse') } }))],
}

// ── ScrollArea ─────────────────────────────────────────────────────────────

export const SCROLL_AREA: ComponentRecipe = {
  key: 'ScrollArea',
  slots: ['root', 'row', 'scrollbar', 'thumb'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.action',
        paddingX: 'spacing.1_5', paddingY: 'spacing.1_5',
      },
      row: { text: c('content.primary'), font: 'type.body-sm', paddingX: 'spacing.2_5', paddingY: 'spacing.2', radius: 'radius.control' },
      'row:hover': { fill: c('action.ghost.hover') },
      scrollbar: { width: 'spacing.2' },
      thumb: { fill: c('action.secondary.hover'), radius: 'radius.pill' },
    })),
  ],
}

// ── Collapsible ────────────────────────────────────────────────────────────
// shadcn ships Collapsible unstyled; this paints its demo: a trigger row (label
// and a ghost icon button) over bordered rows. Open is a Figma property.

export const COLLAPSIBLE: ComponentRecipe = {
  key: 'Collapsible',
  slots: ['root', 'trigger', 'icon', 'content', 'item'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.2' },
      trigger: { text: c('content.primary'), font: 'type.label', gap: 'spacing.4', paddingX: 'spacing.1', paddingY: 'spacing.1' },
      icon: { text: c('content.secondary'), radius: 'radius.action', width: 'size.compact', height: 'size.compact' },
      'trigger:hover': { text: c('content.primary') },
      content: { gap: 'spacing.2' },
      item: {
        stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.action',
        paddingX: 'spacing.4', paddingY: 'spacing.2', text: c('content.primary'), font: 'type.body-sm',
      },
    })),
  ],
}

// ── Table ──────────────────────────────────────────────────────────────────
// shadcn's Table: a hairline under each row, a muted hover and selected row,
// medium-weight heads at the control height, a muted footer.

export const TABLE: ComponentRecipe = {
  key: 'Table',
  slots: ['root', 'row', 'head', 'cell', 'footer', 'caption'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { text: c('content.primary'), font: 'type.body-sm' },
      row: { stroke: c('border.default'), strokeBottomWidth: 'stroke.divider' },
      'row:hover': { fill: c('action.ghost.hover') },
      'row[data-state="selected"]': { fill: c('surface.selected') },
      head: { text: c('content.primary'), font: 'type.label', height: 'size.control', paddingX: 'spacing.2' },
      cell: { paddingX: 'spacing.2', paddingY: 'spacing.2' },
      footer: { fill: c('surface.layer-2'), font: 'type.label' },
      caption: { text: c('content.secondary'), font: 'type.body-sm' },
    })),
  ],
}

// ── AlertDialog ────────────────────────────────────────────────────────────
// shadcn's AlertDialog: the Dialog's surface, a muted media tile, and a footer
// of Buttons (they paint themselves). `size` sm tightens the padding.

export const ALERT_DIALOG: ComponentRecipe = {
  key: 'AlertDialog',
  slots: ['content', 'overlay', 'header', 'media', 'title', 'description', 'footer'],
  detachedSlots: ['overlay'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.overlay', shadow: 'shadow.2xl', text: c('content.primary'),
      },
      header: { gap: 'spacing.1_5' },
      media: { fill: c('surface.layer-1'), text: c('content.primary'), radius: 'radius.action', width: 'size.control', height: 'size.control' },
      title: { text: c('content.primary'), font: OVERLAY_TITLE },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({
      content: size === 'sm'
        ? { paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.4' }
        : { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.gap-group' },
    })),
  ],
}

// ── Sheet ──────────────────────────────────────────────────────────────────
// shadcn's Sheet: a raised panel from an edge. `side` is layout only.

export const SHEET: ComponentRecipe = {
  key: 'Sheet',
  slots: ['content', 'overlay', 'header', 'title', 'description', 'footer'],
  detachedSlots: ['overlay'],
  defaults: {},
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        shadow: 'shadow.lg', gap: 'spacing.4', text: c('content.primary'),
      },
      header: { gap: 'spacing.0_5', paddingX: 'spacing.4', paddingY: 'spacing.4' },
      title: { text: c('content.primary'), font: OVERLAY_TITLE },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.2', paddingX: 'spacing.4', paddingY: 'spacing.4' },
    })),
  ],
}

// ── Drawer ─────────────────────────────────────────────────────────────────
// shadcn's Drawer (vaul): the Sheet's surface with a grab handle on the bottom one.

export const DRAWER: ComponentRecipe = {
  key: 'Drawer',
  slots: ['content', 'overlay', 'handle', 'header', 'title', 'description', 'footer'],
  detachedSlots: ['overlay'],
  defaults: {},
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.overlay', text: c('content.primary'),
      },
      handle: { fill: c('surface.inverse'), radius: 'radius.pill' },
      header: { gap: 'spacing.0_5', paddingX: 'spacing.4', paddingY: 'spacing.4' },
      title: { text: c('content.primary'), font: OVERLAY_TITLE },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.2', paddingX: 'spacing.4', paddingY: 'spacing.4' },
    })),
  ],
}

// ── HoverCard ──────────────────────────────────────────────────────────────
// shadcn's HoverCard: the Popover's raised surface; its content is free.

export const HOVER_CARD: ComponentRecipe = {
  key: 'HoverCard',
  slots: ['root'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.overlay',
        shadow: 'shadow.lg', paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.2', text: c('content.primary'), font: 'type.body-sm',
      },
    })),
  ],
}

// ── Item ───────────────────────────────────────────────────────────────────
// shadcn's Item: a row with media, title, description and actions. `variant`
// default (no edge) | outline | muted × `size` default | sm | xs.

export const ITEM_VARIANTS = ['default', 'outline', 'muted'] as const
export const ITEM_SIZES = ['default', 'sm', 'xs'] as const
// shadcn: default `p-4 gap-4`, sm `px-4 py-3 gap-2.5`, xs one step tighter.
// The three used to share two geometries, so `sm` was `default`.
const ITEM_GEOMETRY: Record<string, SlotProps> = {
  default: { paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.4' },
  sm: { paddingX: 'spacing.4', paddingY: 'spacing.3', gap: 'spacing.2_5' },
  xs: { paddingX: 'spacing.3', paddingY: 'spacing.2', gap: 'spacing.2' },
}
// The description steps down with the row, so the title always leads it:
// at sm / xs a body-sized description matched the title's size and wrapped.
const ITEM_DESCRIPTION: Record<string, string> = { default: 'type.body-sm', sm: 'type.caption', xs: 'type.caption' }
const ITEM_CONTENT_GAP: Record<string, string> = { default: 'spacing.1', sm: 'spacing.0_5', xs: 'spacing.0_5' }
const ITEM_MEDIA: Record<string, string> = { default: 'size.control', sm: 'size.compact', xs: 'size.xs' }

export const ITEM: ComponentRecipe = {
  key: 'Item',
  slots: ['root', 'media', 'content', 'title', 'description', 'actions'],
  defaults: { Variant: 'default', Size: 'default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', text: c('content.primary') },
      media: { text: c('content.primary') },
      title: { text: c('content.primary'), font: 'type.label', gap: 'spacing.2' },
      description: { text: c('content.secondary') },
      actions: { gap: 'spacing.2' },
    })),
    part({ Variant: ITEM_VARIANTS }, (variant) => ({
      root: variant === 'outline'
        ? { fill: NONE, stroke: c('border.default') }
        : variant === 'muted'
          ? { fill: c('surface.layer-2'), stroke: NONE }
          : { fill: NONE, stroke: NONE },
    })),
    part({ Size: ITEM_SIZES }, (size) => ({
      root: ITEM_GEOMETRY[size],
      content: { gap: ITEM_CONTENT_GAP[size] },
      description: { font: ITEM_DESCRIPTION[size] },
      'media[data-variant="image"]': { width: ITEM_MEDIA[size], height: ITEM_MEDIA[size], radius: 'radius.control' },
    })),
  ],
}

// ── Attachment ─────────────────────────────────────────────────────────────
// shadcn's Attachment: a file on the card surface — media tile, title,
// description, actions. `size` default | sm | xs. Error paints the media and
// the description in the critical roles (the state rides on those parts).

export const ATTACHMENT_SIZES = ['default', 'sm', 'xs'] as const
const ATTACHMENT_GEOMETRY: Record<string, SlotProps> = {
  default: { paddingX: 'spacing.2', paddingY: 'spacing.2', gap: 'spacing.2_5' },
  sm: { paddingX: 'spacing.1_5', paddingY: 'spacing.1_5', gap: 'spacing.2' },
  xs: { paddingX: 'spacing.1', paddingY: 'spacing.1', gap: 'spacing.1_5' },
}
const ATTACHMENT_MEDIA: Record<string, string> = { default: 'size.control', sm: 'size.compact', xs: 'size.xs' }

export const ATTACHMENT: ComponentRecipe = {
  key: 'Attachment',
  slots: ['root', 'media', 'content', 'title', 'description', 'actions'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.control', radius: TALL_FIELD_RADIUS,
        text: c('content.primary'),
      },
      media: { fill: c('surface.layer-2'), text: c('content.secondary'), radius: 'radius.control' },
      'media[data-state="error"]': { fill: c('status.critical.surface'), text: c('status.critical.content') },
      content: { gap: 'spacing.0_5' },
      title: { text: c('content.primary'), font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.caption' },
      'description[data-state="error"]': { text: c('status.critical.content') },
      actions: { gap: 'spacing.1' },
    })),
    part({ Size: ATTACHMENT_SIZES }, (size) => ({
      root: ATTACHMENT_GEOMETRY[size],
      media: { width: ATTACHMENT_MEDIA[size], height: ATTACHMENT_MEDIA[size] },
    })),
  ],
}

// ── Message ────────────────────────────────────────────────────────────────
// shadcn's Message: avatar, header and footer around a Bubble (its own recipe).

export const MESSAGE: ComponentRecipe = {
  key: 'Message',
  slots: ['root', 'avatar', 'content', 'header', 'footer'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.2' },
      avatar: { fill: c('surface.layer-2'), text: c('content.secondary'), radius: 'radius.pill', width: 'size.compact', height: 'size.compact', font: 'type.caption' },
      content: { gap: 'spacing.1' },
      header: { text: c('content.secondary'), font: 'type.caption', gap: 'spacing.1_5' },
      footer: { text: c('content.subtle'), font: 'type.caption', gap: 'spacing.1' },
    })),
  ],
}

// ── Bubble ─────────────────────────────────────────────────────────────────
// shadcn's Bubble: the message body, seven variants over Escala's roles —
// default the primary action, secondary, muted, tinted (the accent surface),
// outline, ghost (no box) and destructive (the critical tint).

export const BUBBLE_VARIANTS = ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const
const BUBBLE_PAINT: Record<string, SlotProps> = {
  default: { fill: c('action.primary.default'), stroke: NONE, text: c('content.on-action') },
  secondary: { fill: c('action.secondary.default'), stroke: NONE, text: c('content.accent') },
  muted: { fill: c('surface.layer-2'), stroke: NONE, text: c('content.primary') },
  tinted: { fill: c('surface.accent'), stroke: NONE, text: c('content.accent') },
  outline: { fill: c('surface.page'), stroke: c('border.default'), text: c('content.primary') },
  ghost: { fill: NONE, stroke: NONE, text: c('content.primary'), paddingX: 'spacing.0', paddingY: 'spacing.0' },
  destructive: { fill: c('status.critical.surface'), stroke: NONE, text: c('status.critical.content') },
}

export const BUBBLE: ComponentRecipe = {
  key: 'Bubble',
  slots: ['root', 'content', 'reactions'],
  defaults: { Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.1' },
      reactions: { fill: c('surface.layer-2'), text: c('content.primary'), radius: 'radius.pill', paddingX: 'spacing.1_5', paddingY: 'spacing.0_5', gap: 'spacing.1', font: 'type.caption' },
    })),
    part({ Variant: BUBBLE_VARIANTS }, (variant) => ({
      content: {
        radius: 'radius.container', strokeWidth: 'stroke.control', paddingX: 'spacing.3', paddingY: 'spacing.2',
        font: 'type.body-sm', ...BUBBLE_PAINT[variant],
      },
    })),
  ],
}

// ── Resizable ──────────────────────────────────────────────────────────────
// shadcn's Resizable: panels split by a hairline handle (`bg-border`), with an
// optional grip. `orientation` turns the hairline.

export const RESIZABLE: ComponentRecipe = {
  key: 'Resizable',
  slots: ['root', 'panel', 'handle', 'grip'],
  defaults: { Orientation: 'horizontal' },
  parts: [
    part({}, () => ({
      root: { stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container', text: c('content.primary') },
      panel: { paddingX: 'spacing.4', paddingY: 'spacing.4', font: 'type.label' },
      grip: { fill: c('border.default'), radius: 'radius.pill' },
      'handle:focus-visible': { fill: c('border.focus') },
    })),
    part({ Orientation: ['horizontal', 'vertical'] as const }, (o) => ({
      handle: o === 'horizontal'
        ? { fill: c('border.default'), width: 'stroke.divider' }
        : { fill: c('border.default'), height: 'stroke.divider' },
    })),
  ],
}

// ── Carousel ───────────────────────────────────────────────────────────────
// shadcn's Carousel: the slides are the caller's (a Card); previous / next are
// outline icon Buttons made round, as shadcn's `rounded-full`.

export const CAROUSEL: ComponentRecipe = {
  key: 'Carousel',
  slots: ['root', 'item', 'previous', 'next'],
  defaults: { Orientation: 'horizontal' },
  parts: [
    part({ Orientation: ['horizontal', 'vertical'] as const }, () => ({
      root: { text: c('content.primary') },
      previous: { radius: 'radius.pill' },
      next: { radius: 'radius.pill' },
    })),
  ],
}

// ── Chart ──────────────────────────────────────────────────────────────────
// shadcn's Chart: the frame inks axis ticks and grid in the secondary ink
// (Recharts reads `currentColor`); the tooltip is a small raised panel. Series
// colours are the caller's config (the brand's chartPalette).

export const CHART: ComponentRecipe = {
  key: 'Chart',
  slots: ['root', 'tooltip', 'label', 'legend'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { text: c('content.secondary'), font: 'type.caption' },
      tooltip: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.action',
        shadow: 'shadow.xl', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.1_5', text: c('content.primary'), font: 'type.caption',
      },
      label: { text: c('content.secondary') },
      legend: { text: c('content.secondary'), gap: 'spacing.4', font: 'type.caption' },
    })),
  ],
}
