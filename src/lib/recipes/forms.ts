/**
 * Form control recipes. See `componentRecipes.ts` for the rules: every value is
 * a token reference, a state with no role gets a role (never an opacity), and
 * a slot key may carry a `:state` / `[attr]` suffix to give one PART its state.
 *
 * Refs may SUM dimensions (`selector.control+spacing.1`) — `calc()` in CSS.
 */
import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers'

// ── Shared field chrome ────────────────────────────────────────────────────

/** The box every text-like control draws: fill, edge and focus halo by state. */
export function fieldBox(state: string): SlotProps {
  if (state === 'Disabled') return { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), ring: NONE }
  if (state === 'Error') return { fill: c('surface.input'), stroke: c('status.critical.border-strong'), ring: NONE }
  if (state === 'Focused' || state === 'Open') return { fill: c('surface.input'), stroke: c('border.focus'), ring: c('border.ring.default') }
  if (state === 'Hover') return { fill: c('surface.input'), stroke: c('border.control-hover'), ring: NONE }
  return { fill: c('surface.input'), stroke: c('border.strong'), ring: NONE }
}

const FIELD_FIXED: SlotProps = {
  radius: 'radius.action', strokeWidth: 'stroke.control',
  paddingX: 'spacing.inset-control', gap: 'spacing.gap-control',
}
/** Live focus on a control whose root IS the box (no State axis involved). */
const FIELD_FOCUS: SlotProps = { stroke: c('border.focus'), ring: c('border.ring.default') }

// ── Input ──────────────────────────────────────────────────────────────────

const INPUT_SIZES = ['MD', 'SM', 'XS'] as const
const INPUT_STATES = ['Default', 'Hover', 'Focused', 'Filled', 'Error', 'Loading', 'Disabled'] as const

function inputPaint(state: string): SlotMap {
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  return {
    label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    field: fieldBox(state),
    value: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
    icon: { text: c(disabled ? 'content.disabled' : 'content.secondary') },
    hint: { text: c(error ? 'status.critical.content' : 'content.secondary') },
    spinner: { text: c(state === 'Loading' ? 'action.primary.default' : 'content.secondary') },
  }
}

const INPUT_GEOMETRY: Record<string, SlotProps> = {
  MD: { height: 'size.control', font: 'type.placeholder' },
  SM: { height: 'size.compact', font: 'type.body-sm' },
  XS: { height: 'size.xs', font: 'type.body-sm' },
}

export const INPUT: ComponentRecipe = {
  key: 'Input',
  slots: ['root', 'label', 'field', 'value', 'placeholder', 'icon', 'hint', 'spinner'],
  pseudoSlots: { placeholder: { of: 'value', pseudo: '::placeholder' } },
  defaults: { Size: 'MD', State: 'Default', Type: 'Default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      label: { font: 'type.label' },
      field: FIELD_FIXED,
      hint: { font: 'type.helper' },
    })),
    part({ Size: INPUT_SIZES }, (size) => ({ field: INPUT_GEOMETRY[size] })),
    part({ State: INPUT_STATES }, inputPaint),
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

export const INPUT_GROUP: ComponentRecipe = {
  key: 'InputGroup',
  slots: ['root', 'addon', 'input', 'button', 'separator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.input'), stroke: c('border.strong'), strokeWidth: 'stroke.control',
        radius: 'radius.action', height: 'size.control',
      },
      'root:focus-within': FIELD_FOCUS,
      addon: { fill: c('surface.layer-1'), text: c('content.secondary'), font: 'type.placeholder', paddingX: 'spacing.inset-control' },
      input: { text: c('content.primary'), font: 'type.placeholder', paddingX: 'spacing.inset-control' },
      button: { text: c('content.accent'), font: 'type.button', paddingX: 'spacing.4' },
      'button:hover': { fill: c('action.ghost.hover') },
      'button:active': { fill: c('action.ghost.pressed') },
      separator: { fill: c('border.strong'), width: 'stroke.control' },
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
        fill: c('surface.input'), stroke: c('border.strong'), strokeWidth: 'stroke.control',
        radius: 'radius.action', height: 'size.control',
      },
      'root:focus-within': FIELD_FOCUS,
      button: { text: c('content.secondary'), font: 'type.heading-xs', width: 'size.control' },
      'button:hover': { fill: c('action.ghost.hover') },
      'button:active': { fill: c('action.ghost.pressed') },
      'button:disabled': { text: c('content.disabled') },
      value: { text: c('content.primary'), font: 'type.body-md', width: 'size.2xl' },
      separator: { fill: c('border.strong'), width: 'stroke.control' },
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
        fill: c('surface.input'), stroke: c('border.strong'), strokeWidth: 'stroke.control',
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

const SELECT_GEOMETRY: Record<string, string> = { MD: 'size.control', SM: 'size.compact', LG: 'size.touch' }
const MENU_ITEM: SlotMap = {
  item: { text: c('content.primary'), font: 'type.body-sm', radius: 'radius.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2' },
  'item[data-highlighted]': { fill: c('action.ghost.hover') },
  'item[data-state="checked"]': { fill: c('surface.selected'), text: c('content.accent') },
  'item[data-disabled]': { text: c('content.disabled') },
}
const MENU_CONTENT: SlotProps = {
  fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
  radius: 'radius.overlay', shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
}

export const SELECT: ComponentRecipe = {
  key: 'Select',
  slots: ['root', 'icon', 'content', 'item'],
  // Radix portals the list: it is a sibling of the trigger, not inside it.
  detachedSlots: ['content', 'item'],
  defaults: { Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, font: 'type.placeholder', text: c('content.primary') },
      'root[data-placeholder]': { text: c('content.subtle') },
      icon: { text: c('content.secondary') },
      content: MENU_CONTENT,
      ...MENU_ITEM,
    })),
    part({ Size: ['MD', 'SM', 'LG'] as const }, (size) => ({ root: { height: SELECT_GEOMETRY[size] } })),
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
      'root:focus-within': FIELD_FOCUS,
      input: { text: c('content.primary'), font: 'type.placeholder' },
      icon: { text: c('content.secondary') },
      content: { ...MENU_CONTENT },
      ...MENU_ITEM,
    })),
    part({ State: ['Default', 'Open'] as const }, (state) => ({ root: fieldBox(state) })),
  ],
}

// ── InputOTP ───────────────────────────────────────────────────────────────

const OTP_GEOMETRY: Record<string, { size: string; gap: string }> = {
  MD: { size: 'size.control', gap: 'spacing.gap-control' },
  SM: { size: 'size.compact', gap: 'spacing.gap-tight' },
  LG: { size: 'size.touch', gap: 'spacing.gap-control' },
}

export const INPUT_OTP: ComponentRecipe = {
  key: 'InputOTP',
  slots: ['root', 'cell'],
  defaults: { Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      cell: {
        fill: c('surface.input'), stroke: c('border.strong'), strokeWidth: 'stroke.control',
        radius: 'radius.action', text: c('content.primary'), font: 'type.button',
      },
      'cell[data-active="true"]': FIELD_FOCUS,
    })),
    part({ Size: ['MD', 'SM', 'LG'] as const }, (size) => ({
      root: { gap: OTP_GEOMETRY[size].gap },
      cell: { height: OTP_GEOMETRY[size].size, width: OTP_GEOMETRY[size].size },
    })),
    part({ State: ['Default', 'Filled', 'Error'] as const }, (state) => ({
      cell: state === 'Error' ? { stroke: c('status.critical.border-strong') } : {},
      'cell[data-active="true"]': state === 'Error' ? { stroke: c('status.critical.border-strong'), ring: NONE } : FIELD_FOCUS,
    })),
  ],
}

// ── Checkbox ───────────────────────────────────────────────────────────────

const SELECTOR_SIZE: Record<string, { box: string; gap: string }> = {
  MD: { box: 'selector.control', gap: 'spacing.2_5' },
  SM: { box: 'selector.compact', gap: 'spacing.2' },
}

function checkPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  let box: SlotProps
  if (disabled) box = { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), text: c('content.disabled'), ring }
  else if (on) {
    const fill = c(hover ? 'action.primary.hover' : 'action.primary.default')
    box = { fill, stroke: fill, text: c('content.on-action'), ring }
  } else box = { fill: c('surface.input'), stroke: c(hover ? 'border.control-hover' : 'border.strong'), text: NONE, ring }
  return { box, label: { text: c(disabled ? 'content.disabled' : 'content.primary') } }
}

export const CHECKBOX: ComponentRecipe = {
  key: 'Checkbox',
  slots: ['root', 'box', 'indicator', 'label'],
  defaults: { Checked: 'True', Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      box: { radius: 'radius.control', strokeWidth: 'stroke.control' },
      label: { font: 'type.label' },
    })),
    part({ Size: ['MD', 'SM'] as const }, (size) => ({
      root: { gap: SELECTOR_SIZE[size].gap },
      box: { height: SELECTOR_SIZE[size].box, width: SELECTOR_SIZE[size].box },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, checkPaint),
  ],
}

// ── Radio ──────────────────────────────────────────────────────────────────

function radioPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  const box: SlotProps = disabled
    ? { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), ring }
    : { fill: c('surface.input'), stroke: c(on ? 'action.primary.default' : hover ? 'border.control-hover' : 'border.strong'), ring }
  return {
    box,
    indicator: { fill: on ? c(disabled ? 'content.disabled' : 'action.primary.default') : NONE },
    label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
  }
}

export const RADIO: ComponentRecipe = {
  key: 'Radio',
  slots: ['root', 'box', 'indicator', 'label'],
  defaults: { Checked: 'True', Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      box: { radius: 'radius.pill', strokeWidth: 'stroke.control' },
      indicator: { radius: 'radius.pill' },
      label: { font: 'type.label' },
    })),
    part({ Size: ['MD', 'SM'] as const }, (size) => ({
      root: { gap: SELECTOR_SIZE[size].gap },
      box: { height: SELECTOR_SIZE[size].box, width: SELECTOR_SIZE[size].box },
      indicator: { height: size === 'SM' ? 'spacing.2' : 'spacing.2_5', width: size === 'SM' ? 'spacing.2' : 'spacing.2_5' },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, radioPaint),
  ],
}

// ── Toggle (the Switch) ────────────────────────────────────────────────────

const TOGGLE_GEOMETRY: Record<string, { knob: string; trackH: string; trackW: string; travel: string; gap: string }> = {
  // Track = knob + 2px inset each side; the knob travels width − knob − inset.
  MD: { knob: 'selector.control', trackH: 'selector.control+spacing.1', trackW: 'selector.control+spacing.5', travel: 'spacing.4', gap: 'spacing.2_5' },
  SM: { knob: 'selector.compact', trackH: 'selector.compact+spacing.1', trackW: 'selector.compact+spacing.4', travel: 'spacing.3', gap: 'spacing.2' },
}

function togglePaint(on: string, state: string): SlotMap {
  const isOn = on === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  const trackFill = disabled ? 'action.disabled.default'
    : isOn ? (hover ? 'action.primary.hover' : 'action.primary.default')
    : (hover ? 'action.secondary.hover' : 'action.secondary.default')
  return {
    track: { fill: c(trackFill), ring },
    thumb: { fill: c(isOn && !disabled ? 'content.on-action' : 'surface.input') },
    label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
  }
}

export const TOGGLE: ComponentRecipe = {
  key: 'Toggle',
  slots: ['root', 'track', 'thumb', 'label'],
  defaults: { On: 'True', Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      track: { radius: 'radius.pill' },
      thumb: { radius: 'radius.pill', shadow: 'shadow.xs' },
      label: { font: 'type.label' },
    })),
    part({ Size: ['MD', 'SM'] as const }, (size) => ({
      root: { gap: TOGGLE_GEOMETRY[size].gap },
      track: { height: TOGGLE_GEOMETRY[size].trackH, width: TOGGLE_GEOMETRY[size].trackW, travel: TOGGLE_GEOMETRY[size].travel },
      thumb: { height: TOGGLE_GEOMETRY[size].knob, width: TOGGLE_GEOMETRY[size].knob },
    })),
    part({ On: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, togglePaint),
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

export const FIELD: ComponentRecipe = {
  key: 'Field',
  slots: ['root', 'label', 'asterisk', 'description', 'error'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      label: { text: c('content.primary'), font: 'type.label' },
      asterisk: { text: c('status.critical.content') },
      description: { text: c('content.secondary'), font: 'type.helper' },
      error: { text: c('status.critical.content'), font: 'type.helper' },
    })),
  ],
}

export const LABEL: ComponentRecipe = {
  key: 'Label',
  slots: ['root', 'asterisk'],
  defaults: { Required: 'False' },
  parts: [
    part({ Required: ['False', 'True'] as const }, () => ({
      root: { text: c('content.primary'), font: 'type.label' },
      asterisk: { text: c('status.critical.content') },
    })),
  ],
}

const STRENGTH_FILL: Record<string, string> = {
  Weak: 'status.critical.surface-solid',
  Fair: 'status.warning.surface-solid',
  Strong: 'status.success.surface-solid',
}

export const PASSWORD_STRENGTH: ComponentRecipe = {
  key: 'PasswordStrength',
  slots: ['root', 'meter', 'segment', 'segmentOn', 'caption'],
  defaults: { Strength: 'Fair' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      meter: { gap: 'spacing.gap-tight' },
      segment: { fill: c('action.secondary.default'), height: 'spacing.1', radius: 'radius.pill' },
      segmentOn: { height: 'spacing.1', radius: 'radius.pill' },
      caption: { text: c('content.secondary'), font: 'type.helper' },
    })),
    part({ Strength: ['Weak', 'Fair', 'Strong'] as const }, (strength) => ({
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
          stroke: c(error ? 'status.critical.border-strong' : state === 'Dragging' ? 'border.accent' : 'border.strong'),
        },
        icon: { fill: c(error ? 'status.critical.surface' : 'surface.selected'), text: c(error ? 'status.critical.content' : 'content.accent') },
        link: { text: c('content.accent') },
        hint: { text: c(error ? 'status.critical.content' : 'content.secondary') },
      }
    }),
  ],
}

// ── Groups ─────────────────────────────────────────────────────────────────

function group(key: string, rowGap = 'spacing.2_5', withRows = false): ComponentRecipe {
  return {
    key,
    slots: withRows ? ['root', 'legend', 'row'] : ['root', 'legend'],
    defaults: {},
    parts: [
      part({}, () => ({
        root: { gap: rowGap },
        legend: { text: c('content.secondary'), font: 'type.label' },
        ...(withRows ? { row: { gap: 'spacing.3' } } : {}),
      })),
    ],
  }
}
export const CHECKBOX_GROUP = group('CheckboxGroup')
export const RADIO_GROUP = group('RadioGroup')
export const SWITCH_GROUP: ComponentRecipe = (() => {
  const base = group('SwitchGroup', 'spacing.3', true)
  return {
    ...base,
    slots: [...base.slots, 'rowLabel'],
    parts: [...base.parts, part({}, () => ({ rowLabel: { text: c('content.primary'), font: 'type.label' } }))],
  }
})()
