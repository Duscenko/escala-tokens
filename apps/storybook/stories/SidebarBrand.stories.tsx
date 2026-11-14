import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { Sidebar, SidebarBrand } from '../../../src/components/escala-ui/sidebar'

/** Story args = the Figma `SidebarBrand` set (980:419): Collapsed, then Title · SubtitleVisible / Subtitle; the Logo is a slot. */
interface BrandStoryArgs { collapsed: boolean; title: string; subtitleVisible: boolean; subtitle: string }

const meta: Meta<BrandStoryArgs> = {
  title: 'Navigation/SidebarBrand',
  render: ({ collapsed, title, subtitleVisible, subtitle }) => (
    <Sidebar collapsed={collapsed} className="!h-auto !w-auto !border-0 !bg-transparent">
      <SidebarBrand
        logo={<Avatar type="initials" size="sm" shape="rounded" variant="default" appearance="solid">E</Avatar>}
        title={title}
        subtitle={subtitleVisible ? subtitle : undefined}
      />
    </Sidebar>
  ),
  args: { collapsed: false, title: 'Escala', subtitleVisible: true, subtitle: 'Design system' },
  argTypes: {
    collapsed: { name: 'Collapsed', control: 'boolean' },
    title: { name: 'Title', control: 'text' },
    subtitleVisible: { name: 'SubtitleVisible', control: 'boolean' },
    subtitle: { name: 'Subtitle', control: 'text', if: { arg: 'subtitleVisible' } },
  },
}
export default meta
type Story = StoryObj<BrandStoryArgs>

export const Playground: Story = {}
