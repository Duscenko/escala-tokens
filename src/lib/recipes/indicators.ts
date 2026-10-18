/**
 * Indicator recipes: Badge, StatusBadge, Chip, Progress, Spinner, Icon, Rating,
 * FileFormat, Avatar. Rules as in `componentRecipes.ts`.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers.js'

// ── Badge ──────────────────────────────────────────────────────────────────
// shadcn's variants (`bases/radix/ui/badge.tsx`), painted through Escala roles
// the way the Button reads them: default = primary, secondary = the neutral
// fill, destructive = shadcn v4's soft critical, outline = the hairline,
// ghost / link = no fill. Height h-5 → padding on the spacing scale.

export const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const

function badgePaint(variant: string): SlotMap {
  switch (variant) {
    case 'default': return { root: { fill: c('action.primary.default'), stroke: NONE, text: c('content.on-action') } }
    case 'secondary': return { root: { fill: c('action.secondary.default'), stroke: NONE, text: c('content.primary') } }
    case 'destructive': return { root: { fill: c('status.critical.surface'), stroke: NONE, text: c('status.critical.content') } }
    case 'outline': return { root: { fill: NONE, stroke: c('border.default'), text: c('content.primary') } }
    case 'ghost': return { root: { fill: NONE, stroke: NONE, text: c('content.primary') } }
    default: return { root: { fill: NONE, stroke: NONE, text: c('content.link.default') } }
  }
}

export const BADGE: ComponentRecipe = {
  key: 'Badge',
  slots: ['root'],
  defaults: { Variant: 'default' },
  parts: [
    part({}, () => ({
      root: {
        radius: 'radius.pill', strokeWidth: 'stroke.control', font: 'type.caption',
        paddingX: 'spacing.2', paddingY: 'spacing.0_5', gap: 'spacing.1',
      },
    })),
    part({ Variant: BADGE_VARIANTS }, badgePaint),
  ],
}

// ── StatusBadge ────────────────────────────────────────────────────────────

const PRESENCE_DOT: Record<string, string> = {
  Online: 'status.success.surface-solid',
  Away: 'status.warning.surface-solid',
  Busy: 'status.critical.surface-solid',
  // The absence of a signal reads as muted ink.
  Offline: 'content.subtle',
}

export const STATUS_BADGE: ComponentRecipe = {
  key: 'StatusBadge',
  slots: ['root', 'dot'],
  defaults: { Status: 'Online' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', text: c('content.primary'),
        radius: 'radius.pill', font: 'type.caption', paddingX: 'spacing.2_5', paddingY: 'spacing.1', gap: 'spacing.2',
      },
      dot: { width: 'spacing.2', height: 'spacing.2', radius: 'radius.pill' },
    })),
    part({ Status: ['Online', 'Away', 'Busy', 'Offline'] as const }, (status) => ({ dot: { fill: c(PRESENCE_DOT[status]) } })),
  ],
}

// ── Chip ───────────────────────────────────────────────────────────────────

const CHIP_GEOMETRY: Record<string, SlotProps> = {
  MD: { paddingX: 'spacing.3', paddingY: 'spacing.1', gap: 'spacing.1_5' },
  SM: { paddingX: 'spacing.2_5', paddingY: 'spacing.0_5', gap: 'spacing.1' },
}

export const CHIP: ComponentRecipe = {
  key: 'Chip',
  slots: ['root', 'remove'],
  defaults: { Selected: 'False', Dismissible: 'False', Size: 'MD' },
  parts: [
    part({}, () => ({ root: { radius: 'radius.pill', strokeWidth: 'stroke.control', font: 'type.label' } })),
    part({ Size: ['MD', 'SM'] as const }, (size) => ({ root: CHIP_GEOMETRY[size] })),
    part({ Selected: ['False', 'True'] as const }, (selected) => selected === 'True'
      ? {
          root: { fill: c('surface.selected'), stroke: c('border.accent'), text: c('content.accent') },
          'root:hover': { fill: c('surface.selected-pressed') },
        }
      : {
          root: { fill: NONE, stroke: c('border.strong'), text: c('content.primary') },
          'root:hover': { fill: c('surface.accent'), stroke: c('border.control-hover') },
        }),
  ],
}

// ── Progress ───────────────────────────────────────────────────────────────

export const PROGRESS: ComponentRecipe = {
  key: 'Progress',
  slots: ['root', 'header', 'label', 'value', 'track', 'indicator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      label: { text: c('content.secondary'), font: 'type.caption' },
      value: { text: c('content.primary'), font: 'type.caption' },
      track: { fill: c('action.secondary.default'), height: 'spacing.1_5', radius: 'radius.pill' },
      indicator: { fill: c('action.primary.default'), radius: 'radius.pill' },
    })),
  ],
}

// ── Spinner ────────────────────────────────────────────────────────────────
// shadcn's Spinner is a spinning loader glyph, `size-4` (a class), no variants. It takes
// the ink of the text around it; on its own, the secondary ink.

export const SPINNER: ComponentRecipe = {
  key: 'Spinner',
  slots: ['root'],
  defaults: {},
  parts: [
    part({}, () => ({ root: { text: c('content.secondary') } })),
  ],
}

// ── Icon ───────────────────────────────────────────────────────────────────

const ICON_ROLE: Record<string, string> = { SM: 'icon.small', MD: 'icon.medium', LG: 'icon.large' }

export const ICON: ComponentRecipe = {
  key: 'Icon',
  slots: ['root'],
  defaults: { Size: 'MD' },
  parts: [
    part({ Size: ['SM', 'MD', 'LG'] as const }, (size) => ({
      root: { width: ICON_ROLE[size], height: ICON_ROLE[size], text: c('content.primary') },
    })),
  ],
}

// ── Rating ─────────────────────────────────────────────────────────────────

export const RATING: ComponentRecipe = {
  key: 'Rating',
  slots: ['root', 'stars', 'star', 'starOn', 'label'],
  defaults: { Interactive: 'False' },
  parts: [
    part({ Interactive: ['False', 'True'] as const }, () => ({
      root: { gap: 'spacing.gap-control' },
      stars: { gap: 'spacing.0_5' },
      star: { text: c('content.subtle'), width: 'icon.medium', height: 'icon.medium' },
      starOn: { text: c('status.warning.surface-solid'), width: 'icon.medium', height: 'icon.medium' },
      label: { text: c('content.secondary'), font: 'type.body-sm' },
    })),
  ],
}

// ── FileFormat ─────────────────────────────────────────────────────────────

const FORMAT_TONE: Record<string, { fill: string; on: string }> = {
  PDF: { fill: 'status.critical.surface-solid', on: 'status.critical.on-solid' },
  PNG: { fill: 'status.info.surface-solid', on: 'status.info.on-solid' },
  SVG: { fill: 'action.primary.default', on: 'content.on-action' },
  ZIP: { fill: 'status.warning.surface-solid', on: 'status.warning.on-solid' },
}

export const FILE_FORMAT: ComponentRecipe = {
  key: 'FileFormat',
  slots: ['root', 'page', 'plate'],
  defaults: { Format: 'PDF' },
  parts: [
    part({}, () => ({
      root: { width: 'size.control', height: 'size.lg' },
      page: { text: c('border.strong'), paint: c('surface.layer-1') },
      plate: { radius: 'radius.control', font: 'type.caption', paddingX: 'spacing.1_5', paddingY: 'spacing.0_5' },
    })),
    part({ Format: ['PDF', 'PNG', 'SVG', 'ZIP'] as const }, (format) => ({
      plate: { fill: c(FORMAT_TONE[format].fill), text: c(FORMAT_TONE[format].on) },
    })),
  ],
}

// ── Avatar ─────────────────────────────────────────────────────────────────
// shadcn's sizes: sm 24 · default 32 · lg 40 (size-6 / 8 / 10) — Escala's
// Size steps at those lengths. The fallback is shadcn's `bg-muted
// text-muted-foreground`.

export const AVATAR_SIZES = ['default', 'sm', 'lg'] as const
const AVATAR_GEOMETRY: Record<string, { size: string; font: string }> = {
  sm: { size: 'size.xs', font: 'type.caption' },
  default: { size: 'size.sm', font: 'type.label' },
  lg: { size: 'size.md', font: 'type.label' },
}

export const AVATAR: ComponentRecipe = {
  key: 'Avatar',
  slots: ['root', 'image', 'fallback'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.pill' },
      fallback: { fill: c('surface.layer-2'), text: c('content.secondary'), radius: 'radius.pill' },
    })),
    part({ Size: AVATAR_SIZES }, (size) => ({
      root: { width: AVATAR_GEOMETRY[size].size, height: AVATAR_GEOMETRY[size].size },
      fallback: { font: AVATAR_GEOMETRY[size].font },
    })),
  ],
}
