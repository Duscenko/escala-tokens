import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../../../src/components/escala-ui/badge'
import { TabMenu, TabMenuItem, TAB_MENU_ITEM_STATES, TAB_MENU_SIZES, type TabMenuItemState, type TabMenuSize } from '../../../src/components/escala-ui/tab-menu'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `TabMenuItem` set (design-plans/tab-menu-contract.md): Size · State, then Label, IconLeadingVisible / Icon,
 *  TrailingVisible, IconTrailingVisible / Icon. */
interface ItemStoryArgs {
  size: TabMenuSize
  forceState: TabMenuItemState
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  trailingVisible: boolean
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
}

const px = (size: TabMenuSize) => (size === 'sm' ? ICON_PX.sm : size === 'lg' ? ICON_PX.lg : ICON_PX.default)

function item({ size, forceState, label, iconLeadingVisible, iconLeadingIcon, trailingVisible, iconTrailingVisible, iconTrailingIcon }: ItemStoryArgs, key?: string) {
  return (
    <TabMenuItem
      key={key}
      size={size}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      iconLeading={iconLeadingVisible ? <PreviewIcon concept={iconLeadingIcon} size={px(size)} /> : undefined}
      trailing={trailingVisible ? <Badge appearance="soft" shape="pill" size="xs" type="number" variant="secondary" count={8} /> : undefined}
      iconTrailing={iconTrailingVisible ? <PreviewIcon concept={iconTrailingIcon} size={px(size)} /> : undefined}
    >
      {label}
    </TabMenuItem>
  )
}

const meta: Meta<ItemStoryArgs> = {
  title: 'Navigation/TabMenuItem',
  render: (args) => <TabMenu variant="horizontal-button" size={args.size} aria-label="Item">{item(args)}</TabMenu>,
  args: { size: 'default', forceState: 'Default', label: 'Overview', iconLeadingVisible: false, iconLeadingIcon: 'home', trailingVisible: false, iconTrailingVisible: false, iconTrailingIcon: 'chevron-down' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TAB_MENU_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...TAB_MENU_ITEM_STATES] },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const States: Story = {
  render: (args) => (
    <TabMenu variant="horizontal-button" size={args.size} aria-label="States">
      {TAB_MENU_ITEM_STATES.map((s) => item({ ...args, forceState: s, label: s }, s))}
    </TabMenu>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      {TAB_MENU_SIZES.map((size) => <TabMenu key={size} variant="horizontal-button" size={size} aria-label={`Size ${size}`}>{item({ ...args, size }, size)}</TabMenu>)}
    </div>
  ),
}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      {TAB_MENU_SIZES.map((size) => (
        <TabMenu key={size} variant="horizontal-button" size={size} aria-label={`Size ${size}`}>
          {TAB_MENU_ITEM_STATES.map((s) => item({ ...args, size, forceState: s, label: s }, s))}
        </TabMenu>
      ))}
    </div>
  ),
}
