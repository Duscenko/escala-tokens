import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarDay, CALENDAR_DAY_SIZES, CALENDAR_DAY_STATES, CALENDAR_DAY_VARIANTS,
  type CalendarDayShape, type CalendarDaySize, type CalendarDayState, type CalendarDayVariant,
} from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarDaySize[] = [...CALENDAR_DAY_SIZES]
const STATES: CalendarDayState[] = [...CALENDAR_DAY_STATES]
const VARIANTS: CalendarDayVariant[] = [...CALENDAR_DAY_VARIANTS]

/** Story args = the Figma `CalendarDay` set (design-plans/calendar-day-contract.md), in the panel's
 *  order and with its defaults: Size · State · Variant, then Day (TEXT) and IndicatorVisible (BOOLEAN).
 *  `shape` is the file's instance override (rounded · pill · square), not a component property. */
interface CalendarDayStoryArgs {
  size: CalendarDaySize
  forceState: CalendarDayState
  variant: CalendarDayVariant
  day: string
  indicatorVisible: boolean
  shape: CalendarDayShape
}

function render({ size, forceState, variant, day, indicatorVisible, shape }: CalendarDayStoryArgs) {
  return (
    <CalendarDay
      size={size}
      variant={variant}
      forceState={forceState === 'Default' ? undefined : forceState}
      indicator={indicatorVisible}
      shape={shape}
    >
      {day}
    </CalendarDay>
  )
}

const meta: Meta<CalendarDayStoryArgs> = {
  title: 'Forms/CalendarDay',
  render,
  args: { size: 'default', forceState: 'Default', variant: 'default', day: '15', indicatorVisible: false, shape: 'rounded' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'A 40 (Size/control) or 32 (Size/compact) square.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    variant: { name: 'Variant', control: 'select', options: VARIANTS },
    day: { name: 'Day', control: 'text' },
    indicatorVisible: { name: 'IndicatorVisible', control: 'boolean' },
    shape: { name: 'Day shape (instance override)', control: 'select', options: ['rounded', 'pill', 'square'] },
  },
}
export default meta
type Story = StoryObj<CalendarDayStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Variant, as the file's 44 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {VARIANTS.flatMap((variant) => SIZES.map((size) => (
        <div key={`${variant}-${size}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {STATES.map((forceState) => <div key={forceState}>{render({ ...args, variant, size, forceState })}</div>)}
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size, forceState: 'Selected' })}</div>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState })}</div>)}
    </div>
  ),
}

/** A week with a range laid across it, as the Calendar will draw it: RangeStart · RangeMiddle · RangeEnd. */
export const Range: Story = {
  render: (args) => (
    <div style={{ display: 'flex' }}>
      {(['Outside', 'RangeStart', 'RangeMiddle', 'RangeMiddle', 'RangeEnd', 'Default', 'Today'] as CalendarDayState[]).map((forceState, i) => (
        <div key={i}>{render({ ...args, forceState, day: String(10 + i) })}</div>
      ))}
    </div>
  ),
}
