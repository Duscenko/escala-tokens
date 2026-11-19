import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Input, INPUT_SIZES, INPUT_TYPES, type InputSize, type InputState, type InputType,
} from '../../../src/components/escala-ui/input'
import { PhoneNumberInput } from '../../../src/components/escala-ui/blocks/phoneNumber'
import { CurrencyInput } from '../../../src/components/escala-ui/blocks/currencyInput'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `Input` set's properties (design-plans/input-contract.md), in
 *  the file's panel order: Size · State · Type · Value (variant axes), then
 *  IconLeadingVisible · Placeholder · IconTrailingVisible · IconLeadingIcon ·
 *  IconTrailingIcon · ShortcutVisible · Value (TEXT, since 2026-11-19: the text of every filled variant; its default
 *  in the file is the card number, whatever the Type). The Value AXIS says whether a value is present. */
interface InputStoryArgs {
  size: InputSize
  forceState: InputState
  type: InputType
  value: 'placeholder' | 'filled'
  iconLeadingVisible: boolean
  placeholder: string
  iconTrailingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingIcon: ComponentIconName
  shortcutVisible: boolean
  /** Figma `Value` (TEXT). Empty = each Type's own sample (the matrices). */
  valueText: string
}

const STATES: InputState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled']

/** Each Type's placeholder and filled value, as the file writes them. */
const COPY: Record<InputType, { placeholder: string; filled: string }> = {
  default: { placeholder: 'Jane Doe', filled: 'Jane Doe' },
  phone: { placeholder: 'Mobile number', filled: '612 555 0199' },
  currency: { placeholder: '0.00', filled: '1,250.00' },
  'currency-select': { placeholder: '0.00', filled: '1,250.00' },
  password: { placeholder: 'Your password', filled: 'escala-secret' },
  url: { placeholder: 'yourcompany.com', filled: 'escala.design' },
  upload: { placeholder: 'No file chosen', filled: '' },
  tag: { placeholder: 'username', filled: 'maria.farerro' },
  'copy-link': { placeholder: 'Invite link', filled: 'escala.ds/join/4f2a' },
  'credit-card': { placeholder: '16-digit card number', filled: '4242 4242 4242 4242' },
  search: { placeholder: 'Jane Doe', filled: 'Jane Doe' },
}

function render(a: InputStoryArgs) {
  const px = ICON_PX[a.size === 'sm' ? 'sm' : 'default']
  // The default Type draws its icons from the playground's swaps; every other Type
  // brings its own (search, lock, folder, eye) and the booleans hide them.
  const own = a.type !== 'default'
  return (
    <Input
      key={`${a.type}-${a.value}-${a.valueText}`}
      size={a.size}
      type={a.type}
      forceState={a.forceState}
      disabled={a.forceState === 'Disabled'}
      placeholder={a.placeholder || COPY[a.type].placeholder}
      defaultValue={a.value === 'filled' ? (a.valueText || COPY[a.type].filled) : undefined}
      aria-label={COPY[a.type].placeholder}
      leading={!a.iconLeadingVisible ? null : own ? undefined : <PreviewIcon concept={a.iconLeadingIcon} size={px} />}
      trailing={!a.iconTrailingVisible ? null : own ? undefined : <PreviewIcon concept={a.iconTrailingIcon} size={px} />}
      shortcut={a.shortcutVisible ? undefined : null}
      style={{ width: 260 }}
    />
  )
}

const meta: Meta<InputStoryArgs> = {
  title: 'Forms/Input',
  render,
  args: {
    size: 'default', forceState: 'Default', type: 'default', value: 'placeholder',
    iconLeadingVisible: true, placeholder: 'Jane Doe', iconTrailingVisible: true,
    iconLeadingIcon: 'search', iconTrailingIcon: 'eye', shortcutVisible: true, valueText: '4242 4242 4242 4242',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...INPUT_SIZES], description: 'Size/control-md 40 · control-sm 32 · control-lg 48.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover / Focused come from the pointer and keyboard, Invalid from aria-invalid.' },
    type: { name: 'Type', control: 'select', options: [...INPUT_TYPES], description: 'The parts the field composes.' },
    value: { name: 'Value', control: 'inline-radio', options: ['placeholder', 'filled'] },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    placeholder: { name: 'Placeholder', control: 'text' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'type', eq: 'default' } },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'type', eq: 'default' } },
    shortcutVisible: { name: 'ShortcutVisible', control: 'boolean', if: { arg: 'type', eq: 'search' } },
    valueText: { name: 'Value (text)', control: 'text', if: { arg: 'value', eq: 'filled' }, description: 'Figma Value (TEXT): the text a filled field shows. In code it is `value` / `defaultValue`.' },
  },
}
export default meta
type Story = StoryObj<InputStoryArgs>

export const Playground: Story = {}

const label = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px', textAlign: 'center' as const }

/** The file's own page: the ten composed Types at rest and focused (the caret and the
 *  ring mark the active field). Hover and press the resting ones to try them. Phone and
 *  currency are the live pickers (PhoneNumberInput, CurrencyInput); Copy confirms with a check. */
const EXAMPLES: { type: InputType; placeholder: string; focus: string }[] = [
  { type: 'search', placeholder: 'Search customers', focus: 'Search orders' },
  { type: 'phone', placeholder: 'Mobile number', focus: 'Mobile number' },
  { type: 'currency', placeholder: '0.00', focus: '0.00' },
  { type: 'password', placeholder: 'Your password', focus: 'Your password' },
  { type: 'url', placeholder: 'yourcompany.com', focus: 'yourcompany.com' },
  { type: 'upload', placeholder: 'No file chosen', focus: 'No file chosen' },
  { type: 'tag', placeholder: 'username', focus: 'username' },
  { type: 'copy-link', placeholder: 'Invite link', focus: 'Invite link' },
  { type: 'currency-select', placeholder: '0.00', focus: '0.00' },
  { type: 'credit-card', placeholder: '16-digit card number', focus: '16-digit card number' },
]
function Grid({ focused }: { focused: boolean }) {
  return (
    <div>
      <p style={label}>{focused ? 'FOCUSED · ring and caret mark the active field' : 'RESTING · hover and press to try'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 308px)', gap: '18px 10px' }}>
        {EXAMPLES.map((e) => {
          const common = { forceState: focused ? ('Focused' as const) : undefined, placeholder: focused ? e.focus : e.placeholder, 'aria-label': e.placeholder }
          // The two types with a picker draw the composed fields: the country and the currency open an anchored Popover.
          if (e.type === 'phone') return <PhoneNumberInput key={e.type} defaultCountry="US" {...common} />
          if (e.type === 'currency-select') return <CurrencyInput key={e.type} {...common} />
          return <Input key={e.type} type={e.type} {...common} shortcut={e.type === 'search' ? null : undefined} />
        })}
      </div>
    </div>
  )
}
export const RestingFocused: Story = {
  name: 'Resting · Focused',
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <Grid focused={false} />
      <Grid focused />
    </div>
  ),
}

/** Size × Type, as the Figma DocMatrix draws it: one group per Type, a column per Size, placeholder and filled. */
export const SizeByType: Story = {
  name: 'Size × Type',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(3, 260px)', gap: 12, alignItems: 'center' }}>
      <span />
      {(['sm', 'default', 'lg'] as const).map((size) => <p key={size} style={{ ...label, margin: 0 }}>{size}</p>)}
      {INPUT_TYPES.flatMap((type) => (['placeholder', 'filled'] as const).map((value) => (
        <div key={`${type}-${value}`} style={{ display: 'contents' }}>
          <p style={{ ...label, margin: 0, textAlign: 'left' }}>{type} · {value}</p>
          {(['sm', 'default', 'lg'] as const).map((size) => (
            <Input
              key={size}
              size={size}
              type={type}
              placeholder={COPY[type].placeholder}
              defaultValue={value === 'filled' ? COPY[type].filled : undefined}
              aria-label={`${type} ${size} ${value}`}
            />
          ))}
        </div>
      )))}
    </div>
  ),
}

/** Size × State for every Type: the glyphs stay `Content/subtle` beside the typed value; only Disabled changes them. */
export const SizeByTypeStates: Story = {
  name: 'Size × Type · States',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 220px)', gap: 12, alignItems: 'center' }}>
      <span />
      {STATES.map((state) => <p key={state} style={{ ...label, margin: 0 }}>{state}</p>)}
      {INPUT_TYPES.flatMap((type) => (['sm', 'default', 'lg'] as const).map((size) => (
        <div key={`${type}-${size}`} style={{ display: 'contents' }}>
          <p style={{ ...label, margin: 0, textAlign: 'left' }}>{type} · {size}</p>
          {STATES.map((state) => (
            <Input
              key={state}
              size={size}
              type={type}
              forceState={state}
              disabled={state === 'Disabled'}
              placeholder={COPY[type].placeholder}
              defaultValue={COPY[type].filled || undefined}
              aria-label={`${type} ${size} ${state}`}
            />
          ))}
        </div>
      )))}
    </div>
  ),
}

/** Every Type, placeholder and filled, at the default size. */
export const Types: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 260px)', gap: 16 }}>
      {INPUT_TYPES.flatMap((type) => (['placeholder', 'filled'] as const).map((value) => (
        <div key={`${type}-${value}`}>
          {render({ ...(meta.args as InputStoryArgs), type, value, placeholder: '', valueText: '' })}
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {INPUT_SIZES.map((size) => <div key={size}>{render({ ...args, size, type: 'search' })}</div>)}
    </div>
  ),
}

/** Every State of the current Type — placeholder on top, a typed value below. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['placeholder', 'filled'] as const).map((value) => (
        <div key={value} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, value, valueText: '' })}</div>)}
        </div>
      ))}
    </div>
  ),
}

/**
 * Type=phone with a typed number in every State. The Figma set draws one Filled variant for the phone (Default); the code holds a value in
 * Hover, Focused, Invalid and Disabled too, so the contract gap is closed here first (flagged for the Figma sync: Input Type=phone · Value=filled ×
 * Hover · Focused · Invalid · Disabled).
 */
export const PhoneFilledStates: Story = {
  name: 'Phone · filled · every state',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 280 }}>
      {STATES.map((forceState) => (
        <div key={forceState}>
          <p style={label}>{forceState}</p>
          {render({ ...args, type: 'phone', value: 'filled', forceState, valueText: '' })}
        </div>
      ))}
    </div>
  ),
}
