import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Slider, SLIDER_SIZES, SLIDER_RANGES, SLIDER_STATES, SLIDER_VARIANTS,
  type SliderSize, type SliderRange, type SliderState, type SliderVariant,
} from '../../../src/components/escala-ui/slider'

/** Story args = the Figma `Slider` set (design-plans/slider-contract.md), in the panel's order and with
 *  its defaults: Size · Range · State · Variant, then TooltipVisible · MarksVisible · TooltipText ·
 *  TooltipEndText. */
interface SliderStoryArgs {
  size: SliderSize
  range: SliderRange
  forceState: SliderState
  variant: SliderVariant
  tooltipVisible: boolean
  marksVisible: boolean
  tooltipText: string
  tooltipEndText: string
}

function render({ size, range, forceState, variant, tooltipVisible, marksVisible, tooltipText, tooltipEndText }: SliderStoryArgs) {
  return (
    <div style={{ width: 320 }}>
      <Slider
        key={range}
        aria-label="Volume"
        size={size}
        variant={variant}
        defaultValue={range === 'range' ? [25, 70] : 40}
        forceState={forceState === 'Default' ? undefined : forceState}
        tooltipVisible={tooltipVisible}
        marksVisible={marksVisible}
        tooltipText={tooltipText}
        tooltipEndText={tooltipEndText}
        style={{ width: '100%' }}
      />
    </div>
  )
}

const meta: Meta<SliderStoryArgs> = {
  title: 'Forms/Slider',
  render,
  args: {
    size: 'default', range: 'single', forceState: 'Default', variant: 'default',
    tooltipVisible: false, marksVisible: false, tooltipText: '40', tooltipEndText: '70',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SLIDER_SIZES], description: 'Control 32 · 36 · 40 high, track 4 · 6 · 8, thumb 14 · 16 · 20.' },
    range: { name: 'Range', control: 'select', options: [...SLIDER_RANGES] },
    forceState: { name: 'State', control: 'select', options: [...SLIDER_STATES], description: 'Dragging pins the last thumb; in an app it follows the pointer.' },
    variant: { name: 'Variant', control: 'select', options: [...SLIDER_VARIANTS] },
    tooltipVisible: { name: 'TooltipVisible', control: 'boolean' },
    marksVisible: { name: 'MarksVisible', control: 'boolean' },
    tooltipText: { name: 'TooltipText', control: 'text', if: { arg: 'tooltipVisible' } },
    tooltipEndText: { name: 'TooltipEndText', control: 'text', if: { arg: 'tooltipVisible' } },
  },
}
export default meta
type Story = StoryObj<SliderStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {SLIDER_SIZES.flatMap((size) => SLIDER_RANGES.flatMap((range) => SLIDER_STATES.map((forceState) => (
        <div key={`${size}-${range}-${forceState}`}>{render({ ...args, size, range, forceState, tooltipVisible: true, marksVisible: true })}</div>
      ))))}
    </div>
  ),
}
