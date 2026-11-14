import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sidebar, SidebarGroup, SidebarGroupLabel, SIDEBAR_SIZES, type SidebarSize } from '../../../src/components/escala-ui/sidebar'

/** Story args = the Figma `SidebarGroupLabel` set (980:390): Size, then Label. */
interface LabelStoryArgs { size: SidebarSize; label: string }

const meta: Meta<LabelStoryArgs> = {
  title: 'Navigation/SidebarGroupLabel',
  render: ({ size, label }) => (
    <Sidebar className="!h-auto !w-auto !border-0 !bg-transparent">
      <SidebarGroup size={size} style={{ width: 256 }}><SidebarGroupLabel>{label}</SidebarGroupLabel></SidebarGroup>
    </Sidebar>
  ),
  args: { size: 'default', label: 'Platform' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SIDEBAR_SIZES] },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<LabelStoryArgs>

export const Playground: Story = {}
