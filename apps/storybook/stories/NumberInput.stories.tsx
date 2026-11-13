import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberInput, NUMBER_INPUT_SIZES, type NumberInputSize, type NumberInputState } from '../../../src/components/escala-ui/number-input'

const STATES: NumberInputState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled']

/** Story args = the Figma `NumberInput` set (design-plans/number-input-contract.md):
 *  Size · State (variant axes, the file's option order), then Value. */
interface NumberInputStoryArgs {
  size: NumberInputSize
  forceState: NumberInputState
  value: number
}

function render({ size, forceState, value }: NumberInputStoryArgs) {
  return (
    <NumberInput
      aria-label="Quantity"
      size={size}
      forceState={forceState === 'Default' ? undefined : forceState}
      disabled={forceState === 'Disabled'}
      defaultValue={value}
      key={value}
    />
  )
}

const meta: Meta<NumberInputStoryArgs> = {
  title: 'Forms/NumberInput',
  render,
  args: { size: 'default', forceState: 'Default', value: 1 },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...NUMBER_INPUT_SIZES], description: 'Size/control-md 40 · sm 32 · lg 48; the buttons are one IconButton size below.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    value: { name: 'Value', control: 'number' },
  },
}
export default meta
type Story = StoryObj<NumberInputStoryArgs>

export const Playground: Story = {}

/** Every Size × State, as the file's 15 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: 24, alignItems: 'center' }}>
      {STATES.flatMap((forceState) => NUMBER_INPUT_SIZES.map((size) => <div key={`${forceState}-${size}`}>{render({ ...args, size, forceState })}</div>))}
    </div>
  ),
}

/** Bounds: at the min the decrement button is Disabled, at the max the increment one. */
export const Bounds: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <NumberInput aria-label="At min" defaultValue={0} min={0} max={5} />
      <NumberInput aria-label="At max" defaultValue={5} min={0} max={5} />
    </div>
  ),
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page. RESTING: sm · default · lg at 2 · 1 · 4 — the default
 *  one sits at its min, so its − is Disabled. FOCUSED: 12 with the caret and the focus
 *  ring; 0 Invalid (red edge + halo) at its min, − Disabled; 10 at its max, + Disabled. */
export const RestingFocused: Story = {
  name: 'Resting · Focused',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>RESTING · hover the field or press a stepper to try</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <NumberInput aria-label="Quantity, small" size="sm" defaultValue={2} min={0} max={99} />
          <NumberInput aria-label="Quantity" defaultValue={1} min={1} max={99} />
          <NumberInput aria-label="Quantity, large" size="lg" defaultValue={4} min={0} max={99} />
        </div>
      </div>
      <div>
        <p style={caption}>FOCUSED · ring on the field; Error and the limits disable a stepper</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <NumberInput aria-label="Seats" forceState="Focused" defaultValue={12} min={0} max={99} />
          <NumberInput aria-label="Guests" aria-invalid defaultValue={0} min={0} max={99} />
          <NumberInput aria-label="Rooms" defaultValue={10} min={0} max={10} />
        </div>
      </div>
    </div>
  ),
}
