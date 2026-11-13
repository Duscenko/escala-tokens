import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper, StepperItem, STEPPER_ORIENTATIONS, STEPPER_SIZES, STEPPER_STATES, STEPPER_STATUSES, type StepperOrientation, type StepperSize, type StepperState, type StepperStatus } from '../../../src/components/escala-ui/stepper'

/** Story args = the Figma `StepperItem` set (design-plans/stepper-contract.md): Size · Status · State · Orientation, then Title,
 *  Description, DescriptionVisible. */
interface ItemStoryArgs {
  size: StepperSize
  status: StepperStatus
  state: StepperState
  orientation: StepperOrientation
  title: string
  description: string
  descriptionVisible: boolean
}

const item = (a: ItemStoryArgs, key?: string) => (
  <StepperItem key={key} status={a.status} disabled={a.state === 'Disabled'} description={a.descriptionVisible ? a.description : undefined}>{a.title}</StepperItem>
)
const box = (a: ItemStoryArgs, children: React.ReactNode, label = 'Step', key?: string) => (
  <Stepper key={key} aria-label={label} size={a.size} orientation={a.orientation} width={a.orientation === 'vertical' ? 320 : 200}>{children}</Stepper>
)

const meta: Meta<ItemStoryArgs> = {
  title: 'Navigation/StepperItem',
  render: (a) => box(a, item(a)),
  args: { size: 'default', status: 'active', state: 'Default', orientation: 'vertical', title: 'Step title', description: 'Short description of the step', descriptionVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...STEPPER_SIZES] },
    status: { name: 'Status', control: 'select', options: [...STEPPER_STATUSES] },
    state: { name: 'State', control: 'select', options: [...STEPPER_STATES] },
    orientation: { name: 'Orientation', control: 'select', options: [...STEPPER_ORIENTATIONS] },
    title: { name: 'Title', control: 'text' },
    description: { name: 'Description', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {STEPPER_STATES.flatMap((state) => STEPPER_STATUSES.map((status) => box({ ...a, state, status }, item({ ...a, state, status, title: `${status}` }), `${status} ${state}`, status + state)))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {STEPPER_SIZES.map((size) => box({ ...a, size }, item(a), `Size ${size}`, size))}
    </div>
  ),
}
