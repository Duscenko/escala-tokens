import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardActivityCard } from '../../../../src/components/escala-ui/blocks/dashboard'
import { FIGMA_SAMPLE, SAMPLE_END } from '../activityHeatmapSample'

/** Figma `DashboardActivityCard` (2401:362, page Dashboard (PRO)): total, year switch, ActivityHeatmap, Separator and a caption.
 *  The story feeds the file's own picture of the heatmap and its written total. */
const meta: Meta<typeof DashboardActivityCard> = {
  title: 'Blocks/Dashboard/DashboardActivityCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  component: DashboardActivityCard,
  args: { data: FIGMA_SAMPLE, endDate: SAMPLE_END, heading: '1,170 contributions in 2025' },
}
export default meta
type Story = StoryObj<typeof DashboardActivityCard>

export const Playground: Story = {}
