import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Input, INPUT_SIZES, INPUT_TYPES, type InputSize, type InputState, type InputType,
} from '../../../src/components/escala-ui/input'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `Input` set's properties (design-plans/input-contract.md), in
 *  the file's panel order: Size · State · Type · Value (variant axes), then
 *  IconLeadingVisible · Placeholder · IconTrailingVisible · IconLeadingIcon ·
 *  IconTrailingIcon · ShortcutVisible. Value is a typed value or none. */
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
      key={`${a.type}-${a.value}`}
      size={a.size}
      type={a.type}
      forceState={a.forceState}
      disabled={a.forceState === 'Disabled'}
      placeholder={a.placeholder || COPY[a.type].placeholder}
      defaultValue={a.value === 'filled' ? COPY[a.type].filled : undefined}
      aria-label={COPY[a.type].placeholder}
      leading={!a.iconLeadingVisible ? null : own ? undefined : <PreviewIcon concept={a.iconLeadingIcon} size={px} />}
      trailing={!a.iconTrailingVisible ? null : own ? undefined : <PreviewIcon concept={a.iconTrailingIcon} size={px} />}
      shortcut={a.shortcutVisible ? undefined : null}
      style={{ width: 260 }}
    />
  )
}

const meta: Meta<InputStoryArgs> = {
  title: 'Form Controls/Input',
  render,
  args: {
    size: 'default', forceState: 'Default', type: 'default', value: 'placeholder',
    iconLeadingVisible: true, placeholder: 'Jane Doe', iconTrailingVisible: true,
    iconLeadingIcon: 'search', iconTrailingIcon: 'eye', shortcutVisible: true,
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
  },
}
export default meta
type Story = StoryObj<InputStoryArgs>

export const Playground: Story = {}

const label = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px', textAlign: 'center' as const }

/** The file's own page: the ten composed Types at rest and focused (the caret and the
 *  ring mark the active field). Hover and press the resting ones to try them. */
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
        {EXAMPLES.map((e) => (
          <Input
            key={e.type}
            type={e.type}
            forceState={focused ? 'Focused' : undefined}
            placeholder={focused ? e.focus : e.placeholder}
            aria-label={e.placeholder}
            shortcut={e.type === 'search' ? null : undefined}
          />
        ))}
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

/** Every Type, placeholder and filled, at the default size. */
export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 260px)', gap: 16 }}>
      {INPUT_TYPES.flatMap((type) => (['placeholder', 'filled'] as const).map((value) => (
        <div key={`${type}-${value}`}>
          {render({ ...(meta.args as InputStoryArgs), type, value, placeholder: '' })}
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
          {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, value })}</div>)}
        </div>
      ))}
    </div>
  ),
}
