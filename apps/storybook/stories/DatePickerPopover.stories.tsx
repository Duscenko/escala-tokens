import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  DatePickerPopover,
  type DatePickerPopoverMode, type DatePickerPopoverSize,
} from '../../../src/components/escala-ui/date-picker'
import { Calendar } from '../../../src/components/escala-ui/calendar'

const SIZES: DatePickerPopoverSize[] = ['default', 'sm']
const MODES: DatePickerPopoverMode[] = ['single', 'range']

/** Story args = the Figma `DatePickerPopover` set (design-plans/date-picker-popover-contract.md),
 *  in the panel's order and with its defaults: Size · Mode. The set is a thin shell (Radius/overlay
 *  + the Shadow/lg lift) around the file's Calendar: the footer always, the presets rail in range. */
interface DatePickerPopoverStoryArgs {
  size: DatePickerPopoverSize
  mode: DatePickerPopoverMode
}

function Panel({ size, mode }: DatePickerPopoverStoryArgs) {
  return (
    <DatePickerPopover inline size={size} mode={mode}>
      <Calendar key={mode} size={size} mode={mode} presets={mode === 'range'} footer />
    </DatePickerPopover>
  )
}

const meta: Meta<DatePickerPopoverStoryArgs> = {
  title: 'Forms/DatePicker',
  tags: ['!autodocs', 'part'],
  render: (args) => <div style={{ padding: 24 }}><Panel {...args} /></div>,
  args: { size: 'default', mode: 'single' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'The panel is 322 px (default) or 250 px (sm) wide in single mode.' },
    mode: { name: 'Mode', control: 'select', options: MODES, description: 'single selects one date; range adds the presets rail (482 · 390 px wide).' },
  },
}
export default meta
type Story = StoryObj<DatePickerPopoverStoryArgs>

export const DatePickerPopoverPlayground: Story = { name: 'DatePickerPopover · Playground' }

/** Every Size × Mode, as the file's 4 variants. */
export const DatePickerPopoverAllCombinations: Story = {
  name: 'DatePickerPopover · All Combinations',
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, padding: 24, alignItems: 'flex-start' }}>
      {SIZES.flatMap((size) => MODES.map((mode) => <Panel key={`${size}-${mode}`} {...args} size={size} mode={mode} />))}
    </div>
  ),
}

export const DatePickerPopoverSizes: Story = {
  name: 'DatePickerPopover · Sizes',
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, padding: 24, alignItems: 'flex-start' }}>
      {SIZES.map((size) => <Panel key={size} {...args} size={size} />)}
    </div>
  ),
}

export const DatePickerPopoverModes: Story = {
  name: 'DatePickerPopover · Modes',
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, padding: 24, alignItems: 'flex-start' }}>
      {MODES.map((mode) => <Panel key={mode} {...args} mode={mode} />)}
    </div>
  ),
}
