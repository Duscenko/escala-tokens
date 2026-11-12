import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input, type InputSize, type InputState } from '../../../src/components/escala-ui/input'

/** Story args = the Figma `Input` set's properties (design-plans/input-contract.md):
 *  `Size` and `State` are its variant axes that map to real props (`Value` needs none —
 *  the real <input> already tells a typed value from its own placeholder). The file's
 *  `Type` axis (phone, currency, password…) is InputGroup composed around this same bare
 *  box, not a prop here — see the contract's "Lo que queda fuera de esta pasada". */
interface InputStoryArgs {
  size: InputSize
  forceState: InputState
  placeholder: string
  value: string
}

const SIZES: InputSize[] = ['sm', 'default', 'lg']
const STATES: InputState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled']

function render({ size, forceState, placeholder, value }: InputStoryArgs) {
  return (
    <Input
      size={size}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      placeholder={placeholder}
      defaultValue={value || undefined}
      aria-label={placeholder}
      style={{ width: 260 }}
    />
  )
}

const meta: Meta<InputStoryArgs> = {
  title: 'Form Controls/Input',
  render,
  args: { size: 'default', forceState: 'Default', placeholder: 'Jane Doe', value: '' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Size/control-sm 32 · control-md 40 · control-lg 48.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover / Focused come from the pointer and keyboard, Invalid from aria-invalid.' },
    placeholder: { name: 'Placeholder', control: 'text' },
    value: { name: 'Value', control: 'text', description: 'A typed value (Figma Value=filled) reads content.primary; empty keeps the placeholder (content.subtle).' },
  },
}
export default meta
type Story = StoryObj<InputStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 260 }}>
      {SIZES.map((size) => <Input key={size} size={size} placeholder={`Size ${size}`} aria-label={`Size ${size}`} />)}
    </div>
  ),
}

/** Every State at the default Size — placeholder on top, a typed value below. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {STATES.map((forceState) => (
          <Input key={forceState} forceState={forceState} disabled={forceState === 'Disabled'} placeholder={forceState} aria-label={forceState} style={{ width: 220 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {STATES.map((forceState) => (
          <Input key={forceState} forceState={forceState} disabled={forceState === 'Disabled'} defaultValue={`${forceState} value`} aria-label={`${forceState} value`} style={{ width: 220 }} />
        ))}
      </div>
    </div>
  ),
}
