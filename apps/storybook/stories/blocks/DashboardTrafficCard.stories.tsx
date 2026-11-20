import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardTrafficCard } from '../../../../src/components/escala-ui/blocks/dashboard'

/** Figma `DashboardTrafficCard` (2401:844, page Dashboard (PRO)): range switch, title, total and a SplitBar of six sources. */
const meta: Meta<typeof DashboardTrafficCard> = {
  title: 'Blocks/Dashboard/DashboardTrafficCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  component: DashboardTrafficCard,
}
export default meta
type Story = StoryObj<typeof DashboardTrafficCard>

export const Playground: Story = {}
