import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  SegmentedControlItem, SEGMENTED_CONTROL_SIZES, SEGMENTED_CONTROL_ITEM_STATES,
  type SegmentedControlSize, type SegmentedControlItemState,
} from '../../../src/components/escala-ui/segmented-control'
import { iconSwapArg } from './iconSwap'

const CHECKED = ['false', 'true'] as const
type CheckedArg = (typeof CHECKED)[number]

/** Story args = the Figma `SegmentedControlItem` set (design-plans/segmented-control-item-contract.md),
 *  in the panel's order and with its defaults: Size · Checked · State, then Label · LabelVisible ·
 *  IconLeadingVisible · IconLeadingIcon. */
interface ItemStoryArgs {
  size: SegmentedControlSize
  checked: CheckedArg
  forceState: SegmentedControlItemState
  label: string
  labelVisible: boolean
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
}

function render({ size, checked, forceState, label, labelVisible, iconLeadingVisible, iconLeadingIcon }: ItemStoryArgs) {
  // sm and default draw the 16px icon, lg the 20px one (Size/icon-sm · icon-md).
  const px = size === 'lg' ? 20 : 16
  return (
    <SegmentedControlItem
      size={size}
      checked={checked === 'true'}
      forceState={forceState === 'Default' ? undefined : forceState}
      label={label}
      labelVisible={labelVisible}
      iconLeadingVisible={iconLeadingVisible}
      iconLeading={<PreviewIcon concept={iconLeadingIcon} size={px} />}
      aria-label={labelVisible ? undefined : label}
    />
  )
}

const meta: Meta<ItemStoryArgs> = {
  title: 'Navigation/SegmentedControlItem',
  render,
  args: { size: 'default', checked: 'false', forceState: 'Default', label: 'Label', labelVisible: true, iconLeadingVisible: false, iconLeadingIcon: 'home' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SEGMENTED_CONTROL_SIZES], description: 'Height 32 · 24 · 40.' },
    checked: { name: 'Checked', control: 'select', options: [...CHECKED] },
    forceState: { name: 'State', control: 'select', options: [...SEGMENTED_CONTROL_ITEM_STATES], description: 'Pins a state; in an app Hover, Pressed and Focused come from the pointer and keyboard.' },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {CHECKED.map((checked) => (
        <div key={checked} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {SEGMENTED_CONTROL_ITEM_STATES.map((forceState) => <span key={forceState}>{render({ ...args, checked, forceState })}</span>)}
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {SEGMENTED_CONTROL_SIZES.map((size) => <span key={size}>{render({ ...args, size, checked: 'true' })}</span>)}
    </div>
  ),
}
