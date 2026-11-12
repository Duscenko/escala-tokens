/**
 * Button & Actions recipes. See `componentRecipes.ts` for the rules: every value
 * is a token reference, a state with no role gets a role (never an opacity).
 *
 * `slot:hover` / `slot[attr]` keys give one PART its own state.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps, FOCUS } from './helpers.js'

// ── Button · IconButton ────────────────────────────────────────────────────
// The Figma file is the source (design-plans/button-contract.md): `Variant` is the
// intent (default = brand, secondary = neutral, critical = destructive), `Appearance`
// the style (solid · outline · ghost · link), all 12 combinations. Each paint below
// is the variable the Figma variant binds, state by state. Disabled is a role
// (action.disabled / content.disabled), never an opacity.
//
// Focus: `focus` is the edge the Figma variant strokes in its Focused state, `ring`
// the halo outside it — exactly as each set has them (`focusPair`).

export const BUTTON_VARIANTS = ['default', 'secondary', 'critical'] as const
export const BUTTON_APPEARANCES = ['solid', 'outline', 'ghost', 'link'] as const
export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const
const BUTTON_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] as const

/** The solid fill ladder per intent: rest · hover · pressed, and its ink. */
const SOLID: Record<string, { fill: [string, string, string]; ink: string }> = {
  default: { fill: ['action.primary.default', 'action.primary.hover', 'action.primary.pressed'], ink: 'content.on-action' },
  secondary: { fill: ['action.secondary.default', 'action.secondary.hover', 'action.secondary.pressed'], ink: 'content.on-secondary' },
  critical: { fill: ['status.critical.surface-solid', 'status.critical.surface-solid-hover', 'status.critical.surface-solid-pressed'], ink: 'status.critical.on-solid' },
}

/** The focus edge and ring, read per set from the Figma file (2026-11-12):
 *  Button focuses every combination on Border/focus + Border/ring/default;
 *  IconButton keeps its own on two solid fills. Figma is the rule here. */
function focusPair(variant: string, appearance: string, iconOnly: boolean): [string, string] {
  if (iconOnly && appearance === 'solid') {
    if (variant === 'secondary') return ['border.strong', 'border.subtle']
    if (variant === 'critical') return ['status.critical.border-strong', 'status.critical.border']
  }
  return ['border.focus', 'border.ring.default']
}
/** Outline / ghost: the intent's ink and the outline's edge. */
const QUIET: Record<string, { ink: string; edge: string }> = {
  default: { ink: 'content.accent', edge: 'border.accent' },
  secondary: { ink: 'content.primary', edge: 'border.control' },
  critical: { ink: 'status.critical.content', edge: 'status.critical.border-strong' },
}
/** Link: rest ink, hover / pressed ink. */
const LINK: Record<string, [string, string]> = {
  default: ['content.link.default', 'content.link.hover'],
  secondary: ['content.secondary', 'content.primary'],
  critical: ['status.critical.content', 'status.critical.content'],
}

/** Only `outline` has a stroke in the Figma file; solid, ghost and link have
 *  none (a transparent CSS border would push the top highlight 1px down).
 *  Focused draws its 2px edge as an inset on top, so nothing shifts. */
const strokeOf = (appearance: string) => (appearance === 'outline' ? 'stroke.control' : 'stroke.none')

function buttonPaint(variant: string, appearance: string, state: string, iconOnly = false): SlotMap {
  const [focusEdge, focusRing] = focusPair(variant, appearance, iconOnly)
  const ring = state === 'Focused' ? c(focusRing) : NONE
  if (state === 'Disabled') {
    return {
      root: {
        fill: appearance === 'solid' ? c('action.disabled.default') : NONE,
        stroke: appearance === 'outline' ? c('border.control') : NONE,
        text: c('content.disabled'),
        focus: NONE,
        ring: NONE,
        highlight: NONE,
        strokeWidth: strokeOf(appearance),
      },
    }
  }
  const step = state === 'Pressed' ? 2 : state === 'Hover' ? 1 : 0
  const focused = state === 'Focused'
  if (appearance === 'solid') {
    const k = SOLID[variant]
    // Every solid state but Disabled carries Figma's top highlight. (Its
    // DROP_SHADOW 0 0 0 spread 1 paints nothing: Figma applies spread only to
    // a frame that clips content — measured on the file's own render.)
    return { root: { fill: c(k.fill[step]), stroke: NONE, text: c(k.ink), focus: focused ? c(focusEdge) : NONE, ring, highlight: c('elevation.highlight'), strokeWidth: strokeOf(appearance) } }
  }
  if (appearance === 'link') {
    const [rest, over] = LINK[variant]
    return { root: { fill: NONE, stroke: NONE, text: c(step ? over : rest), focus: focused ? c(focusEdge) : NONE, ring, highlight: NONE, strokeWidth: strokeOf(appearance) } }
  }
  const k = QUIET[variant]
  const wash = step === 2 ? c('action.ghost.pressed') : step === 1 ? c('action.ghost.hover') : NONE
  return {
    root: {
      fill: wash,
      stroke: appearance === 'outline' ? c(k.edge) : NONE,
      text: c(k.ink),
      focus: focused ? c(focusEdge) : NONE,
      ring,
      highlight: NONE,
      strokeWidth: strokeOf(appearance),
    },
  }
}

/** Figma's geometry: one inset at every size, the height from the Size roles
 *  (hit 24 · compact 32 · control 40 · touch 48), the gap tight at xs. */
const BUTTON_HEIGHT: Record<string, string> = { xs: 'size.hit', sm: 'size.compact', default: 'size.control', lg: 'size.touch' }
const BUTTON_GAP: Record<string, string> = { xs: 'spacing.gap-tight', sm: 'spacing.gap-control', default: 'spacing.gap-control', lg: 'spacing.gap-control' }

// `text` sits on the ROOT: label and icons share it (`currentColor`), which is
// also what the plugin does — one ink fills the label and the icon slots.
export const BUTTON: ComponentRecipe = {
  key: 'Button',
  slots: ['root', 'label', 'icon'],
  defaults: { Variant: 'default', Appearance: 'solid', Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', font: 'type.button' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({
      root: { height: BUTTON_HEIGHT[size], paddingX: 'spacing.inset-control', gap: BUTTON_GAP[size] },
    })),
    part({ Variant: BUTTON_VARIANTS, Appearance: BUTTON_APPEARANCES, State: BUTTON_STATES }, (v, a, s) => buttonPaint(v, a, s)),
  ],
}

/** The icon-only button: a square at the Button heights, no inset, one icon slot. */
export const ICON_BUTTON: ComponentRecipe = {
  key: 'IconButton',
  slots: ['root', 'icon', 'badge'],
  defaults: { Variant: 'default', Appearance: 'solid', Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({
      root: { height: BUTTON_HEIGHT[size], width: BUTTON_HEIGHT[size], paddingX: 'spacing.0' },
    })),
    part({ Variant: BUTTON_VARIANTS, Appearance: BUTTON_APPEARANCES, State: BUTTON_STATES }, (v, a, s) => buttonPaint(v, a, s, true)),
  ],
}

// ── CloseButton ────────────────────────────────────────────────────────────
// The Figma `CloseButton` set (design-plans/close-button-contract.md): a dismiss
// control, one fixed glyph, Appearance × Shape × Size × State × Variant. Its own
// grammar, not Button's: `soft` is the default, `Shape` rounds the corner, `Variant`
// is `default` or `inverse` (for a dark chip), there is no Loading, and no solid
// highlight. Hover and Pressed are the same translucent fill STACKED over the
// rest fill (`overlay`, `overlay2`), as the file draws them — not a role of their
// own. Colour is the same at every Shape and Size (measured on all 600 variants).

/** The options in the order the Figma file lists them. */
export const CLOSE_BUTTON_APPEARANCES = ['solid', 'outline', 'soft', 'ghost'] as const
export const CLOSE_BUTTON_SHAPES = ['rounded', 'pill', 'square'] as const
export const CLOSE_BUTTON_SIZES = ['sm', 'lg', 'xl', 'xs', 'default'] as const
export const CLOSE_BUTTON_VARIANTS = ['default', 'inverse'] as const
const CLOSE_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const

/** What one Variant · Appearance paints, state by state: [rest, hover, pressed]. */
interface ClosePaint {
  ink: [string, string, string]
  /** The fill under everything, per state (`none` = transparent). */
  fill: [string, string, string]
  /** Translucent fills laid over `fill`, per state (at most two). */
  over: [string[], string[], string[]]
  /** An outline's resting edge (1px). */
  edge?: string
  /** The 2px edge Focused draws INSIDE the control (outline and ghost only). */
  focusEdge?: string
  /** The 2px halo Focused draws OUTSIDE. */
  halo: string
}
const same3 = <T,>(v: T): [T, T, T] => [v, v, v]
const NO_OVER: [string[], string[], string[]] = [[], [], []]
const MUTED = 'color.surface.inverse-muted'

const CLOSE: Record<string, Record<string, ClosePaint>> = {
  default: {
    soft: {
      ink: same3(c('content.on-secondary')), fill: [c('action.secondary.default'), c('action.secondary.hover'), c('action.secondary.pressed')],
      over: NO_OVER, halo: c('border.subtle'),
    },
    solid: {
      ink: same3(c('content.inverse')), fill: same3(c('surface.inverse')),
      over: [[], [MUTED], [MUTED, MUTED]], halo: c('border.subtle'),
    },
    outline: {
      ink: same3(c('content.primary')), fill: [NONE, c('action.ghost.hover'), c('action.ghost.pressed')],
      over: NO_OVER, edge: c('border.control'), focusEdge: c('border.strong'), halo: c('border.subtle'),
    },
    ghost: {
      ink: [c('content.secondary'), c('content.primary'), c('content.primary')], fill: [NONE, c('action.ghost.hover'), c('action.ghost.pressed')],
      over: NO_OVER, focusEdge: c('border.strong'), halo: c('border.subtle'),
    },
  },
  inverse: {
    soft: {
      ink: same3(c('content.inverse')), fill: same3(MUTED),
      over: [[], [MUTED], [MUTED, MUTED]], halo: MUTED,
    },
    solid: {
      ink: same3(c('content.primary')), fill: same3(c('surface.page')),
      over: [[], [c('action.ghost.hover')], [c('action.ghost.pressed')]], halo: MUTED,
    },
    outline: {
      ink: same3(c('content.inverse')), fill: [NONE, MUTED, MUTED],
      over: [[], [], [MUTED]], edge: c('border.inverse'), focusEdge: c('border.inverse'), halo: MUTED,
    },
    ghost: {
      ink: [c('content.inverse-secondary'), c('content.inverse'), c('content.inverse')], fill: [NONE, MUTED, MUTED],
      over: [[], [], [MUTED]], focusEdge: c('border.inverse'), halo: MUTED,
    },
  },
}

function closePaint(variant: string, appearance: string, state: string): SlotMap {
  const k = CLOSE[variant][appearance]
  const strokeWidth = appearance === 'outline' ? 'stroke.control' : 'stroke.none'
  if (state === 'Disabled') {
    return {
      root: {
        fill: appearance === 'solid' || appearance === 'soft' ? c('action.disabled.default') : NONE,
        stroke: appearance === 'outline' ? c('border.control') : NONE,
        text: c('content.disabled'),
        strokeWidth,
      },
    }
  }
  const step = state === 'Pressed' ? 2 : state === 'Hover' ? 1 : 0
  const focused = state === 'Focused'
  const rest = focused ? 0 : step
  const root: SlotProps = { fill: k.fill[rest], text: k.ink[rest], strokeWidth }
  const over = k.over[rest]
  if (over[0]) root.overlay = over[0]
  if (over[1]) root.overlay2 = over[1]
  if (appearance === 'outline') root.stroke = k.edge!
  if (focused) {
    // outline · ghost: a 2px edge inside + the halo; soft · solid: the halo alone.
    if (k.focusEdge) { root.focus = k.focusEdge; root.ring = k.halo } else root.halo = k.halo
  }
  return { root }
}

const CLOSE_SIZE: Record<string, { box: string; icon: string }> = {
  xs: { box: 'size.hit', icon: 'icon.small' },
  sm: { box: 'size.compact', icon: 'icon.small' },
  default: { box: 'size.control', icon: 'icon.medium' },
  lg: { box: 'size.touch', icon: 'icon.large' },
  xl: { box: 'size.fab', icon: 'icon.large' },
}
const CLOSE_RADIUS: Record<string, string> = { rounded: 'radius.action', pill: 'radius.pill', square: 'radius.none' }

export const CLOSE_BUTTON: ComponentRecipe = {
  key: 'CloseButton',
  slots: ['root', 'icon'],
  defaults: { Appearance: 'soft', Shape: 'pill', Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({ Shape: CLOSE_BUTTON_SHAPES }, (shape) => ({ root: { radius: CLOSE_RADIUS[shape] } })),
    part({ Size: CLOSE_BUTTON_SIZES }, (size) => ({
      root: { height: CLOSE_SIZE[size].box, width: CLOSE_SIZE[size].box, paddingX: 'spacing.0' },
      icon: { width: CLOSE_SIZE[size].icon, height: CLOSE_SIZE[size].icon },
    })),
    part({ Variant: CLOSE_BUTTON_VARIANTS, Appearance: CLOSE_BUTTON_APPEARANCES, State: CLOSE_STATES }, (v, a, s) => closePaint(v, a, s)),
  ],
}

// ── TextLink ───────────────────────────────────────────────────────────────
// The Figma `TextLink` set (design-plans/text-link-contract.md): an inline link,
// Size × State × Variant, optional icons either side and an underline that is a
// 1px bar on the label's bottom edge. Text, underline and icons share one ink.
// Colour is the same at every Size (measured on all 144 variants). Hover and
// Pressed always draw the underline; elsewhere `UnderlineVisible` decides.

export const TEXT_LINK_VARIANTS = ['inverse', 'success', 'info', 'default', 'secondary', 'critical'] as const
export const TEXT_LINK_SIZES = ['xs', 'sm', 'default', 'lg'] as const
const TEXT_LINK_STATES = ['Default', 'Hover', 'Pressed', 'Visited', 'Focused', 'Disabled'] as const

/** Ink at [rest · hover and pressed]; Visited and Focused read the rest ink (the
 *  file paints Visited as Default). */
const LINK_INK: Record<string, [string, string]> = {
  default: [c('content.link.default'), c('content.link.hover')],
  secondary: [c('content.secondary'), c('content.primary')],
  inverse: [c('content.inverse'), c('content.inverse')],
  critical: [c('status.critical.content'), c('status.critical.content')],
  success: [c('status.success.content'), c('status.success.content')],
  info: [c('status.info.content'), c('status.info.content')],
}
/** The 2px edge inside and the 2px halo outside a focused link. */
const LINK_FOCUS: Record<string, [string, string]> = {
  default: [c('border.focus'), c('border.ring.default')],
  secondary: [c('border.strong'), c('border.subtle')],
  inverse: [c('border.inverse'), c('surface.inverse-muted')],
  critical: [c('status.critical.border-strong'), c('status.critical.border')],
  success: [c('status.success.border-strong'), c('status.success.border')],
  info: [c('status.info.border-strong'), c('status.info.border')],
}

function textLinkPaint(variant: string, state: string): SlotMap {
  if (state === 'Disabled') return { root: { text: c('content.disabled') } }
  const [rest, over] = LINK_INK[variant]
  // The underline is drawn at 40% (node opacity) until Hover and Pressed.
  if (state === 'Hover' || state === 'Pressed') return { root: { text: over }, underline: { fill: over, opacity: '1' } }
  if (state === 'Focused') {
    const [edge, halo] = LINK_FOCUS[variant]
    // Figma's 2px inside stroke counts in the layout: the focused link is 4px
    // larger on each axis, so its padding takes the stroke on top.
    return { root: { text: rest, focus: edge, ring: halo, paddingX: 'spacing.gap-tight+stroke.focus', paddingY: 'stroke.focus' } }
  }
  return { root: { text: rest } }
}

/** The label's type: body-sm · md · lg, and the scale's text-xl at lg (the file
 *  binds `Type/body-xl` to the scale primitives, there is no such role). */
const LINK_FONT: Record<string, string> = { xs: 'type.body-sm', sm: 'type.body-md', default: 'type.body-lg', lg: 'type.text-xl' }
const LINK_ICON: Record<string, string> = { xs: 'icon.small', sm: 'icon.small', default: 'icon.medium', lg: 'icon.medium' }
const LINK_GAP: Record<string, string> = { xs: 'spacing.gap-tight', sm: 'spacing.gap-tight', default: 'spacing.gap-control', lg: 'spacing.gap-control' }

export const TEXT_LINK: ComponentRecipe = {
  key: 'TextLink',
  slots: ['root', 'icon', 'label', 'underline'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.control' },
      underline: { height: 'stroke.divider', opacity: '0.4' },
    })),
    part({ Size: TEXT_LINK_SIZES }, (size) => ({
      root: { paddingX: 'spacing.gap-tight', paddingY: 'spacing.0', gap: LINK_GAP[size] },
      icon: { width: LINK_ICON[size], height: LINK_ICON[size] },
      label: { font: LINK_FONT[size] },
    })),
    part({ Variant: TEXT_LINK_VARIANTS, State: TEXT_LINK_STATES }, (v, s) => textLinkPaint(v, s)),
    // `underline={false}` hides the bar everywhere but Hover and Pressed, whose
    // own rules (above this in specificity) put it back.
    part({}, () => ({ 'underline[data-visible="false"]': { fill: NONE } })),
  ],
}

// ── FABButton ──────────────────────────────────────────────────────────────
// The Figma `FABButton` set (design-plans/fab-button-contract.md): a floating
// action button, a leading icon and an optional label on a surface that lifts
// (key + ambient shadows, per state) with the solid's top highlight. Colour is
// the same at every Shape and Size (measured on all 100 variants). Hover and
// Pressed of `soft` and `inverse` stack a translucent fill; Disabled is the page
// under the disabled fill. Focus is a 2px halo OUTSIDE with no edge of its own.

export const FAB_APPEARANCES = ['solid', 'soft'] as const
export const FAB_SHAPES = ['rounded', 'pill'] as const
export const FAB_SIZES = ['default', 'lg'] as const
export const FAB_VARIANTS = ['inverse', 'default', 'secondary'] as const
const FAB_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const

/** What one Variant · Appearance paints, state by state: [rest, hover, pressed]. */
interface FabPaint {
  ink: string
  fill: [string, string, string]
  over: [string[], string[], string[]]
  /** The focus halo (2px, outside). */
  halo: string
}
const FAB_MUTED = 'color.surface.inverse-muted'
const FAB: Record<string, Record<string, FabPaint>> = {
  default: {
    solid: { ink: c('content.on-action'), fill: [c('action.primary.default'), c('action.primary.hover'), c('action.primary.pressed')], over: [[], [], []], halo: c('border.ring.default') },
    soft: { ink: c('content.accent'), fill: [c('surface.accent'), c('surface.accent'), c('surface.accent')], over: [[], [c('surface.selected')], [c('surface.selected-pressed')]], halo: c('border.ring.default') },
  },
  secondary: {
    solid: { ink: c('content.on-secondary'), fill: [c('action.secondary.default'), c('action.secondary.hover'), c('action.secondary.pressed')], over: [[], [], []], halo: c('border.subtle') },
    soft: { ink: c('content.primary'), fill: [c('surface.layer-2'), c('surface.layer-2'), c('surface.layer-2')], over: [[], [c('action.ghost.hover')], [c('action.ghost.pressed')]], halo: c('border.subtle') },
  },
  // The file draws the inverse chip in `solid` only; `soft` reads the same.
  inverse: {
    solid: { ink: c('content.inverse'), fill: [c('surface.inverse'), c('surface.inverse'), c('surface.inverse')], over: [[], [FAB_MUTED], [FAB_MUTED, FAB_MUTED]], halo: FAB_MUTED },
  },
}

function fabPaint(variant: string, appearance: string, state: string): SlotMap {
  if (state === 'Disabled') {
    return { root: { fill: c('surface.page'), overlay: c('action.disabled.default'), text: c('content.disabled'), lift: NONE, highlight: NONE } }
  }
  const k = FAB[variant][FAB[variant][appearance] ? appearance : 'solid']
  const step = state === 'Pressed' ? 2 : state === 'Hover' ? 1 : 0
  const root: SlotProps = { fill: k.fill[step], text: k.ink }
  if (k.over[step][0]) root.overlay = k.over[step][0]
  if (k.over[step][1]) root.overlay2 = k.over[step][1]
  root.lift = step === 2 ? 'pressed' : step === 1 ? 'hover' : 'rest'
  root.highlight = c('elevation.highlight')
  if (state === 'Focused') root.halo = k.halo
  return { root }
}

const FAB_SIZE: Record<string, { box: string; icon: string }> = {
  default: { box: 'size.touch', icon: 'icon.medium' },
  lg: { box: 'size.fab', icon: 'icon.large' },
}

export const FAB_BUTTON: ComponentRecipe = {
  key: 'FABButton',
  slots: ['root', 'icon', 'label'],
  defaults: { Appearance: 'solid', Shape: 'rounded', Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { paddingX: 'spacing.inset-control', paddingY: 'spacing.0', gap: 'spacing.gap-control', font: 'type.button' },
      // The label's own 8px on its right, beyond the root's inset (the file's `label-wrap`).
      label: { paddingRight: 'spacing.gap-control' },
    })),
    part({ Shape: FAB_SHAPES }, (shape) => ({ root: { radius: shape === 'pill' ? 'radius.pill' : 'radius.action' } })),
    part({ Size: FAB_SIZES }, (size) => ({
      root: { height: FAB_SIZE[size].box, minWidth: FAB_SIZE[size].box },
      icon: { width: FAB_SIZE[size].icon, height: FAB_SIZE[size].icon },
    })),
    part({ Variant: FAB_VARIANTS, Appearance: FAB_APPEARANCES, State: FAB_STATES }, (v, a, s) => fabPaint(v, a, s)),
  ],
}

// ── ButtonGroup ────────────────────────────────────────────────────────────
// shadcn's group: Buttons attached edge to edge. The buttons paint themselves
// (Button recipe); the group owns the separator and the text segment.

export const BUTTON_GROUP: ComponentRecipe = {
  key: 'ButtonGroup',
  slots: ['root', 'text', 'separator'],
  defaults: { Orientation: 'horizontal' },
  parts: [
    part({}, () => ({
      text: {
        fill: c('surface.layer-2'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        text: c('content.primary'), radius: 'radius.action', paddingX: 'spacing.2_5', gap: 'spacing.2', font: 'type.label',
      },
      separator: { fill: c('border.control') },
    })),
    part({ Orientation: ['horizontal', 'vertical'] as const }, (o) => ({
      separator: o === 'horizontal' ? { width: 'stroke.control' } : { height: 'stroke.control' },
    })),
  ],
}

// ── SocialLoginButton ──────────────────────────────────────────────────────

const SOCIAL_GEOMETRY: Record<string, SlotProps> = {
  default: { height: 'size.control', paddingX: 'spacing.4', gap: 'spacing.2_5' },
  lg: { height: 'size.touch', paddingX: 'spacing.5', gap: 'spacing.2_5' },
}

export const SOCIAL_LOGIN_BUTTON: ComponentRecipe = {
  key: 'SocialLoginButton',
  slots: ['root', 'label', 'icon'],
  defaults: { Provider: 'google', Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        text: c('content.primary'), radius: 'radius.action', font: 'type.button',
      },
      'root:hover': { fill: c('action.ghost.hover') },
      'root:active': { fill: c('action.ghost.pressed') },
      'root:focus-visible': FOCUS,
    })),
    part({ Size: ['default', 'lg'] as const }, (size) => ({ root: SOCIAL_GEOMETRY[size] })),
  ],
}

// ── AppStoreBadge ──────────────────────────────────────────────────────────
// The badge is the STORE's artwork (Apple and Google require a black badge with
// white type), so its ink and fill are not tokens — only its geometry is.

export const APP_STORE_BADGE: ComponentRecipe = {
  key: 'AppStoreBadge',
  slots: ['root', 'eyebrow', 'name'],
  defaults: { Store: 'app-store' },
  parts: [
    part({ Store: ['app-store', 'google-play'] as const }, () => ({
      root: { radius: 'radius.action', paddingX: 'spacing.4', paddingY: 'spacing.2', gap: 'spacing.2_5' },
      eyebrow: { font: 'type.caption' },
      name: { font: 'type.button' },
    })),
  ],
}

// ── ToggleGroup ────────────────────────────────────────────────────────────
// shadcn's ToggleGroup over its Toggle: `variant` default (no edge) | outline
// (the control boundary) × `size` default | sm | lg, the Button heights. A
// pressed item (`data-state="on"`) takes the muted surface, as shadcn's
// `data-[state=on]:bg-muted`. The hover and on rules ride in the variant part,
// after the item's base, so they win on equal specificity.

export const TOGGLE_GROUP_VARIANTS = ['default', 'outline'] as const
export const TOGGLE_GROUP_SIZES = ['default', 'sm', 'lg'] as const
const TOGGLE_HEIGHT: Record<string, string> = { sm: 'size.compact', default: 'size.control', lg: 'size.touch' }

export const TOGGLE_GROUP: ComponentRecipe = {
  key: 'ToggleGroup',
  slots: ['root', 'item'],
  defaults: { Variant: 'default', Size: 'default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.1' },
      'item:focus-visible': FOCUS,
    })),
    part({ Variant: TOGGLE_GROUP_VARIANTS }, (variant) => ({
      item: variant === 'outline'
        ? {
            fill: NONE, stroke: c('border.control'), strokeWidth: 'stroke.control', text: c('content.secondary'),
            font: 'type.button', radius: 'radius.action', gap: 'spacing.1',
          }
        : { fill: NONE, text: c('content.secondary'), font: 'type.button', radius: 'radius.action', gap: 'spacing.1' },
      'item:hover': { fill: c('action.ghost.hover'), text: c('content.primary') },
      'item[data-state="on"]': { fill: c('surface.layer-2'), text: c('content.primary') },
    })),
    part({ Size: TOGGLE_GROUP_SIZES }, (size) => ({
      item: { height: TOGGLE_HEIGHT[size], paddingX: 'spacing.2_5' },
    })),
  ],
}

// ── Toggle ─────────────────────────────────────────────────────────────────
// shadcn's Toggle: the ToggleGroup item on its own. Pressed (Radix
// `data-state="on"`, mirrored as `data-pressed` True/False — a Figma property)
// takes the muted surface.

export const TOGGLE: ComponentRecipe = {
  key: 'Toggle',
  slots: ['root'],
  defaults: { Variant: 'default', Size: 'default', Pressed: 'False' },
  parts: [
    part({ Variant: TOGGLE_GROUP_VARIANTS }, (variant) => ({
      root: variant === 'outline'
        ? { stroke: c('border.control'), strokeWidth: 'stroke.control', font: 'type.button', radius: 'radius.action', gap: 'spacing.1' }
        : { font: 'type.button', radius: 'radius.action', gap: 'spacing.1' },
    })),
    part({ Size: TOGGLE_GROUP_SIZES }, (size) => ({
      root: { height: TOGGLE_HEIGHT[size], paddingX: 'spacing.2_5' },
    })),
    part({ Pressed: ['False', 'True'] as const }, (pressed) => ({
      root: pressed === 'True'
        ? { fill: c('surface.layer-2'), text: c('content.primary') }
        : { fill: NONE, text: c('content.secondary') },
      'root:hover': { fill: c('action.ghost.hover'), text: c('content.primary') },
      'root:focus-visible': FOCUS,
    })),
  ],
}
