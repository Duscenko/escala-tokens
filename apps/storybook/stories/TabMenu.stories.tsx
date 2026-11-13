import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../../../src/components/escala-ui/badge'
import { TabMenu, TabMenuItem, TabMenuLineItem, TAB_MENU_SIZES, TAB_MENU_VARIANTS, type TabMenuSize, type TabMenuVariant } from '../../../src/components/escala-ui/tab-menu'

/** Story args = the Figma `TabMenu` set (design-plans/tab-menu-contract.md), in the panel's order and with its defaults:
 *  Size · Variant (variant axes), then Content (the items; line items for the line variants). */
interface TabMenuStoryArgs {
  size: TabMenuSize
  variant: TabMenuVariant
}

function Content({ variant }: { variant: TabMenuVariant }) {
  const Item = variant.endsWith('line') ? TabMenuLineItem : TabMenuItem
  return (
    <>
      <Item>Overview</Item>
      <Item>Activity</Item>
      <Item trailing={<Badge appearance="soft" shape="pill" size="xs" type="number" variant="secondary" count={8} />}>Members</Item>
      <Item>Settings</Item>
    </>
  )
}

const meta: Meta<TabMenuStoryArgs> = {
  title: 'Navigation/TabMenu',
  render: ({ size, variant }) => (
    <TabMenu size={size} variant={variant} defaultValue="Overview" aria-label={variant} style={variant.startsWith('vertical') ? { width: 224 } : undefined}>
      <Content variant={variant} />
    </TabMenu>
  ),
  args: { size: 'default', variant: 'horizontal-line' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TAB_MENU_SIZES] },
    variant: { name: 'Variant', control: 'select', options: [...TAB_MENU_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<TabMenuStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {TAB_MENU_VARIANTS.map((variant) => (
        <TabMenu key={variant} size={args.size} variant={variant} defaultValue="Overview" aria-label={variant} style={variant.startsWith('vertical') ? { width: 224 } : undefined}>
          <Content variant={variant} />
        </TabMenu>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      {TAB_MENU_SIZES.map((size) => (
        <TabMenu key={size} size={size} variant={args.variant} defaultValue="Overview" aria-label={`Size ${size}`} style={args.variant.startsWith('vertical') ? { width: 224 } : undefined}>
          <Content variant={args.variant} />
        </TabMenu>
      ))}
    </div>
  ),
}
