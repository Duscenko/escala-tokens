import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../../../src/components/escala-ui/badge'
import { NavItem, NAV_ITEM_SIZES, NAV_ITEM_STATES, type NavItemSize, type NavItemState } from '../../../src/components/escala-ui/nav-item'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `NavItem` set (design-plans/nav-header-contract.md): Size · State, then Label, IconLeadingVisible / Icon,
 *  TrailingVisible, IconTrailingVisible / Icon. */
interface NavItemStoryArgs {
  size: NavItemSize
  forceState: NavItemState
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  trailingVisible: boolean
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
}

const px = (size: NavItemSize) => (size === 'sm' ? ICON_PX.sm : size === 'lg' ? ICON_PX.lg : ICON_PX.default)

function item(a: NavItemStoryArgs, key?: string) {
  return (
    <NavItem
      key={key}
      href="#"
      onClick={(e) => e.preventDefault()}
      size={a.size}
      forceState={a.forceState}
      disabled={a.forceState === 'Disabled'}
      iconLeading={a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={px(a.size)} /> : undefined}
      trailing={a.trailingVisible ? <Badge appearance="soft" shape="pill" size="xs" type="number" variant="secondary" count={8} /> : undefined}
      iconTrailing={a.iconTrailingVisible ? <PreviewIcon concept={a.iconTrailingIcon} size={px(a.size)} /> : undefined}
    >
      {a.label}
    </NavItem>
  )
}

const meta: Meta<NavItemStoryArgs> = {
  title: 'Navigation/NavItem',
  render: (args) => item(args),
  args: { size: 'default', forceState: 'Default', label: 'Overview', iconLeadingVisible: false, iconLeadingIcon: 'home', trailingVisible: false, iconTrailingVisible: false, iconTrailingIcon: 'chevron-down' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...NAV_ITEM_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...NAV_ITEM_STATES] },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
  },
}
export default meta
type Story = StoryObj<NavItemStoryArgs>

export const Playground: Story = {}

export const States: Story = {
  render: (args) => <nav aria-label="States" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{NAV_ITEM_STATES.map((s) => item({ ...args, forceState: s, label: s }, s))}</nav>,
}

export const Sizes: Story = {
  render: (args) => <nav aria-label="Sizes" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>{NAV_ITEM_SIZES.map((size) => item({ ...args, size, label: size }, size))}</nav>,
}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {NAV_ITEM_SIZES.map((size) => (
        <nav key={size} aria-label={`Size ${size}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {NAV_ITEM_STATES.map((s) => item({ ...args, size, forceState: s, label: s }, s))}
        </nav>
      ))}
    </div>
  ),
}
