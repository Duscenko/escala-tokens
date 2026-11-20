import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SplitBar, type SplitBarSegmentData } from '../../../src/components/escala-ui/split-bar'
import { Button } from '../../../src/components/escala-ui/button'
import { blockType } from '../../../src/components/escala-ui/blocks/shared'

/** Story args = the Figma `SplitBar` component (2401:248, design-plans/splitbar-contract.md): `LegendVisible` is its one boolean;
 *  `Bar` and `Legend` are slots, which in code are the `segments` (see the stories below for their shape). */
interface SplitBarStoryArgs {
  legendVisible: boolean
}

/** The file's sample: traffic by source, 99,300 sessions. The last two are under 5 %, so their text moves under the bar. */
const TRAFFIC: SplitBarSegmentData[] = [
  { id: 'organic', label: 'Organic search', value: 41_300, series: 1 },
  { id: 'direct', label: 'Direct', value: 24_600, series: 2 },
  { id: 'paid', label: 'Paid search', value: 19_000, series: 3 },
  { id: 'social', label: 'Social', value: 9_800, series: 4 },
  { id: 'referral', label: 'Referral', value: 3_100, series: 5 },
  { id: 'other', label: 'Other', value: 1_500, series: 6 },
]

/** The file draws the set 960 wide. */
const frame: React.CSSProperties = { width: 'calc(var(--dimension-96, 384px) * 2.5)', maxWidth: '100%' }

function Chart({ legendVisible, ...rest }: { legendVisible: boolean } & Partial<React.ComponentProps<typeof SplitBar>>) {
  return (
    <div style={frame}>
      <SplitBar aria-label="Traffic by source" segments={TRAFFIC} valueUnit="sessions" showLegend={legendVisible} {...rest} />
    </div>
  )
}

const meta: Meta<SplitBarStoryArgs> = {
  title: 'Indicators/SplitBar',
  // Contrast as the file draws it (design-plans/splitbar-contract.md, COL-CHART-01 · 02): in Light, Chart/series-2 · 3 · 4 · 6 /content on their
  // /soft read 4.30–4.46:1 (under 4.5), and a legend item that is off is Content/disabled (3.58:1 Light, 4.29:1 Dark). Dark passes everywhere else.
  // The a11y panel skips only those elements; the roles are the owner's decision, not a bug.
  parameters: { a11y: { context: { exclude: ['[data-escala="SplitBarSegment"][data-series="2"]', '[data-escala="SplitBarSegment"][data-series="3"]', '[data-escala="SplitBarSegment"][data-series="4"]', '[data-escala="SplitBarSegment"][data-series="6"]', '[data-escala="SplitBarLegendItem"][data-checked="false"]'] } } },
  render: (a) => <Chart legendVisible={a.legendVisible} />,
  args: { legendVisible: true },
  argTypes: {
    legendVisible: { name: 'LegendVisible', control: 'boolean', description: 'The legend under the bar: one toggle per series. Without it the bar cannot be filtered.' },
  },
}
export default meta
type Story = StoryObj<SplitBarStoryArgs>

/**
 * The file's SplitBar: a bar that is 100 % of the sessions, six sources, and the legend that turns each one on and off.
 * Hover or focus a segment and it widens to show its label; press a legend item and the others reflow to 100 %.
 * `segments` is `{ id, label, value, series }[]`: `value` is any non-negative number (the bar shows each as a share),
 * `series` 1–8 picks the Chart colour. Name the chart with `aria-label` (or `aria-labelledby` its title).
 */
export const Playground: Story = {}

/**
 * Series 1–8: the eight chart colours, in the fixed order of the file (violet · teal · amber · blue · rose · lime · magenta · orange).
 * Each segment is `Chart/series-n/soft` with a `Chart/series-n/solid` edge on its right and `Chart/series-n/content` text, so a segment
 * never relies on colour alone to be told from its neighbour. **Chart vs Status:** `Chart/*` are categories with no meaning (a source
 * is not better than another); when a share means good or bad (passed · failed), use `Status/*` — never a Chart colour for a verdict,
 * and never an opacity on top of a Chart role. **Contrast:** text on `/soft` is as the file draws it: Dark reads 6.3–8.0:1; Light 4.3–4.8:1, with
 * series 2 · 3 · 4 · 6 just under 4.5 (4.30 · 4.40 · 4.46 · 4.30), reported as COL-CHART-01.
 */
export const Series: Story = {
  render: (a) => (
    <Chart
      legendVisible={a.legendVisible}
      segments={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `s${n}`, label: `Series ${n}`, value: 100 - n * 7, series: n as SplitBarSegmentData['series'] }))}
      aria-label="The eight chart colours"
      valueUnit={undefined}
    />
  ),
}

/**
 * What the file's states look like on a whole bar. Top to bottom: the default; Social widened as by the pointer or the
 * keyboard (`forceActiveId` pins it for docs: in an app it follows hover and focus, and the others give way); a series turned off
 * (`defaultHiddenIds`), the rest reflowed to 100 % and its legend item Surface/muted with Content/disabled text.
 */
export const States: Story = {
  render: (a) => {
    const caption = (text: string) => <span style={{ ...blockType('caption'), color: 'var(--color-content-secondary)' }}>{text}</span>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)' }}>
        {caption('Default')}
        <Chart legendVisible={a.legendVisible} aria-label="Default" />
        {caption('Widened: the pointer or the keyboard is on Social, so it shows its label')}
        <Chart legendVisible={a.legendVisible} aria-label="Widened" forceActiveId="social" />
        {caption('A series turned off: Direct, the rest reflowed to 100 %')}
        <Chart legendVisible={a.legendVisible} aria-label="A series turned off" defaultHiddenIds={['direct']} />
      </div>
    )
  },
}

/**
 * Narrow segments. A segment shows its label and value when they fit, only the value when it is narrower, and nothing
 * under that; a share under 5 % (`leaderBelow`) keeps its text out of the bar and gets a callout under it, a hairline in its
 * own `Chart/series-n/solid` running up to the segment (the file calls this consumer layout: it is code only).
 */
export const NarrowSegments: Story = {
  render: (a) => (
    <Chart
      legendVisible={a.legendVisible}
      aria-label="Storage by type"
      valueUnit="GB"
      segments={[
        { id: 'a', label: 'Photos', value: 640, series: 1 },
        { id: 'b', label: 'Videos', value: 180, series: 2 },
        { id: 'c', label: 'Documents', value: 90, series: 3 },
        { id: 'd', label: 'Backups', value: 52, series: 4 },
        { id: 'e', label: 'Mail', value: 24, series: 5 },
        { id: 'f', label: 'Trash', value: 14, series: 6 },
      ]}
    />
  ),
}

/**
 * The real behaviour, in a card. **Pointer:** hover a segment to widen it on `use-hover`. **Keyboard:** Tab visits every segment, then every
 * legend item; Enter or Space presses (a segment calls `onSegmentClick`, a legend item turns its series off or on). **Motion:** turning a
 * series off reflows the others to 100 %, the ones that grow on `use-travel-in`, the ones that shrink on `use-travel-out`; the last
 * series shown cannot be turned off. Reduced motion: the roles collapse to the system's short fade (`--motion-duration-fade`), nothing travels. Pressed segment:
 */
export const Motion: Story = {
  render: (a) => {
    const [pressed, setPressed] = React.useState<string>('none')
    const [hidden, setHidden] = React.useState<string[]>([])
    return (
      <div
        style={{
          ...frame, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', padding: 'var(--spacing-inset-surface)', boxSizing: 'border-box',
          background: 'var(--color-surface-layer-1)', border: 'var(--stroke-divider, 1px) solid var(--color-border-default)', borderRadius: 'var(--radius-container)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 id="traffic-title" style={{ ...blockType('heading-2xs'), margin: 0, color: 'var(--color-content-primary)' }}>Traffic by source</h3>
          <span style={{ ...blockType('body-sm'), color: 'var(--color-content-secondary)' }}>Sessions on ohmewn.com · 99,300 in total</span>
        </div>
        <SplitBar
          aria-labelledby="traffic-title"
          segments={TRAFFIC}
          valueUnit="sessions"
          showLegend={a.legendVisible}
          hiddenIds={hidden}
          onHiddenIdsChange={setHidden}
          onSegmentClick={(id) => setPressed(TRAFFIC.find((s) => s.id === id)?.label ?? id)}
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-gap-control)', alignItems: 'center' }}>
          <Button variant="secondary" appearance="outline" size="sm" onClick={() => setHidden([])}>Show all</Button>
          <span style={{ ...blockType('body-sm'), color: 'var(--color-content-secondary)' }}>Pressed: {pressed}</span>
        </div>
      </div>
    )
  },
}
