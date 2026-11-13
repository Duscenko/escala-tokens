import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../../../src/components/escala-ui/badge'
import { TabMenu, TabMenuLineItem, TAB_MENU_INDICATORS, TAB_MENU_ITEM_STATES, TAB_MENU_SIZES, type TabMenuIndicator, type TabMenuItemState, type TabMenuSize } from '../../../src/components/escala-ui/tab-menu'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `TabMenuLineItem` set (design-plans/tab-menu-contract.md): Size · State · Indicator, then Label,
 *  IconLeadingVisible / Icon, TrailingVisible, IconTrailingVisible / Icon. */
interface LineStoryArgs {
  size: TabMenuSize
  forceState: TabMenuItemState
  indicator: TabMenuIndicator
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  trailingVisible: boolean
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
}

const px = (size: TabMenuSize) => (size === 'sm' ? ICON_PX.sm : size === 'lg' ? ICON_PX.lg : ICON_PX.default)

function item({ size, forceState, indicator, label, iconLeadingVisible, iconLeadingIcon, trailingVisible, iconTrailingVisible, iconTrailingIcon }: LineStoryArgs, key?: string) {
  return (
    <TabMenuLineItem
      key={key}
      size={size}
      indicator={indicator}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      iconLeading={iconLeadingVisible ? <PreviewIcon concept={iconLeadingIcon} size={px(size)} /> : undefined}
      trailing={trailingVisible ? <Badge appearance="soft" shape="pill" size="xs" type="number" variant="secondary" count={8} /> : undefined}
      iconTrailing={iconTrailingVisible ? <PreviewIcon concept={iconTrailingIcon} size={px(size)} /> : undefined}
    >
      {label}
    </TabMenuLineItem>
  )
}

const meta: Meta<LineStoryArgs> = {
  title: 'Navigation/TabMenuLineItem',
  render: (args) => <TabMenu variant={args.indicator === 'left' ? 'vertical-line' : 'horizontal-line'} size={args.size} aria-label="Line item" style={args.indicator === 'left' ? { width: 120 } : undefined}>{item(args)}</TabMenu>,
  args: { size: 'default', forceState: 'Default', indicator: 'bottom', label: 'Overview', iconLeadingVisible: false, iconLeadingIcon: 'home', trailingVisible: false, iconTrailingVisible: false, iconTrailingIcon: 'chevron-down' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TAB_MENU_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...TAB_MENU_ITEM_STATES] },
    indicator: { name: 'Indicator', control: 'select', options: [...TAB_MENU_INDICATORS] },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
  },
}
export default meta
type Story = StoryObj<LineStoryArgs>

export const Playground: Story = {}

export const States: Story = {
  render: (args) => (
    <TabMenu variant={args.indicator === 'left' ? 'vertical-line' : 'horizontal-line'} size={args.size} aria-label="States" style={args.indicator === 'left' ? { width: 160 } : undefined}>
      {TAB_MENU_ITEM_STATES.map((s) => item({ ...args, forceState: s, label: s }, s))}
    </TabMenu>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      {TAB_MENU_SIZES.map((size) => <TabMenu key={size} size={size} aria-label={`Size ${size}`}>{item({ ...args, size, forceState: 'Selected', indicator: 'bottom' }, size)}</TabMenu>)}
    </div>
  ),
}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {TAB_MENU_INDICATORS.map((indicator) => (
        <TabMenu key={indicator} variant={indicator === 'left' ? 'vertical-line' : 'horizontal-line'} size={args.size} aria-label={`Indicator ${indicator}`} style={indicator === 'left' ? { width: 160 } : undefined}>
          {TAB_MENU_ITEM_STATES.map((s) => item({ ...args, indicator, forceState: s, label: s }, s))}
        </TabMenu>
      ))}
    </div>
  ),
}
