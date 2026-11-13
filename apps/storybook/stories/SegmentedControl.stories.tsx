import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SegmentedControl, SegmentedControlItem, SEGMENTED_CONTROL_SIZES, type SegmentedControlSize,
} from '../../../src/components/escala-ui/segmented-control'

/** Story args = the Figma `SegmentedControl` set (design-plans/segmented-control-contract.md), in the
 *  panel's order and with its defaults: Content (the file's Day · Week · Month items), then Size. */
interface SegmentedControlStoryArgs {
  size: SegmentedControlSize
}

function render({ size }: SegmentedControlStoryArgs) {
  return (
    <SegmentedControl size={size} aria-label="Range" defaultValue="Day">
      <SegmentedControlItem value="Day" label="Day" />
      <SegmentedControlItem value="Week" label="Week" />
      <SegmentedControlItem value="Month" label="Month" />
    </SegmentedControl>
  )
}

const meta: Meta<SegmentedControlStoryArgs> = {
  title: 'Navigation/SegmentedControl',
  render,
  args: { size: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SEGMENTED_CONTROL_SIZES], description: 'Segment height 32 · 24 · 40; the track is 8 more. Cascades to every item.' },
  },
}
export default meta
type Story = StoryObj<SegmentedControlStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {SEGMENTED_CONTROL_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}
