import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  InputOTP, INPUT_OTP_SIZES, INPUT_OTP_VARIANTS,
  type InputOTPSize, type InputOTPState, type InputOTPVariant,
} from '../../../src/components/escala-ui/input-otp'

const LENGTHS = ['4', '6', '8'] as const
const STATES: InputOTPState[] = ['Empty', 'Typing', 'Filled', 'Invalid', 'Disabled']

/** Story args = the Figma `InputOTP` set (design-plans/input-otp-contract.md), in the
 *  panel's order and with its defaults: Size · Length · State · Variant. */
interface InputOTPStoryArgs {
  size: InputOTPSize
  length: (typeof LENGTHS)[number]
  forceState: InputOTPState
  variant: InputOTPVariant
}

function render({ size, length, forceState, variant }: InputOTPStoryArgs) {
  return <InputOTP aria-label="Verification code" size={size} length={Number(length)} variant={variant} forceState={forceState} />
}

const meta: Meta<InputOTPStoryArgs> = {
  title: 'Forms/InputOTP',
  render,
  args: { size: 'default', length: '4', forceState: 'Empty', variant: 'outline' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...INPUT_OTP_SIZES], description: 'Slots 32×40 · 40×48 · 48×56.' },
    length: { name: 'Length', control: 'select', options: [...LENGTHS] },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Draws the file\'s variant (Typing: the first half filled, the caret next).' },
    variant: { name: 'Variant', control: 'select', options: [...INPUT_OTP_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<InputOTPStoryArgs>

export const Playground: Story = {}

/** Live: type, paste or delete; the active empty slot shows the caret. */
export const Live: Story = {
  render: function Live(args) {
    const [code, setCode] = useState('')
    return <InputOTP aria-label="Verification code" size={args.size} length={Number(args.length)} variant={args.variant} value={code} onChange={setCode} />
  },
}

/** Every State × Variant at one Size and Length (the file's 135 variants are these × Size × Length). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {INPUT_OTP_VARIANTS.flatMap((variant) => STATES.map((forceState) => (
        <div key={`${variant}-${forceState}`}>{render({ ...args, length: '6', variant, forceState })}</div>
      )))}
    </div>
  ),
}

/** Sizes × Lengths, Filled. */
export const SizesAndLengths: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
      {INPUT_OTP_SIZES.flatMap((size) => LENGTHS.map((length) => (
        <div key={`${size}-${length}`}>{render({ ...args, size, length, forceState: 'Filled' })}</div>
      )))}
    </div>
  ),
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page: filled six-digit fields in each variant; typing and
 *  error states, with four-digit error fields. */
export const FilledTypingError: Story = {
  name: 'Filled · Typing / Error',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>Filled six-digit fields in each variant.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {INPUT_OTP_VARIANTS.map((variant) => <InputOTP key={variant} aria-label={`Code, ${variant}`} length={6} variant={variant} forceState="Filled" />)}
        </div>
      </div>
      <div>
        <p style={caption}>Typing and error states, with four-digit error fields.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <InputOTP aria-label="Code, typing" length={6} forceState="Typing" />
          <InputOTP aria-label="Code, error" length={4} forceState="Invalid" />
          <InputOTP aria-label="Code, error, underline" length={4} variant="underline" forceState="Invalid" />
        </div>
      </div>
    </div>
  ),
}
