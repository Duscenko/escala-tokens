/**
 * Form control recipes. See `componentRecipes.ts` for the rules: every value is
 * a token reference, a state with no role gets a role (never an opacity), and
 * a slot key may carry a `:state` / `[attr]` suffix to give one PART its state.
 *
 * Refs may SUM dimensions (`selector.control+spacing.1`) — `calc()` in CSS.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers.js'

// ── Shared field chrome ────────────────────────────────────────────────────

/** The box every text-like control draws: fill, edge and focus halo by state. */
export function fieldBox(state: string): SlotProps {
  if (state === 'Disabled') return { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), ring: NONE }
  // shadcn: `border-destructive` + a soft destructive ring (`ring-destructive/20`).
  // The stroke is the contrast-bearing boundary (pale in dark — see its role),
  // the halo is `status.critical.border`, the alpha red that carries the hue.
  if (state === 'Error') return { fill: c('surface.input'), stroke: c('status.critical.border-strong'), ring: c('status.critical.border') }
  if (state === 'Focused' || state === 'Open') return { fill: c('surface.input'), stroke: c('border.focus'), ring: c('border.ring.default') }
  if (state === 'Hover') return { fill: c('surface.input'), stroke: c('border.control-hover'), ring: NONE }
  return { fill: c('surface.input'), stroke: c('border.control'), ring: NONE }
}

const FIELD_FIXED: SlotProps = {
  radius: 'radius.action', strokeWidth: 'stroke.control',
  paddingX: 'spacing.inset-control', gap: 'spacing.gap-control',
}
/** Live focus on a control whose root IS the box (no State axis involved). */
const FIELD_FOCUS: SlotProps = { stroke: c('border.focus'), ring: c('border.ring.default') }

// ── Input ──────────────────────────────────────────────────────────────────
// shadcn's Input: the box IS the <input>. No sizes, no types — a label and a
// hint are Field's, icons and add-ons are InputGroup's. State is Figma's axis.

const INPUT_STATES = ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] as const

export const INPUT: ComponentRecipe = {
  key: 'Input',
  slots: ['root', 'placeholder'],
  pseudoSlots: { placeholder: { of: 'root', pseudo: '::placeholder' } },
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, height: 'size.control', font: 'type.placeholder' },
    })),
    part({ State: INPUT_STATES }, (state) => {
      const disabled = state === 'Disabled'
      return {
        root: { ...fieldBox(state), text: c(disabled ? 'content.disabled' : 'content.primary') },
        placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
      }
    }),
  ],
}

// ── Textarea ───────────────────────────────────────────────────────────────

export const TEXTAREA: ComponentRecipe = {
  key: 'Textarea',
  slots: ['root', 'label', 'field', 'placeholder', 'hint', 'count'],
  pseudoSlots: { placeholder: { of: 'field', pseudo: '::placeholder' } },
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      label: { font: 'type.label' },
      field: {
        ...FIELD_FIXED,
        minHeight: 'size.2xl+spacing.6', paddingY: 'spacing.2_5', font: 'type.placeholder',
      },
      hint: { font: 'type.helper' },
      count: { font: 'type.helper', text: c('content.secondary') },
    })),
    part({ State: ['Default', 'Focused', 'Error', 'Disabled'] as const }, (state) => {
      const disabled = state === 'Disabled'
      return {
        label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
        field: { ...fieldBox(state), text: c(disabled ? 'content.disabled' : 'content.primary') },
        placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
        hint: { text: c(state === 'Error' ? 'status.critical.content' : 'content.secondary') },
      }
    }),
  ],
}

// ── InputGroup ─────────────────────────────────────────────────────────────

// The group IS the field box, so it paints what the bare Input paints in each
// state — shadcn moves the control's focus / invalid styling onto the group
// with `has-[…]`. Selectors, not a State axis: the catalogue (= the plugin's
// Figma set) ships Input Group with no variants. Same specificity ladder as the
// recipe's own state suffixes, emitted in order Hover < Focused < Error < Disabled.
const GROUP_LIVE = ':not([data-force-state]):not([aria-disabled="true"]):not(:has(:disabled))'
const GROUP_CONTROL = '[data-slot="input-group-control"]'

export const INPUT_GROUP: ComponentRecipe = {
  key: 'InputGroup',
  slots: ['root', 'addon', 'input', 'button', 'separator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { ...fieldBox('Default'), strokeWidth: 'stroke.control', radius: 'radius.action', height: 'size.control' },
      [`root:hover${GROUP_LIVE}`]: fieldBox('Hover'),
      'root[data-force-state="Hover"]': fieldBox('Hover'),
      [`root:has(${GROUP_CONTROL}:focus-visible)${GROUP_LIVE}`]: fieldBox('Focused'),
      'root[data-force-state="Focused"]': fieldBox('Focused'),
      [`root:has(${GROUP_CONTROL}[aria-invalid="true"])`]: fieldBox('Error'),
      'root[data-force-state="Error"]': fieldBox('Error'),
      'root:has(:disabled)': fieldBox('Disabled'),
      'root[aria-disabled="true"]': fieldBox('Disabled'),
      // shadcn's addon is transparent: it holds an icon, text, kbd or button.
      addon: { text: c('content.secondary'), font: 'type.placeholder', paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
      input: { text: c('content.primary'), font: 'type.placeholder', paddingX: 'spacing.inset-control' },
      'input::placeholder': { text: c('content.subtle') },
      'input:disabled': { text: c('content.disabled') },
      'input:disabled::placeholder': { text: c('content.disabled') },
      button: { text: c('content.accent'), font: 'type.button', paddingX: 'spacing.4' },
      'button:hover': { fill: c('action.ghost.hover') },
      'button:active': { fill: c('action.ghost.pressed') },
      separator: { fill: c('border.control'), width: 'stroke.control' },
    })),
  ],
}

// ── InputStepper ───────────────────────────────────────────────────────────

export const INPUT_STEPPER: ComponentRecipe = {
  key: 'InputStepper',
  slots: ['root', 'button', 'value', 'separator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.action', height: 'size.control',
      },
      'root:focus-within': FIELD_FOCUS,
      button: { text: c('content.secondary'), font: 'type.heading-xs', width: 'size.control' },
      'button:hover': { fill: c('action.ghost.hover') },
      'button:active': { fill: c('action.ghost.pressed') },
      'button:disabled': { text: c('content.disabled') },
      value: { text: c('content.primary'), font: 'type.body-md', width: 'size.2xl' },
      separator: { fill: c('border.control'), width: 'stroke.control' },
    })),
  ],
}

// ── InputTag ───────────────────────────────────────────────────────────────

export const INPUT_TAG: ComponentRecipe = {
  key: 'InputTag',
  slots: ['root', 'tag', 'tagRemove', 'input'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.action', minHeight: 'size.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5',
        gap: 'spacing.1_5',
      },
      'root:focus-within': FIELD_FOCUS,
      tag: {
        fill: c('surface.selected'), text: c('content.accent'), radius: 'radius.pill', font: 'type.label',
        paddingX: 'spacing.2', gap: 'spacing.1',
      },
      tagRemove: { text: c('content.accent') },
      'tagRemove:hover': { text: c('content.link.hover') },
      input: { text: c('content.primary'), font: 'type.placeholder' },
    })),
  ],
}

// ── Select ─────────────────────────────────────────────────────────────────

// shadcn's trigger sizes: default (control 40) · sm (compact 32).
const SELECT_GEOMETRY: Record<string, string> = { default: 'size.control', sm: 'size.compact' }
const MENU_ITEM: SlotMap = {
  item: { text: c('content.primary'), font: 'type.body-sm', radius: 'radius.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2' },
  'item[data-highlighted]': { fill: c('action.ghost.hover') },
  'item[data-state="checked"]': { fill: c('surface.selected'), text: c('content.accent') },
  'item[data-disabled]': { text: c('content.disabled') },
}
// The list panel is `radius.action` with a `spacing.1` inset: its rows'
// `radius.control` is then concentric (the menus' rule, `navigation.ts`).
const MENU_CONTENT: SlotProps = {
  fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
  radius: 'radius.action', shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
}

export const SELECT: ComponentRecipe = {
  key: 'Select',
  slots: ['root', 'icon', 'content', 'item'],
  // Radix portals the list: it is a sibling of the trigger, not inside it.
  detachedSlots: ['content', 'item'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, font: 'type.placeholder', text: c('content.primary') },
      'root[data-placeholder]': { text: c('content.subtle') },
      icon: { text: c('content.secondary') },
      content: MENU_CONTENT,
      ...MENU_ITEM,
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({ root: { height: SELECT_GEOMETRY[size] } })),
    part({ State: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] as const }, (state) => ({
      root: { ...fieldBox(state), ...(state === 'Disabled' ? { text: c('content.disabled') } : {}) },
      icon: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.secondary') },
    })),
  ],
}

// ── Combobox ───────────────────────────────────────────────────────────────

export const COMBOBOX: ComponentRecipe = {
  key: 'Combobox',
  slots: ['root', 'input', 'icon', 'content', 'item'],
  pseudoSlots: {},
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, height: 'size.control', paddingX: 'spacing.inset-control' },
      // shadcn's ComboboxInput is an InputGroup: the field box takes the
      // control's live states (hover, focus, invalid, disabled).
      [`root:hover:not(:focus-within)${GROUP_LIVE}`]: fieldBox('Hover'),
      'root:focus-within': FIELD_FOCUS,
      'root:has([aria-invalid="true"])': fieldBox('Error'),
      'root:has(:disabled)': fieldBox('Disabled'),
      input: { text: c('content.primary'), font: 'type.placeholder' },
      'input::placeholder': { text: c('content.subtle') },
      'input:disabled': { text: c('content.disabled') },
      icon: { text: c('content.secondary') },
      content: { ...MENU_CONTENT },
      ...MENU_ITEM,
    })),
    part({ State: ['Default', 'Open'] as const }, (state) => ({ root: fieldBox(state) })),
  ],
}

// ── InputOTP ───────────────────────────────────────────────────────────────
// shadcn's InputOTP (`input-otp`): a group of slots, the active one ringed.
// No sizes. State is Figma's axis; Error is `aria-invalid` on the wrapper.

export const INPUT_OTP: ComponentRecipe = {
  key: 'InputOTP',
  slots: ['root', 'group', 'slot'],
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      group: { gap: 'spacing.gap-control' },
      slot: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.action', text: c('content.primary'), font: 'type.button',
        height: 'size.control', width: 'size.control',
      },
      'slot[data-active="true"]': FIELD_FOCUS,
    })),
    part({ State: ['Default', 'Filled', 'Error'] as const }, (state) => ({
      slot: state === 'Error' ? { stroke: c('status.critical.border-strong') } : {},
      'slot[data-active="true"]': state === 'Error' ? { stroke: c('status.critical.border-strong'), ring: NONE } : FIELD_FOCUS,
    })),
  ],
}

// ── Checkbox ───────────────────────────────────────────────────────────────
// shadcn's Checkbox: the box alone (label it with Label / a horizontal Field).
// Checked is shadcn's `data-checked`: bg-primary + primary-foreground check.

function checkPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  let root: SlotProps
  if (disabled) root = { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), ring }
  else if (on) {
    const fill = c(hover ? 'action.primary.hover' : 'action.primary.default')
    root = { fill, stroke: fill, ring }
  } else root = { fill: c('surface.input'), stroke: c(hover ? 'border.control-hover' : 'border.control'), ring }
  return { root, indicator: { text: c(disabled ? 'content.disabled' : 'content.on-action') } }
}

export const CHECKBOX: ComponentRecipe = {
  key: 'Checkbox',
  slots: ['root', 'indicator'],
  defaults: { Checked: 'True', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.control', strokeWidth: 'stroke.control', height: 'selector.control', width: 'selector.control' },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, checkPaint),
  ],
}

// ── RadioGroup ─────────────────────────────────────────────────────────────
// shadcn's RadioGroup: a grid of items; a checked item is bg-primary with a
// primary-foreground dot (Radix's `data-state="checked"`).

export const RADIO_GROUP: ComponentRecipe = {
  key: 'RadioGroup',
  slots: ['root', 'item', 'indicator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.3' },
      item: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.pill', height: 'selector.control', width: 'selector.control',
      },
      'item:hover': { stroke: c('border.control-hover') },
      'item:focus-visible': { ring: c('border.ring.default') },
      'item[data-state="checked"]': { fill: c('action.primary.default'), stroke: c('action.primary.default') },
      'item:disabled': { fill: c('action.disabled.default'), stroke: c('action.disabled.default') },
      indicator: { fill: c('content.on-action'), radius: 'radius.pill', height: 'spacing.2', width: 'spacing.2' },
    })),
  ],
}

// ── Switch ─────────────────────────────────────────────────────────────────
// shadcn's Switch, `size` default | sm: primary track when checked, the input
// colour when not.

const SWITCH_GEOMETRY: Record<string, { knob: string; trackH: string; trackW: string; travel: string }> = {
  // Track = knob + 2px inset each side; the knob travels width − knob − inset.
  default: { knob: 'selector.control', trackH: 'selector.control+spacing.1', trackW: 'selector.control+spacing.5', travel: 'spacing.4' },
  sm: { knob: 'selector.compact', trackH: 'selector.compact+spacing.1', trackW: 'selector.compact+spacing.4', travel: 'spacing.3' },
}

function switchPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  const track = disabled ? 'action.disabled.default'
    : on ? (hover ? 'action.primary.hover' : 'action.primary.default')
    : (hover ? 'action.secondary.hover' : 'action.secondary.default')
  return {
    root: { fill: c(track), ring },
    thumb: { fill: c(on && !disabled ? 'content.on-action' : 'surface.input') },
  }
}

export const SWITCH: ComponentRecipe = {
  key: 'Switch',
  slots: ['root', 'thumb'],
  defaults: { Checked: 'True', Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.pill' },
      thumb: { radius: 'radius.pill', shadow: 'shadow.xs' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({
      root: { height: SWITCH_GEOMETRY[size].trackH, width: SWITCH_GEOMETRY[size].trackW, travel: SWITCH_GEOMETRY[size].travel },
      thumb: { height: SWITCH_GEOMETRY[size].knob, width: SWITCH_GEOMETRY[size].knob },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, switchPaint),
  ],
}

// ── Slider ─────────────────────────────────────────────────────────────────

export const SLIDER: ComponentRecipe = {
  key: 'Slider',
  slots: ['root', 'label', 'value', 'track', 'range', 'thumb'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      label: { text: c('content.secondary'), font: 'type.caption' },
      value: { text: c('content.primary'), font: 'type.caption' },
      track: { fill: c('action.secondary.default'), height: 'spacing.1_5', radius: 'radius.pill' },
      range: { fill: c('action.primary.default'), radius: 'radius.pill' },
      thumb: {
        fill: c('surface.page'), stroke: c('action.primary.default'), strokeWidth: 'stroke.md',
        height: 'selector.control', width: 'selector.control', radius: 'radius.pill', shadow: 'shadow.sm',
      },
      'thumb:focus-visible': { ring: c('border.ring.default') },
    })),
  ],
}

// ── Field · Label · PasswordStrength ───────────────────────────────────────
// shadcn's Field: `orientation` vertical | horizontal | responsive, gap-3, a
// muted description, a destructive error. Label: medium text-sm, no variants.

export const FIELD: ComponentRecipe = {
  key: 'Field',
  slots: ['root', 'label', 'description', 'error', 'legend'],
  defaults: { Orientation: 'vertical' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.3' },
      label: { text: c('content.primary'), font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.helper' },
      error: { text: c('status.critical.content'), font: 'type.helper' },
      legend: { text: c('content.primary'), font: 'type.label' },
    })),
  ],
}

export const LABEL: ComponentRecipe = {
  key: 'Label',
  slots: ['root'],
  defaults: {},
  parts: [
    part({}, () => ({ root: { text: c('content.primary'), font: 'type.label' } })),
  ],
}

const STRENGTH_FILL: Record<string, string> = {
  weak: 'status.critical.surface-solid',
  fair: 'status.warning.surface-solid',
  strong: 'status.success.surface-solid',
}

export const PASSWORD_STRENGTH: ComponentRecipe = {
  key: 'PasswordStrength',
  slots: ['root', 'meter', 'segment', 'segmentOn', 'caption'],
  defaults: { Strength: 'fair' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      meter: { gap: 'spacing.gap-tight' },
      segment: { fill: c('action.secondary.default'), height: 'spacing.1', radius: 'radius.pill' },
      segmentOn: { height: 'spacing.1', radius: 'radius.pill' },
      caption: { text: c('content.secondary'), font: 'type.helper' },
    })),
    part({ Strength: ['weak', 'fair', 'strong'] as const }, (strength) => ({
      segmentOn: { fill: c(STRENGTH_FILL[strength]) },
    })),
  ],
}

// ── FileUpload · Dropzone ──────────────────────────────────────────────────

export const FILE_UPLOAD: ComponentRecipe = {
  key: 'FileUpload',
  slots: ['root', 'file', 'badge', 'name', 'meta', 'track', 'progress'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.2_5' },
      file: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.action', paddingX: 'spacing.inset-control', paddingY: 'spacing.2_5', gap: 'spacing.2_5',
      },
      badge: { fill: c('surface.selected'), text: c('content.accent'), font: 'type.caption', radius: 'radius.control', paddingX: 'spacing.1_5' },
      name: { text: c('content.primary'), font: 'type.caption' },
      meta: { text: c('content.secondary'), font: 'type.caption' },
      track: { fill: c('action.secondary.default'), height: 'spacing.1_5', radius: 'radius.pill' },
      progress: { fill: c('action.primary.default'), radius: 'radius.pill' },
    })),
  ],
}

export const DROPZONE: ComponentRecipe = {
  key: 'Dropzone',
  slots: ['root', 'icon', 'title', 'link', 'hint'],
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: {
        strokeWidth: 'stroke.control', radius: 'radius.container',
        paddingX: 'spacing.5', paddingY: 'spacing.8', gap: 'spacing.gap-control',
      },
      icon: { height: 'size.control', width: 'size.control', radius: 'radius.pill' },
      title: { text: c('content.primary'), font: 'type.body-sm' },
      link: { font: 'type.label' },
      hint: { font: 'type.helper' },
    })),
    part({ State: ['Default', 'Dragging', 'Error'] as const }, (state) => {
      const error = state === 'Error'
      return {
        root: {
          fill: state === 'Dragging' ? c('surface.accent') : error ? c('status.critical.surface') : NONE,
          stroke: c(error ? 'status.critical.border-strong' : state === 'Dragging' ? 'border.accent' : 'border.control'),
        },
        icon: { fill: c(error ? 'status.critical.surface' : 'surface.selected'), text: c(error ? 'status.critical.content' : 'content.accent') },
        link: { text: c('content.accent') },
        hint: { text: c(error ? 'status.critical.content' : 'content.secondary') },
      }
    }),
  ],
}

// ── NativeSelect ───────────────────────────────────────────────────────────
// shadcn's NativeSelect: a real <select> drawn as the field box, `size` default
// | sm (the Select heights). The wrapper is the root, so the State axis reads
// off it like every other field.

const NATIVE_SELECT_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const

export const NATIVE_SELECT: ComponentRecipe = {
  key: 'NativeSelect',
  slots: ['root', 'select', 'icon'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      select: { ...FIELD_FIXED, font: 'type.placeholder' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({ select: { height: SELECT_GEOMETRY[size] } })),
    part({ State: NATIVE_SELECT_STATES }, (state) => {
      const disabled = state === 'Disabled'
      return {
        select: { ...fieldBox(state), text: c(disabled ? 'content.disabled' : 'content.primary') },
        icon: { text: c(disabled ? 'content.disabled' : 'content.secondary') },
      }
    }),
  ],
}

// ── Calendar ───────────────────────────────────────────────────────────────
// shadcn's Calendar (react-day-picker): caption, weekdays and ghost day cells;
// a single or range end day takes the primary action, the range middle and
// today the muted surface, outside days the subtle ink. Nav arrows are ghost
// icon Buttons (their own recipe).

export const CALENDAR: ComponentRecipe = {
  key: 'Calendar',
  slots: ['root', 'caption', 'weekday', 'day'],
  defaults: { Mode: 'single' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.container',
        paddingX: 'spacing.3', paddingY: 'spacing.3', text: c('content.primary'),
      },
      caption: { text: c('content.primary'), font: 'type.label' },
      weekday: { text: c('content.secondary'), font: 'type.caption' },
      day: { text: c('content.primary'), font: 'type.body-sm', radius: 'radius.action', height: 'size.compact', width: 'size.compact' },
      'day:hover': { fill: c('action.ghost.hover') },
      'day[data-today="true"]': { fill: c('surface.layer-2') },
      'day[data-outside="true"]': { text: c('content.subtle') },
      'day[data-range-middle="true"]': { fill: c('surface.layer-2'), text: c('content.primary') },
      'day[data-selected-single="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      'day[data-range-start="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      'day[data-range-end="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
    })),
  ],
}
