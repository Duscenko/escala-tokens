import type { Meta, StoryObj } from '@storybook/react-vite'
import { DatePicker, type DatePickerTriggerSize } from '../../../src/components/escala-ui/date-picker'
import type { CalendarMode } from '../../../src/components/escala-ui/calendar'

/** The DatePicker family's root. The Figma page has no `DatePicker` set: it is DatePickerTrigger (the field) and
 *  DatePickerPopover (the panel around the file's Calendar), wired by the `DatePicker` component. A click opens the
 *  popover 8px under the trigger; a day writes into the trigger; Apply, Escape or a click outside close it. Each part
 *  keeps its own playground under Anatomy. */
interface DatePickerStoryArgs {
  size: DatePickerTriggerSize
  mode: CalendarMode
  open: boolean
  placeholderText: string
}

const meta: Meta<DatePickerStoryArgs> = {
  title: 'Forms/DatePicker',
  render: ({ size, mode, open, placeholderText }) => (
    <div style={{ minHeight: mode === 'range' ? 560 : 500, width: 340 }}>
      <DatePicker
        key={`${size}-${mode}-${open}`}
        size={size} mode={mode} defaultOpen={open} placeholderText={placeholderText} style={{ width: 280 }}
        defaultValue={mode === 'single' ? new Date(2026, 10, 12) : undefined}
      />
    </div>
  ),
  args: { size: 'default', mode: 'single', open: true, placeholderText: 'Select date' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['lg', 'default', 'sm'], description: 'The trigger’s; the popover follows (sm → 250 px, else 322 px).' },
    mode: { name: 'Mode', control: 'select', options: ['single', 'multiple', 'range'], description: 'One date, several, or a range (adds the presets rail).' },
    open: { name: 'Open', control: 'boolean', description: 'Starts with the popover open. Click the trigger to toggle it.' },
    placeholderText: { name: 'PlaceholderText', control: 'text' },
  },
}
export default meta
type Story = StoryObj<DatePickerStoryArgs>

export const Playground: Story = {}
