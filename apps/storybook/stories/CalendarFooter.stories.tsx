import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarFooter, CALENDAR_FOOTER_SIZES, type CalendarFooterSize } from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarFooterSize[] = [...CALENDAR_FOOTER_SIZES]

/** Story args = the Figma `CalendarFooter` set (design-plans/calendar-footer-contract.md): Size, its only property. */
interface CalendarFooterStoryArgs {
  size: CalendarFooterSize
}

function render({ size }: CalendarFooterStoryArgs) {
  return <CalendarFooter size={size} />
}

const meta: Meta<CalendarFooterStoryArgs> = {
  title: 'Forms/CalendarFooter',
  render,
  args: { size: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'A 312×72 (default) or 248×56 (sm) bar; the Buttons follow.' },
  },
}
export default meta
type Story = StoryObj<CalendarFooterStoryArgs>

export const Playground: Story = {}

/** The two variants of the file. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}
