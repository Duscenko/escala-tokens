import { c, part, type ComponentRecipe, type SlotProps } from './helpers'

// ── Card ───────────────────────────────────────────────────────────────────

export const CARD: ComponentRecipe = {
  key: 'Card',
  slots: ['root', 'header', 'title', 'description', 'content', 'footer', 'link'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.container', paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface',
        gap: 'spacing.gap-control', shadow: 'shadow.sm',
      },
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.heading-sm' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      content: { text: c('content.primary'), font: 'type.body-md' },
      footer: { gap: 'spacing.gap-control' },
      link: { text: c('content.accent'), font: 'type.button' },
    })),
  ],
}

// ── Dialog (catalogue key `Modal`) ─────────────────────────────────────────

export const MODAL: ComponentRecipe = {
  key: 'Modal',
  slots: ['content', 'overlay', 'header', 'title', 'description', 'footer', 'close'],
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
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.heading-sm' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
      close: { text: c('content.secondary'), radius: 'radius.control', height: 'size.xs' },
    })),
  ],
}


// ── Divider ────────────────────────────────────────────────────────────────

export const DIVIDER: ComponentRecipe = {
  key: 'Divider',
  slots: ['root'],
  defaults: { Orientation: 'Horizontal' },
  parts: [
    part({ Orientation: ['Horizontal', 'Vertical'] as const }, (o) => ({
      root: o === 'Horizontal'
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
        text: c('content.primary'), font: 'type.heading-xs', paddingX: 'spacing.4', paddingY: 'spacing.3', gap: 'spacing.2_5',
      },
      'trigger:hover': { fill: c('action.ghost.hover') },
      icon: { text: c('content.secondary') },
      content: { text: c('content.secondary'), font: 'type.body-sm', paddingX: 'spacing.4', paddingY: 'spacing.3' },
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
      title: { text: c('content.primary'), font: 'type.heading-xs' },
      body: { text: c('content.secondary'), font: 'type.body-sm' },
      arrow: { paint: c('surface.layer-2') },
    })),
  ],
}

// ── Tooltip · InfoTooltip ──────────────────────────────────────────────────

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

export const INFO_TOOLTIP: ComponentRecipe = {
  key: 'InfoTooltip',
  slots: ['root', 'tip', 'arrow', 'label', 'icon'],
  // The bubble portals out of the label, so it is not a descendant of the root.
  detachedSlots: ['tip', 'arrow'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      tip: TIP,
      arrow: { paint: c('surface.inverse') },
      label: { text: c('content.primary'), font: 'type.label', gap: 'spacing.1_5' },
      icon: { text: c('content.secondary') },
    })),
  ],
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
