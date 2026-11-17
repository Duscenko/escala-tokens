import type { Meta, StoryObj } from '@storybook/react-vite'
import { NAV_LAYOUTS, type NavLayout } from '../../../../src/components/escala-ui/blocks/navigation'
import { SidebarMockup } from '../../../../src/components/escala-ui/blocks/navigationShowcase'
import { NavigationOverview, PlaygroundMockup, Themed } from './navigationOverview'

/** The Figma `DualSidebar` block, shown as the file's SidebarNavigation · Prototype draws it: an app shell in a 1440
 *  desktop window (expanded and collapsed; the SidebarSimple toggle switches them) and a drawer over the Surface/overlay
 *  scrim in an iPhone. Persistent chrome: no motion on load. */
interface Args {
  layout: NavLayout
  panelVisible: boolean
}
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/DualSidebar',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (args, ctx) => (
    <Themed appearance={(ctx.globals.theme ?? 'light') as 'light' | 'dark'} viewport={args.layout === 'mobile' ? 'mobile' : 'desktop'}>
      <PlaygroundMockup layout={args.layout}><SidebarMockup layout={args.layout} expanded={args.panelVisible} /></PlaygroundMockup>
    </Themed>
  ),
  args: { layout: 'desktop', panelVisible: true },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...NAV_LAYOUTS], description: 'The prototype frame: the 1440 desktop window or the phone drawer.' },
    panelVisible: { name: 'PanelVisible', control: 'boolean', description: 'false is the collapsed state (the rail alone). The toggle in the main area flips it.' },
  },
}
export default meta
type Story = StoryObj<Args>

/** Desktop Light, Desktop Dark (expanded · collapsed) and Mobile (Light · Dark), as the Figma prototype page lays them out. */
export const Overview: Story = {
  render: () => (
    <NavigationOverview
      desktop={() => [<SidebarMockup layout="desktop" expanded />, <SidebarMockup layout="desktop" expanded={false} />]}
      mobile={() => <SidebarMockup layout="mobile" />}
    />
  ),
}

export const Playground: Story = {}
