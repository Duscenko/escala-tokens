import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { PopoverFooter, POPOVER_FOOTER_LAYOUTS, POPOVER_SIZES, type PopoverFooterLayout, type PopoverSize } from '../../../src/components/escala-ui/popover'

/** Story args = the Figma `PopoverFooter` set (design-plans/popover-contract.md), in the panel's order and with its
 *  defaults: Layout · Size (variant axes), LeadingVisible · Leading · ActionsVisible (Actions = the buttons). */
interface PopoverFooterStoryArgs {
  layout: PopoverFooterLayout
  size: PopoverSize
  leadingVisible: boolean
  leading: string
  actionsVisible: boolean
}

function footer({ layout, size, leadingVisible, leading, actionsVisible }: PopoverFooterStoryArgs) {
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  return (
    <div style={{ width: 256 }}>
      <PopoverFooter size={size} layout={layout} leadingVisible={leadingVisible} leading={leading}>
        {actionsVisible ? [
          <Button key="skip" variant="secondary" appearance="solid" size={btn}>Skip</Button>,
          <Button key="next" variant="default" appearance="solid" size={btn}>Next</Button>,
        ] : null}
      </PopoverFooter>
    </div>
  )
}

const meta: Meta<PopoverFooterStoryArgs> = {
  title: 'Content & Surfaces/PopoverFooter',
  render: footer,
  args: { layout: 'inline', size: 'default', leadingVisible: true, leading: 'Step 1 of 3', actionsVisible: true },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...POPOVER_FOOTER_LAYOUTS] },
    size: { name: 'Size', control: 'select', options: [...POPOVER_SIZES] },
    leadingVisible: { name: 'LeadingVisible', control: 'boolean' },
    leading: { name: 'Leading', control: 'text' },
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PopoverFooterStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {POPOVER_FOOTER_LAYOUTS.flatMap((layout) => POPOVER_SIZES.map((size) => <div key={layout + size}>{footer({ ...args, layout, size })}</div>))}
    </div>
  ),
}
