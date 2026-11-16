import type { Meta, StoryObj } from '@storybook/react-vite'
import { UtilityBar } from '../../../../src/components/escala-ui/blocks/navigation'

/** The Figma `UtilityBar` block: composed of escala-ui components and role tokens. Persistent chrome: no motion on load. */
interface Args {
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/UtilityBar',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <UtilityBar />,
  args: {  },
  argTypes: {
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}
