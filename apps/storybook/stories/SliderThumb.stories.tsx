import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SliderThumb, SLIDER_SIZES, SLIDER_THUMB_STATES, SLIDER_VARIANTS,
  type SliderSize, type SliderThumbState, type SliderVariant,
} from '../../../src/components/escala-ui/slider'

/** Story args = the Figma `SliderThumb` set (design-plans/slider-thumb-contract.md), in the panel's
 *  order and with its defaults: Size · State · Variant. */
interface ThumbStoryArgs {
  size: SliderSize
  forceState: SliderThumbState
  variant: SliderVariant
}

function render({ size, forceState, variant }: ThumbStoryArgs) {
  return <SliderThumb size={size} variant={variant} forceState={forceState === 'Default' ? undefined : forceState} />
}

const meta: Meta<ThumbStoryArgs> = {
  title: 'Forms/SliderThumb',
  render,
  args: { size: 'default', forceState: 'Default', variant: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SLIDER_SIZES], description: 'Thumb 14 · 16 · 20.' },
    forceState: { name: 'State', control: 'select', options: [...SLIDER_THUMB_STATES] },
    variant: { name: 'Variant', control: 'select', options: [...SLIDER_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<ThumbStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {SLIDER_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', padding: 8 }}>
          {SLIDER_THUMB_STATES.map((forceState) => <span key={forceState}>{render({ ...args, variant, forceState })}</span>)}
        </div>
      ))}
    </div>
  ),
}
