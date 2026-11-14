import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Sidebar, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SIDEBAR_SIZES, type SidebarSize,
} from '../../../src/components/escala-ui/sidebar'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `SidebarGroup` set (982:292): Size · Collapsed, then LabelVisible; the Content slot is the SidebarMenu. */
interface GroupStoryArgs { size: SidebarSize; collapsed: boolean; labelVisible: boolean }

const ITEMS = [
  { label: 'Overview', icon: 'home' as const },
  { label: 'Tokens', icon: 'search' as const },
  { label: 'Components', icon: 'plus' as const },
  { label: 'Settings', icon: 'lock' as const },
]

function group(a: GroupStoryArgs) {
  const px = a.size === 'lg' ? 20 : 16
  return (
    <Sidebar collapsed={a.collapsed} className="!h-auto !w-auto !border-0 !bg-transparent">
      <SidebarGroup size={a.size} aria-labelledby="sb-group" style={{ width: a.collapsed ? undefined : 256 }}>
        {a.labelVisible && <SidebarGroupLabel id="sb-group">Platform</SidebarGroupLabel>}
        <SidebarMenu>
          {ITEMS.map((item, i) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton icon={<PreviewIcon concept={item.icon} size={px} />} state={i === 0 ? 'Current' : undefined}>{item.label}</SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </Sidebar>
  )
}

const meta: Meta<GroupStoryArgs> = {
  title: 'Navigation/SidebarGroup',
  render: (args) => group(args),
  args: { size: 'default', collapsed: false, labelVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SIDEBAR_SIZES], description: 'Cascades to every row.' },
    collapsed: { name: 'Collapsed', control: 'boolean' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<GroupStoryArgs>

export const Playground: Story = {}

/** Every Size × Collapsed, as the file's 6 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SIDEBAR_SIZES.flatMap((size) => [false, true].map((collapsed) => <div key={`${size}-${collapsed}`}>{group({ ...args, size, collapsed })}</div>))}
    </div>
  ),
}
