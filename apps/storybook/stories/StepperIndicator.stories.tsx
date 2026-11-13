import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepperIndicator, STEPPER_ORIENTATIONS, STEPPER_SIZES, STEPPER_STATES, STEPPER_STATUSES, type StepperOrientation, type StepperSize, type StepperState, type StepperStatus } from '../../../src/components/escala-ui/stepper'

/** Story args = the Figma `StepperIndicator` set (design-plans/stepper-contract.md): Size · Status · State · Orientation, then LineVisible. */
interface IndicatorStoryArgs {
  size: StepperSize
  status: StepperStatus
  state: StepperState
  orientation: StepperOrientation
  lineVisible: boolean
}

const indicator = (a: IndicatorStoryArgs, key?: string) => (
  <div key={key} style={a.orientation === 'vertical' ? { height: 96, display: 'flex' } : { width: 200, display: 'flex' }}>
    <StepperIndicator size={a.size} status={a.status} orientation={a.orientation} disabled={a.state === 'Disabled'} lineVisible={a.lineVisible} className={a.orientation === 'horizontal' ? 'w-full' : undefined} />
  </div>
)

const meta: Meta<IndicatorStoryArgs> = {
  title: 'Navigation/StepperIndicator',
  render: (a) => indicator(a),
  args: { size: 'default', status: 'active', state: 'Default', orientation: 'vertical', lineVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...STEPPER_SIZES] },
    status: { name: 'Status', control: 'select', options: [...STEPPER_STATUSES] },
    state: { name: 'State', control: 'select', options: [...STEPPER_STATES] },
    orientation: { name: 'Orientation', control: 'select', options: [...STEPPER_ORIENTATIONS] },
    lineVisible: { name: 'LineVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<IndicatorStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {STEPPER_STATES.flatMap((state) => STEPPER_STATUSES.map((status) => indicator({ ...a, state, status }, status + state)))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (a) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>{STEPPER_SIZES.map((size) => indicator({ ...a, size }, size))}</div>,
}
