/**
 * Button & Actions recipes. See `componentRecipes.ts` for the rules: every value
 * is a token reference, a state with no role gets a role (never an opacity).
 *
 * `slot:hover` / `slot[attr]` keys give one PART its own state.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers.js'

// ── Button ─────────────────────────────────────────────────────────────────
// shadcn's variants and sizes, verbatim (`bases/radix/ui/button.tsx`). What
// each one PAINTS is shadcn's `cn-button-variant-*` read through Escala's roles:
//   default     bg-primary → action.primary.*         · ink on it
//   secondary   bg-secondary → action.secondary.*     · page ink
//   outline     border, NO fill at rest, hover muted  · page ink
//               (Escala's call: shadcn's bg-background is the PAGE colour, so
//               on a raised surface — a Dialog's Cancel, a Card's footer — it
//               cut a page-coloured patch out of that surface; transparent
//               shows whatever it sits on and only the outline reads)
//   ghost       transparent, hover muted              · page ink
//   destructive the critical SOLID → status.critical.surface-solid* · on-solid
//               (Escala's call: a Delete reads as a solid action, the soft
//               tint stays for Badge, Bubble and Alert)
//   link        text-primary → content.link.*
// shadcn dims a disabled button with opacity; a recipe never does, so disabled
// is a role (action.disabled / content.disabled).

export const BUTTON_VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const
const BUTTON_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] as const

function buttonPaint(variant: string, state: string): SlotMap {
  if (state === 'Disabled') {
    const filled = variant === 'default' || variant === 'secondary' || variant === 'destructive'
    return {
      root: {
        fill: filled ? c('action.disabled.default') : NONE,
        stroke: variant === 'outline' ? c('action.disabled.default') : NONE,
        text: c('content.disabled'),
        focus: NONE,
      },
    }
  }
  const hover = state === 'Hover'
  const pressed = state === 'Pressed'
  const focus = state === 'Focused'
  // Focus is ONE solid `border.focus` ring set off from the button, for every
  // variant: the translucent halo alone disappeared next to an accent fill
  // (Figma audit: 54 Focused variants identical to Default). Destructive too —
  // focus wins over the error colour (see `border.focus`).
  const ring = focus ? c('border.focus') : NONE
  switch (variant) {
    case 'default':
      return { root: { fill: c(pressed ? 'action.primary.pressed' : hover ? 'action.primary.hover' : 'action.primary.default'), stroke: NONE, text: c('content.on-action'), focus: ring } }
    case 'secondary':
      return { root: { fill: c(pressed ? 'action.secondary.pressed' : hover ? 'action.secondary.hover' : 'action.secondary.default'), stroke: NONE, text: c('content.primary'), focus: ring } }
    case 'outline':
      return { root: { fill: pressed ? c('action.ghost.pressed') : hover ? c('action.ghost.hover') : NONE, stroke: c('border.control'), text: c('content.primary'), focus: ring } }
    case 'ghost':
      return { root: { fill: pressed ? c('action.ghost.pressed') : hover ? c('action.ghost.hover') : NONE, stroke: NONE, text: c('content.primary'), focus: ring } }
    case 'destructive':
      return { root: { fill: c(pressed ? 'status.critical.surface-solid-pressed' : hover ? 'status.critical.surface-solid-hover' : 'status.critical.surface-solid'), stroke: NONE, text: c('status.critical.on-solid'), focus: ring } }
    default: // link
      return { root: { fill: NONE, stroke: NONE, text: c(hover || pressed ? 'content.link.hover' : 'content.link.default'), focus: ring } }
  }
}

/** shadcn's heights (24 · 32 · 36 · 40) read through the Size roles Escala
 *  ships (hit 24 · compact 32 · control 40 · touch 48): the names are shadcn's,
 *  the lengths are the system's. `icon*` are square at the same heights. */
const BUTTON_GEOMETRY: Record<string, SlotProps> = {
  xs: { height: 'size.hit', paddingX: 'spacing.2', gap: 'spacing.1' },
  sm: { height: 'size.compact', paddingX: 'spacing.3', gap: 'spacing.1_5' },
  default: { height: 'size.control', paddingX: 'spacing.4', gap: 'spacing.gap-control' },
  lg: { height: 'size.touch', paddingX: 'spacing.5', gap: 'spacing.gap-control' },
  'icon-xs': { height: 'size.hit', width: 'size.hit', paddingX: 'spacing.0' },
  'icon-sm': { height: 'size.compact', width: 'size.compact', paddingX: 'spacing.0' },
  icon: { height: 'size.control', width: 'size.control', paddingX: 'spacing.0' },
  'icon-lg': { height: 'size.touch', width: 'size.touch', paddingX: 'spacing.0' },
}

// `text` sits on the ROOT: label and icons share it (`currentColor`), which is
// also what the plugin does — one ink fills the label and the icon slots.
export const BUTTON: ComponentRecipe = {
  key: 'Button',
  slots: ['root', 'label', 'icon'],
  defaults: { Variant: 'default', Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', font: 'type.button' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({ root: BUTTON_GEOMETRY[size] })),
    part({ Variant: BUTTON_VARIANTS, State: BUTTON_STATES }, buttonPaint),
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
      'root:focus-visible': { focus: c('border.focus') },
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
      'item:focus-visible': { focus: c('border.focus') },
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
      'root:focus-visible': { focus: c('border.focus') },
    })),
  ],
}
