import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ActivityHeatmapCell,
  ACTIVITY_HEATMAP_CELL_STATES,
  ACTIVITY_HEATMAP_CELL_VALUES,
  type ActivityHeatmapCellState,
  type ActivityLevel,
} from '../../../src/components/escala-ui/activity-heatmap'

/** Story args = the Figma `ActivityHeatmapCell` set (2400:57, design-plans/activityheatmap-contract.md), in the panel's order and with its
 *  defaults: Value 0–5 (default 0) · State Default · Focused. A 12 px square on `Chart/sequential/<Value>`; Focused adds the 2 px
 *  `Border/ring/default` ring one pixel off its edge. Inside the heatmap it is a `gridcell`; here a grid of one row holds it. */
interface ActivityHeatmapCellStoryArgs {
  value: `${ActivityLevel}`
  forceState: ActivityHeatmapCellState
}

const LABEL = ['No contributions', '1 contribution', '3 contributions', '6 contributions', '10 contributions', '15 contributions']

function cell(value: `${ActivityLevel}`, forceState: ActivityHeatmapCellState, tabIndex?: number) {
  return <ActivityHeatmapCell value={Number(value) as ActivityLevel} forceState={forceState} aria-label={`Level ${value}: ${LABEL[Number(value)]}`} tabIndex={tabIndex} />
}

/** A one-row grid, so the cells keep a valid parent (`grid` → `row` → `gridcell`). The cells sit a group apart: the Focused ring reaches 3 px past a square, so tight neighbours would overlap it (inside the heatmap they do, as in the file). */
function row(cells: React.ReactNode, label: string) {
  return (
    <div role="grid" aria-label={label} style={{ display: 'inline-flex' }}>
      <div role="row" style={{ display: 'flex', gap: 'var(--spacing-gap-group)', padding: 'var(--spacing-gap-group)' }}>{cells}</div>
    </div>
  )
}

const meta: Meta<ActivityHeatmapCellStoryArgs> = {
  title: 'Indicators/ActivityHeatmap',
  tags: ['!autodocs', 'part'],
  parameters: { layout: 'centered' },
  render: ({ value, forceState }) => row(cell(value, forceState), 'Activity cell'),
  args: { value: '0', forceState: 'Default' },
  argTypes: {
    value: { name: 'Value', control: 'select', options: [...ACTIVITY_HEATMAP_CELL_VALUES], description: 'Level 0–5 → Chart/sequential/<n>: 0 no activity, 5 the most.' },
    forceState: { name: 'State', control: 'select', options: [...ACTIVITY_HEATMAP_CELL_STATES], description: 'Pins Focused (the ring); in an app it follows the keyboard (:focus-visible).' },
  },
}
export default meta
type Story = StoryObj<ActivityHeatmapCellStoryArgs>

export const ActivityHeatmapCellPlayground: Story = { name: 'ActivityHeatmapCell · Playground' }

/** The six levels, Default: the sequential ladder, from "no activity" to "the most". */
export const ActivityHeatmapCellLevels: Story = {
  name: 'ActivityHeatmapCell · Levels',
  render: (args) => row(ACTIVITY_HEATMAP_CELL_VALUES.map((v) => <span key={v}>{cell(v, args.forceState)}</span>), 'Activity levels'),
}

/** The 12 variants of the set, as the Figma DocMatrix draws them: Value across, State down. */
export const ActivityHeatmapCellAllCombinations: Story = {
  name: 'ActivityHeatmapCell · All Combinations',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)' }}>
      {ACTIVITY_HEATMAP_CELL_STATES.map((state) => (
        <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-gap-group)' }}>
          <span style={{ width: 64, font: 'var(--text-caption-font-size) / var(--text-caption-line-height) var(--text-caption-font-family)', color: 'var(--color-content-secondary)' }}>{state}</span>
          {row(ACTIVITY_HEATMAP_CELL_VALUES.map((v) => <span key={v}>{cell(v, state)}</span>), `${state} levels`)}
        </div>
      ))}
    </div>
  ),
}

export const ActivityHeatmapCellStates: Story = {
  name: 'ActivityHeatmapCell · States',
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-gap-group)', alignItems: 'center' }}>
      {ACTIVITY_HEATMAP_CELL_STATES.map((state) => <span key={state}>{row(cell('3', state), state)}</span>)}
    </div>
  ),
}
