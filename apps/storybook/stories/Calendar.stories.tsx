import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import {
  Calendar, CALENDAR_SIZES, CALENDAR_MODES, CALENDAR_HEADERS,
  type CalendarSize, type CalendarMode, type CalendarHeaderKind,
} from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarSize[] = [...CALENDAR_SIZES]
const MODES: CalendarMode[] = [...CALENDAR_MODES]
const HEADERS: CalendarHeaderKind[] = [...CALENDAR_HEADERS]

/** Story args = the Figma `Calendar` set (design-plans/calendar-contract.md), in the panel's order and
 *  with its defaults: Size · Mode · Header (variants), then FooterVisible · PresetsVisible. Without a
 *  month or a value it shows the file's November 2026 sample; clicks, the arrows and the presets work. */
interface CalendarStoryArgs {
  size: CalendarSize
  mode: CalendarMode
  header: CalendarHeaderKind
  footerVisible: boolean
  presetsVisible: boolean
}

function render({ size, mode, header, footerVisible, presetsVisible }: CalendarStoryArgs) {
  // Remount on Mode so the sample selection matches the mode.
  return <Calendar key={mode} size={size} mode={mode} header={header} footer={footerVisible} presets={presetsVisible} />
}

const meta: Meta<CalendarStoryArgs> = {
  title: 'Forms/Calendar',
  render,
  args: { size: 'default', mode: 'single', header: 'single', footerVisible: false, presetsVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: '40 (default) or 32 (sm) px day cells: 314 or 250 px wide.' },
    mode: { name: 'Mode', control: 'select', options: MODES, description: 'What a click selects: one day, several days or a range.' },
    header: { name: 'Header', control: 'select', options: HEADERS, description: 'single: one month/year chip · multiple: two chips · plain: text.' },
    footerVisible: { name: 'FooterVisible', control: 'boolean', description: 'Today · Clear · Apply under the month.' },
    presetsVisible: { name: 'PresetsVisible', control: 'boolean', description: 'The presets rail at the start.' },
  },
}
export default meta
type Story = StoryObj<CalendarStoryArgs>

export const Playground: Story = {}

/** Every Size × Mode (Header single). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.flatMap((size) => MODES.map((mode) => <div key={`${size}-${mode}`}>{render({ ...args, size, mode })}</div>))}
    </div>
  ),
}

export const Headers: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {HEADERS.map((header) => <div key={header}>{render({ ...args, header })}</div>)}
    </div>
  ),
}

/** The full panel: presets rail, month in range mode and the footer. */
export const WithPresetsAndFooter: Story = {
  args: { mode: 'range', presetsVisible: true, footerVisible: true },
}

const days = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>('[data-escala=CalendarDay]')]
const stateOf = (root: HTMLElement, n: number) => days(root).find((d) => d.textContent === String(n) && d.getAttribute('data-force-state') !== 'Outside')?.getAttribute('data-force-state')

/** A range, end to end: the first click sets the start, the day under the pointer previews the span from it (either side), the second click
 *  sets the end, and a third starts over. Arrow keys move between the days and Enter / Space picks, so it works without a pointer. */
export const RangeSelection: Story = {
  render: () => <Calendar mode="range" defaultMonth={new Date(2026, 10, 1)} today={new Date(2026, 10, 7)} footer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const day = (n: number) => canvas.getByRole('button', { name: new RegExp(`November ${n}, 2026`) })
    await userEvent.click(day(10))
    await expect(stateOf(canvasElement, 10)).toBe('Selected')
    await userEvent.hover(day(14))
    await waitFor(() => expect([11, 12, 13].map((n) => stateOf(canvasElement, n))).toEqual(['RangeMiddle', 'RangeMiddle', 'RangeMiddle']))
    await expect(stateOf(canvasElement, 10)).toBe('RangeStart')
    await expect(stateOf(canvasElement, 14)).toBe('RangeEnd')
    await userEvent.hover(day(6))
    await waitFor(() => expect(stateOf(canvasElement, 8)).toBe('RangeMiddle'))
    await userEvent.click(day(14))
    await waitFor(() => expect([10, 11, 12, 13, 14].map((n) => stateOf(canvasElement, n))).toEqual(['RangeStart', 'RangeMiddle', 'RangeMiddle', 'RangeMiddle', 'RangeEnd']))
    await userEvent.unhover(day(14))
    await userEvent.click(day(20))
    await expect(stateOf(canvasElement, 20)).toBe('Selected')
    await expect(stateOf(canvasElement, 12)).not.toBe('RangeMiddle')
    // Keyboard: ArrowRight ×2 from the start, Enter ends the range.
    day(20).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')
    await waitFor(() => expect([20, 21, 22].map((n) => stateOf(canvasElement, n))).toEqual(['RangeStart', 'RangeMiddle', 'RangeEnd']))
  },
}
