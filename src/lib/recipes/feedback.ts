/**
 * Feedback recipes: Alert (shadcn's Alert) and Sonner (shadcn's toaster).
 * Rules as in `componentRecipes.ts`.
 */
import { c, part, type ComponentRecipe } from './helpers.js'

// ── Alert ──────────────────────────────────────────────────────────────────
// The Figma set (design-plans/alert-contract.md, 397:1932, 96 variants): a message bar. Layout horizontal is the
// full-width banner (no radius, a bottom hairline when outline), vertical a boxed message (Radius/container, a
// hairline all round when outline; its content leaves 32px for the close). The icon, the text and the surface
// come from Variant (severity) × Appearance (outline · solid · soft · inverse).

export const ALERT_VARIANTS = ['success', 'info', 'warning', 'default', 'critical', 'secondary'] as const
export const ALERT_APPEARANCES = ['outline', 'solid', 'soft', 'inverse'] as const
export const ALERT_LAYOUTS = ['horizontal', 'vertical'] as const
export const ALERT_SIZES = ['sm', 'default'] as const

interface AlertTone { stroke: string; ink: string; solid: string; onSolid: string; soft: string; softInk: string; softText: string }
const STATUS_TONE = (s: string): AlertTone => ({
  stroke: `status.${s}.border`, ink: `status.${s}.content`, solid: `status.${s}.surface-solid`, onSolid: `status.${s}.on-solid`,
  soft: `status.${s}.surface`, softInk: `status.${s}.content`, softText: `status.${s}.content`,
})
const ALERT_TONE: Record<string, AlertTone> = {
  default: { stroke: 'border.accent', ink: 'content.accent', solid: 'action.primary.default', onSolid: 'content.on-action', soft: 'surface.accent', softInk: 'content.accent', softText: 'content.accent' },
  critical: STATUS_TONE('critical'),
  success: STATUS_TONE('success'),
  info: STATUS_TONE('info'),
  warning: STATUS_TONE('warning'),
  secondary: { stroke: 'border.default', ink: 'content.secondary', solid: 'action.secondary.default', onSolid: 'content.on-secondary', soft: 'surface.layer-2', softInk: 'content.secondary', softText: 'content.primary' },
}

export const ALERT: ComponentRecipe = {
  key: 'Alert',
  slots: ['root', 'content', 'icon', 'title', 'description', 'actions', 'close'],
  defaults: { Variant: 'default', Appearance: 'outline', Layout: 'horizontal', Size: 'default' },
  parts: [
    part({}, () => ({
      content: { gap: 'spacing.gap-control' },
      actions: { gap: 'spacing.gap-control' },
      title: { font: 'type.label' },
    })),
    part({ Layout: ALERT_LAYOUTS }, (layout) => ({
      root: layout === 'horizontal'
        ? { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-control', gap: 'spacing.gap-group', radius: 'radius.none' }
        : { gap: 'spacing.gap-group', radius: 'radius.container' },
      ...(layout === 'vertical' ? { content: { gap: 'spacing.gap-control', paddingRight: 'size.sm' } } : {}),
    })),
    part({ Size: ALERT_SIZES }, (size) => ({
      icon: size === 'sm' ? { width: 'icon.small', height: 'icon.small' } : { width: 'icon.medium', height: 'icon.medium' },
      description: { font: size === 'sm' ? 'type.body-md' : 'type.body-lg' },
    })),
    // Vertical pads 20 all round; its outline hairline is laid out, so the padding adds it.
    part({ Layout: ALERT_LAYOUTS, Appearance: ALERT_APPEARANCES }, (layout, appearance) => ({
      root: layout === 'vertical'
        ? (appearance === 'outline'
          ? { paddingX: 'spacing.inset-surface+stroke.control', paddingY: 'spacing.inset-surface+stroke.control' }
          : { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface' })
        : {},
    })),
    part({ Variant: ALERT_VARIANTS, Appearance: ALERT_APPEARANCES, Layout: ALERT_LAYOUTS }, (variant, appearance, layout) => {
      const t = ALERT_TONE[variant]
      switch (appearance) {
        case 'solid':
          return { root: { fill: c(t.solid) }, icon: { text: c(t.onSolid) }, description: { text: c(t.onSolid) }, title: { text: c(t.onSolid) } }
        case 'soft':
          return { root: { fill: c(t.soft) }, icon: { text: c(t.softInk) }, description: { text: c(t.softText) }, title: { text: c(t.softText) } }
        case 'inverse':
          return { root: { fill: c('surface.inverse') }, icon: { text: c('content.inverse-secondary') }, description: { text: c('content.inverse') }, title: { text: c('content.inverse') } }
        default:
          return {
            root: layout === 'horizontal'
              ? { fill: c('surface.layer-1'), stroke: c(t.stroke), strokeBottomWidth: 'stroke.control' }
              : { fill: c('surface.layer-1'), stroke: c(t.stroke), strokeWidth: 'stroke.control' },
            icon: { text: c(t.ink) }, description: { text: c('content.primary') }, title: { text: c('content.primary') },
          }
      }
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
