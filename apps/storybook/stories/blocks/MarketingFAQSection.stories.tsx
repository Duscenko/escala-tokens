import type { Meta, StoryObj } from '@storybook/react-vite'
import { FAQSection, MARKETING_LAYOUTS, type MarketingLayout, FAQ_STYLES, type FaqStyle } from '../../../../src/components/escala-ui/blocks/marketing'

/** The Figma `FAQSection` block (Layout desktop · mobile, Style split · centered): escala-ui components and role tokens only. */
interface Args {
  layout: MarketingLayout
  faqStyle: FaqStyle
}
const meta: Meta<Args> = {
  title: 'Blocks/Marketing/FAQSection',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <FAQSection layout={args.layout} faqStyle={args.faqStyle} />,
  args: { layout: 'desktop', faqStyle: 'split' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...MARKETING_LAYOUTS], description: 'desktop · mobile: a viewport switch, never animated.' },
    faqStyle: { name: 'Style', control: 'select', options: [...FAQ_STYLES] },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Layout values. */
export const Layouts: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {MARKETING_LAYOUTS.map((layout) => <div key={layout} style={{ maxWidth: layout === 'mobile' ? 402 : undefined }}><FAQSection layout={layout} faqStyle={args.faqStyle} /></div>)}
    </div>
  ),
}
