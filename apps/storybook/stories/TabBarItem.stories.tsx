import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { TabBarItem, TAB_BAR_ITEM_STATES, type TabBarItemState } from '../../../src/components/escala-ui/tab-bar'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { AVATAR_PHOTOS } from './avatarPhotos'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `TabBarItem` set (design-plans/tab-bar-contract.md), in the panel's order and with its defaults:
 *  State (the one axis, no Size on purpose), Label, LabelVisible, IconVisible / Icon, MediaVisible (Media slot), BadgeVisible.
 *  A link, not a tab: State=Current is `aria-current="page"`. Motion: the pill and the inks on `use-hover`. */
interface TabBarItemStoryArgs {
  forceState: TabBarItemState
  label: string
  labelVisible: boolean
  iconVisible: boolean
  icon: ComponentIconName
  mediaVisible: boolean
  badgeVisible: boolean
  count: number
}

const ICON = ICON_PX.lg

function item(a: TabBarItemStoryArgs, key?: string) {
  return (
    <TabBarItem
      key={key}
      href="#"
      onClick={(e) => e.preventDefault()}
      forceState={a.forceState}
      disabled={a.forceState === 'Disabled'}
      hideLabel={!a.labelVisible}
      icon={a.iconVisible ? <PreviewIcon concept={a.icon} size={ICON} /> : undefined}
      media={a.mediaVisible ? <Avatar type="image" size="xs" shape="circle" src={AVATAR_PHOTOS['photo-9']} alt="" /> : undefined}
      badge={a.badgeVisible ? a.count : undefined}
    >
      {a.label}
    </TabBarItem>
  )
}

/** The set draws each item 80 wide; inside a TabBar it fills its share. */
const cell = { width: 80 } as const

const meta: Meta<TabBarItemStoryArgs> = {
  title: 'Navigation/TabBar',
  tags: ['!autodocs', 'part'],
  render: (args) => <div style={cell}>{item(args)}</div>,
  args: { forceState: 'Default', label: 'Home', labelVisible: true, iconVisible: true, icon: 'home', mediaVisible: false, badgeVisible: false, count: 3 },
  argTypes: {
    forceState: { name: 'State', control: 'select', options: [...TAB_BAR_ITEM_STATES] },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    icon: { ...iconSwapArg('Icon'), if: { arg: 'iconVisible' } },
    mediaVisible: { name: 'MediaVisible', control: 'boolean' },
    badgeVisible: { name: 'BadgeVisible', control: 'boolean' },
    count: { name: 'Count (Badge)', control: 'number', if: { arg: 'badgeVisible' } },
  },
}
export default meta
type Story = StoryObj<TabBarItemStoryArgs>

export const TabBarItemPlayground: Story = { name: 'TabBarItem · Playground' }

/** The five variants of the set, pinned. */
export const TabBarItemStates: Story = {
  name: 'TabBarItem · States',
  render: (args) => (
    <nav aria-label="States" style={{ display: 'flex', gap: 12 }}>
      {TAB_BAR_ITEM_STATES.map((s) => <div key={s} style={cell}>{item({ ...args, forceState: s, label: s })}</div>)}
    </nav>
  ),
}

/** BadgeVisible: the critical count on the pill's top right. */
export const TabBarItemWithBadge: Story = { name: 'TabBarItem · With Badge', args: { label: 'Inbox', icon: 'mail', badgeVisible: true } }

/** The Media slot: an Avatar xs in the icon's box (the file's "You" item). */
export const TabBarItemWithAvatar: Story = { name: 'TabBarItem · With Avatar', args: { label: 'You', mediaVisible: true, iconVisible: false } }

/** LabelVisible off: the label still names the link (`aria-label`). */
export const TabBarItemIconOnly: Story = {
  name: 'TabBarItem · Icon Only',
  render: (args) => (
    <div style={cell}>
      <TabBarItem href="#" onClick={(e) => e.preventDefault()} hideLabel aria-label="Search" forceState={args.forceState} icon={<PreviewIcon concept="search" size={ICON} />}>Search</TabBarItem>
    </div>
  ),
}
