import type { Meta, StoryObj } from '@storybook/react-vite'
import { AnnouncementBar } from '../../../../src/components/escala-ui/blocks/navigation'

/** The Figma `AnnouncementBar` block: composed of escala-ui components and role tokens. Persistent chrome: no motion on load. */
interface Args {
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/AnnouncementBar',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <AnnouncementBar />,
  args: {  },
  argTypes: {
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}
