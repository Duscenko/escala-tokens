import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComboboxGroupLabel, COMBOBOX_SIZES, type ComboboxSize } from '../../../src/components/escala-ui/combobox'

/** Story args = the Figma `ComboboxGroupLabel` set (406:147): Size, then Label. */
interface ComboboxGroupLabelStoryArgs {
  size: ComboboxSize
  label: string
}

function render({ size, label }: ComboboxGroupLabelStoryArgs) {
  return <div style={{ width: 256 }}><ComboboxGroupLabel size={size}>{label}</ComboboxGroupLabel></div>
}

const meta: Meta<ComboboxGroupLabelStoryArgs> = {
  title: 'Forms/ComboboxGroupLabel',
  render,
  args: { size: 'default', label: 'Group' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...COMBOBOX_SIZES], description: 'Type/caption · label · label.' },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<ComboboxGroupLabelStoryArgs>

export const Playground: Story = {}

/** The file's 3 variants. */
export const AllSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {COMBOBOX_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}
