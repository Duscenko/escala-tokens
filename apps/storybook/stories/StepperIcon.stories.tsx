import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepperIcon, STEPPER_SIZES, STEPPER_STATES, STEPPER_STATUSES, type StepperSize, type StepperState, type StepperStatus } from '../../../src/components/escala-ui/stepper'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `StepperIcon` set (design-plans/stepper-contract.md): Size · Status · State, then Label, LabelVisible, IconVisible, Icon. */
interface IconStoryArgs {
  size: StepperSize
  status: StepperStatus
  state: StepperState
  label: string
  labelVisible: boolean
  iconVisible: boolean
  icon: ComponentIconName
}

const px = (size: StepperSize) => (size === 'lg' ? ICON_PX.lg : size === 'default' ? ICON_PX.default : ICON_PX.sm)
const marker = (a: IconStoryArgs, key?: string) => (
  <StepperIcon key={key} size={a.size} status={a.status} disabled={a.state === 'Disabled'} label={a.label} labelVisible={a.labelVisible} icon={a.iconVisible ? <PreviewIcon concept={a.icon} size={px(a.size)} /> : undefined} />
)

const meta: Meta<IconStoryArgs> = {
  title: 'Navigation/StepperIcon',
  render: (a) => marker(a),
  args: { size: 'default', status: 'active', state: 'Default', label: '1', labelVisible: true, iconVisible: false, icon: 'home' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...STEPPER_SIZES] },
    status: { name: 'Status', control: 'select', options: [...STEPPER_STATUSES] },
    state: { name: 'State', control: 'select', options: [...STEPPER_STATES] },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    icon: { ...iconSwapArg('Icon'), if: { arg: 'iconVisible' } },
  },
}
export default meta
type Story = StoryObj<IconStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {STEPPER_STATES.map((state) => (
        <div key={state} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>{STEPPER_STATUSES.map((status) => marker({ ...a, state, status }, status))}</div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (a) => <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>{STEPPER_SIZES.map((size) => marker({ ...a, size }, size))}</div>,
}
