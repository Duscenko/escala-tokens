import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ActivityHeatmap, ACTIVITY_DEFAULT_THRESHOLDS } from '../../../src/components/escala-ui/activity-heatmap'
import { Button } from '../../../src/components/escala-ui/button'
import { describeActivityDay, type ActivityDay } from '../../../src/lib/activityHeatmap'
import { DATASETS, FIGMA_SAMPLE, SAMPLE_END, SAMPLE_FOCUSED_DATE, type DatasetName } from './activityHeatmapSample'

/** Story args = the Figma `ActivityHeatmap` component's properties (design-plans/activityheatmap-contract.md), in the order and
 *  with the defaults of Figma's component playground: LegendVisible · MonthLabelsVisible · DayLabelsVisible (all true). The data is
 *  code's (`data`, `thresholds`): `dataset` picks a deterministic sample and `focusedDay` pins the ring on one day for docs.
 *  A year of days, one square each, one column per week (53 × 7); `role="grid"` with arrow-key navigation. */
interface ActivityHeatmapStoryArgs {
  legendVisible: boolean
  monthLabelsVisible: boolean
  dayLabelsVisible: boolean
  dataset: DatasetName
  focusedDay: string
}

const FRAME = { overflowX: 'auto', padding: 'var(--spacing-gap-tight)' } as const

function heatmap({ legendVisible, monthLabelsVisible, dayLabelsVisible, dataset, focusedDay }: ActivityHeatmapStoryArgs, extra: Partial<React.ComponentProps<typeof ActivityHeatmap>> = {}) {
  return (
    <ActivityHeatmap
      data={DATASETS[dataset]}
      endDate={SAMPLE_END}
      showLegend={legendVisible}
      showMonthLabels={monthLabelsVisible}
      showDayLabels={dayLabelsVisible}
      forceFocusedDate={focusedDay || undefined}
      aria-label="Contributions in 2025"
      {...extra}
    />
  )
}

const meta: Meta<ActivityHeatmapStoryArgs> = {
  title: 'Indicators/ActivityHeatmap',
  tags: ['stage:storybook'],
  parameters: { layout: 'centered' },
  render: (args) => <div style={FRAME}>{heatmap(args)}</div>,
  args: { legendVisible: true, monthLabelsVisible: true, dayLabelsVisible: true, dataset: 'Figma sample', focusedDay: '' },
  argTypes: {
    legendVisible: { name: 'LegendVisible', control: 'boolean', description: '"Less ▢▢▢▢▢▢ More" under the grid.' },
    monthLabelsVisible: { name: 'MonthLabelsVisible', control: 'boolean', description: 'Jan … Dec above the week they start on.' },
    dayLabelsVisible: { name: 'DayLabelsVisible', control: 'boolean', description: 'Mon · Wed · Fri beside the rows.' },
    dataset: { name: 'Data (code)', control: 'inline-radio', options: Object.keys(DATASETS), description: 'Deterministic samples. "Figma sample" is the file\'s own picture, cell for cell.' },
    focusedDay: { name: 'Focused day (docs)', control: 'text', description: 'ISO date to pin the ring on (the file leaves one cell Focused: 2025-03-18). In an app the ring follows the keyboard.' },
  },
}
export default meta
type Story = StoryObj<ActivityHeatmapStoryArgs>

export const Playground: Story = {}

/** The eight combinations of the three booleans. The prototype's "Resting" is the first; its "Compact" (labels and legend hidden, for
 *  small cards) is the last. */
export const AllCombinations: Story = {
  parameters: { layout: 'padded' },
  render: (args) => {
    const flags = [true, false]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', overflowX: 'auto' }}>
        {flags.flatMap((legend) => flags.flatMap((month) => flags.map((day) => (
          <figure key={`${legend}-${month}-${day}`} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
            <figcaption style={{ font: 'var(--text-caption-font-size) / var(--text-caption-line-height) var(--text-caption-font-family)', color: 'var(--color-content-secondary)' }}>
              {`LegendVisible ${legend} · MonthLabelsVisible ${month} · DayLabelsVisible ${day}`}
            </figcaption>
            <div style={FRAME}>{heatmap({ ...args, legendVisible: legend, monthLabelsVisible: month, dayLabelsVisible: day })}</div>
          </figure>
        ))))}
      </div>
    )
  },
}

/** The focused day, pinned: a 2 px `Border/ring/default` ring one pixel off the square (the file's Focused cell, Tuesday, March 18). */
export const FocusedDay: Story = {
  args: { focusedDay: SAMPLE_FOCUSED_DATE },
}

/** The consumer shows the focused day in a caption below the grid (`onFocusDay`; `null` once focus leaves). Tab into the grid, then
 *  the arrows: left and right move by week, up and down by day, Home and End to the first and last day of the week. */
export const Interactive: Story = {
  render: (args) => {
    const [day, setDay] = React.useState<ActivityDay | null>(null)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
        <div style={FRAME}>{heatmap(args, { onFocusDay: setDay })}</div>
        <p data-testid="caption" aria-live="polite" style={{ margin: 0, font: 'var(--text-body-md-font-size) / var(--text-body-md-line-height) var(--text-body-md-font-family)', color: 'var(--color-content-secondary)' }}>
          {day ? describeActivityDay(day) : 'Focus a day to read it here.'}
        </p>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const grid = canvas.getByRole('grid')
    await userEvent.tab()
    // The tab stop is the end date; Left goes one week back, Up one day back.
    await waitFor(() => expect(grid.contains(document.activeElement)).toBe(true))
    await expect(document.activeElement).toHaveAttribute('aria-label', 'Tuesday, December 30: 0 contributions')
    await userEvent.keyboard('{ArrowLeft}')
    await expect(canvas.getByTestId('caption')).toHaveTextContent('Tuesday, December 23')
    await userEvent.keyboard('{ArrowUp}')
    await expect(canvas.getByTestId('caption')).toHaveTextContent('Monday, December 22')
    await userEvent.keyboard('{Home}')
    await expect(canvas.getByTestId('caption')).toHaveTextContent('Sunday, December 21')
  },
}

/** The same year with sparse, dense and no activity. The squares come from `thresholds` (the count at which levels 1 to 5 begin,
 *  default [1, 3, 6, 10, 15]); a day left out of `data` is level 0. */
export const Datasets: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', overflowX: 'auto' }}>
      {(['Sparse', 'Dense', 'Empty'] as const).map((dataset) => (
        <figure key={dataset} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-control)' }}>
          <figcaption style={{ font: 'var(--text-caption-font-size) / var(--text-caption-line-height) var(--text-caption-font-family)', color: 'var(--color-content-secondary)' }}>
            {`${dataset} · thresholds ${ACTIVITY_DEFAULT_THRESHOLDS.join(' · ')}`}
          </figcaption>
          <div style={FRAME}>{heatmap({ ...args, dataset })}</div>
        </figure>
      ))}
    </div>
  ),
}

const KEYS: [string, string][] = [
  ['Tab', 'Enters the grid on its one tab stop (the last day you focused; the end date at first), and leaves it. The days are not tab stops.'],
  ['← →', 'The same weekday in the previous or next week. Stops at the first and last week.'],
  ['↑ ↓', 'The previous or next day of the week. Stops at Sunday and Saturday (in the last column, at the last day that exists).'],
  ['Home · End', 'The first (Sunday) and the last (Saturday) day of the focused week.'],
  ['Ctrl + Home · Ctrl + End', 'The first and the last day of the grid.'],
]

/** Keyboard behaviour (code owns it; the Figma prototype copies it). Every day is a `gridcell` named by its date and count. */
export const Keyboard: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', maxWidth: 720 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', font: 'var(--text-body-md-font-size) / var(--text-body-md-line-height) var(--text-body-md-font-family)', color: 'var(--color-content-primary)' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left', padding: 'var(--spacing-gap-control)', borderBottom: 'var(--stroke-divider) solid var(--color-border-subtle)' }}>Key</th>
            <th scope="col" style={{ textAlign: 'left', padding: 'var(--spacing-gap-control)', borderBottom: 'var(--stroke-divider) solid var(--color-border-subtle)' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {KEYS.map(([key, action]) => (
            <tr key={key}>
              <th scope="row" style={{ textAlign: 'left', padding: 'var(--spacing-gap-control)', borderBottom: 'var(--stroke-divider) solid var(--color-border-subtle)', whiteSpace: 'nowrap' }}>{key}</th>
              <td style={{ padding: 'var(--spacing-gap-control)', borderBottom: 'var(--stroke-divider) solid var(--color-border-subtle)', color: 'var(--color-content-secondary)' }}>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={FRAME}>{heatmap(args, { 'aria-label': 'Contributions in 2025, try the keys' })}</div>
    </div>
  ),
}

/** No motion on load: the squares are drawn at once, however often it mounts. Replay to check. The only motion is the ring, which
 *  follows `use-focus`; a year switch is a cross-fade of the region by the consumer (`use-page-transition`), not the component. */
export const Motion: Story = {
  render: (args) => {
    const [run, setRun] = React.useState(0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
        <Button variant="secondary" appearance="outline" size="sm" onClick={() => setRun((n) => n + 1)}>Replay</Button>
        <div key={run} style={FRAME}>{heatmap({ ...args, dataset: 'Figma sample' })}</div>
      </div>
    )
  },
}

/** The data the sample draws, for reference: the file's own picture as `{ date, count }`. */
export const Data: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <pre style={{ margin: 0, font: '12px / 1.5 ui-monospace, monospace', color: 'var(--color-content-secondary)' }}>
      {JSON.stringify(FIGMA_SAMPLE.slice(0, 12), null, 2)}
      {'\n… '}{FIGMA_SAMPLE.length} days with activity
    </pre>
  ),
}
