import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { DatePicker, DatePickerTrigger, type DatePickerTriggerSize, type DatePickerTriggerState } from '../../../src/components/escala-ui/date-picker'

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
  // A pinned state is a still (docs, Figma parity); at Default the trigger is live: it opens the calendar.
  if (forceState === 'Default') {
    return (
      <div style={{ minHeight: 480 }}>
        <DatePicker
          size={size} placeholderText={placeholderText} style={{ width: 280 }}
          defaultValue={value === 'filled' ? new Date(2026, 10, 12) : undefined}
        />
      </div>
    )
  }
  return (
    <DatePickerTrigger
      size={size}
      forceState={forceState}
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

/** Trigger → popover, the whole lifecycle: a click opens the DatePickerPopover 8px under the trigger on `popover-enter`, choosing a day writes
 *  it into the trigger and closes on `popover-exit`, and focus returns to the trigger. */
export const OpensTheCalendar: Story = {
  name: 'Opens the calendar',
  args: { value: 'placeholder', forceState: 'Default' },
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLButtonElement>('[data-escala=DatePickerTrigger]')!
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    const panel = await waitFor(() => { const p = document.querySelector('[data-escala=DatePickerPopover]'); expect(p).toBeTruthy(); return p as HTMLElement })
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(getComputedStyle(panel).animationName).not.toBe('none')
    await userEvent.click(await screen.findByRole('button', { name: / 15, \d{4}$/ }))
    await waitFor(() => expect(trigger).toHaveTextContent(/ 15, \d{4}$/))
    await waitFor(() => expect(document.querySelector('[data-escala=DatePickerPopover]')).toBeNull())
    await expect(trigger).toHaveFocus()
  },
}
