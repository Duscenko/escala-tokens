import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper, StepperItem, STEPPER_ORIENTATIONS, STEPPER_SIZES, type StepperOrientation, type StepperSize } from '../../../src/components/escala-ui/stepper'

/** Story args = the Figma `Stepper` set (design-plans/stepper-contract.md), in the panel's order and with its defaults:
 *  Size · Orientation (variant axes), then Content (the StepperItems). */
interface StepperStoryArgs {
  size: StepperSize
  orientation: StepperOrientation
}

function Steps({ size, orientation, label }: StepperStoryArgs & { label?: string }) {
  return (
    <Stepper aria-label={label ?? 'Checkout'} size={size} orientation={orientation} width={orientation === 'vertical' ? 320 : 880}>
      <StepperItem status="completed" description="Your login details">Account</StepperItem>
      <StepperItem status="active" description="Where we deliver">Shipping</StepperItem>
      <StepperItem status="locked" description="Card or transfer">Payment</StepperItem>
      <StepperItem status="locked" description="Confirm your order">Review</StepperItem>
    </Stepper>
  )
}

const meta: Meta<StepperStoryArgs> = {
  title: 'Navigation/Stepper',
  render: (args) => <Steps {...args} />,
  args: { size: 'default', orientation: 'vertical' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...STEPPER_SIZES] },
    orientation: { name: 'Orientation', control: 'select', options: [...STEPPER_ORIENTATIONS] },
  },
}
export default meta
type Story = StoryObj<StepperStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {STEPPER_ORIENTATIONS.flatMap((orientation) => STEPPER_SIZES.map((size) => <Steps key={orientation + size} size={size} orientation={orientation} label={`${orientation} ${size}`} />))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {STEPPER_SIZES.map((size) => <Steps key={size} {...args} size={size} label={`Size ${size}`} />)}
    </div>
  ),
}
