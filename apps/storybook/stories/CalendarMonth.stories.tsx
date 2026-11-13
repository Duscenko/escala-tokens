import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarMonth, CALENDAR_MONTH_SIZES, CALENDAR_MONTH_MODES, CALENDAR_MONTH_VARIANTS,
  type CalendarMonthSize, type CalendarMonthMode, type CalendarMonthVariant,
} from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarMonthSize[] = [...CALENDAR_MONTH_SIZES]
const MODES: CalendarMonthMode[] = [...CALENDAR_MONTH_MODES]
const VARIANTS: CalendarMonthVariant[] = [...CALENDAR_MONTH_VARIANTS]

/** Story args = the Figma `CalendarMonth` set (design-plans/calendar-month-contract.md), in the panel's
 *  order and with its defaults: Size · Mode · Variant. The set has no other properties. */
interface CalendarMonthStoryArgs {
  size: CalendarMonthSize
  mode: CalendarMonthMode
  variant: CalendarMonthVariant
}

function render({ size, mode, variant }: CalendarMonthStoryArgs) {
  return <CalendarMonth size={size} mode={mode} variant={variant} />
}

const meta: Meta<CalendarMonthStoryArgs> = {
  title: 'Forms/CalendarMonth',
  render,
  args: { size: 'default', mode: 'single', variant: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Seven 40 (default) or 32 (sm) px day cells wide.' },
    mode: { name: 'Mode', control: 'select', options: MODES, description: 'single: one day · multiple: four days · range: the 10th to the 18th.' },
    variant: { name: 'Variant', control: 'select', options: VARIANTS, description: 'Passed to every day cell.' },
  },
}
export default meta
type Story = StoryObj<CalendarMonthStoryArgs>

export const Playground: Story = {}

/** The twelve variants of the file: Size × Mode × Variant. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {SIZES.flatMap((size) => MODES.flatMap((mode) => VARIANTS.map((variant) => <div key={`${size}-${mode}-${variant}`}>{render({ ...args, size, mode, variant })}</div>)))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24 }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

export const Modes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24 }}>
      {MODES.map((mode) => <div key={mode}>{render({ ...args, mode })}</div>)}
    </div>
  ),
}
