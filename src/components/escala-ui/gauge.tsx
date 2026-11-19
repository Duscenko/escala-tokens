// Escala component: Gauge — the Figma set of the same name (design-plans/gauge-contract.md, 2398:762), 1:1. One measurement
// against a fixed range on an open 270° arc (from 135°, clockwise, round ends): a Surface/muted track, a fill on the neutral
// chart series (`default`) or on a severity (`success · warning · critical`), and the value, its unit and a label in the middle.
// Variant default · success · warning · critical × Size default (160) · sm (128) · lg (192). The file's Value axis (0 · 25 · 50 ·
// 75 · 100) is a sample: here `value` is continuous between `min` and `max`.
// Behaviour (Storybook owns it, not Figma): role="meter" with aria-valuenow / min / max and an aria-valuetext that reads the
// label ("72 %, Healthy"); not focusable. A new value sweeps the fill on `use-travel-in`; reduced motion is instant (the role).
// Use ProgressCircle for task completion. Appearance and motion: recipe Gauge (lib/recipes/dataDisplay.ts, recipes/motion.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const GAUGE_VARIANTS = ['default', 'success', 'warning', 'critical'] as const
export type GaugeVariant = (typeof GAUGE_VARIANTS)[number]
export const GAUGE_SIZES = ['default', 'sm', 'lg'] as const
export type GaugeSize = (typeof GAUGE_SIZES)[number]

/** The arc as the file draws it: an ellipse's inner radius as a share of the radius (thickness 12 · 8 · 16 of 160 · 128 · 192). */
const GAUGE_INNER: Record<GaugeSize, number> = { default: 0.85, sm: 0.875, lg: 5 / 6 }
/** 270° of the 360° circle, as a share of the path (`pathLength` 100). */
const SWEEP = 75

export interface GaugeProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Variant: `default` reads the neutral chart series, the others the Status roles (use them only when the colour means good or bad). */
  variant?: GaugeVariant
  /** Figma Size: 160 (default) · 128 (sm) · 192 (lg) across. */
  size?: GaugeSize
  /** The measurement, between `min` and `max` (the file samples 0 · 25 · 50 · 75 · 100). */
  value?: number
  /** Start of the range (aria-valuemin). */
  min?: number
  /** End of the range (aria-valuemax). */
  max?: number
  /** Figma ValueText: the big number as written. Defaults to the value, rounded to one decimal. */
  valueText?: string
  /** Figma Unit (with UnitVisible): shown beside the value. Leave it out to hide it. */
  unit?: string
  /** Figma Label (with LabelVisible): the reading in words under the value, e.g. "Healthy". Leave it out to hide it. */
  label?: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

function Gauge({
  variant = 'default', size = 'default', value = 0, min = 0, max = 100, valueText, unit, label, className, ...props
}: GaugeProps) {
  const span = max - min
  const v = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
  const share = span > 0 ? (v - min) / span : 0
  const shown = valueText ?? String(round1(v))
  const thick = 50 * (1 - GAUGE_INNER[size])
  const r = 50 - thick / 2
  const fill = SWEEP * share
  const readout = `${shown}${unit ? ` ${unit}` : ''}${label ? `, ${label}` : ''}`
  return (
    <div
      role="meter"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={v}
      aria-valuetext={readout}
      aria-label={label}
      data-slot="gauge"
      data-escala="Gauge"
      data-variant={variant}
      data-size={size}
      className={cn('relative inline-flex shrink-0', className)}
      {...props}
    >
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden focusable="false">
        <circle
          data-part="Gauge.track"
          cx="50" cy="50" r={r} fill="none"
          stroke="currentColor" strokeWidth={thick} strokeLinecap="round"
          pathLength={100} strokeDasharray={`${SWEEP} ${100 - SWEEP}`} transform="rotate(135 50 50)"
        />
        {/* The fill is the same arc, as long as the value: its dash is what the transition sweeps. At 0 it is not drawn at all (a round cap on a zero-length dash would leave a dot). */}
        <circle
          data-part="Gauge.arc"
          cx="50" cy="50" r={r} fill="none"
          stroke="currentColor" strokeWidth={thick} strokeLinecap={share > 0 ? 'round' : 'butt'}
          pathLength={100} strokeDasharray={`${fill} ${100 - fill}`} transform="rotate(135 50 50)"
        />
      </svg>
      {/* The arc is open at the bottom, so the content sits a little under the centre: the recipe's `travel` (6 · 4 · 6 px, the file's y 55.5 · 40.5 · 64.5). */}
      <div
        data-part="Gauge.content"
        className="absolute left-1/2 top-[calc(50%+var(--escala-travel,0px))] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center whitespace-nowrap"
      >
        <div data-part="Gauge.valueRow" className="flex items-baseline">
          <span data-part="Gauge.value">{shown}</span>
          {unit ? <span data-part="Gauge.unit">{unit}</span> : null}
        </div>
        {label ? <span data-part="Gauge.label">{label}</span> : null}
      </div>
    </div>
  )
}

export { Gauge }
