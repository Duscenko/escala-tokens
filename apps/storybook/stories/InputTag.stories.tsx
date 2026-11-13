import type { Meta, StoryObj } from '@storybook/react-vite'
import { InputTag, type InputTagLayout, type InputTagSize, type InputTagState } from '../../../src/components/escala-ui/input-tag'

const LAYOUTS: InputTagLayout[] = ['inline', 'outside']
const SIZES: InputTagSize[] = ['sm', 'default', 'lg']
const STATES: InputTagState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading']
const VALUES = ['placeholder', 'filled'] as const
type InputTagValue = (typeof VALUES)[number]

/** Story args = the Figma `InputTag` set (design-plans/input-tag-contract.md), in the
 *  panel's order and with its defaults: Layout · Size · State · Value, then Placeholder. */
interface InputTagStoryArgs {
  layout: InputTagLayout
  size: InputTagSize
  forceState: InputTagState
  value: InputTagValue
  placeholder: string
}

const FILLED = ['Design', 'Research']

function render({ layout, size, forceState, value, placeholder }: InputTagStoryArgs) {
  return (
    <InputTag
      key={`${layout}-${value}`}
      aria-label="Tags"
      layout={layout}
      size={size}
      forceState={forceState === 'Default' ? undefined : forceState}
      placeholder={placeholder}
      defaultValue={value === 'filled' ? FILLED : []}
      width={360}
    />
  )
}

const meta: Meta<InputTagStoryArgs> = {
  title: 'Forms/InputTag',
  render,
  args: { layout: 'inline', size: 'default', forceState: 'Default', value: 'placeholder', placeholder: 'Add tag…' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: LAYOUTS, description: 'inline wraps the chips inside the box; outside puts the box over the chips.' },
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Box 32 · 40 · 48; the chips are InputTagChip xs · sm · default.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    value: { name: 'Value', control: 'select', options: [...VALUES] },
    placeholder: { name: 'Placeholder', control: 'text' },
  },
}
export default meta
type Story = StoryObj<InputTagStoryArgs>

export const Playground: Story = {}

/** Every Layout × Size × State × Value, as the file's 72 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {LAYOUTS.flatMap((layout) => VALUES.flatMap((value) => SIZES.flatMap((size) => STATES.map((forceState) => (
        <div key={`${layout}-${value}-${size}-${forceState}`}>{render({ ...args, layout, value, size, forceState })}</div>
      )))))}
    </div>
  ),
}

/** Live: type and press Enter or comma; Backspace takes the last tag back; the third tag is past `max`. */
export const Live: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <InputTag aria-label="Tags" defaultValue={['Design', 'Research', 'Brand']} max={2} width={360} />
      <InputTag aria-label="Tags" layout="outside" defaultValue={['Design', 'Research']} width={360} />
    </div>
  ),
}
