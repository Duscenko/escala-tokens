import { c, NONE, part, type ComponentRecipe, type SlotMap, type SlotProps } from './helpers'

// ── Input ──────────────────────────────────────────────────────────────────

const INPUT_SIZES = ['MD', 'SM', 'XS'] as const
const INPUT_STATES = ['Default', 'Hover', 'Focused', 'Filled', 'Error', 'Loading', 'Disabled'] as const

function inputPaint(state: string): SlotMap {
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const stroke = disabled ? 'action.disabled.default'
    : error ? 'status.critical.border-strong'
    : state === 'Focused' ? 'border.focus'
    : state === 'Hover' ? 'border.control-hover'
    : 'border.strong'
  return {
    label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    field: {
      fill: c(disabled ? 'action.disabled.default' : 'surface.input'),
      stroke: c(stroke),
      ring: state === 'Focused' ? c('border.ring.default') : NONE,
    },
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
      field: { radius: 'radius.action', strokeWidth: 'stroke.control', paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
      hint: { font: 'type.helper' },
    })),
    part({ Size: INPUT_SIZES }, (size) => ({ field: INPUT_GEOMETRY[size] })),
    part({ State: INPUT_STATES }, inputPaint),
  ],
}

