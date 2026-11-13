import type { Meta, StoryObj } from '@storybook/react-vite'
import { InputTagOption, type InputTagOptionState, type InputTagOptionType } from '../../../src/components/escala-ui/input-tag'

const TYPES: InputTagOptionType[] = ['option', 'create']
const STATES: InputTagOptionState[] = ['Default', 'Hover', 'Focused', 'Disabled']

/** Story args = the Figma `InputTagOption` set (390:793), in the panel's order and with its
 *  defaults: Type · State, then Label · Meta · BadgeVisible · MetaVisible. */
interface InputTagOptionStoryArgs {
  type: InputTagOptionType
  forceState: InputTagOptionState
  label: string
  meta: string
  badge: boolean
  metaVisible: boolean
}

function render({ type, forceState, label, meta, badge, metaVisible }: InputTagOptionStoryArgs) {
  return (
    <div role="listbox" aria-label="Suggestions" style={{ width: 240 }}>
      <InputTagOption
        type={type}
        forceState={forceState === 'Default' ? undefined : forceState}
        badge={badge}
        meta={metaVisible ? meta : undefined}
      >
        {type === 'create' ? `Create “${label}”` : label}
      </InputTagOption>
    </div>
  )
}

const meta: Meta<InputTagOptionStoryArgs> = {
  title: 'Forms/InputTagOption',
  render,
  args: { type: 'option', forceState: 'Default', label: 'Design', meta: '12', badge: true, metaVisible: true },
  argTypes: {
    type: { name: 'Type', control: 'select', options: TYPES },
    forceState: { name: 'State', control: 'select', options: STATES },
    label: { name: 'Label', control: 'text' },
    meta: { name: 'Meta', control: 'text' },
    badge: { name: 'BadgeVisible', control: 'boolean' },
    metaVisible: { name: 'MetaVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<InputTagOptionStoryArgs>

export const Playground: Story = {}

/** Every Type × State, as the file's 8 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {TYPES.flatMap((type) => STATES.map((forceState) => (
        <div key={`${type}-${forceState}`}>{render({ ...args, type, forceState })}</div>
      )))}
    </div>
  ),
}
