import type { Meta, StoryObj } from '@storybook/react-vite'
import { InputTagChip, type InputTagChipSize, type InputTagChipState, type InputTagChipVariant } from '../../../src/components/escala-ui/input-tag'

const SIZES: InputTagChipSize[] = ['xs', 'sm', 'default', 'lg', 'xl']
const STATES: InputTagChipState[] = ['Default', 'Hover', 'Focused', 'Disabled']
const VARIANTS: InputTagChipVariant[] = ['default', 'critical']

/** Story args = the Figma `InputTagChip` set (388:235), in the panel's order and with its
 *  defaults: Size · State · Variant, then Label · RemoveVisible. */
interface InputTagChipStoryArgs {
  size: InputTagChipSize
  forceState: InputTagChipState
  variant: InputTagChipVariant
  label: string
  removable: boolean
}

function render({ size, forceState, variant, label, removable }: InputTagChipStoryArgs) {
  return (
    <InputTagChip
      size={size}
      variant={variant}
      forceState={forceState === 'Default' ? undefined : forceState}
      removable={removable}
    >
      {label}
    </InputTagChip>
  )
}

const meta: Meta<InputTagChipStoryArgs> = {
  title: 'Forms/InputTagChip',
  render,
  args: { size: 'default', forceState: 'Default', variant: 'default', label: 'Design', removable: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Height 18 · 20 · 24 · 28 · 32.' },
    forceState: { name: 'State', control: 'select', options: STATES },
    variant: { name: 'Variant', control: 'select', options: VARIANTS, description: 'critical marks a tag past the maximum.' },
    label: { name: 'Label', control: 'text' },
    removable: { name: 'RemoveVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<InputTagChipStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Variant, as the file's 40 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {VARIANTS.flatMap((variant) => SIZES.flatMap((size) => STATES.map((forceState) => (
        <div key={`${variant}-${size}-${forceState}`}>{render({ ...args, variant, size, forceState })}</div>
      ))))}
    </div>
  ),
}
