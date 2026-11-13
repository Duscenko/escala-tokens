import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Switch, SWITCH_SIZES, SWITCH_STATES, SWITCH_THUMBS,
  type SwitchSize, type SwitchState, type SwitchThumb,
} from '../../../src/components/escala-ui/switch'

const CHECKED = ['true', 'false'] as const
type CheckedArg = (typeof CHECKED)[number]

/** Story args = the Figma `Switch` set (design-plans/switch-contract.md), in the panel's order and with
 *  its defaults: Size · State · Checked · Thumb, then IoVisible · ThumbIconVisible. */
interface SwitchStoryArgs {
  size: SwitchSize
  forceState: SwitchState
  checked: CheckedArg
  thumb: SwitchThumb
  ioVisible: boolean
  thumbIconVisible: boolean
}

function render({ size, forceState, checked, thumb, ioVisible, thumbIconVisible }: SwitchStoryArgs) {
  return (
    <Switch
      key={checked}
      aria-label="Switch"
      size={size}
      thumb={thumb}
      ioVisible={ioVisible}
      thumbIconVisible={thumbIconVisible}
      defaultChecked={checked === 'true'}
      forceState={forceState === 'Default' ? undefined : forceState}
    />
  )
}

const meta: Meta<SwitchStoryArgs> = {
  title: 'Forms/Switch',
  render,
  args: { size: 'default', forceState: 'Default', checked: 'false', thumb: 'short', ioVisible: false, thumbIconVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SWITCH_SIZES], description: 'Track 16 · 16 · 20 high.' },
    forceState: { name: 'State', control: 'select', options: [...SWITCH_STATES], description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    checked: { name: 'Checked', control: 'select', options: [...CHECKED] },
    thumb: { name: 'Thumb', control: 'select', options: [...SWITCH_THUMBS] },
    ioVisible: { name: 'IoVisible', control: 'boolean' },
    thumbIconVisible: { name: 'ThumbIconVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<SwitchStoryArgs>

export const Playground: Story = {}

/** Checked × State × Thumb at one Size, as the file's grid. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {SWITCH_THUMBS.map((thumb) => (
        <div key={thumb} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {CHECKED.flatMap((checked) => SWITCH_STATES.map((forceState) => (
            <span key={`${checked}-${forceState}`} style={{ display: 'inline-flex', padding: 4 }}>{render({ ...args, thumb, checked, forceState })}</span>
          )))}
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {SWITCH_SIZES.map((size) => <span key={size}>{render({ ...args, size, checked: 'true' })}</span>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {SWITCH_STATES.map((forceState) => <span key={forceState}>{render({ ...args, forceState, checked: 'true' })}</span>)}
    </div>
  ),
}

/** The I / O marks and the thumb glyph, which the file hides by default. */
export const Marks: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {CHECKED.map((checked) => <span key={checked}>{render({ ...args, checked, ioVisible: true, thumbIconVisible: true })}</span>)}
    </div>
  ),
}
