import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarPresets, CALENDAR_PRESETS_SIZES, CALENDAR_PRESETS_VARIANTS,
  type CalendarPresetsSize, type CalendarPresetsVariant,
} from '../../../src/components/escala-ui/calendar'

const SIZES: CalendarPresetsSize[] = [...CALENDAR_PRESETS_SIZES]
const VARIANTS: CalendarPresetsVariant[] = [...CALENDAR_PRESETS_VARIANTS]

/** Story args = the Figma `CalendarPresets` set (design-plans/calendar-presets-contract.md), in the panel's
 *  order and with its defaults: Size · Variant. The set has no other properties. */
interface CalendarPresetsStoryArgs {
  size: CalendarPresetsSize
  variant: CalendarPresetsVariant
}

function render({ size, variant }: CalendarPresetsStoryArgs) {
  return <CalendarPresets size={size} variant={variant} />
}

const meta: Meta<CalendarPresetsStoryArgs> = {
  title: 'Forms/CalendarPresets',
  render,
  args: { size: 'default', variant: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'A 160 (default) or 140 (sm) px rail.' },
    variant: { name: 'Variant', control: 'select', options: VARIANTS, description: 'The selected preset\'s tint, as CalendarDay\'s range.' },
  },
}
export default meta
type Story = StoryObj<CalendarPresetsStoryArgs>

export const Playground: Story = {}

/** The four variants of the file: Size × Variant. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.flatMap((size) => VARIANTS.map((variant) => <div key={`${size}-${variant}`}>{render({ ...args, size, variant })}</div>))}
    </div>
  ),
}
