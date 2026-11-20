// Escala components: SplitBar, SplitBarSegment and SplitBarLegendItem — the Figma page `❖ SplitBar (PRO)`: SplitBar (2401:248),
// SplitBarSegment (2401:102) and SplitBarLegendItem (2401:211), 1:1 (design-plans/splitbar-contract.md).
// One bar that is 100 % of something, cut into shares, over a legend that toggles each series. A SplitBar is a `role="group"` named by
// the chart's title; every segment is a button named "Organic search, 41.6%, 41,300 sessions"; every legend item is an `aria-pressed` toggle.
// Colour: the `Chart/series-<n>` roles (soft fill, solid edge, content text) — categories with no meaning. A share that means good or bad
// takes `Status/*` instead. Appearance: recipes SplitBar, SplitBarSegment and SplitBarLegendItem (lib/recipes/splitBar.ts); motion by role
// (lib/recipes/motion.ts): hover and focus widen a segment on `use-hover`, turning a series off reflows the rest to 100 % on `use-travel-in`
// (grow) and `use-travel-out` (shrink). Reduced motion: the roles collapse to the system's short fade (the foundation's rule).
import * as React from 'react'
import { cn } from '../../lib/utils'

/** Figma axis `Series` 1–8 (ARC-AXIS-01): one value per categorical chart colour, in the file's fixed order. */
export const SPLIT_BAR_SERIES = ['1', '2', '3', '4', '5', '6', '7', '8'] as const
export type SplitBarSeries = (typeof SPLIT_BAR_SERIES)[number]
export const SPLIT_BAR_SEGMENT_STATES = ['Default', 'Focused'] as const
export const SPLIT_BAR_LEGEND_ITEM_STATES = ['Default', 'Focused'] as const
export const SPLIT_BAR_LEGEND_CHECKED = ['true', 'false'] as const
export type SplitBarSegmentState = (typeof SPLIT_BAR_SEGMENT_STATES)[number]
export type SplitBarLegendItemState = (typeof SPLIT_BAR_LEGEND_ITEM_STATES)[number]
/** Figma `Series` is the string "1" … "8"; data may use the number. */
export type SplitBarSeriesInput = SplitBarSeries | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
/** How much of its text a segment shows: label and value, the value alone, or nothing (a narrow one). */
export type SplitBarFit = 'full' | 'value' | 'none'

/** A segment never grows past this share of the bar when it widens to show its text. */
const MAX_WIDENED_SHARE = 0.6
/** Under this share (percent) a segment keeps no text inside: its callout goes under the bar. */
export const SPLIT_BAR_LEADER_BELOW = 5

const series = (s: SplitBarSeriesInput | undefined): SplitBarSeries => String(s ?? 1) as SplitBarSeries

// ── SplitBarSegment ──────────────────────────────────────────────────────────

export interface SplitBarSegmentProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** Figma Series 1–8: Chart/series-<n>/soft fill, /solid right edge, /content text. */
  series?: SplitBarSeriesInput
  /** Figma Label (TEXT). */
  label?: string
  /** Figma Value (TEXT): the share as text, e.g. "41.6%". */
  value?: string
  /** Figma LabelVisible. */
  labelVisible?: boolean
  /** Figma ValueVisible. */
  valueVisible?: boolean
  /** Pins a state for docs and previews (Figma State); in an app Focused comes from the keyboard. */
  forceState?: SplitBarSegmentState
  /** How much text a SplitBar gave this segment (set by the bar; a standalone segment leaves it to LabelVisible / ValueVisible). */
  fit?: SplitBarFit
}

/** Figma SplitBarSegment: one share of the bar. Its width is its share of 100 %, set by the bar (a percentage `width`: padding and edge never skew the shares); alone it fills its container. */
const SplitBarSegment = React.forwardRef<HTMLButtonElement, SplitBarSegmentProps>(function SplitBarSegment(
  { series: s, label = 'Organic search', value = '41.6%', labelVisible = true, valueVisible = true, forceState, fit, className, ...props },
  ref,
) {
  const showLabel = fit ? fit === 'full' : labelVisible
  const showValue = fit ? fit !== 'none' : valueVisible
  return (
    <button
      ref={ref}
      type="button"
      data-slot="split-bar-segment"
      data-escala="SplitBarSegment"
      data-series={series(s)}
      data-fit={fit}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      className={cn('relative flex w-full min-w-0 cursor-pointer items-center justify-start overflow-hidden border-0 text-left outline-none', className)}
      {...props}
    >
      {/* The text is always in the DOM so the bar can measure it; a hidden one is out of flow, invisible and unannounced. */}
      <span data-part="SplitBarSegment.content" aria-hidden className="flex min-w-0 items-center whitespace-nowrap">
        <span data-part="SplitBarSegment.label" data-hidden={showLabel ? undefined : ''} className="data-hidden:invisible data-hidden:absolute">{label}</span>
        {' '}
        <span data-part="SplitBarSegment.value" data-hidden={showValue ? undefined : ''} className="data-hidden:invisible data-hidden:absolute">{value}</span>
      </span>
    </button>
  )
})

// ── SplitBarLegendItem ───────────────────────────────────────────────────────

export interface SplitBarLegendItemProps extends Omit<React.ComponentProps<'button'>, 'children' | 'value'> {
  /** Figma Series 1–8: the swatch is Chart/series-<n>/solid while the series is shown. */
  series?: SplitBarSeriesInput
  /** Figma Checked: the series is shown. Off, the swatch is Surface/muted and the text Content/disabled. */
  checked?: boolean
  /** Called with the next value when the item is pressed. */
  onCheckedChange?: (checked: boolean) => void
  /** Figma Label (TEXT). */
  label?: string
  /** Figma Value (TEXT). */
  value?: string
  /** Figma ValueVisible. */
  valueVisible?: boolean
  /** Pins a state for docs and previews (Figma State). */
  forceState?: SplitBarLegendItemState
}

/** Figma SplitBarLegendItem: a legend entry that is also the toggle of its series (`aria-pressed`). */
const SplitBarLegendItem = React.forwardRef<HTMLButtonElement, SplitBarLegendItemProps>(function SplitBarLegendItem(
  { series: s, checked = true, onCheckedChange, label = 'Organic search', value = '41.6%', valueVisible = true, forceState, className, onClick, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={checked}
      data-slot="split-bar-legend-item"
      data-escala="SplitBarLegendItem"
      data-series={series(s)}
      data-checked={String(checked)}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      className={cn('inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent whitespace-nowrap outline-none', className)}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) onCheckedChange?.(!checked) }}
      {...props}
    >
      <span data-part="SplitBarLegendItem.swatch" aria-hidden className="shrink-0" />
      <span data-part="SplitBarLegendItem.label">{label}</span>
      {valueVisible && <span data-part="SplitBarLegendItem.value">{value}</span>}
    </button>
  )
})

// ── SplitBar ─────────────────────────────────────────────────────────────────

export interface SplitBarSegmentData {
  id: string
  label: string
  /** Any non-negative number (sessions, euros…): the bar shows each one as its share of what is shown. */
  value: number
  /** Chart/series-<n>: 1–8, in this order. A colour is a category, never a meaning. */
  series: SplitBarSeriesInput
}

interface SplitBarBaseProps extends Omit<React.ComponentProps<'div'>, 'children' | 'role' | 'aria-label' | 'aria-labelledby'> {
  segments: SplitBarSegmentData[]
  /** Figma LegendVisible. */
  showLegend?: boolean
  /** Show each legend item's share. */
  showLegendValues?: boolean
  /** The unit of `value` for the screen reader: "Organic search, 41.6%, 41,300 sessions". */
  valueUnit?: string
  /** Ids of the series that are turned off (controlled). */
  hiddenIds?: string[]
  defaultHiddenIds?: string[]
  onHiddenIdsChange?: (ids: string[]) => void
  /** A segment under this share (percent) keeps its text out of the bar and gets a callout under it. Default 5. */
  leaderBelow?: number
  /** Called when a segment is pressed. */
  onSegmentClick?: (id: string) => void
  /** Docs only: pins the widened segment as if the pointer or keyboard were on it. */
  forceActiveId?: string
}
export type SplitBarProps = SplitBarBaseProps & ({ 'aria-label': string; 'aria-labelledby'?: string } | { 'aria-labelledby': string; 'aria-label'?: string })

interface Measure { barW: number; chromeX: number; gap: number; text: Record<string, { label: number; value: number }> }
const EMPTY_MEASURE: Measure = { barW: 0, chromeX: 0, gap: 0, text: {} }

const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat()

/** Figma SplitBar: the Bar slot (segments clipped to Radius/action) over the Legend slot, on Spacing/gap-group. */
const SplitBar = React.forwardRef<HTMLDivElement, SplitBarProps>(function SplitBar(
  {
    segments, showLegend = true, showLegendValues = true, valueUnit, hiddenIds, defaultHiddenIds, onHiddenIdsChange, leaderBelow = SPLIT_BAR_LEADER_BELOW,
    onSegmentClick, forceActiveId, className, ...props
  },
  ref,
) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const [innerHidden, setInnerHidden] = React.useState<string[]>(defaultHiddenIds ?? [])
  const hidden = hiddenIds ?? innerHidden
  const [pointed, setPointed] = React.useState<string | null>(null)
  const [reflow, setReflow] = React.useState<Record<string, 'in' | 'out'>>({})
  const [measure, setMeasure] = React.useState<Measure>(EMPTY_MEASURE)
  const active = forceActiveId ?? pointed

  const visible = segments.filter((s) => !hidden.includes(s.id) && s.value > 0)
  const total = visible.reduce((sum, s) => sum + s.value, 0)
  const allTotal = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  const shareOf = (s: SplitBarSegmentData): number => (hidden.includes(s.id) ? (allTotal ? s.value / allTotal : 0) : total ? s.value / total : 0)

  // A segment's width is its share. The active one (pointer or keyboard) widens to show its text, the others give way.
  const widened = React.useMemo(() => {
    const out: Record<string, number> = {}
    for (const s of visible) out[s.id] = total ? s.value / total : 0
    const a = visible.find((s) => s.id === active)
    const text = a ? measure.text[a.id] : undefined
    if (a && text && measure.barW > 0) {
      const want = Math.min((text.label + measure.gap + text.value + measure.chromeX) / measure.barW, MAX_WIDENED_SHARE)
      const own = out[a.id]
      if (want > own) out[a.id] = (want * (1 - own)) / (1 - want)
    }
    return out
  // `visible` is derived from segments and hidden; those are the real inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, hidden, active, measure, total])
  const sum = visible.reduce((acc, s) => acc + (widened[s.id] ?? 0), 0) || 1

  const fitOf = (s: SplitBarSegmentData): SplitBarFit => {
    const text = measure.text[s.id]
    if (!text || measure.barW === 0) return 'full'
    const ideal = (measure.barW * (widened[s.id] ?? 0)) / sum
    const isActive = s.id === active
    if (!isActive && total && (s.value / total) * 100 < leaderBelow) return 'none'
    if (text.label + measure.gap + text.value + measure.chromeX <= ideal + 0.5) return 'full'
    if (text.value + measure.chromeX <= ideal + 0.5) return 'value'
    return 'none'
  }

  // Measure the bar and the natural width of every label and value (they stay in the DOM, hidden or not).
  const measureNow = React.useCallback(() => {
    const bar = barRef.current
    if (!bar) return
    const text: Measure['text'] = {}
    let chromeX = 0
    let gap = 0
    for (const el of bar.querySelectorAll<HTMLElement>('[data-escala="SplitBarSegment"]')) {
      const id = el.dataset.segmentId
      if (!id) continue
      const label = el.querySelector<HTMLElement>('[data-part="SplitBarSegment.label"]')
      const value = el.querySelector<HTMLElement>('[data-part="SplitBarSegment.value"]')
      text[id] = { label: label?.scrollWidth ?? 0, value: value?.scrollWidth ?? 0 }
      // The padding of a segment that dropped it (fit none) reads 0: only a segment with its padding tells the chrome.
      if (el.dataset.fit !== 'none' && !el.hasAttribute('data-collapsed')) {
        const cs = getComputedStyle(el)
        chromeX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderRightWidth) || 0)
        const content = el.querySelector<HTMLElement>('[data-part="SplitBarSegment.content"]')
        gap = content ? parseFloat(getComputedStyle(content).columnGap) || 0 : 0
      }
    }
    setMeasure((prev) => {
      const next: Measure = { barW: bar.clientWidth, chromeX: chromeX || prev.chromeX, gap: gap || prev.gap, text }
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    })
  }, [])
  React.useLayoutEffect(() => {
    measureNow()
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measureNow)
    ro.observe(bar)
    for (const el of bar.querySelectorAll('[data-part="SplitBarSegment.label"], [data-part="SplitBarSegment.value"]')) ro.observe(el)
    void document.fonts?.ready.then(measureNow)
    return () => ro.disconnect()
  }, [measureNow, segments, hidden])

  const setHidden = (next: string[]) => {
    if (hiddenIds === undefined) setInnerHidden(next)
    onHiddenIdsChange?.(next)
  }
  /** Turn a series on or off. The last one shown stays on: a bar of nothing says nothing. */
  const toggle = (id: string, on: boolean) => {
    const nextHidden = on ? hidden.filter((h) => h !== id) : [...hidden, id]
    const nextVisible = segments.filter((s) => !nextHidden.includes(s.id) && s.value > 0)
    if (nextVisible.length === 0) return
    const nextTotal = nextVisible.reduce((acc, s) => acc + s.value, 0)
    const motion: Record<string, 'in' | 'out'> = {}
    for (const s of segments) {
      const before = hidden.includes(s.id) || s.value <= 0 ? 0 : s.value / (total || 1)
      const after = nextHidden.includes(s.id) || s.value <= 0 ? 0 : s.value / nextTotal
      if (after > before) motion[s.id] = 'in'
      else if (after < before) motion[s.id] = 'out'
    }
    setReflow(motion)
    setHidden(nextHidden)
  }

  // Under `leaderBelow` percent the text goes under the bar. Right-hand callouts run left from their line, nearest first;
  // left-hand ones run right, farthest first, so no hairline crosses a callout.
  const leaders = React.useMemo(() => {
    let cursor = 0
    const found: { s: SplitBarSegmentData; at: number }[] = []
    for (const s of visible) {
      const w = widened[s.id] ?? 0
      if (total && (s.value / total) * 100 < leaderBelow) found.push({ s, at: ((cursor + w / 2) / sum) * 100 })
      cursor += w
    }
    const right = found.filter((l) => l.at >= 50)
    const left = found.filter((l) => l.at < 50).reverse()
    return [...right.map((l) => ({ ...l, toward: 'left' as const })), ...left.map((l) => ({ ...l, toward: 'right' as const }))]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, hidden, widened, leaderBelow, sum, total])

  const aria = (s: SplitBarSegmentData): string => {
    // The visible text, word for word, first (WCAG 2.5.3 Label in Name), then the absolute value.
    return `${s.label}, ${percent.format(shareOf(s))}${valueUnit ? `, ${whole.format(s.value)} ${valueUnit}` : ''}`
  }

  return (
    <div ref={ref} role="group" data-slot="split-bar" data-escala="SplitBar" className={cn('flex w-full flex-col', className)} {...props}>
      <div className="flex w-full flex-col">
        <div ref={barRef} data-part="SplitBar.bar" className="flex w-full min-w-0 overflow-hidden">
          {segments.map((s) => {
            const off = hidden.includes(s.id) || s.value <= 0
            const fit = off ? 'none' : fitOf(s)
            const share = shareOf(s)
            return (
              <SplitBarSegment
                key={s.id}
                series={s.series}
                label={s.label}
                value={percent.format(share)}
                fit={fit}
                data-segment-id={s.id}
                data-collapsed={off ? '' : undefined}
                data-motion={reflow[s.id]}
                aria-label={aria(s)}
                aria-hidden={off || undefined}
                tabIndex={off ? -1 : undefined}
                className={off ? 'pointer-events-none' : undefined}
                style={{ width: `${off ? 0 : ((widened[s.id] ?? 0) / sum) * 100}%`, flex: '0 1 auto' }}
                onClick={() => onSegmentClick?.(s.id)}
                onPointerEnter={() => { setReflow({}); setPointed(s.id) }}
                onPointerLeave={() => setPointed((p) => (p === s.id ? null : p))}
                onFocus={() => { setReflow({}); setPointed(s.id) }}
                onBlur={() => setPointed((p) => (p === s.id ? null : p))}
                onTransitionEnd={(e) => {
                  if (e.propertyName !== 'width') return
                  setReflow((r) => { if (!(s.id in r)) return r; const { [s.id]: _done, ...rest } = r; return rest })
                }}
              />
            )
          })}
        </div>
        {leaders.length > 0 && (
          <div data-part="SplitBar.leaders" aria-hidden className="relative flex w-full flex-col">
            {leaders.map((row, r) => (
              <div key={row.s.id} data-part="SplitBar.leaderRow" className="relative w-full">
                {leaders.map((l, i) => i >= r && (
                  <span
                    key={l.s.id}
                    data-part="SplitBar.leaderLine"
                    data-series={series(l.s.series)}
                    data-motion={reflow[l.s.id]}
                    className={cn('absolute top-0 -translate-x-1/2', i === r ? 'h-1/2' : 'h-full')}
                    style={{ left: `${l.at}%` }}
                  />
                ))}
                <span
                  data-part="SplitBar.leaderText"
                  data-motion={reflow[row.s.id]}
                  className={cn('absolute top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap', row.s.id === active && 'invisible')}
                  style={row.toward === 'left' ? { right: `${100 - row.at}%` } : { left: `${row.at}%` }}
                >
                  <span data-part="SplitBar.leaderLabel">{row.s.label}</span>
                  <span data-part="SplitBar.leaderValue">{percent.format(shareOf(row.s))}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {showLegend && (
        <div data-part="SplitBar.legend" className="flex w-full flex-wrap">
          {segments.map((s) => (
            <SplitBarLegendItem
              key={s.id}
              series={s.series}
              label={s.label}
              value={percent.format(shareOf(s))}
              valueVisible={showLegendValues}
              checked={!hidden.includes(s.id)}
              onCheckedChange={(on) => toggle(s.id, on)}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export { SplitBar, SplitBarSegment, SplitBarLegendItem }
