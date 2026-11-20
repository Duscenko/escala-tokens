import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardMetricCard } from '../../../../src/components/escala-ui/blocks/dashboard'

/** Figma `DashboardMetricCard` (2401:325, page Dashboard (PRO)): label, value, delta, a Sparkline and a range switch. */
const meta: Meta<typeof DashboardMetricCard> = {
  title: 'Blocks/Dashboard/DashboardMetricCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  component: DashboardMetricCard,
}
export default meta
type Story = StoryObj<typeof DashboardMetricCard>

export const Playground: Story = {}
