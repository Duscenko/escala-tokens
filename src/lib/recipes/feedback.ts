/**
 * Feedback recipes: Alert and Toast (the Figma sets).
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

// ── Toast ──────────────────────────────────────────────────────────────────
// The Figma set (design-plans/toast-contract.md, 1117:114, 24 variants). 360 wide, Radius/overlay, Shadow/lg (the key +
// ambient lift: the file's ring and negative spreads paint nothing), padding 12 (left 20: the component), gap 8; a 4px
// progress hairline along the bottom edge. Appearance solid · soft · filled · outline × Variant (default · secondary ·
// success · info · warning · critical). A stroke (filled, outline) is laid out, so the padding adds it.

export const TOAST_APPEARANCES = ['solid', 'soft', 'filled', 'outline'] as const
export const TOAST_VARIANTS = ['default', 'secondary', 'success', 'info', 'warning', 'critical'] as const

interface ToastTone { ink: string; border: string; soft: string; solid: string; onSolid: string; track: string; trackSoft: string; bar: string }
const TOAST_STATUS = (s: string): ToastTone => ({
  ink: `status.${s}.content`, border: `status.${s}.border`, soft: `status.${s}.surface`, solid: `status.${s}.surface-solid`,
  onSolid: `status.${s}.on-solid`, track: `status.${s}.surface`, trackSoft: `status.${s}.border`, bar: `status.${s}.surface-solid`,
})
const TOAST_TONE: Record<string, ToastTone> = {
  default: { ink: 'content.accent', border: 'border.accent', soft: 'surface.accent', solid: 'action.primary.default', onSolid: 'content.on-action', track: 'surface.accent', trackSoft: 'border.accent', bar: 'action.primary.default' },
  secondary: { ink: 'content.secondary', border: 'border.default', soft: 'surface.muted', solid: 'surface.inverse', onSolid: 'content.inverse', track: 'surface.muted', trackSoft: 'border.default', bar: 'surface.inverse' },
  success: TOAST_STATUS('success'),
  info: TOAST_STATUS('info'),
  warning: TOAST_STATUS('warning'),
  critical: TOAST_STATUS('critical'),
}

export const TOAST: ComponentRecipe = {
  key: 'Toast',
  slots: ['root', 'icon', 'content', 'title', 'description', 'actions', 'close', 'progress', 'bar'],
  defaults: { Appearance: 'filled', Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.overlay', gap: 'spacing.gap-control', lift: 'rest' },
      icon: { width: 'icon.medium', height: 'icon.medium' },
      content: { gap: 'spacing.gap-tight' },
      title: { font: 'type.label' },
      description: { font: 'type.body-sm' },
      actions: { gap: 'spacing.gap-control' },
      progress: { height: 'spacing.1' },
    })),
    part({ Appearance: TOAST_APPEARANCES, Variant: TOAST_VARIANTS }, (appearance, variant) => {
      const t = TOAST_TONE[variant]
      const pad = appearance === 'filled' || appearance === 'outline'
        ? { paddingX: 'spacing.inset-control+stroke.control', paddingY: 'spacing.inset-control+stroke.control' }
        : { paddingX: 'spacing.inset-control', paddingY: 'spacing.inset-control' }
      switch (appearance) {
        case 'solid':
          return {
            root: { ...pad, fill: c(t.solid) },
            icon: { text: c(t.onSolid) },
            title: { text: c(t.onSolid) },
            description: { text: c(variant === 'secondary' ? 'content.inverse-secondary' : t.onSolid) },
            progress: { fill: c('surface.inverse-muted') },
            bar: { fill: c(t.onSolid) },
          }
        case 'soft':
          return {
            root: { ...pad, fill: c(t.soft) },
            icon: { text: c(t.ink) },
            title: { text: c('content.primary') },
            description: { text: c('content.primary') },
            progress: { fill: c(t.trackSoft) },
            bar: { fill: c(t.bar) },
          }
        case 'outline':
          return {
            root: { ...pad, fill: c('surface.layer-1'), stroke: c(t.border), strokeWidth: 'stroke.control' },
            icon: { text: c(t.ink) },
            title: { text: c(variant === 'secondary' ? 'content.primary' : t.ink) },
            description: { text: c(variant === 'secondary' ? 'content.secondary' : t.ink) },
            progress: { fill: c(t.track) },
            bar: { fill: c(t.bar) },
          }
        default:
          return {
            root: { ...pad, fill: c('surface.layer-2'), stroke: c('border.default'), strokeWidth: 'stroke.control' },
            icon: { text: c(t.ink) },
            title: { text: c('content.primary') },
            description: { text: c('content.secondary') },
            progress: { fill: c(t.track) },
            bar: { fill: c(t.bar) },
          }
      }
    }),
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
