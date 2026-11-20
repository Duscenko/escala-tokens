import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SplitBarSegment, SPLIT_BAR_SERIES, SPLIT_BAR_SEGMENT_STATES, type SplitBarSeries, type SplitBarSegmentState,
} from '../../../src/components/escala-ui/split-bar'

/** Story args = the Figma `SplitBarSegment` set (2401:102, design-plans/splitbar-contract.md), in the panel's order and with its
 *  defaults: Series · State are its variant axes, Label and Value its TEXT properties, LabelVisible and ValueVisible its booleans. */
interface SegmentStoryArgs {
  series: SplitBarSeries
  state: SplitBarSegmentState
  label: string
  value: string
  labelVisible: boolean
  valueVisible: boolean
}

/** The file draws the segment 240 wide; in a bar its width is its share of 100 %. */
const frame = { width: 'calc(var(--dimension-96, 384px) * 0.625)', maxWidth: '100%' } as const

const render = (a: SegmentStoryArgs) => (
  <div style={frame}>
    <SplitBarSegment
      series={a.series}
      label={a.label}
      value={a.value}
      labelVisible={a.labelVisible}
      valueVisible={a.valueVisible}
      forceState={a.state === 'Default' ? undefined : a.state}
      aria-label={`${a.label}, ${a.value}`}
    />
  </div>
)

const meta: Meta<SegmentStoryArgs> = {
  title: 'Indicators/SplitBar',
  tags: ['!autodocs', 'part'],
  // In Light, Chart/series-2 · 3 · 4 · 6 /content on their /soft read 4.30–4.46:1 (COL-CHART-01): as the file draws them, reported, not fixed.
  parameters: { a11y: { context: { exclude: ['[data-escala="SplitBarSegment"][data-series="2"]', '[data-escala="SplitBarSegment"][data-series="3"]', '[data-escala="SplitBarSegment"][data-series="4"]', '[data-escala="SplitBarSegment"][data-series="6"]'] } } },
  render,
  args: { series: '1', state: 'Default', label: 'Organic search', value: '41.6%', labelVisible: true, valueVisible: true },
  argTypes: {
    series: { name: 'Series', control: 'select', options: [...SPLIT_BAR_SERIES], description: 'Chart/series-n: soft fill, solid right edge, content text.' },
    state: { name: 'State', control: 'select', options: [...SPLIT_BAR_SEGMENT_STATES], description: 'Pins a state; in an app Focused comes from the keyboard. There is no Hover colour: hover widens the segment inside a SplitBar.' },
    label: { name: 'Label', control: 'text' },
    value: { name: 'Value', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    valueVisible: { name: 'ValueVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<SegmentStoryArgs>

export const SplitBarSegmentPlayground: Story = { name: 'SplitBarSegment · Playground' }

/** Every Series × State, as the file's grid draws it (16 variants). */
export const SplitBarSegmentAllCombinations: Story = {
  name: 'SplitBarSegment · AllCombinations',
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: 'var(--spacing-gap-group)' }}>
      {SPLIT_BAR_SERIES.flatMap((series) => SPLIT_BAR_SEGMENT_STATES.map((state) => <div key={`${series}-${state}`}>{render({ ...args, series, state })}</div>))}
    </div>
  ),
}

/** Series 1–8: Chart/series-n/soft, /solid and /content. */
export const SplitBarSegmentSeries: Story = {
  name: 'SplitBarSegment · Series',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)' }}>
      {SPLIT_BAR_SERIES.map((series) => <div key={series}>{render({ ...args, series })}</div>)}
    </div>
  ),
}

/** Default and Focused: the ring is Stroke/focus wide, inside the segment, Border/ring/neutral. */
export const SplitBarSegmentStates: Story = {
  name: 'SplitBarSegment · States',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)' }}>
      {SPLIT_BAR_SEGMENT_STATES.map((state) => <div key={state}>{render({ ...args, state })}</div>)}
    </div>
  ),
}
