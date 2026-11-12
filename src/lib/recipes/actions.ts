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
// the `border.ring.default` halo outside it. The edge is NOT one colour yet — Figma
// strokes secondary · solid with border.strong and critical solid / outline (Button)
// with the critical border; the contract copies it until the file unifies it.

export const BUTTON_VARIANTS = ['default', 'secondary', 'critical'] as const
export const BUTTON_APPEARANCES = ['solid', 'outline', 'ghost', 'link'] as const
export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const
const BUTTON_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] as const

/** The solid fill ladder per intent: rest · hover · pressed, and its ink. */
const SOLID: Record<string, { fill: [string, string, string]; ink: string; focus: string }> = {
  default: { fill: ['action.primary.default', 'action.primary.hover', 'action.primary.pressed'], ink: 'content.on-action', focus: 'border.focus' },
  secondary: { fill: ['action.secondary.default', 'action.secondary.hover', 'action.secondary.pressed'], ink: 'content.on-secondary', focus: 'border.strong' },
  critical: { fill: ['status.critical.surface-solid', 'status.critical.surface-solid-hover', 'status.critical.surface-solid-pressed'], ink: 'status.critical.on-solid', focus: 'status.critical.border-strong' },
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

function buttonPaint(variant: string, appearance: string, state: string, iconOnly = false): SlotMap {
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  if (state === 'Disabled') {
    return {
      root: {
        fill: appearance === 'solid' ? c('action.disabled.default') : NONE,
        stroke: appearance === 'outline' ? c('border.control') : NONE,
        text: c('content.disabled'),
        focus: NONE,
        ring: NONE,
      },
    }
  }
  const step = state === 'Pressed' ? 2 : state === 'Hover' ? 1 : 0
  const focused = state === 'Focused'
  if (appearance === 'solid') {
    const k = SOLID[variant]
    return { root: { fill: c(k.fill[step]), stroke: NONE, text: c(k.ink), focus: focused ? c(k.focus) : NONE, ring } }
  }
  if (appearance === 'link') {
    const [rest, over] = LINK[variant]
    return { root: { fill: NONE, stroke: NONE, text: c(step ? over : rest), focus: focused ? c('border.focus') : NONE, ring } }
  }
  const k = QUIET[variant]
  const wash = step === 2 ? c('action.ghost.pressed') : step === 1 ? c('action.ghost.hover') : NONE
  // Button's critical · outline focuses on its own critical edge (Figma);
  // IconButton's and every other quiet button on border.focus.
  const edge = variant === 'critical' && appearance === 'outline' && !iconOnly ? 'status.critical.border-strong' : 'border.focus'
  return {
    root: {
      fill: wash,
      stroke: appearance === 'outline' ? c(k.edge) : NONE,
      text: c(k.ink),
      focus: focused ? c(edge) : NONE,
      ring,
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
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', font: 'type.button' },
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
      root: { radius: 'radius.action', strokeWidth: 'stroke.control' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({
      root: { height: BUTTON_HEIGHT[size], width: BUTTON_HEIGHT[size], paddingX: 'spacing.0' },
    })),
    part({ Variant: BUTTON_VARIANTS, Appearance: BUTTON_APPEARANCES, State: BUTTON_STATES }, (v, a, s) => buttonPaint(v, a, s, true)),
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
