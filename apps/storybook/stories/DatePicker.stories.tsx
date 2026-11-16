import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  DatePickerPopover, DatePickerTrigger, formatPickedDate,
  type DatePickerPopoverMode, type DatePickerPopoverSize,
} from '../../../src/components/escala-ui/date-picker'
import { Calendar } from '../../../src/components/escala-ui/calendar'
import { Popover, PopoverTrigger } from '../../../src/components/escala-ui/popover'

/** The DatePicker family's root. The Figma page has no `DatePicker` set: it is DatePickerTrigger (the field) and
 *  DatePickerPopover (the panel around the file's Calendar). This is the two together as a designer places them: the
 *  trigger opens the popover 8px below it; Escape closes it, Apply closes it too and the chosen day goes back into the
 *  trigger. Size and Mode are the popover's axes. Each part keeps its own playground. */
interface DatePickerStoryArgs {
  size: DatePickerPopoverSize
  mode: DatePickerPopoverMode
}

const MONTH = new Date(2026, 10, 1)

function DatePickerDemo({ size, mode }: DatePickerStoryArgs) {
  const [open, setOpen] = React.useState(true)
  const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 10, 12))
  const single = mode === 'single'
  return (
    <div style={{ minHeight: single ? 480 : 560, padding: 24 }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <DatePickerTrigger valueText={single && date ? formatPickedDate(date) : undefined} style={{ width: 280 }} />
        </PopoverTrigger>
        <DatePickerPopover size={size} mode={mode}>
          {single ? (
            <Calendar
              size={size} mode="single" footer defaultMonth={MONTH}
              value={date} onValueChange={(d) => setDate(d instanceof Date ? d : undefined)}
              onApply={() => setOpen(false)}
            />
          ) : (
            <Calendar key="range" size={size} mode="range" presets footer defaultMonth={MONTH} onApply={() => setOpen(false)} />
          )}
        </DatePickerPopover>
      </Popover>
    </div>
  )
}

const meta: Meta<DatePickerStoryArgs> = {
  title: 'Forms/DatePicker',
  render: (args) => <DatePickerDemo key={`${args.size}-${args.mode}`} {...args} />,
  args: { size: 'default', mode: 'single' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'sm'] },
    mode: { name: 'Mode', control: 'select', options: ['single', 'range'] },
  },
}
export default meta
type Story = StoryObj<DatePickerStoryArgs>

export const Playground: Story = {}
