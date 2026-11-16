import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldLabel, FieldLegend, FieldSet } from '../../../src/components/escala-ui/field'
import { RadioGroup, RadioGroupItem } from '../../../src/components/escala-ui/radio-group'

/** The RadioGroup as the code has it (Radix behaviour, a bare control labelled through Field). The Figma file's
 *  RadioGroup / Radio / RadioCard / RadioItem sets are still pending in spec/figma-components.status.json, so these args
 *  are the component's own props, not the file's. */
interface RadioGroupStoryArgs {
  legend: string
  value: string
  disabled: boolean
}

const OPTIONS = [
  { value: 'monthly', label: 'Monthly billing' },
  { value: 'yearly', label: 'Yearly billing — save 20%' },
  { value: 'lifetime', label: 'Lifetime' },
]

function render(a: RadioGroupStoryArgs) {
  return (
    <FieldSet style={{ width: 280 }}>
      <FieldLegend variant="label">{a.legend}</FieldLegend>
      <RadioGroup key={a.value} defaultValue={a.value} disabled={a.disabled}>
        {OPTIONS.map((o) => (
          <Field key={o.value} orientation="horizontal">
            <RadioGroupItem value={o.value} id={`rg-${o.value}`} />
            <FieldLabel htmlFor={`rg-${o.value}`}>{o.label}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  )
}

const meta: Meta<RadioGroupStoryArgs> = {
  title: 'Forms/RadioGroup',
  render,
  args: { legend: 'Billing period', value: 'monthly', disabled: false },
  argTypes: {
    legend: { name: 'Legend', control: 'text' },
    value: { name: 'Value', control: 'select', options: OPTIONS.map((o) => o.value) },
    disabled: { name: 'Disabled', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<RadioGroupStoryArgs>

export const Playground: Story = {}

export const Disabled: Story = { args: { disabled: true } }
