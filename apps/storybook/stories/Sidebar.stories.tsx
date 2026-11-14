import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import {
  Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
} from '../../../src/components/escala-ui/sidebar'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `Sidebar` set (982:1003): Collapsed, then the Content and Footer slots and FooterVisible
 *  (the slots are the children the story composes). */
interface SidebarStoryArgs { collapsed: boolean; footerVisible: boolean }

const PLATFORM = [
  { label: 'Dashboard', icon: 'home' as const },
  { label: 'Tokens', icon: 'search' as const },
  { label: 'Components', icon: 'plus' as const },
]

function Demo({ collapsed: initial, footerVisible }: SidebarStoryArgs) {
  const [collapsed, setCollapsed] = useState(initial)
  const [current, setCurrent] = useState('Dashboard')
  return (
    <div style={{ height: 520 }}>
      <Sidebar collapsed={collapsed} id="demo-sidebar">
        <SidebarHeader>
          <SidebarBrand logo={<Avatar type="initials" size="sm" shape="rounded" variant="default" appearance="solid">E</Avatar>} title="Escala" subtitle="Design system" />
          <SidebarTrigger aria-controls="demo-sidebar" onClick={() => setCollapsed((c) => !c)} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup aria-labelledby="platform">
            <SidebarGroupLabel id="platform">Platform</SidebarGroupLabel>
            <SidebarMenu>
              {PLATFORM.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    icon={<PreviewIcon concept={item.icon} size={16} />}
                    state={item.label === current ? 'Current' : undefined}
                    trailing={item.label === 'Tokens' ? '12' : undefined}
                    trend={item.label === 'Components' ? 'up' : undefined}
                    trendLabel={item.label === 'Components' ? '+4%' : undefined}
                    onClick={() => setCurrent(item.label)}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {footerVisible && (
          <SidebarFooter>
            <SidebarMenuButton icon={<PreviewIcon concept="lock" size={16} />}>Settings</SidebarMenuButton>
            <SidebarMenuButton icon={<PreviewIcon concept="home" size={16} />} state="Disabled">Support</SidebarMenuButton>
          </SidebarFooter>
        )}
      </Sidebar>
    </div>
  )
}

const meta: Meta<SidebarStoryArgs> = {
  title: 'Navigation/Sidebar',
  render: (args) => <Demo key={String(args.collapsed) + String(args.footerVisible)} {...args} />,
  args: { collapsed: false, footerVisible: true },
  argTypes: {
    collapsed: { name: 'Collapsed', control: 'boolean', description: '272 px, or the 48 px icon rail.' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<SidebarStoryArgs>

export const Playground: Story = {}

/** Both Collapsed values side by side, as the file's 2 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {[false, true].map((collapsed) => <Demo key={String(collapsed)} {...args} collapsed={collapsed} />)}
    </div>
  ),
}
