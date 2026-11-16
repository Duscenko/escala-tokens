import type { Meta, StoryObj } from '@storybook/react-vite'
import { DualSidebar } from '../../../../src/components/escala-ui/blocks/navigation'

/** The Figma `DualSidebar` block: composed of escala-ui components and role tokens. Persistent chrome: no motion on load. */
interface Args {
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/DualSidebar',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <DualSidebar />,
  args: {  },
  argTypes: {
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}
