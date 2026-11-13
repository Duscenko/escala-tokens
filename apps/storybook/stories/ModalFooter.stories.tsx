import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { ModalFooter, MODAL_FOOTER_LAYOUTS, MODAL_SIZES, type ModalFooterLayout, type ModalSize } from '../../../src/components/escala-ui/modal'

/** Story args = the Figma `ModalFooter` set (design-plans/modal-contract.md), in the panel's order and with its
 *  defaults: Size · Layout (variant axes), LeadingVisible · Leading · ActionsVisible (the Actions slot is the buttons). */
interface ModalFooterStoryArgs {
  size: ModalSize
  layout: ModalFooterLayout
  leadingVisible: boolean
  leading: string
  actionsVisible: boolean
}

const WIDTH: Record<ModalSize, number> = { default: 480, lg: 640 }

function footer({ size, layout, leadingVisible, leading, actionsVisible }: ModalFooterStoryArgs) {
  const btn = size === 'lg' ? 'lg' : 'default'
  const confirm = <Button key="confirm" variant="default" appearance="solid" size={btn}>Confirm</Button>
  const cancel = <Button key="cancel" variant="secondary" appearance="solid" size={btn}>Cancel</Button>
  return (
    <div style={{ width: WIDTH[size] }}>
      <ModalFooter size={size} layout={layout} leadingVisible={leadingVisible} leading={leading}>
        {actionsVisible ? (layout === 'stacked' ? [confirm, cancel] : [cancel, confirm]) : null}
      </ModalFooter>
    </div>
  )
}

const meta: Meta<ModalFooterStoryArgs> = {
  title: 'Content & Surfaces/ModalFooter',
  render: footer,
  args: { size: 'default', layout: 'inline', leadingVisible: false, leading: 'Step 1 of 3', actionsVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...MODAL_SIZES] },
    layout: { name: 'Layout', control: 'select', options: [...MODAL_FOOTER_LAYOUTS] },
    leadingVisible: { name: 'LeadingVisible', control: 'boolean' },
    leading: { name: 'Leading', control: 'text' },
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ModalFooterStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {MODAL_SIZES.flatMap((size) => MODAL_FOOTER_LAYOUTS.map((layout) => <div key={size + layout}>{footer({ ...args, size, layout })}</div>))}
    </div>
  ),
}
