import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarHeader, CALENDAR_HEADER_HEADERS, CALENDAR_HEADER_SIZES,
  type CalendarHeaderHeader, type CalendarHeaderSize,
} from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarHeaderSize[] = [...CALENDAR_HEADER_SIZES]
const HEADERS: CalendarHeaderHeader[] = [...CALENDAR_HEADER_HEADERS]

/** Story args = the Figma `CalendarHeader` set (design-plans/calendar-header-contract.md), in the panel's
 *  order and with its defaults: Size · Header, then Label · Month · Year (TEXT). */
interface CalendarHeaderStoryArgs {
  size: CalendarHeaderSize
  header: CalendarHeaderHeader
  label: string
  month: string
  year: string
}

function render({ size, header, label, month, year }: CalendarHeaderStoryArgs) {
  return <CalendarHeader size={size} header={header} label={label} month={month} year={year} />
}

const meta: Meta<CalendarHeaderStoryArgs> = {
  title: 'Forms/CalendarHeader',
  render,
  args: { size: 'default', header: 'single', label: 'November 2026', month: 'November', year: '2026' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'As wide as seven 40 (default) or 32 (sm) px day cells.' },
    header: { name: 'Header', control: 'select', options: HEADERS, description: 'single: one month/year chip · multiple: month and year chips · plain: static heading.' },
    label: { name: 'Label', control: 'text' },
    month: { name: 'Month', control: 'text' },
    year: { name: 'Year', control: 'text' },
  },
}
export default meta
type Story = StoryObj<CalendarHeaderStoryArgs>

export const Playground: Story = {}

/** The six variants of the file: Size × Header. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {SIZES.flatMap((size) => HEADERS.map((header) => <div key={`${size}-${header}`}>{render({ ...args, size, header })}</div>))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

export const Headers: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {HEADERS.map((header) => <div key={header}>{render({ ...args, header })}</div>)}
    </div>
  ),
}
