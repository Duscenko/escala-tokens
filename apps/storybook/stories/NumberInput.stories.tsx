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
