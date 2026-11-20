import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardGaugeCard } from '../../../../src/components/escala-ui/blocks/dashboard'

/** Figma `DashboardGaugeCard` (2401:309, page Dashboard (PRO)): one health score, a Gauge, a title and a status line. */
const meta: Meta<typeof DashboardGaugeCard> = {
  title: 'Blocks/Dashboard/DashboardGaugeCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  component: DashboardGaugeCard,
}
export default meta
type Story = StoryObj<typeof DashboardGaugeCard>

export const Playground: Story = {}
export const Critical: Story = { args: { variant: 'critical', value: 18, label: 'At risk', description: '4 of 20 checks passing' } }
