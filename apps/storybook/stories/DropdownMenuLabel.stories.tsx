import type { Meta, StoryObj } from '@storybook/react-vite'
import { DropdownMenuLabel, DROPDOWN_MENU_SIZES, type DropdownMenuSize } from '../../../src/components/escala-ui/dropdown-menu'

/** Story args = the Figma `DropdownMenuLabel` set (design-plans/dropdown-menu-contract.md): Size, then Label. */
interface LabelStoryArgs { size: DropdownMenuSize; label: string }

const meta: Meta<LabelStoryArgs> = {
  title: 'Navigation/DropdownMenuLabel',
  render: ({ size, label }) => <div style={{ width: 256 }}><DropdownMenuLabel size={size}>{label}</DropdownMenuLabel></div>,
  args: { size: 'default', label: 'Action' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...DROPDOWN_MENU_SIZES] },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<LabelStoryArgs>

export const Playground: Story = {}
