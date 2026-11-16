import type { Meta, StoryObj } from '@storybook/react-vite'
import { Footer, MARKETING_LAYOUTS, type MarketingLayout } from '../../../../src/components/escala-ui/blocks/marketing'

/** The Figma `Footer` block (Layout desktop · mobile): escala-ui components and role tokens only. */
interface Args {
  layout: MarketingLayout
}
const meta: Meta<Args> = {
  title: 'Blocks/Marketing/Footer',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <Footer layout={args.layout} />,
  args: { layout: 'desktop' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...MARKETING_LAYOUTS], description: 'desktop · mobile: a viewport switch, never animated.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Layout values. */
export const Layouts: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {MARKETING_LAYOUTS.map((layout) => <div key={layout} style={{ maxWidth: layout === 'mobile' ? 402 : undefined }}><Footer layout={layout} /></div>)}
    </div>
  ),
}
