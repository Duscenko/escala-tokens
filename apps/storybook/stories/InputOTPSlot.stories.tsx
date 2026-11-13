import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  InputOTPSlot, INPUT_OTP_SIZES, INPUT_OTP_VARIANTS,
  type InputOTPSize, type InputOTPSlotState, type InputOTPVariant,
} from '../../../src/components/escala-ui/input-otp'

const STATES: InputOTPSlotState[] = ['Default', 'Filled', 'Typing', 'Focused', 'Invalid', 'Disabled']

/** Story args = the Figma `InputOTPSlot` set (design-plans/input-otp-contract.md):
 *  Size · State · Variant, then Digit. */
interface SlotStoryArgs {
  size: InputOTPSize
  forceState: InputOTPSlotState
  variant: InputOTPVariant
  digit: string
}

const render = ({ size, forceState, variant, digit }: SlotStoryArgs) => (
  <InputOTPSlot size={size} forceState={forceState} variant={variant} digit={digit} />
)

const meta: Meta<SlotStoryArgs> = {
  title: 'Forms/InputOTPSlot',
  render,
  args: { size: 'default', forceState: 'Default', variant: 'outline', digit: '7' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...INPUT_OTP_SIZES] },
    forceState: { name: 'State', control: 'select', options: STATES },
    variant: { name: 'Variant', control: 'select', options: [...INPUT_OTP_VARIANTS] },
    digit: { name: 'Digit', control: 'text' },
  },
}
export default meta
type Story = StoryObj<SlotStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Variant, as the file's 54 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {INPUT_OTP_SIZES.flatMap((size) => INPUT_OTP_VARIANTS.map((variant) => (
        <div key={`${size}-${variant}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {STATES.map((forceState) => <div key={forceState}>{render({ ...args, size, variant, forceState })}</div>)}
        </div>
      )))}
    </div>
  ),
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page: filled slots in each variant; focused slots in each
 *  variant and an error slot. */
export const RestingFocused: Story = {
  name: 'Resting · Focused',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>Filled slots in each variant.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {INPUT_OTP_VARIANTS.map((variant, i) => <InputOTPSlot key={variant} variant={variant} forceState="Filled" digit={'482'[i]} />)}
        </div>
      </div>
      <div>
        <p style={caption}>Focused slots in each variant and an error slot.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {INPUT_OTP_VARIANTS.map((variant, i) => <InputOTPSlot key={variant} variant={variant} forceState="Focused" digit={'519'[i]} />)}
          <InputOTPSlot forceState="Invalid" digit="3" />
        </div>
      </div>
    </div>
  ),
}
