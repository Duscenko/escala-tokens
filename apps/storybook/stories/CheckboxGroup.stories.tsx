import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CheckboxGroup, CHECKBOX_SIZES, CHECKBOX_VARIANTS, CHECKBOX_GROUP_STATES, CHECKBOX_ITEM_PLACEMENTS,
  type CheckboxSize, type CheckboxVariant, type CheckboxGroupState, type CheckboxItemPlacement,
} from '../../../src/components/escala-ui/checkbox'

/** Story args = the Figma `CheckboxGroup` set (design-plans/checkbox-group-contract.md), in the panel's
 *  order and with its defaults: Size · Placement · State · Variant, then GroupLabel · FooterVisible ·
 *  FooterText. The rows are the file's three samples. */
interface CheckboxGroupStoryArgs {
  size: CheckboxSize
  placement: CheckboxItemPlacement
  forceState: CheckboxGroupState
  variant: CheckboxVariant
  groupLabel: string
  footerVisible: boolean
  footerText: string
}

function render(a: CheckboxGroupStoryArgs) {
  return (
    <CheckboxGroup
      size={a.size}
      placement={a.placement}
      variant={a.variant}
      forceState={a.forceState === 'Default' ? undefined : a.forceState}
      label={a.groupLabel}
      footer={a.footerVisible ? a.footerText : undefined}
    />
  )
}

const meta: Meta<CheckboxGroupStoryArgs> = {
  title: 'Forms/CheckboxGroup',
  render,
  args: {
    size: 'default', placement: 'left', forceState: 'Default', variant: 'default',
    groupLabel: 'Notifications', footerVisible: false, footerText: 'Helper text',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...CHECKBOX_SIZES] },
    placement: { name: 'Placement', control: 'select', options: [...CHECKBOX_ITEM_PLACEMENTS] },
    forceState: { name: 'State', control: 'select', options: [...CHECKBOX_GROUP_STATES] },
    variant: { name: 'Variant', control: 'select', options: [...CHECKBOX_VARIANTS] },
    groupLabel: { name: 'GroupLabel', control: 'text' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
    footerText: { name: 'FooterText', control: 'text' },
  },
}
export default meta
type Story = StoryObj<CheckboxGroupStoryArgs>

export const Playground: Story = {}

/** Size × State, with the footer (Placement and Variant pass straight to the rows). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {CHECKBOX_SIZES.flatMap((size) => CHECKBOX_GROUP_STATES.map((forceState) => (
        <div key={`${size}-${forceState}`}>{render({ ...args, size, forceState, footerVisible: true })}</div>
      )))}
    </div>
  ),
}

export const Placements: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {CHECKBOX_ITEM_PLACEMENTS.map((placement) => <div key={placement}>{render({ ...args, placement })}</div>)}
    </div>
  ),
}
