import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  RatingGroup, RATING_GROUP_SIZES, RATING_GROUP_TYPES, type RatingGroupSize, type RatingGroupType,
} from '../../../src/components/escala-ui/rating-group'

/** Story args = the Figma `RatingGroup` set (design-plans/rating-group-contract.md), in the panel's
 *  order and with its defaults: Content (the file's five items, four checked), then Size · Type. */
interface RatingGroupStoryArgs {
  size: RatingGroupSize
  type: RatingGroupType
}

function render({ size, type }: RatingGroupStoryArgs) {
  return <RatingGroup key={type} aria-label="How was it?" size={size} type={type} />
}

const meta: Meta<RatingGroupStoryArgs> = {
  title: 'Indicators/RatingGroup',
  render,
  args: { size: 'default', type: 'star' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...RATING_GROUP_SIZES], description: 'Items 32 · 24 · 40, icons 20 · 16 · 24. Cascades to every item.' },
    type: { name: 'Type', control: 'select', options: [...RATING_GROUP_TYPES] },
  },
}
export default meta
type Story = StoryObj<RatingGroupStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {RATING_GROUP_TYPES.flatMap((type) => RATING_GROUP_SIZES.map((size) => <div key={`${type}-${size}`}>{render({ ...args, type, size })}</div>))}
    </div>
  ),
}
