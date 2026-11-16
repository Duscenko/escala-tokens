import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarStatCard } from '../../../../src/components/escala-ui/blocks/navigation'

/** The Figma `SidebarStatCard` block: composed of escala-ui components and role tokens. Persistent chrome: no motion on load. */
interface Args {
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/SidebarStatCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <SidebarStatCard />,
  args: {  },
  argTypes: {
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}
