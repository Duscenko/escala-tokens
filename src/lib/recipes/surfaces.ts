import { c, part, type ComponentRecipe } from './helpers'

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

