import type { Meta, StoryObj } from '@storybook/react-vite'
import { DatePickerTrigger, type DatePickerTriggerSize, type DatePickerTriggerState } from '../../../src/components/escala-ui/date-picker'

const SIZES: DatePickerTriggerSize[] = ['lg', 'sm', 'default']
const STATES: DatePickerTriggerState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading']
const VALUES = ['placeholder', 'filled'] as const
type DatePickerTriggerValue = (typeof VALUES)[number]

/** Story args = the Figma `DatePickerTrigger` set (design-plans/date-picker-trigger-contract.md),
 *  in the panel's order and with its defaults: Size · State · Value, then PlaceholderText ·
 *  ValueText. Value filled shows ValueText, placeholder shows PlaceholderText. */
interface DatePickerTriggerStoryArgs {
  size: DatePickerTriggerSize
  forceState: DatePickerTriggerState
  value: DatePickerTriggerValue
  placeholderText: string
  valueText: string
}

function render({ size, forceState, value, placeholderText, valueText }: DatePickerTriggerStoryArgs) {
  return (
    <DatePickerTrigger
      size={size}
      forceState={forceState === 'Default' ? undefined : forceState}
      placeholderText={placeholderText}
      valueText={value === 'filled' ? valueText : undefined}
      style={{ width: 280 }}
    />
  )
}

const meta: Meta<DatePickerTriggerStoryArgs> = {
  title: 'Forms/DatePickerTrigger',
  render,
  args: {
    size: 'default',
    forceState: 'Default',
    value: 'placeholder',
    placeholderText: 'Select date',
    valueText: 'Nov 12, 2026',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Box 48 · 32 · 40 (Size/control-lg · sm · md); the glyph is 16 · 16 · 20.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    value: { name: 'Value', control: 'select', options: [...VALUES] },
    placeholderText: { name: 'PlaceholderText', control: 'text' },
    valueText: { name: 'ValueText', control: 'text' },
  },
}
export default meta
type Story = StoryObj<DatePickerTriggerStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Value, as the file's 36 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {VALUES.flatMap((value) => SIZES.flatMap((size) => STATES.map((forceState) => (
        <div key={`${value}-${size}-${forceState}`}>{render({ ...args, value, size, forceState })}</div>
      ))))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size, value: 'filled' })}</div>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, value: 'filled' })}</div>)}
    </div>
  ),
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page. RESTING (hover to try): a placeholder, a filled and a small
 *  filled trigger. FOCUSED · INVALID · LOADING: "Pick a start date" focused, "Jan 1, 2025"
 *  invalid, and the Spinner. */
export const RestingFocused: Story = {
  name: 'Resting · Focused',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>RESTING · hover to try</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DatePickerTrigger style={{ width: 280 }} />
          <DatePickerTrigger valueText="Nov 12, 2026" style={{ width: 280 }} />
          <DatePickerTrigger size="sm" valueText="Dec 3, 2026" style={{ width: 280 }} />
        </div>
      </div>
      <div>
        <p style={caption}>FOCUSED · INVALID · LOADING</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DatePickerTrigger forceState="Focused" placeholderText="Pick a start date" style={{ width: 280 }} />
          <DatePickerTrigger aria-invalid valueText="Jan 1, 2025" style={{ width: 280 }} />
          <DatePickerTrigger loading style={{ width: 280 }} />
        </div>
      </div>
    </div>
  ),
}
