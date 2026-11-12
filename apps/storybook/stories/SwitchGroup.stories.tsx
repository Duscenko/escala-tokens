import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SwitchGroup, SWITCH_SIZES, SWITCH_GROUP_STATES, SWITCH_GROUP_PLACEMENTS,
  type SwitchSize, type SwitchGroupState, type SwitchGroupPlacement,
} from '../../../src/components/escala-ui/switch'

/** Story args = the Figma `SwitchGroup` set (design-plans/switch-group-contract.md), in the panel's
 *  order and with its defaults: Label · Description · Footer · DescriptionVisible · FooterVisible ·
 *  Size · State · Placement. The switch is the file's checked sample. */
interface SwitchGroupStoryArgs {
  label: string
  description: string
  footer: string
  descriptionVisible: boolean
  footerVisible: boolean
  size: SwitchSize
  forceState: SwitchGroupState
  placement: SwitchGroupPlacement
}

function render(a: SwitchGroupStoryArgs) {
  return (
    <SwitchGroup
      defaultChecked
      label={a.label}
      description={a.descriptionVisible ? a.description : undefined}
      footer={a.footerVisible ? (a.forceState === 'Invalid' ? 'Enable at least one channel to continue.' : a.footer) : undefined}
      size={a.size}
      placement={a.placement}
      forceState={a.forceState === 'Default' ? undefined : a.forceState}
    />
  )
}

const meta: Meta<SwitchGroupStoryArgs> = {
  title: 'Forms/SwitchGroup',
  render,
  args: {
    label: 'Email notifications', description: 'Receive a summary of activity in your inbox.', footer: 'Changes apply immediately.',
    descriptionVisible: true, footerVisible: true, size: 'default', forceState: 'Default', placement: 'left',
  },
  argTypes: {
    label: { name: 'Label', control: 'text' },
    description: { name: 'Description', control: 'text' },
    footer: { name: 'Footer', control: 'text', description: 'Invalid replaces it with the file’s error text.' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
    size: { name: 'Size', control: 'select', options: [...SWITCH_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...SWITCH_GROUP_STATES] },
    placement: { name: 'Placement', control: 'select', options: [...SWITCH_GROUP_PLACEMENTS] },
  },
}
export default meta
type Story = StoryObj<SwitchGroupStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {SWITCH_SIZES.flatMap((size) => SWITCH_GROUP_STATES.map((forceState) => (
        <div key={`${size}-${forceState}`}>{render({ ...args, size, forceState })}</div>
      )))}
    </div>
  ),
}

export const Placements: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {SWITCH_GROUP_PLACEMENTS.map((placement) => <div key={placement}>{render({ ...args, placement })}</div>)}
    </div>
  ),
}
