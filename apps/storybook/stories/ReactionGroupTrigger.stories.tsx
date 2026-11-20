import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ReactionGroupTrigger, REACTION_GROUP_TRIGGER_SIZES, REACTION_GROUP_TRIGGER_STATES,
  type ReactionGroupTriggerSize, type ReactionGroupTriggerState,
} from '../../../src/components/escala-ui/reaction-group'

/** Story args = the Figma `ReactionGroupTrigger` set (design-plans/reaction-group-contract.md), in the panel's order and
 *  with its defaults: Size · State. */
interface TriggerStoryArgs {
  size: ReactionGroupTriggerSize
  state: ReactionGroupTriggerState
}

const render = (a: TriggerStoryArgs) => <ReactionGroupTrigger size={a.size} forceState={a.state === 'Default' ? undefined : a.state} />

const meta: Meta<TriggerStoryArgs> = {
  title: 'Buttons/ReactionGroup',
  tags: ['!autodocs', 'part'],
  render,
  args: { size: 'default', state: 'Default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...REACTION_GROUP_TRIGGER_SIZES], description: '40 · 24 · 32 · 48 · 56 across: the pill Chip\'s heights.' },
    state: { name: 'State', control: 'select', options: [...REACTION_GROUP_TRIGGER_STATES], description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard, Open from the picker.' },
  },
}
export default meta
type Story = StoryObj<TriggerStoryArgs>

export const ReactionGroupTriggerPlayground: Story = { name: 'ReactionGroupTrigger · Playground' }

/** Every Size × State, as the file's grid draws it. */
export const ReactionGroupTriggerAllCombinations: Story = {
  name: 'ReactionGroupTrigger · AllCombinations',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {REACTION_GROUP_TRIGGER_SIZES.map((size) => (
        <div key={size} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {REACTION_GROUP_TRIGGER_STATES.map((state) => <span key={state}>{render({ size, state })}</span>)}
        </div>
      ))}
    </div>
  ),
}

export const ReactionGroupTriggerSizes: Story = {
  name: 'ReactionGroupTrigger · Sizes',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {REACTION_GROUP_TRIGGER_SIZES.map((size) => <span key={size}>{render({ ...args, size })}</span>)}
    </div>
  ),
}

export const ReactionGroupTriggerStates: Story = {
  name: 'ReactionGroupTrigger · States',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {REACTION_GROUP_TRIGGER_STATES.map((state) => <span key={state}>{render({ ...args, state })}</span>)}
    </div>
  ),
}
