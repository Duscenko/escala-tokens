import type { Meta, StoryObj } from '@storybook/react-vite'
import { PricingCard } from '../../../../src/components/escala-ui/blocks/marketing'

/** The Figma `PricingCard` block: escala-ui components and role tokens only. */
interface Args {
}
const meta: Meta<Args> = {
  title: 'Blocks/Marketing/PricingCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <PricingCard />,
  args: {  },
  argTypes: {
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}
