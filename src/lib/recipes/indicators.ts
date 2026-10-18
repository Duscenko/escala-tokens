/**
 * Indicator recipes: Badge, StatusBadge, Chip, Progress, Spinner, Icon, Rating,
 * FileFormat, Avatar. Rules as in `componentRecipes.ts`.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers'

// ── Badge ──────────────────────────────────────────────────────────────────

interface Tone { solid: string; on: string; soft: string; ink: string; line: string; dot: string }
const BADGE_TONES: Record<string, Tone> = {
  Brand: { solid: 'action.primary.default', on: 'content.on-action', soft: 'surface.selected', ink: 'content.accent', line: 'border.accent', dot: 'action.primary.default' },
  Neutral: { solid: 'surface.inverse', on: 'content.inverse', soft: 'action.secondary.default', ink: 'content.secondary', line: 'border.strong', dot: 'content.secondary' },
  Success: { solid: 'status.success.surface-solid', on: 'status.success.on-solid', soft: 'status.success.surface', ink: 'status.success.content', line: 'status.success.border-strong', dot: 'status.success.surface-solid' },
  Warning: { solid: 'status.warning.surface-solid', on: 'status.warning.on-solid', soft: 'status.warning.surface', ink: 'status.warning.content', line: 'status.warning.border-strong', dot: 'status.warning.surface-solid' },
  Error: { solid: 'status.critical.surface-solid', on: 'status.critical.on-solid', soft: 'status.critical.surface', ink: 'status.critical.content', line: 'status.critical.border-strong', dot: 'status.critical.surface-solid' },
  Info: { solid: 'status.info.surface-solid', on: 'status.info.on-solid', soft: 'status.info.surface', ink: 'status.info.content', line: 'status.info.border-strong', dot: 'status.info.surface-solid' },
}

function badgePaint(style: string, color: string): SlotMap {
  const k = BADGE_TONES[color]
  if (style === 'Solid') return { root: { fill: c(k.solid), stroke: NONE, text: c(k.on) }, dot: { fill: c(k.on) } }
  if (style === 'Soft') return { root: { fill: c(k.soft), stroke: NONE, text: c(k.ink) }, dot: { fill: c(k.dot) } }
  return { root: { fill: NONE, stroke: c(k.line), text: c(k.ink) }, dot: { fill: c(k.dot) } }
}

const BADGE_GEOMETRY: Record<string, { root: SlotProps; dot: string }> = {
  SM: { root: { paddingX: 'spacing.2', paddingY: 'spacing.0_5', gap: 'spacing.1_5' }, dot: 'spacing.1_5' },
  MD: { root: { paddingX: 'spacing.2_5', paddingY: 'spacing.1', gap: 'spacing.1_5' }, dot: 'spacing.1_5' },
  LG: { root: { paddingX: 'spacing.3', paddingY: 'spacing.1', gap: 'spacing.2' }, dot: 'spacing.2' },
}

export const BADGE: ComponentRecipe = {
  key: 'Badge',
  slots: ['root', 'dot'],
  defaults: { Style: 'Soft', Color: 'Brand', Size: 'MD' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.pill', strokeWidth: 'stroke.control', font: 'type.caption' },
      dot: { radius: 'radius.pill' },
    })),
    part({ Size: ['MD', 'SM', 'LG'] as const }, (size) => ({
      root: BADGE_GEOMETRY[size].root,
      dot: { width: BADGE_GEOMETRY[size].dot, height: BADGE_GEOMETRY[size].dot },
    })),
    part({ Style: ['Solid', 'Soft', 'Outline'] as const, Color: ['Neutral', 'Brand', 'Success', 'Warning', 'Error', 'Info'] as const }, badgePaint),
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

const SPINNER_GEOMETRY: Record<string, { size: string; stroke: string }> = {
  SM: { size: 'spacing.4', stroke: 'spacing.0_5' },
  MD: { size: 'spacing.6', stroke: 'spacing.0_5' },
  LG: { size: 'spacing.8', stroke: 'spacing.1' },
}

export const SPINNER: ComponentRecipe = {
  key: 'Spinner',
  slots: ['root'],
  defaults: { Size: 'MD' },
  parts: [
    part({ Size: ['SM', 'MD', 'LG'] as const }, (size) => ({
      root: {
        width: SPINNER_GEOMETRY[size].size, height: SPINNER_GEOMETRY[size].size, radius: 'radius.pill',
        strokeWidth: SPINNER_GEOMETRY[size].stroke, stroke: c('action.secondary.default'), strokeTop: c('action.primary.default'),
      },
    })),
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

const AVATAR_GEOMETRY: Record<string, { size: string; font: string }> = {
  XS: { size: 'size.xs', font: 'type.caption' },
  SM: { size: 'size.sm', font: 'type.caption' },
  MD: { size: 'size.md', font: 'type.label' },
  LG: { size: 'size.lg', font: 'type.body-md' },
  XL: { size: 'size.xl', font: 'type.body-lg' },
}

export const AVATAR: ComponentRecipe = {
  key: 'Avatar',
  slots: ['root', 'image', 'fallback'],
  defaults: { Size: 'MD' },
  parts: [
    part({ Size: ['XS', 'SM', 'MD', 'LG', 'XL'] as const }, (size) => ({
      root: {
        width: AVATAR_GEOMETRY[size].size, height: AVATAR_GEOMETRY[size].size, radius: 'radius.pill',
        fill: c('surface.selected'), text: c('content.accent'), font: AVATAR_GEOMETRY[size].font,
      },
    })),
  ],
}
