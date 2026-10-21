/**
 * Feedback recipes: Alert (shadcn's Alert) and Sonner (shadcn's toaster).
 * Rules as in `componentRecipes.ts`.
 */
import { c, part, type ComponentRecipe } from './helpers.js'

// ── Alert ──────────────────────────────────────────────────────────────────
// shadcn: `bg-card` with a hairline, `default` in the card's ink, `destructive`
// in the critical ink (title, description and icon), the surface unchanged.

export const ALERT_VARIANTS = ['default', 'destructive'] as const

export const ALERT: ComponentRecipe = {
  key: 'Alert',
  slots: ['root', 'icon', 'title', 'description'],
  defaults: { Variant: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.control',
        radius: 'radius.container', paddingX: 'spacing.4', paddingY: 'spacing.3',
        // shadcn: `has-[>svg]:gap-x-3 gap-y-0.5` — the icon column is 12px off the
        // text, title and description 2px apart. In Figma `gap` is the icon slot's
        // spacing; the body column keeps the row gap.
        gap: 'spacing.3', rowGap: 'spacing.0_5',
        font: 'type.body-sm',
      },
      title: { font: 'type.label' },
      description: { font: 'type.body-sm' },
    })),
    part({ Variant: ALERT_VARIANTS }, (variant) => variant === 'destructive'
      ? {
          root: { text: c('status.critical.content') },
          icon: { text: c('status.critical.content') },
          description: { text: c('status.critical.content') },
        }
      : {
          root: { text: c('content.primary') },
          icon: { text: c('content.primary') },
          description: { text: c('content.secondary') },
        }),
  ],
}

// ── Sonner ─────────────────────────────────────────────────────────────────
// shadcn's Toaster maps Sonner onto the popover: `--normal-bg: var(--popover)`,
// `--normal-text: var(--popover-foreground)`, `--normal-border: var(--border)`.
// The toast `type` changes only the icon, as in shadcn — and the icon takes
// that severity's ink (`status.*.content`), so a success reads as a success
// and not as a neutral note with a tick. Sonner puts `data-type` on the toast,
// which is the attribute the `Type` axis reads. Sonner renders the DOM, so the
// parts are its own attributes.

export const SONNER_TYPES = ['default', 'success', 'info', 'warning', 'error', 'loading'] as const
const SONNER_ICON: Record<string, string> = {
  default: 'content.primary', loading: 'content.secondary',
  success: 'status.success.content', info: 'status.info.content',
  warning: 'status.warning.content', error: 'status.critical.content',
}

export const SONNER: ComponentRecipe = {
  key: 'Sonner',
  slots: ['root', 'icon', 'title', 'description', 'action'],
  defaults: { Type: 'default' },
  dom: {
    // Sonner's own sheet is `[data-sonner-toast][data-styled='true'] …`, injected
    // after ours: the toaster and `[data-styled]` in the selector outrank it.
    root: '[data-escala="Sonner"] [data-sonner-toaster] [data-sonner-toast][data-styled]',
    slots: { icon: '[data-icon]', title: '[data-title]', description: '[data-description]', action: '[data-button]' },
  },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.control', text: c('content.primary'),
        radius: 'radius.container', shadow: 'shadow.lg', paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.1_5',
      },
      title: { font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      action: {
        fill: c('action.primary.default'), text: c('content.on-action'), radius: 'radius.action',
        paddingX: 'spacing.2', font: 'type.caption',
      },
    })),
    part({ Type: SONNER_TYPES }, (type) => ({ icon: { text: c(SONNER_ICON[type]) } })),
  ],
}

// ── Skeleton ───────────────────────────────────────────────────────────────
// shadcn's Skeleton: `bg-muted rounded-md` that pulses. The size is the
// caller's (a line of text, an avatar, a card).

export const SKELETON: ComponentRecipe = {
  key: 'Skeleton',
  slots: ['root'],
  defaults: {},
  parts: [part({}, () => ({ root: { fill: c('surface.layer-2'), radius: 'radius.action' } }))],
}

// ── Empty ──────────────────────────────────────────────────────────────────
// shadcn's Empty: a dashed box (the dash is the component's), media, title,
// description and the actions under them. EmptyMedia `variant="icon"` puts the
// glyph on a muted tile — a slot state (`media-icon` in Figma), since the
// variant lives on the media, not on the root.

export const EMPTY: ComponentRecipe = {
  key: 'Empty',
  slots: ['root', 'header', 'media', 'title', 'description', 'content'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container',
        paddingX: 'spacing.6', paddingY: 'spacing.6', gap: 'spacing.4', text: c('content.primary'),
      },
      header: { gap: 'spacing.2' },
      media: { text: c('content.primary') },
      'media[data-variant="icon"]': { fill: c('surface.layer-2'), radius: 'radius.action', width: 'size.compact', height: 'size.compact' },
      title: { text: c('content.primary'), font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      content: { gap: 'spacing.2_5' },
    })),
  ],
}
