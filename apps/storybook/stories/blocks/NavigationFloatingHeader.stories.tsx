import type { Meta, StoryObj } from '@storybook/react-vite'
import { FLOATING_NAVS, NAV_LAYOUTS, type FloatingNav, type NavLayout } from '../../../../src/components/escala-ui/blocks/navigation'
import { HeaderMockup } from '../../../../src/components/escala-ui/blocks/navigationShowcase'
import { NavigationOverview, PlaygroundMockup, Themed } from './navigationOverview'

/** The Figma `FloatingHeader` block (Layout desktop · mobile), shown as the file's HeaderNavigation · Prototype draws it:
 *  Header 04 (icon nav) and Header 05 (link nav) floating Spacing/inset-page below the top of a 1440 desktop window,
 *  and Spacing/gap-control inside an iPhone. Persistent chrome: no motion on load. */
interface Args {
  layout: NavLayout
  nav: FloatingNav
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/FloatingHeader',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args, ctx) => (
    <Themed appearance={(ctx.globals.theme ?? 'light') as 'light' | 'dark'} viewport={args.layout === 'mobile' ? 'mobile' : 'desktop'}>
      <PlaygroundMockup layout={args.layout}><HeaderMockup block="FloatingHeader" layout={args.layout} nav={args.nav} /></PlaygroundMockup>
    </Themed>
  ),
  args: { layout: 'desktop', nav: 'links' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...NAV_LAYOUTS], description: 'desktop · mobile: a viewport switch of the same anatomy, never animated.' },
    nav: { name: 'Nav', control: 'select', options: [...FLOATING_NAVS], description: 'The Nav slot: NavItem links (Header 05) or icon-only IconButtons (Header 04). Mobile collapses it behind the menu.' },
  },
}
export default meta
type Story = StoryObj<Args>

/** Desktop Light, Desktop Dark (icon nav · link nav) and Mobile (Light · Dark), as the Figma prototype page lays them out. */
export const Overview: Story = {
  render: () => (
    <NavigationOverview
      desktop={() => [<HeaderMockup block="FloatingHeader" layout="desktop" nav="icons" />, <HeaderMockup block="FloatingHeader" layout="desktop" nav="links" />]}
      mobile={() => <HeaderMockup block="FloatingHeader" layout="mobile" />}
    />
  ),
}

export const Playground: Story = {}
