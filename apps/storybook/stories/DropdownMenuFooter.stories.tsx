import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { DropdownMenuFooter, DROPDOWN_MENU_FOOTER_LAYOUTS, DROPDOWN_MENU_SIZES, type DropdownMenuFooterLayout, type DropdownMenuSize } from '../../../src/components/escala-ui/dropdown-menu'

/** Story args = the Figma `DropdownMenuFooter` set (design-plans/dropdown-menu-contract.md): Layout · Size, then LeadingVisible ·
 *  Leading · ActionsVisible (Actions = Clear and Apply). */
interface FooterStoryArgs {
  layout: DropdownMenuFooterLayout
  size: DropdownMenuSize
  leadingVisible: boolean
  leading: string
  actionsVisible: boolean
}

function footer({ layout, size, leadingVisible, leading, actionsVisible }: FooterStoryArgs) {
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  return (
    <div style={{ width: 256 }}>
      <DropdownMenuFooter size={size} layout={layout} leadingVisible={leadingVisible} leading={leading}>
        {actionsVisible ? [
          <Button key="c" variant="secondary" appearance="solid" size={btn}>Clear</Button>,
          <Button key="a" variant="default" appearance="solid" size={btn}>Apply</Button>,
        ] : null}
      </DropdownMenuFooter>
    </div>
  )
}

const meta: Meta<FooterStoryArgs> = {
  title: 'Navigation/DropdownMenuFooter',
  render: footer,
  args: { layout: 'inline', size: 'default', leadingVisible: true, leading: '12 of 40 selected', actionsVisible: true },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...DROPDOWN_MENU_FOOTER_LAYOUTS] },
    size: { name: 'Size', control: 'select', options: [...DROPDOWN_MENU_SIZES] },
    leadingVisible: { name: 'LeadingVisible', control: 'boolean' },
    leading: { name: 'Leading', control: 'text' },
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<FooterStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {DROPDOWN_MENU_FOOTER_LAYOUTS.flatMap((layout) => DROPDOWN_MENU_SIZES.map((size) => <div key={layout + size}>{footer({ ...args, layout, size })}</div>))}
    </div>
  ),
}
