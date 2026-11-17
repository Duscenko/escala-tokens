import type { Meta, StoryObj } from '@storybook/react-vite'
import { NAV_LAYOUTS, type NavLayout } from '../../../../src/components/escala-ui/blocks/navigation'
import { HeaderMockup } from '../../../../src/components/escala-ui/blocks/navigationShowcase'
import { NavigationOverview, PlaygroundMockup, Themed } from './navigationOverview'

/** The Figma `AppHeaderExtended` block (Layout desktop · mobile), shown as the file's HeaderNavigation · Prototype draws it:
 *  Header 02 (announcement, utility bar, header, breadcrumb) at the top of a 1440 desktop window and of an iPhone. Persistent chrome: no motion on load. */
interface Args {
  layout: NavLayout
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/AppHeaderExtended',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args, ctx) => (
    <Themed appearance={(ctx.globals.theme ?? 'light') as 'light' | 'dark'} viewport={args.layout === 'mobile' ? 'mobile' : 'desktop'}>
      <PlaygroundMockup layout={args.layout}><HeaderMockup block="AppHeaderExtended" layout={args.layout} /></PlaygroundMockup>
    </Themed>
  ),
  args: { layout: 'desktop' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...NAV_LAYOUTS], description: 'desktop · mobile: a viewport switch of the same anatomy, never animated.' },
  },
}
export default meta
type Story = StoryObj<Args>

/** Desktop Light, Desktop Dark and Mobile (Light · Dark), as the Figma prototype page lays them out. */
export const Overview: Story = {
  render: () => <NavigationOverview desktop={() => [<HeaderMockup block="AppHeaderExtended" layout="desktop" />]} mobile={() => <HeaderMockup block="AppHeaderExtended" layout="mobile" />} />,
}

export const Playground: Story = {}
