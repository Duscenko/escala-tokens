import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Sidebar, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SIDEBAR_SIZES, SIDEBAR_MENU_BUTTON_STATES,
  type SidebarMenuButtonState, type SidebarSize,
} from '../../../src/components/escala-ui/sidebar'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `SidebarMenuButton` set (980:368), in the panel's order and with its defaults:
 *  Size · State · Collapsed (variant axes), then Label · IconLeadingVisible / Icon · TrailingVisible / Trailing ·
 *  IconTrailingVisible / Icon · TrendVisible. Collapsed comes from the Sidebar, as in the file. */
interface MenuButtonStoryArgs {
  size: SidebarSize
  state: SidebarMenuButtonState
  collapsed: boolean
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  trailingVisible: boolean
  trailing: string
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
  trendVisible: boolean
}

const px = (size: SidebarSize) => (size === 'lg' ? 20 : 16)

function row(a: MenuButtonStoryArgs, key?: string) {
  return (
    <Sidebar key={key} collapsed={a.collapsed} className="!h-auto !w-auto !border-0 !bg-transparent">
      <SidebarGroup size={a.size} style={{ width: a.collapsed ? undefined : 256 }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              state={a.state}
              icon={a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={px(a.size)} /> : undefined}
              trailing={a.trailingVisible ? a.trailing : undefined}
              iconTrailing={a.iconTrailingVisible ? <PreviewIcon concept={a.iconTrailingIcon} size={px(a.size)} /> : undefined}
              trend={a.trendVisible ? 'up' : undefined}
              trendLabel={a.trendVisible ? '+4%' : undefined}
            >
              {a.label}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </Sidebar>
  )
}

const meta: Meta<MenuButtonStoryArgs> = {
  title: 'Navigation/SidebarMenuButton',
  render: (args) => row(args),
  args: {
    size: 'default', state: 'Default', collapsed: false, label: 'Dashboard', iconLeadingVisible: true, iconLeadingIcon: 'home',
    trailingVisible: false, trailing: '12', iconTrailingVisible: false, iconTrailingIcon: 'chevron-right', trendVisible: false,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SIDEBAR_SIZES], description: 'Row 32 · 24 · 40.' },
    state: { name: 'State', control: 'select', options: [...SIDEBAR_MENU_BUTTON_STATES] },
    collapsed: { name: 'Collapsed', control: 'boolean', description: 'Driven by the Sidebar in the file; a square of the row height.' },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    trailing: { name: 'Trailing', control: 'text', if: { arg: 'trailingVisible' } },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
    trendVisible: { name: 'TrendVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<MenuButtonStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Collapsed, as the file's 30 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      {SIDEBAR_SIZES.flatMap((size) => [false, true].flatMap((collapsed) => SIDEBAR_MENU_BUTTON_STATES.map((state) => (
        <div key={`${size}-${collapsed}-${state}`}>{row({ ...args, size, collapsed, state })}</div>
      ))))}
    </div>
  ),
}

/** Hovering a row fills it and draws no ring; the ring is keyboard focus (the pinned Focused row). */
export const HoverHasNoRing: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['Hover', 'Focused'] as const).map((state) => row({ ...args, state, label: state === 'Hover' ? 'Hover: fill, no ring' : 'Focused: fill + ring' }, state))}
    </div>
  ),
}

/** The trend Badge (success up, critical down) and a trailing count. */
export const WithTrendAndCount: Story = {
  args: { trailingVisible: true, trendVisible: true },
}
