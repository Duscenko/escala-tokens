import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  RatingGroupItem, RATING_GROUP_SIZES, RATING_GROUP_TYPES, RATING_GROUP_ITEM_STATES,
  type RatingGroupSize, type RatingGroupType, type RatingGroupItemState,
} from '../../../src/components/escala-ui/rating-group'
import { iconSwapArg } from './iconSwap'

const CHECKED = ['false', 'true'] as const
type CheckedArg = (typeof CHECKED)[number]

/** Story args = the Figma `RatingGroupItem` set (design-plans/rating-group-item-contract.md), in the
 *  panel's order and with its defaults: Size · Type · Checked · State, then the Icon swap (the file's
 *  default is the star; a star keeps its own filled / outline pair). */
interface ItemStoryArgs {
  size: RatingGroupSize
  type: RatingGroupType
  checked: CheckedArg
  forceState: RatingGroupItemState
  icon: ComponentIconName
}

function render({ size, type, checked, forceState, icon }: ItemStoryArgs) {
  const px = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
  return (
    <RatingGroupItem
      aria-label="Rating"
      size={size}
      kind={type}
      checked={checked === 'true'}
      forceState={forceState === 'Default' ? undefined : forceState}
      icon={icon === 'star' ? undefined : <PreviewIcon concept={icon} size={px} />}
    />
  )
}

const meta: Meta<ItemStoryArgs> = {
  title: 'Indicators/RatingGroupItem',
  render,
  args: { size: 'default', type: 'star', checked: 'false', forceState: 'Default', icon: 'star' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...RATING_GROUP_SIZES], description: 'Item 32 · 24 · 40, icon 20 · 16 · 24.' },
    type: { name: 'Type', control: 'select', options: [...RATING_GROUP_TYPES] },
    checked: { name: 'Checked', control: 'select', options: [...CHECKED] },
    forceState: { name: 'State', control: 'select', options: [...RATING_GROUP_ITEM_STATES], description: 'Pins a state; in an app Hover, Pressed and Focused come from the pointer and keyboard.' },
    icon: iconSwapArg('Icon'),
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {RATING_GROUP_TYPES.flatMap((type) => CHECKED.map((checked) => (
        <div key={`${type}-${checked}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {RATING_GROUP_ITEM_STATES.map((forceState) => <span key={forceState}>{render({ ...args, type, checked, forceState, icon: 'star' })}</span>)}
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {RATING_GROUP_SIZES.map((size) => <span key={size}>{render({ ...args, size, checked: 'true' })}</span>)}
    </div>
  ),
}
