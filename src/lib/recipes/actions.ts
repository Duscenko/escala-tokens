/**
 * Button & Actions recipes. See `componentRecipes.ts` for the rules: every value
 * is a token reference, a state with no role gets a role (never an opacity).
 *
 * `slot:hover` / `slot[attr]` keys give one PART its own state.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers'

// ── Button ─────────────────────────────────────────────────────────────────

/** Every token one intent of the Button needs. One shape, so no style can be
 *  missing a state for one intent and not another. */
interface IntentPalette {
  solid: string; solidHover: string; solidPressed: string; on: string
  soft: string; softPressed: string
  /** The faint wash an Outline button takes on hover / press. */
  wash: string; washPressed: string
  line: string; ink: string; ring: string
}
export const BUTTON_INTENTS: Record<string, IntentPalette> = {
  Brand: {
    solid: 'action.primary.default', solidHover: 'action.primary.hover', solidPressed: 'action.primary.pressed',
    on: 'content.on-action',
    soft: 'surface.selected', softPressed: 'surface.selected-pressed',
    wash: 'surface.selected', washPressed: 'surface.selected-pressed',
    line: 'border.accent', ink: 'content.accent', ring: 'border.ring.default',
  },
  // shadcn's secondary / outline / ghost are NEUTRAL: ink is the page's text,
  // the edge is the control boundary, fills are the neutral action ramp.
  Neutral: {
    solid: 'action.secondary.default', solidHover: 'action.secondary.hover', solidPressed: 'action.secondary.pressed',
    on: 'content.primary',
    soft: 'action.secondary.default', softPressed: 'action.secondary.pressed',
    wash: 'action.ghost.hover', washPressed: 'action.ghost.pressed',
    line: 'border.strong', ink: 'content.primary', ring: 'border.ring.default',
  },
  Danger: {
    solid: 'status.critical.surface-solid', solidHover: 'status.critical.surface-solid-hover',
    solidPressed: 'status.critical.surface-solid-pressed', on: 'status.critical.on-solid',
    soft: 'status.critical.surface', softPressed: 'status.critical.surface-pressed',
    wash: 'status.critical.surface', washPressed: 'status.critical.surface-pressed',
    line: 'status.critical.border-strong', ink: 'status.critical.content', ring: 'status.critical.border',
  },
  Success: {
    solid: 'status.success.surface-solid', solidHover: 'status.success.surface-solid-hover',
    solidPressed: 'status.success.surface-solid-pressed', on: 'status.success.on-solid',
    soft: 'status.success.surface', softPressed: 'status.success.surface-pressed',
    wash: 'status.success.surface', washPressed: 'status.success.surface-pressed',
    line: 'status.success.border-strong', ink: 'status.success.content', ring: 'status.success.border',
  },
}

const BUTTON_COLORS = ['Brand', 'Neutral', 'Danger', 'Success'] as const
const BUTTON_STYLES = ['Solid', 'Outline', 'Soft', 'Ghost'] as const
const BUTTON_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] as const
const BUTTON_SIZES = ['MD', 'SM', 'LG', 'XL'] as const

function buttonPaint(color: string, style: string, state: string): SlotMap {
  const k = BUTTON_INTENTS[color]
  if (state === 'Disabled') {
    return {
      root: {
        fill: style === 'Solid' || style === 'Soft' ? c('action.disabled.default') : NONE,
        stroke: style === 'Outline' ? c('action.disabled.default') : NONE,
        text: c('content.disabled'),
      },
    }
  }
  const hover = state === 'Hover'
  const pressed = state === 'Pressed'
  const ring = state === 'Focused' ? c(k.ring) : NONE
  if (style === 'Solid') {
    return { root: { fill: c(pressed ? k.solidPressed : hover ? k.solidHover : k.solid), stroke: NONE, ring, text: c(k.on) } }
  }
  if (style === 'Soft') {
    // Two tones only: a soft fill has no third step that is not the border.
    return { root: { fill: c(hover || pressed ? k.softPressed : k.soft), stroke: NONE, ring, text: c(k.ink) } }
  }
  if (style === 'Outline') {
    return { root: { fill: pressed ? c(k.washPressed) : hover ? c(k.wash) : NONE, stroke: c(k.line), ring, text: c(k.ink) } }
  }
  // Ghost — the neutral wash both renderers already used.
  return {
    root: { fill: pressed ? c('action.ghost.pressed') : hover ? c('action.ghost.hover') : NONE, stroke: NONE, ring, text: c(k.ink) },
  }
}

/** Heights bind the SIZE ROLES the plugin already bound (compact · control ·
 *  touch); XL has no role at 56 (the only one is `fab`, another component's),
 *  so it reads the static `size.xl` step. Padding sits on spacing steps. */
const BUTTON_GEOMETRY: Record<string, SlotProps> = {
  SM: { height: 'size.compact', paddingX: 'spacing.3', gap: 'spacing.1_5' },
  MD: { height: 'size.control', paddingX: 'spacing.4', gap: 'spacing.gap-control' },
  LG: { height: 'size.touch', paddingX: 'spacing.5', gap: 'spacing.gap-control' },
  XL: { height: 'size.xl', paddingX: 'spacing.6', gap: 'spacing.2_5' },
}

// `text` sits on the ROOT: label and icons share it (`currentColor`), which is
// also what the plugin does — one ink fills the label and the icon slots.
export const BUTTON: ComponentRecipe = {
  key: 'Button',
  slots: ['root', 'label', 'icon'],
  defaults: { Color: 'Brand', Style: 'Solid', Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', font: 'type.button' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({ root: BUTTON_GEOMETRY[size] })),
    part({ Color: BUTTON_COLORS, Style: BUTTON_STYLES, State: BUTTON_STATES }, buttonPaint),
  ],
}

// ── ButtonGroup ────────────────────────────────────────────────────────────

const GROUP_GEOMETRY: Record<string, SlotProps> = {
  MD: { height: 'size.control', paddingX: 'spacing.4' },
  SM: { height: 'size.compact', paddingX: 'spacing.3' },
  LG: { height: 'size.touch', paddingX: 'spacing.5' },
}

export const BUTTON_GROUP: ComponentRecipe = {
  key: 'ButtonGroup',
  slots: ['root', 'item', 'itemSelected', 'separator'],
  defaults: { Size: 'MD' },
  parts: [
    part({}, () => ({
      root: { stroke: c('border.strong'), strokeWidth: 'stroke.control', radius: 'radius.action' },
      item: { text: c('content.primary'), font: 'type.label' },
      'item:hover': { fill: c('action.ghost.hover') },
      'item:active': { fill: c('action.ghost.pressed') },
      itemSelected: { fill: c('action.secondary.default'), text: c('content.primary'), font: 'type.label' },
      separator: { fill: c('border.strong') },
    })),
    part({ Size: ['MD', 'SM', 'LG'] as const }, (size) => ({
      item: GROUP_GEOMETRY[size],
      itemSelected: GROUP_GEOMETRY[size],
      separator: { width: 'stroke.control' },
    })),
  ],
}

// ── CloseButton ────────────────────────────────────────────────────────────

export const CLOSE_BUTTON: ComponentRecipe = {
  key: 'CloseButton',
  slots: ['root', 'icon'],
  defaults: { Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({ root: { radius: 'radius.action' } })),
    // 24 / 32 — `hit` is the 24px role; MD steps up one rung.
    part({ Size: ['MD', 'SM'] as const }, (size) => ({
      root: { height: size === 'SM' ? 'size.hit' : 'size.sm' },
    })),
    part({ State: ['Default', 'Hover', 'Focused'] as const }, (state) => ({
      root: {
        fill: state === 'Hover' ? c('action.ghost.hover') : NONE,
        text: c('content.secondary'),
        ring: state === 'Focused' ? c('border.ring.default') : NONE,
      },
    })),
  ],
}

// ── FABButton ──────────────────────────────────────────────────────────────

export const FAB_BUTTON: ComponentRecipe = {
  key: 'FABButton',
  slots: ['root', 'icon'],
  defaults: { Size: 'MD' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('action.primary.default'), text: c('content.on-action'),
        radius: 'radius.pill', shadow: 'shadow.lg',
      },
      'root:hover': { fill: c('action.primary.hover') },
      'root:active': { fill: c('action.primary.pressed') },
      'root:focus-visible': { ring: c('border.ring.default') },
    })),
    // 48 / 56 — `fab` is the 56px role; MD is one rung down.
    part({ Size: ['MD', 'LG'] as const }, (size) => ({
      root: { height: size === 'LG' ? 'size.fab' : 'size.lg' },
    })),
  ],
}

// ── SocialLoginButton ──────────────────────────────────────────────────────

const SOCIAL_GEOMETRY: Record<string, SlotProps> = {
  MD: { height: 'size.control', paddingX: 'spacing.4', gap: 'spacing.2_5' },
  LG: { height: 'size.touch', paddingX: 'spacing.5', gap: 'spacing.2_5' },
}

export const SOCIAL_LOGIN_BUTTON: ComponentRecipe = {
  key: 'SocialLoginButton',
  slots: ['root', 'label', 'icon'],
  defaults: { Provider: 'Google', Size: 'MD' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.strong'), strokeWidth: 'stroke.control',
        text: c('content.primary'), radius: 'radius.action', font: 'type.button',
      },
      'root:hover': { fill: c('action.ghost.hover') },
      'root:active': { fill: c('action.ghost.pressed') },
      'root:focus-visible': { ring: c('border.ring.default') },
    })),
    part({ Size: ['MD', 'LG'] as const }, (size) => ({ root: SOCIAL_GEOMETRY[size] })),
  ],
}

// ── TextLink ───────────────────────────────────────────────────────────────

export const TEXT_LINK: ComponentRecipe = {
  key: 'TextLink',
  slots: ['root'],
  defaults: { State: 'Default' },
  parts: [
    part({ State: ['Default', 'Hover', 'Disabled'] as const }, (state) => ({
      root: {
        text: c(state === 'Disabled' ? 'content.disabled' : state === 'Hover' ? 'content.link.hover' : 'content.link.default'),
      },
    })),
  ],
}

// ── AppStoreBadge ──────────────────────────────────────────────────────────
// The badge is the STORE's artwork (Apple and Google require a black badge with
// white type), so its ink and fill are not tokens — only its geometry is.

export const APP_STORE_BADGE: ComponentRecipe = {
  key: 'AppStoreBadge',
  slots: ['root', 'eyebrow', 'name'],
  defaults: { Store: 'App Store' },
  parts: [
    part({ Store: ['App Store', 'Google Play'] as const }, () => ({
      root: { radius: 'radius.action', paddingX: 'spacing.4', paddingY: 'spacing.2', gap: 'spacing.2_5' },
      eyebrow: { font: 'type.caption' },
      name: { font: 'type.button' },
    })),
  ],
}
