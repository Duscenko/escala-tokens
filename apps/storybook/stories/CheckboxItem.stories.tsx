import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CheckboxItem, CHECKBOX_SIZES, CHECKBOX_VARIANTS, CHECKBOX_ITEM_STATES, CHECKBOX_ITEM_PLACEMENTS,
  type CheckboxSize, type CheckboxVariant, type CheckboxItemState, type CheckboxItemPlacement,
} from '../../../src/components/escala-ui/checkbox'

const CHECKED = ['false', 'true', 'indeterminate'] as const
type CheckedArg = (typeof CHECKED)[number]

/** Story args = the Figma `CheckboxItem` set (design-plans/checkbox-item-contract.md), in the panel's
 *  order and with its defaults: Size · Checked · State · Placement · Variant, then Label ·
 *  DescriptionVisible · Description. */
interface CheckboxItemStoryArgs {
  size: CheckboxSize
  checked: CheckedArg
  forceState: CheckboxItemState
  placement: CheckboxItemPlacement
  variant: CheckboxVariant
  label: string
  descriptionVisible: boolean
  description: string
}

function render(a: CheckboxItemStoryArgs) {
  return (
    <CheckboxItem
      key={a.checked}
      size={a.size}
      variant={a.variant}
      placement={a.placement}
      defaultChecked={a.checked === 'indeterminate' ? 'indeterminate' : a.checked === 'true'}
      forceState={a.forceState === 'Default' ? undefined : a.forceState}
      label={a.label}
      description={a.descriptionVisible ? a.description : undefined}
    />
  )
}

const meta: Meta<CheckboxItemStoryArgs> = {
  title: 'Forms/CheckboxItem',
  render,
  args: {
    size: 'default', checked: 'false', forceState: 'Default', placement: 'left', variant: 'default',
    label: 'Label', descriptionVisible: false, description: 'Helper text',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...CHECKBOX_SIZES], description: 'Box 16 · 16 · 20; label body-sm · body-md · body-lg.' },
    checked: { name: 'Checked', control: 'select', options: [...CHECKED] },
    forceState: { name: 'State', control: 'select', options: [...CHECKBOX_ITEM_STATES] },
    placement: { name: 'Placement', control: 'select', options: [...CHECKBOX_ITEM_PLACEMENTS] },
    variant: { name: 'Variant', control: 'select', options: [...CHECKBOX_VARIANTS] },
    label: { name: 'Label', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
  },
}
export default meta
type Story = StoryObj<CheckboxItemStoryArgs>

export const Playground: Story = {}

/** Size × State × Placement, checked (Variant only colours the box, as in Checkbox). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {CHECKBOX_ITEM_PLACEMENTS.flatMap((placement) => CHECKBOX_SIZES.flatMap((size) => CHECKBOX_ITEM_STATES.map((forceState) => (
        <div key={`${placement}-${size}-${forceState}`}>{render({ ...args, placement, size, forceState, checked: 'true', descriptionVisible: true })}</div>
      ))))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {CHECKBOX_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {CHECKBOX_ITEM_STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, checked: 'true' })}</div>)}
    </div>
  ),
}
