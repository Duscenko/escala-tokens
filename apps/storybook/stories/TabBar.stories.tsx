import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { TabBar, TabBarItem } from '../../../src/components/escala-ui/tab-bar'
import { IssueBoardPage } from '../../../src/components/escala-ui/screens/screens'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { AVATAR_PHOTOS } from './avatarPhotos'
import { ICON_PX } from './iconSwap'

/** The Figma `TabBar` component (2354:124, design-plans/tab-bar-contract.md): no axes, one `Content` slot of 3 to 5
 *  TabBarItem, exactly one Current. The file's example: Home (Current) · Search · Inbox (badge) · You (Avatar media).
 *  A `nav` landmark of links in natural Tab order: not a tablist, no arrow keys. Motion: none on the bar (the items carry it). */
interface TabBarStoryArgs {
  items: 3 | 4 | 5
  current: number
}

const ICON = ICON_PX.lg
const DESTINATIONS: { label: string; icon?: ComponentIconName; badge?: number; avatar?: boolean }[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Search', icon: 'search' },
  { label: 'Inbox', icon: 'mail', badge: 3 },
  { label: 'You', avatar: true },
  { label: 'Settings', icon: 'settings' },
]

function bar({ items, current }: TabBarStoryArgs) {
  const shown = items === 5 ? DESTINATIONS : DESTINATIONS.filter((d) => d.label !== 'Settings').slice(0, items)
  return (
    <TabBar aria-label="Main">
      {shown.map((d, i) => (
        <TabBarItem
          key={d.label}
          href="#"
          onClick={(e) => e.preventDefault()}
          current={i === Math.min(current, shown.length - 1)}
          icon={d.icon ? <PreviewIcon concept={d.icon} size={ICON} /> : undefined}
          media={d.avatar ? <Avatar type="image" size="xs" shape="circle" src={AVATAR_PHOTOS['photo-9']} alt="" /> : undefined}
          badge={d.badge}
          aria-label={d.badge ? `${d.label}, ${d.badge} unread` : undefined}
        >
          {d.label}
        </TabBarItem>
      ))}
    </TabBar>
  )
}

/** The file's frame: 390 wide (a phone). */
const PHONE = { width: 390 } as const

const meta: Meta<TabBarStoryArgs> = {
  title: 'Navigation/TabBar',
  tags: ['stage:storybook'],
  render: (args) => <div style={PHONE}>{bar(args)}</div>,
  args: { items: 4, current: 0 },
  argTypes: {
    items: { name: 'Content (items)', control: 'inline-radio', options: [3, 4, 5] },
    current: { name: 'Current (index)', control: { type: 'number', min: 0, max: 4 } },
  },
  globals: { dimensions: 'mobile' },
}
export default meta
type Story = StoryObj<TabBarStoryArgs>

export const Playground: Story = {}

/** At the bottom of a phone screen, under the IssueBoardPage mobile build (the context of proposal 2343:4187). */
export const InContext: Story = {
  parameters: { layout: 'centered' },
  render: (args) => (
    <div style={{ ...PHONE, height: 844, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <IssueBoardPage layout="mobile" photos={AVATAR_PHOTOS} />
      </div>
      {bar(args)}
    </div>
  ),
}
