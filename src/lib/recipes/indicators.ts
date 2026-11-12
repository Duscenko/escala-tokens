/**
 * Indicator recipes: Badge, StatusBadge, Chip, Progress, Spinner, Icon, Rating,
 * FileFormat, Avatar. Rules as in `componentRecipes.ts`.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps, FOCUS } from './helpers.js'

// ── Badge ──────────────────────────────────────────────────────────────────
// The Figma set (design-plans/badge-contract.md, 383:176, 525 variants): Appearance soft · solid · outline · ghost
// × Shape rounded (Radius/control) · pill × Size xs · sm · default × Type default · icon · number · dot × Variant
// success · warning · info · inverse · default · secondary · critical. Tones are invariant of Size, Shape and
// Type. A dot exists only solid + pill; an icon / number badge is as tall as it is wide at least.

export const BADGE_APPEARANCES = ['soft', 'solid', 'outline', 'ghost'] as const
export const BADGE_SHAPES = ['rounded', 'pill'] as const
export const BADGE_SIZES = ['xs', 'sm', 'default'] as const
export const BADGE_TYPES = ['default', 'icon', 'number', 'dot'] as const
export const BADGE_VARIANTS = ['success', 'warning', 'info', 'inverse', 'default', 'secondary', 'critical'] as const

// height (xs 16 and sm 20 are literals; default is Size/control-xs 24) · side padding · label type · glyph px.
const BADGE_GEOMETRY: Record<string, { h: string; pad: string; font: string; icon: string; dot: string }> = {
  xs: { h: 'spacing.4', pad: 'spacing.gap-tight', font: 'type.caption', icon: 'spacing.2_5', dot: 'spacing.1_5' },
  sm: { h: 'spacing.5', pad: 'spacing.gap-control', font: 'type.label', icon: 'spacing.3', dot: 'spacing.2' },
  default: { h: 'size.xs', pad: 'spacing.inset-control', font: 'type.label', icon: 'spacing.3+spacing.0_5', dot: 'spacing.2_5' },
}

type Tone = { fill?: string; edge?: string; ink: string }
function badgeTone(variant: string, appearance: string): Tone {
  const status = ['success', 'warning', 'info', 'critical'].includes(variant)
  if (status) {
    if (appearance === 'soft') return { fill: `status.${variant}.surface`, ink: `status.${variant}.content` }
    if (appearance === 'solid') return { fill: `status.${variant}.surface-solid`, ink: `status.${variant}.on-solid` }
    if (appearance === 'outline') return { edge: `status.${variant}.border`, ink: `status.${variant}.content` }
    return { ink: `status.${variant}.content` }
  }
  switch (variant) {
    case 'secondary':
      return appearance === 'soft' ? { fill: 'action.secondary.default', ink: 'content.on-secondary' }
        : appearance === 'solid' ? { fill: 'surface.inverse', ink: 'content.inverse' }
        : appearance === 'outline' ? { edge: 'border.control', ink: 'content.primary' }
        : { ink: 'content.secondary' }
    case 'inverse':
      return appearance === 'soft' ? { fill: 'surface.inverse-muted', ink: 'content.inverse' }
        : appearance === 'solid' ? { fill: 'surface.page', ink: 'content.primary' }
        : appearance === 'outline' ? { edge: 'border.inverse', ink: 'content.inverse' }
        : { ink: 'content.inverse-secondary' }
    default:
      return appearance === 'soft' ? { fill: 'surface.accent', ink: 'content.accent' }
        : appearance === 'solid' ? { fill: 'action.primary.default', ink: 'content.on-action' }
        : appearance === 'outline' ? { edge: 'border.accent', ink: 'content.accent' }
        : { ink: 'content.accent' }
  }
}

function badgeLayout(size: string, type: string, shape: string, appearance: string): SlotMap {
  const g = BADGE_GEOMETRY[size]
  // A stroke the file lays out (outline widens the badge by two hairlines).
  const lay = appearance === 'outline' ? '+stroke.control' : ''
  const radius = shape === 'pill' ? 'radius.pill' : 'radius.control'
  if (type === 'dot') return { root: { width: g.dot, height: g.dot, radius: 'radius.pill', paddingX: 'spacing.none', paddingY: 'spacing.none' } }
  const root: SlotProps = { height: g.h, radius, paddingY: 'spacing.none', font: g.font }
  if (type === 'icon') return { root: { ...root, width: g.h, paddingX: 'spacing.none' }, icon: { width: g.icon, height: g.icon } }
  if (type === 'number') return { root: { ...root, minWidth: g.h, paddingX: `spacing.gap-tight${lay}` }, count: { font: g.font } }
  return {
    root: { ...root, paddingX: `${g.pad}${lay}`, gap: 'spacing.gap-tight' },
    iconLeading: { width: g.icon, height: g.icon },
    iconTrailing: { width: g.icon, height: g.icon },
    label: { font: g.font },
  }
}

export const BADGE: ComponentRecipe = {
  key: 'Badge',
  slots: ['root', 'iconLeading', 'label', 'iconTrailing', 'icon', 'count'],
  defaults: { Appearance: 'soft', Shape: 'rounded', Size: 'default', Type: 'default', Variant: 'default' },
  parts: [
    part({ Size: BADGE_SIZES, Type: BADGE_TYPES, Shape: BADGE_SHAPES, Appearance: BADGE_APPEARANCES }, badgeLayout),
    part({ Variant: BADGE_VARIANTS, Appearance: BADGE_APPEARANCES, Type: BADGE_TYPES }, (variant, appearance, type) => {
      const tone = badgeTone(variant, type === 'dot' ? 'solid' : appearance)
      const outline = appearance === 'outline' && type !== 'dot'
      return {
        root: {
          fill: tone.fill ? c(tone.fill) : NONE,
          stroke: outline && tone.edge ? c(tone.edge) : NONE,
          strokeWidth: outline && type !== 'dot' ? 'stroke.control' : 'stroke.none',
          text: c(tone.ink),
        },
      }
    }),
  ],
}

// ── StatusBadge ────────────────────────────────────────────────────────────

const PRESENCE_DOT: Record<string, string> = {
  online: 'status.success.surface-solid',
  away: 'status.warning.surface-solid',
  busy: 'status.critical.surface-solid',
  // The absence of a signal reads as muted ink.
  offline: 'content.subtle',
}

export const STATUS_BADGE: ComponentRecipe = {
  key: 'StatusBadge',
  slots: ['root', 'dot'],
  defaults: { Status: 'online' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', text: c('content.primary'),
        radius: 'radius.pill', font: 'type.caption', paddingX: 'spacing.2_5', paddingY: 'spacing.1', gap: 'spacing.2',
      },
      dot: { width: 'spacing.2', height: 'spacing.2', radius: 'radius.pill' },
    })),
    part({ Status: ['online', 'away', 'busy', 'offline'] as const }, (status) => ({ dot: { fill: c(PRESENCE_DOT[status]) } })),
  ],
}

// ── Chip ───────────────────────────────────────────────────────────────────

const CHIP_GEOMETRY: Record<string, SlotProps> = {
  default: { paddingX: 'spacing.3', paddingY: 'spacing.1', gap: 'spacing.1_5' },
  sm: { paddingX: 'spacing.2_5', paddingY: 'spacing.0_5', gap: 'spacing.1' },
}

export const CHIP: ComponentRecipe = {
  key: 'Chip',
  slots: ['root', 'remove'],
  defaults: { Selected: 'False', Dismissible: 'False', Size: 'default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.pill', strokeWidth: 'stroke.control', font: 'type.label' },
      'root:focus-visible': FOCUS,
      // The × is ~10px: its pointer target is the 24px hit area around it.
      remove: { hit: 'size.hit' },
      'remove:focus-visible': FOCUS,
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({ root: CHIP_GEOMETRY[size] })),
    part({ Selected: ['False', 'True'] as const }, (selected) => selected === 'True'
      ? {
          root: { fill: c('surface.selected'), stroke: c('border.accent'), text: c('content.accent') },
          'root:hover': { fill: c('surface.selected-pressed') },
        }
      : {
          root: { fill: NONE, stroke: c('border.control'), text: c('content.primary') },
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
      track: { fill: c('surface.muted'), height: 'spacing.1_5', radius: 'radius.pill' },
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

const ICON_ROLE: Record<string, string> = { sm: 'icon.small', default: 'icon.medium', lg: 'icon.large' }

export const ICON: ComponentRecipe = {
  key: 'Icon',
  slots: ['root'],
  defaults: { Size: 'default' },
  parts: [
    part({ Size: ['sm', 'default', 'lg'] as const }, (size) => ({
      root: { width: ICON_ROLE[size], height: ICON_ROLE[size], text: c('content.primary') },
    })),
  ],
}

// ── RatingGroup + RatingGroupItem ──────────────────────────────────────────
// The Figma `RatingGroup` (design-plans/rating-group-contract.md, 1122:316, 6 variants: Size default ·
// sm · lg × Type star · emoji) and its `RatingGroupItem` (1122:195, 60 variants: Size × Type × Checked
// × State Default · Hover · Pressed · Focused · Disabled). A row of 5 items in a `Content` slot, 4 apart
// (stars) or 8 (emoji). An item is a Radius/action square (32 · 24 · 40) with a 20 · 16 · 24 glyph:
// Content/secondary at rest, a ghost wash and Content/primary on hover / press; a checked star is
// Content/accent, a checked emoji sits on Surface/selected in Content/accent; Disabled Content/disabled.
export const RATING_GROUP_SIZES = ['default', 'sm', 'lg'] as const
export const RATING_GROUP_TYPES = ['star', 'emoji'] as const
export const RATING_GROUP_ITEM_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
const RATING_ITEM: Record<string, { box: string; icon: string }> = {
  default: { box: 'size.compact', icon: 'icon.medium' },
  sm: { box: 'size.hit', icon: 'icon.small' },
  lg: { box: 'size.control', icon: 'icon.large' },
}

function ratingItemPaint(type: string, checked: string, state: string): SlotMap {
  const on = checked === 'true'
  const emoji = type === 'emoji'
  if (state === 'Disabled') return { root: { fill: on && emoji ? c('surface.selected') : NONE, text: c('content.disabled') } }
  const hoverFill = state === 'Hover' ? c('action.ghost.hover') : state === 'Pressed' ? c('action.ghost.pressed') : NONE
  const focus = state === 'Focused' ? { focus: c('border.focus'), ring: c('border.ring.default') } : {}
  if (on && emoji) {
    return { root: { fill: c(state === 'Pressed' ? 'surface.selected-pressed' : 'surface.selected'), text: c('content.accent'), ...focus } }
  }
  const ink = on ? 'content.accent' : state === 'Hover' || state === 'Pressed' ? 'content.primary' : 'content.secondary'
  return { root: { fill: hoverFill, text: c(ink), ...focus } }
}

export const RATING_GROUP: ComponentRecipe = {
  key: 'RatingGroup',
  slots: ['root', 'content'],
  defaults: { Size: 'default', Type: 'star' },
  parts: [
    part({ Type: RATING_GROUP_TYPES }, (type) => ({ content: { gap: type === 'star' ? 'spacing.gap-tight' : 'spacing.gap-control' } })),
  ],
}

export const RATING_GROUP_ITEM: ComponentRecipe = {
  key: 'RatingGroupItem',
  slots: ['root', 'icon'],
  defaults: { Size: 'default', Type: 'star', Checked: 'false', State: 'Default' },
  parts: [
    part({}, () => ({ root: { radius: 'radius.action' } })),
    part({ Size: RATING_GROUP_SIZES }, (size) => ({
      root: { width: RATING_ITEM[size].box, height: RATING_ITEM[size].box },
      icon: { width: RATING_ITEM[size].icon, height: RATING_ITEM[size].icon },
    })),
    part({ Type: RATING_GROUP_TYPES, Checked: ['false', 'true'] as const, State: RATING_GROUP_ITEM_STATES }, ratingItemPaint),
  ],
}

// ── FileFormat ─────────────────────────────────────────────────────────────

const FORMAT_TONE: Record<string, { fill: string; on: string }> = {
  pdf: { fill: 'status.critical.surface-solid', on: 'status.critical.on-solid' },
  png: { fill: 'status.info.surface-solid', on: 'status.info.on-solid' },
  svg: { fill: 'action.primary.default', on: 'content.on-action' },
  zip: { fill: 'status.warning.surface-solid', on: 'status.warning.on-solid' },
}

export const FILE_FORMAT: ComponentRecipe = {
  key: 'FileFormat',
  slots: ['root', 'page', 'plate'],
  defaults: { Format: 'pdf' },
  parts: [
    part({}, () => ({
      root: { width: 'size.control', height: 'size.lg' },
      page: { text: c('border.strong'), paint: c('surface.layer-1') },
      plate: { radius: 'radius.control', font: 'type.caption', paddingX: 'spacing.1_5', paddingY: 'spacing.0_5' },
    })),
    part({ Format: ['pdf', 'png', 'svg', 'zip'] as const }, (format) => ({
      plate: { fill: c(FORMAT_TONE[format].fill), text: c(FORMAT_TONE[format].on) },
    })),
  ],
}

// ── Avatar · AvatarStatus · AvatarGroup ────────────────────────────────────
// The Figma sets of the same names (design-plans/avatar-contract.md, 378:2094 · 377:54 · 378:2507).
// Avatar: Type image · initials · icon × Size 2xs … 2xl × Shape circle · rounded × Variant × Appearance
// soft · solid (350 variants; an image avatar only exists as secondary · soft). The root is a square
// (16 · 24 · 32 · 40 · 48 · 56 · 64) on Radius/full or Radius/control with a 1px Border/subtle edge laid
// OVER the content (0.5px on 2xs · xs), an optional 2px Border/accent ring 4px outside it and an
// AvatarStatus dot on the bottom-right corner. The initials text styles (Type/avatar-*) are unbound in
// the file: literal px, Medium, line height 100%.

export const AVATAR_TYPES = ['image', 'initials', 'icon'] as const
export const AVATAR_SIZES = ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl'] as const
export const AVATAR_SHAPES = ['circle', 'rounded'] as const
export const AVATAR_VARIANTS = ['secondary', 'default', 'info', 'success', 'warning', 'critical'] as const
export const AVATAR_APPEARANCES = ['soft', 'solid'] as const
export const AVATAR_STATUSES = ['online', 'busy', 'away', 'offline', 'do-not-disturb'] as const
export const AVATAR_STATUS_SIZES = ['xs', 'sm', 'default', 'lg'] as const

// box: the file binds Size/control-xs … xl (24 · 32 · 40 · 48 · 56); 2xs (16) and 2xl (64) are literals
// that sit on a step. icon: the glyph px (10 · 14 · 18 · 20 · 24 · 28 · 32), initials: Type/avatar-* px.
const AVATAR_GEOMETRY: Record<string, { box: string; icon: string; text: string; hairline?: string }> = {
  '2xs': { box: 'spacing.4', icon: 'spacing.2_5', text: '8', hairline: '0.5' },
  xs: { box: 'size.xs', icon: 'spacing.3+spacing.0_5', text: '10', hairline: '0.5' },
  sm: { box: 'size.sm', icon: 'spacing.4+spacing.0_5', text: '12' },
  default: { box: 'size.md', icon: 'icon.medium', text: '14' },
  lg: { box: 'size.lg', icon: 'icon.large', text: '16' },
  xl: { box: 'size.xl', icon: 'spacing.6+spacing.1', text: '18' },
  '2xl': { box: 'size.2xl', icon: 'spacing.8', text: '20' },
}
const AVATAR_TONE: Record<string, { soft: [string, string]; solid: [string, string] }> = {
  secondary: { soft: ['surface.muted', 'content.secondary'], solid: ['surface.inverse', 'content.inverse'] },
  default: { soft: ['surface.accent', 'content.accent'], solid: ['action.primary.default', 'content.on-action'] },
  info: { soft: ['status.info.surface', 'status.info.content'], solid: ['status.info.surface-solid', 'status.info.on-solid'] },
  success: { soft: ['status.success.surface', 'status.success.content'], solid: ['status.success.surface-solid', 'status.success.on-solid'] },
  warning: { soft: ['status.warning.surface', 'status.warning.content'], solid: ['status.warning.surface-solid', 'status.warning.on-solid'] },
  critical: { soft: ['status.critical.surface', 'status.critical.content'], solid: ['status.critical.surface-solid', 'status.critical.on-solid'] },
}

export const AVATAR: ComponentRecipe = {
  key: 'Avatar',
  slots: ['root', 'image', 'initials', 'icon', 'stroke', 'ring'],
  defaults: { Type: 'image', Size: 'default', Shape: 'circle', Variant: 'secondary', Appearance: 'soft' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.muted') },
      stroke: { stroke: c('border.subtle') },
      ring: { stroke: c('border.accent'), strokeWidth: 'stroke.md' },
    })),
    part({ Shape: AVATAR_SHAPES }, (shape) => {
      const radius = shape === 'circle' ? 'radius.pill' : 'radius.control'
      return { root: { radius }, image: { radius }, stroke: { radius }, ring: { radius } }
    }),
    part({ Size: AVATAR_SIZES }, (size) => {
      const g = AVATAR_GEOMETRY[size]
      const stroke: SlotProps = g.hairline ? { hairline: g.hairline } : { strokeWidth: 'stroke.control' }
      return {
        root: { width: g.box, height: g.box },
        image: { width: g.box, height: g.box },
        initials: size === 'sm' ? { font: 'type.label' } : { fontLiteral: g.text },
        icon: { width: g.icon, height: g.icon },
        stroke,
      }
    }),
    part({ Variant: AVATAR_VARIANTS, Appearance: AVATAR_APPEARANCES }, (variant, appearance) => {
      const [fill, ink] = AVATAR_TONE[variant][appearance as 'soft' | 'solid']
      return { root: { fill: c(fill) }, initials: { text: c(ink) }, icon: { text: c(ink) } }
    }),
  ],
}

const STATUS_FILL: Record<string, string> = {
  online: 'status.success.surface-solid',
  busy: 'status.critical.surface-solid',
  away: 'status.warning.surface-solid',
  offline: 'content.subtle',
  'do-not-disturb': 'status.critical.surface-solid',
}
// size · its outside stroke (1px on xs / sm, 2px on default / lg) · the do-not-disturb bar's height.
const STATUS_GEOMETRY: Record<string, { box: string; edge: string; bar: string }> = {
  xs: { box: 'spacing.1_5', edge: 'stroke.sm', bar: 'stroke.sm' },
  sm: { box: 'spacing.2', edge: 'stroke.sm', bar: 'stroke.sm' },
  default: { box: 'spacing.2_5', edge: 'stroke.md', bar: 'stroke.md' },
  lg: { box: 'spacing.3', edge: 'stroke.md', bar: 'stroke.md' },
}

export const AVATAR_STATUS: ComponentRecipe = {
  key: 'AvatarStatus',
  slots: ['root', 'bar'],
  defaults: { Status: 'online', Size: 'default' },
  parts: [
    part({}, () => ({ root: { radius: 'radius.pill' }, bar: { fill: c('status.critical.on-solid') } })),
    part({ Status: AVATAR_STATUSES }, (status) => ({ root: { fill: c(STATUS_FILL[status]) } })),
    part({ Size: AVATAR_STATUS_SIZES }, (size) => ({
      // The outside edge (colour + width) lives in ONE part: `outerStroke` reads its width.
      root: { width: STATUS_GEOMETRY[size].box, height: STATUS_GEOMETRY[size].box, outerStroke: c('surface.page'), outerStrokeWidth: STATUS_GEOMETRY[size].edge },
      bar: { height: STATUS_GEOMETRY[size].bar },
    })),
  ],
}

// AvatarGroup: a row of avatars (each in a Surface/page ring 1 · 2 · 3px wide: stroke.sm, spacing.0_5, both) overlapping, then a +N
// tile on Surface/inverse. The overlap is Spacing/overlap-sm (-4) on 2xs and overlap-md (-8) on sm /
// default; xs (-6), lg · xl (-12) and 2xl (-16) are hand-set in the file (the component sets them
// from the spacing steps).
const GROUP_GEOMETRY: Record<string, { pad: string; box: string; overlap?: string; count: SlotProps }> = {
  '2xs': { pad: 'stroke.sm', box: 'spacing.4', overlap: 'spacing.overlap-sm', count: { fontLiteral: '8' } },
  xs: { pad: 'stroke.sm', box: 'size.xs', count: { fontLiteral: '10' } },
  sm: { pad: 'spacing.0_5', box: 'size.sm', overlap: 'spacing.overlap-md', count: { font: 'type.label' } },
  default: { pad: 'spacing.0_5', box: 'size.md', overlap: 'spacing.overlap-md', count: { fontLiteral: '14' } },
  lg: { pad: 'spacing.0_5', box: 'size.lg', count: { fontLiteral: '16' } },
  xl: { pad: 'spacing.0_5', box: 'size.xl', count: { fontLiteral: '18' } },
  '2xl': { pad: 'spacing.0_5+stroke.sm', box: 'size.2xl', count: { fontLiteral: '20' } },
}

export const AVATAR_GROUP: ComponentRecipe = {
  key: 'AvatarGroup',
  slots: ['root', 'item', 'action', 'count'],
  defaults: { Size: 'default', Shape: 'circle' },
  parts: [
    part({}, () => ({
      item: { fill: c('surface.page') },
      action: { fill: c('surface.inverse') },
      count: { text: c('content.inverse') },
    })),
    part({ Size: AVATAR_SIZES }, (size) => {
      const g = GROUP_GEOMETRY[size]
      return {
        root: g.overlap ? { overlap: g.overlap } : {},
        item: { paddingX: g.pad, paddingY: g.pad },
        action: { width: g.box, height: g.box },
        count: g.count,
      }
    }),
    part({ Shape: AVATAR_SHAPES }, (shape) => {
      const radius = shape === 'circle' ? 'radius.pill' : 'radius.control'
      return { item: { radius }, action: { radius } }
    }),
  ],
}

// ── FeaturedIcon ───────────────────────────────────────────────────────────
// The Figma set (design-plans/featured-icon-contract.md, 1119:10857, 96 variants): Size sm · default · lg ·
// xl (32 · 40 · 48 · 56) × Variant × Appearance soft · solid × Shape circle (Radius/full) · rounded
// (Radius/action), a glyph centred in it: 20 on sm, 24 from default up. Same tones as an Avatar.
export const FEATURED_ICON_SIZES = ['default', 'sm', 'lg', 'xl'] as const
export const FEATURED_ICON_VARIANTS = ['default', 'secondary', 'critical', 'success', 'warning', 'info'] as const
const FEATURED_ICON_GEOMETRY: Record<string, { box: string; icon: string }> = {
  sm: { box: 'size.sm', icon: 'icon.medium' },
  default: { box: 'size.md', icon: 'icon.large' },
  lg: { box: 'size.lg', icon: 'icon.large' },
  xl: { box: 'size.xl', icon: 'icon.large' },
}

export const FEATURED_ICON: ComponentRecipe = {
  key: 'FeaturedIcon',
  slots: ['root', 'icon'],
  defaults: { Size: 'default', Variant: 'default', Appearance: 'soft', Shape: 'circle' },
  parts: [
    part({ Size: FEATURED_ICON_SIZES }, (size) => ({
      root: { width: FEATURED_ICON_GEOMETRY[size].box, height: FEATURED_ICON_GEOMETRY[size].box },
      icon: { width: FEATURED_ICON_GEOMETRY[size].icon, height: FEATURED_ICON_GEOMETRY[size].icon },
    })),
    part({ Shape: AVATAR_SHAPES }, (shape) => ({ root: { radius: shape === 'circle' ? 'radius.pill' : 'radius.action' } })),
    part({ Variant: FEATURED_ICON_VARIANTS, Appearance: AVATAR_APPEARANCES }, (variant, appearance) => {
      const [fill, ink] = AVATAR_TONE[variant][appearance as 'soft' | 'solid']
      return { root: { fill: c(fill), text: c(ink) } }
    }),
  ],
}

// ── Kbd ────────────────────────────────────────────────────────────────────
// The Figma set (design-plans/kbd-contract.md, 1091:6, 3 variants: Size xs · sm · default): a key cap on
// Surface/muted with a 1px Border/subtle edge and Content/secondary ink, a Radius/control box exactly as tall as
// the icon of the control it sits in (16 · 20 · 24, also its minimum width), 4px sides on xs / sm and 8px on default;
// the label is Type/caption (xs, sm) or Type/label (default). KbdGroup only spaces several keys.

export const KBD_SIZES = ['xs', 'sm', 'default'] as const
const KBD_GEOMETRY: Record<string, { box: string; pad: string; font: string }> = {
  xs: { box: 'icon.small', pad: 'spacing.gap-tight', font: 'type.caption' },
  sm: { box: 'icon.medium', pad: 'spacing.gap-tight', font: 'type.caption' },
  default: { box: 'icon.large', pad: 'spacing.gap-control', font: 'type.label' },
}

export const KBD: ComponentRecipe = {
  key: 'Kbd',
  slots: ['root'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.muted'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', text: c('content.secondary'),
        radius: 'radius.control', gap: 'spacing.gap-tight',
      },
    })),
    part({ Size: KBD_SIZES }, (size) => ({
      root: { height: KBD_GEOMETRY[size].box, minWidth: KBD_GEOMETRY[size].box, paddingX: KBD_GEOMETRY[size].pad, font: KBD_GEOMETRY[size].font },
    })),
  ],
}
