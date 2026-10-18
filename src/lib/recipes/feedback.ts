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
        radius: 'radius.container', paddingX: 'spacing.4', paddingY: 'spacing.3', gap: 'spacing.0_5',
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
// The toast `type` changes only the icon, as in shadcn — so the recipe has no
// axis. Sonner renders the DOM, so the parts are its own attributes.

export const SONNER: ComponentRecipe = {
  key: 'Sonner',
  slots: ['root', 'icon', 'title', 'description', 'action'],
  defaults: {},
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
      icon: { text: c('content.primary') },
      title: { font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      action: {
        fill: c('action.primary.default'), text: c('content.on-action'), radius: 'radius.action',
        paddingX: 'spacing.2', font: 'type.caption',
      },
    })),
  ],
}
