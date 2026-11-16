import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppHeader, NAV_LAYOUTS, type NavLayout } from '../../../../src/components/escala-ui/blocks/navigation'

/** The Figma `AppHeader` block (Layout desktop · mobile): composed of escala-ui components and role tokens. Persistent chrome: no motion on load. */
interface Args {
  layout: NavLayout
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/AppHeader',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args) => <AppHeader layout={args.layout} />,
  args: { layout: 'desktop' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...NAV_LAYOUTS], description: 'desktop · mobile: a viewport switch of the same anatomy, never animated.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Layout values, as the Figma set draws them. */
export const Layouts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {NAV_LAYOUTS.map((layout) => <div key={layout} style={{ maxWidth: layout === 'mobile' ? 402 : undefined }}><AppHeader layout={layout} /></div>)}
    </div>
  ),
}
