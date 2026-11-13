import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FIELD_SIZES, FIELD_STATES, type FieldSize, type FieldState } from '../../../src/components/escala-ui/field'
import { Input } from '../../../src/components/escala-ui/input'
import { TextLink } from '../../../src/components/escala-ui/text-link'

/** Story args = the Figma `Field` set's properties (design-plans/field-contract.md):
 *  Size · State (variant axes, the file's option order), then Label, RequiredVisible,
 *  TrailingVisible, DescriptionVisible, Description and Error, with the file's defaults.
 *  The control is the file's default swap, an Input ("Jane Doe"). */
interface FieldStoryArgs {
  size: FieldSize
  state: FieldState
  label: string
  requiredVisible: boolean
  trailingVisible: boolean
  descriptionVisible: boolean
  description: string
  error: string
}

function render(a: FieldStoryArgs) {
  return (
    <div style={{ width: 320 }}>
      <Field
        size={a.size}
        state={a.state}
        label={a.label}
        required={a.requiredVisible}
        trailing={a.trailingVisible ? <TextLink href="#" onClick={(e) => e.preventDefault()}>Forgot password?</TextLink> : undefined}
        description={a.descriptionVisible ? a.description : undefined}
        error={a.error}
      >
        <Input type="email" placeholder="Jane Doe" />
      </Field>
    </div>
  )
}

const meta: Meta<FieldStoryArgs> = {
  title: 'Forms/Field',
  render,
  args: {
    size: 'default', state: 'Default', label: 'Email address', requiredVisible: false, trailingVisible: false,
    descriptionVisible: false, description: 'We will never share your email.', error: 'Enter a valid email address.',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...FIELD_SIZES], description: 'The control\'s size: Size/control-md 40 · sm 32 · lg 48.' },
    state: { name: 'State', control: 'select', options: [...FIELD_STATES], description: 'Invalid shows the error and marks the control; Disabled disables it and dims the texts.' },
    label: { name: 'Label', control: 'text' },
    requiredVisible: { name: 'RequiredVisible', control: 'boolean' },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    error: { name: 'Error', control: 'text', description: 'Shown with State Invalid.' },
  },
}
export default meta
type Story = StoryObj<FieldStoryArgs>

export const Playground: Story = {}

/** Every Size × State, as the file's 9 variants (everything visible). */
export const AllCombinations: Story = {
  args: { requiredVisible: true, trailingVisible: true, descriptionVisible: true },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {FIELD_STATES.flatMap((state) => FIELD_SIZES.map((size) => <div key={`${state}-${size}`}>{render({ ...args, size, state })}</div>))}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 32 }}>{FIELD_STATES.map((state) => <div key={state}>{render({ ...args, state })}</div>)}</div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 32 }}>{FIELD_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}</div>
  ),
}
