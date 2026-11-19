// Escala blocks · Dashboard cards. Four cards on the Figma page `❖ Dashboard (PRO)` (2397:82): DashboardGaugeCard (2401:309),
// DashboardMetricCard (2401:325), DashboardActivityCard (2401:362) and DashboardTrafficCard (2401:844). Each is one shell
// (Surface/layer-1, Border/default · Stroke/divider, Radius/container, padding Spacing/inset-surface, gap Spacing/gap-group)
// filled with escala-ui components: Gauge, Sparkline, ActivityHeatmap, SplitBar, SegmentedControl (size sm) and Separator.
// Nothing is drawn here except the arrangement, in role tokens (CSS variables). Sample brand: Ohmewn.
//
// Motion (contract in dashboard.contract.json): a range switch cross-fades the chart region on `use-page-transition`; a nested
// component keeps its own motion (the Sparkline line draws on `use-reveal`, the SplitBar widens on `use-hover`).
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { describeActivityDay, type ActivityDay } from '../../../lib/activityHeatmap'
import { blockType } from './shared'
import { ActivityHeatmap } from '../activity-heatmap'
import { Gauge, type GaugeVariant } from '../gauge'
import { SegmentedControl } from '../segmented-control'
import { Separator } from '../separator'
import { Sparkline } from '../sparkline'
import { SplitBar, type SplitBarSegmentData } from '../split-bar'
import { DASHBOARD_ACTIVITY_END, DASHBOARD_ACTIVITY_SAMPLE } from './dashboardSample'

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`

/** The shell every card shares. The stroke lays out inside the frame in Figma, so the padding is the role in full, inside the border. */
const shell = (width: string): React.CSSProperties => ({
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), width, maxWidth: '100%',
  padding: v('spacing.inset-surface'), background: v('color.surface.layer-1'),
  border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'),
})

// The widths the file draws (320 · 400 · 924 · 1008) on the dimension scale.
const W_GAUGE = 'calc(var(--spacing-32) * 2.5)'
const W_METRIC = 'calc(var(--spacing-32) * 3.125)'
const W_ACTIVITY = 'calc(var(--spacing-32) * 7.21875)'
const W_TRAFFIC = 'calc(var(--spacing-32) * 7.875)'

const primary = v('color.content.primary')
const secondary = v('color.content.secondary')

/** Fades its content in when `k` changes: the chart region of a range switch. */
function Swap({ k, children, style }: { k: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const [shown, setShown] = React.useState(k)
  const [on, setOn] = React.useState(true)
  React.useEffect(() => {
    if (k === shown) return
    setOn(false)
    // A timer, not requestAnimationFrame: a hidden tab never ticks a frame.
    const id = setTimeout(() => { setShown(k); setOn(true) }, 16)
    return () => clearTimeout(id)
  }, [k, shown])
  return <div style={{ display: 'flex', flexDirection: 'column', opacity: on ? 1 : 0, transition: `opacity ${motion('use-page-transition')}`, ...style }}>{children}</div>
}

interface CardProps extends Omit<React.ComponentProps<'div'>, 'title'> {}

// ── DashboardGaugeCard ───────────────────────────────────────────────────────

export interface DashboardGaugeCardProps extends CardProps {
  value?: number
  variant?: GaugeVariant
  /** The big number as written. */
  valueText?: string
  unit?: string
  /** The reading in words under the number. */
  label?: string
  title?: string
  description?: string
}

/** Figma DashboardGaugeCard (2401:309): one health score, a Gauge, a title and a status line. The Gauge reads its value and label as one aria-valuetext. */
export function DashboardGaugeCard({
  value = 72, variant = 'success', valueText, unit = '%', label = 'Healthy', title = 'Workspace health', description = '14 of 20 checks passing', style, ...props
}: DashboardGaugeCardProps) {
  return (
    <div data-escala="DashboardGaugeCard" style={{ ...shell(W_GAUGE), alignItems: 'center', ...style }} {...props}>
      <Gauge variant={variant} value={value} valueText={valueText} unit={unit} label={label} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v('spacing.gap-tight') }}>
        <span style={{ ...type('heading-2xs'), color: primary }}>{title}</span>
        <span style={{ ...type('body-sm'), color: secondary }}>{description}</span>
      </div>
    </div>
  )
}

// ── DashboardMetricCard ──────────────────────────────────────────────────────

export const DASHBOARD_METRIC_RANGES = ['1W', '1M', '1Y'] as const

export interface DashboardMetricCardProps extends CardProps {
  label?: string
  value?: string
  /** The change, written as text: never shown by colour alone. */
  delta?: string
  /** One series per range. */
  series?: Record<string, number[]>
  ranges?: readonly string[]
  range?: string
  onRangeChange?: (range: string) => void
  /** What the trend says for the screen reader, per range. */
  trendLabel?: (range: string) => string
}

const METRIC_SERIES: Record<string, number[]> = {
  '1W': [18, 37, 40, 36, 51, 50, 45, 37, 64],
  '1M': [22, 30, 28, 41, 38, 52, 49, 57, 61],
  '1Y': [12, 19, 27, 25, 36, 44, 52, 58, 66],
}

/** Figma DashboardMetricCard (2401:325): label, value and delta, a Sparkline (success · lg · fluid) and a range switch (SegmentedControl sm). */
export function DashboardMetricCard({
  label = 'Daily active users', value = '2,486', delta = '+7.2%', series = METRIC_SERIES, ranges = DASHBOARD_METRIC_RANGES,
  range, onRangeChange, trendLabel, style, ...props
}: DashboardMetricCardProps) {
  const [inner, setInner] = React.useState(ranges[0])
  const active = range ?? inner
  const set = (r: string) => { setInner(r); onRangeChange?.(r) }
  const data = series[active] ?? series[ranges[0]] ?? []
  return (
    <div data-escala="DashboardMetricCard" style={{ ...shell(W_METRIC), ...style }} {...props}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
        <span style={{ ...type('body-md'), color: secondary }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: v('spacing.gap-control') }}>
          <span style={{ ...type('heading-sm'), color: primary }}>{value}</span>
          <span style={{ ...type('label'), color: v('color.status.success.content') }}>{delta}</span>
        </span>
      </div>
      <Swap k={active}>
        <Sparkline variant="success" size="lg" fluid data={data} aria-label={trendLabel ? trendLabel(active) : `${label}, ${delta} over ${active}`} />
      </Swap>
      <SegmentedControl size="sm" options={[...ranges]} value={active} onValueChange={set} aria-label="Range" style={{ alignSelf: 'flex-start' }} />
    </div>
  )
}

// ── DashboardActivityCard ────────────────────────────────────────────────────

export interface DashboardActivityCardProps extends CardProps {
  /** One entry per day with activity. Default: a deterministic sample year. */
  data?: readonly ActivityDay[]
  endDate?: string
  years?: readonly string[]
  year?: string
  onYearChange?: (year: string) => void
  /** The header text. Default: "<total> contributions in <year>". */
  heading?: string
  /** The caption when no day is focused. */
  caption?: string
}

/** Figma DashboardActivityCard (2401:362): total, year switch, ActivityHeatmap, Separator and a caption that repeats what the focused day announces. */
export function DashboardActivityCard({
  data = DASHBOARD_ACTIVITY_SAMPLE, endDate = DASHBOARD_ACTIVITY_END, years = ['2025', '2024', '2023'], year, onYearChange, heading, caption = 'Tuesday, March 18: 4 commits, 2 pull requests and 2 reviews, mostly in escala-tokens.', style, ...props
}: DashboardActivityCardProps) {
  const [inner, setInner] = React.useState(years[0])
  const active = year ?? inner
  const [focused, setFocused] = React.useState<ActivityDay | null>(null)
  const total = React.useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data])
  return (
    <div data-escala="DashboardActivityCard" style={{ ...shell(W_ACTIVITY), ...style }} {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...type('label'), color: primary }}>{heading ?? `${total.toLocaleString('en-US')} contributions in ${active}`}</span>
        <SegmentedControl size="sm" options={[...years]} value={active} onValueChange={(y) => { setInner(y); onYearChange?.(y) }} aria-label="Year" />
      </div>
      <Swap k={active} style={{ alignSelf: 'flex-start', width: 'max-content' }}>
        <ActivityHeatmap data={data} endDate={endDate} onFocusDay={setFocused} aria-label={`Activity in ${active}`} />
      </Swap>
      <Separator />
      <span aria-live="polite" style={{ ...type('body-sm'), color: secondary }}>{focused ? describeActivityDay(focused) : caption}</span>
    </div>
  )
}

// ── DashboardTrafficCard ─────────────────────────────────────────────────────

export const DASHBOARD_TRAFFIC_RANGES = ['7 days', '30 days', '90 days'] as const

/** The file's sample: traffic by source, 99,300 sessions. */
export const DASHBOARD_TRAFFIC_SEGMENTS: SplitBarSegmentData[] = [
  { id: 'organic', label: 'Organic search', value: 41_300, series: 1 },
  { id: 'direct', label: 'Direct', value: 24_600, series: 2 },
  { id: 'paid', label: 'Paid search', value: 19_000, series: 3 },
  { id: 'social', label: 'Social', value: 9_800, series: 4 },
  { id: 'referral', label: 'Referral', value: 3_100, series: 5 },
  { id: 'other', label: 'Other', value: 1_500, series: 6 },
]

export interface DashboardTrafficCardProps extends CardProps {
  segments?: SplitBarSegmentData[]
  ranges?: readonly string[]
  range?: string
  onRangeChange?: (range: string) => void
  title?: string
  description?: string
  unit?: string
}

/** Figma DashboardTrafficCard (2401:844): range switch, title, total and a SplitBar. Every share is also written in the legend. */
export function DashboardTrafficCard({
  segments = DASHBOARD_TRAFFIC_SEGMENTS, ranges = DASHBOARD_TRAFFIC_RANGES, range, onRangeChange,
  title = 'Traffic by source', description = 'Sessions on ohmewn.com', unit = 'sessions', style, ...props
}: DashboardTrafficCardProps) {
  const [inner, setInner] = React.useState(ranges[0])
  const active = range ?? inner
  const titleId = React.useId()
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div data-escala="DashboardTrafficCard" style={{ ...shell(W_TRAFFIC), ...style }} {...props}>
      <SegmentedControl size="sm" options={[...ranges]} value={active} onValueChange={(r) => { setInner(r); onRangeChange?.(r) }} aria-label="Range" style={{ alignSelf: 'flex-start' }} />
      <Swap k={active} style={{ gap: v('spacing.gap-group') }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight') }}>
            <span id={titleId} style={{ ...type('heading-2xs'), color: primary }}>{title}</span>
            <span style={{ ...type('body-sm'), color: secondary }}>{description}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: v('spacing.gap-control') }}>
            <span style={{ ...type('body-sm'), color: secondary }}>Total</span>
            <span style={{ ...type('heading-sm'), color: primary }}>{total.toLocaleString('en-US')}</span>
            <span style={{ ...type('body-sm'), color: secondary }}>{unit}</span>
          </div>
        </div>
        {/* The file draws the small shares bare (no callout under the bar): the legend writes every share. */}
        <SplitBar aria-labelledby={titleId} segments={segments} valueUnit={unit} leaderBelow={0} />
      </Swap>
    </div>
  )
}
