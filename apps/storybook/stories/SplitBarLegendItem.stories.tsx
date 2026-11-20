import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SplitBarLegendItem, SPLIT_BAR_SERIES, SPLIT_BAR_LEGEND_ITEM_STATES, type SplitBarSeries, type SplitBarLegendItemState,
} from '../../../src/components/escala-ui/split-bar'

/** Story args = the Figma `SplitBarLegendItem` set (2401:211, design-plans/splitbar-contract.md), in the panel's order and with its
 *  defaults: Series · Checked · State are its variant axes, Label and Value its TEXT properties, ValueVisible its boolean. */
interface LegendItemStoryArgs {
  series: SplitBarSeries
  checked: boolean
  state: SplitBarLegendItemState
  label: string
  value: string
  valueVisible: boolean
}

const render = (a: LegendItemStoryArgs) => (
  <SplitBarLegendItem
    series={a.series}
    checked={a.checked}
    label={a.label}
    value={a.value}
    valueVisible={a.valueVisible}
    forceState={a.state === 'Default' ? undefined : a.state}
  />
)

const meta: Meta<LegendItemStoryArgs> = {
  title: 'Indicators/SplitBar',
  tags: ['!autodocs', 'part'],
  // An item that is off is Content/disabled on the page: 3.58:1 in Light, 4.29:1 in Dark (COL-CHART-02): as the file draws it, reported, not fixed.
  parameters: { a11y: { context: { exclude: ['[data-escala="SplitBarLegendItem"][data-checked="false"]'] } } },
  render,
  args: { series: '1', checked: true, state: 'Default', label: 'Organic search', value: '41.6%', valueVisible: true },
  argTypes: {
    series: { name: 'Series', control: 'select', options: [...SPLIT_BAR_SERIES], description: 'Chart/series-n/solid: the swatch.' },
    checked: { name: 'Checked', control: 'boolean', description: 'The series is shown (aria-pressed). Off: Surface/muted swatch, Content/disabled text.' },
    state: { name: 'State', control: 'select', options: [...SPLIT_BAR_LEGEND_ITEM_STATES], description: 'Pins a state; in an app Focused comes from the keyboard.' },
    label: { name: 'Label', control: 'text' },
    value: { name: 'Value', control: 'text' },
    valueVisible: { name: 'ValueVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<LegendItemStoryArgs>

export const SplitBarLegendItemPlayground: Story = {
  name: 'SplitBarLegendItem · Playground',
  render: (args) => {
    const [checked, setChecked] = React.useState(args.checked)
    React.useEffect(() => setChecked(args.checked), [args.checked])
    return <SplitBarLegendItem series={args.series} checked={checked} onCheckedChange={setChecked} label={args.label} value={args.value} valueVisible={args.valueVisible} forceState={args.state === 'Default' ? undefined : args.state} />
  },
}

/** Every Series × Checked × State, as the file's grid draws it (32 variants). */
export const SplitBarLegendItemAllCombinations: Story = {
  name: 'SplitBarLegendItem · AllCombinations',
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: 'var(--spacing-gap-group)', alignItems: 'center' }}>
      {SPLIT_BAR_SERIES.flatMap((series) => [true, false].flatMap((checked) => SPLIT_BAR_LEGEND_ITEM_STATES.map((state) => <div key={`${series}-${checked}-${state}`}>{render({ ...args, series, checked, state })}</div>)))}
    </div>
  ),
}

/** Series 1–8, shown. */
export const SplitBarLegendItemSeries: Story = {
  name: 'SplitBarLegendItem · Series',
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)' }}>
      {SPLIT_BAR_SERIES.map((series) => <div key={series}>{render({ ...args, series })}</div>)}
    </div>
  ),
}

/** Checked on and off, Default and Focused: the Focused ring is the Button ring (2px, 1px off the edge) in Border/ring/neutral. */
export const SplitBarLegendItemStates: Story = {
  name: 'SplitBarLegendItem · States',
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-gap-group)', padding: 'var(--spacing-gap-control)' }}>
      {[true, false].flatMap((checked) => SPLIT_BAR_LEGEND_ITEM_STATES.map((state) => <div key={`${checked}-${state}`}>{render({ ...args, checked, state })}</div>))}
    </div>
  ),
}
