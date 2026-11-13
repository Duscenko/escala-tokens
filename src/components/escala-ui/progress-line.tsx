// Escala component: ProgressLine and ProgressCircle — the Figma sets of the same names (design-plans/progress-contract.md,
// 410:687 and 411:523), 1:1. A value from 0 to 100 as a bar (Size sets the track thickness) or a ring (Size sets the
// diameter; Cap round or butt ends); Appearance solid or gradient (Action/primary/default → /hover). Radix gives the
// bar its progressbar semantics; the ring is an SVG with the same ARIA. Appearance: recipes (ProgressLine, ProgressCircle).
import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const PROGRESS_SIZES = ['xs', 'sm', 'default', 'lg'] as const
export type ProgressSize = (typeof PROGRESS_SIZES)[number]
export const PROGRESS_APPEARANCES = ['solid', 'gradient'] as const
export type ProgressAppearance = (typeof PROGRESS_APPEARANCES)[number]
export const PROGRESS_CAPS = ['round', 'butt'] as const
export type ProgressCap = (typeof PROGRESS_CAPS)[number]

const clamp = (v: number) => Math.max(0, Math.min(100, v))
const GRADIENT = 'linear-gradient(to right, var(--color-action-primary-default), var(--color-action-primary-hover))'

// ── ProgressLine ─────────────────────────────────────────────────────────────

export interface ProgressLineProps extends Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, 'children'> {
  /** Figma Size: the track is 4 · 6 · 8 · 12 thick. */
  size?: ProgressSize
  /** Figma Appearance. */
  appearance?: ProgressAppearance
  /** Figma Value, 0–100 (the file draws 0 · 25 · 50 · 75 · 100). */
  value?: number
}

function ProgressLine({ size = 'default', appearance = 'solid', value = 0, className, ...props }: ProgressLineProps) {
  const v = clamp(value ?? 0)
  return (
    <ProgressPrimitive.Root
      value={v}
      data-slot="progress"
      data-escala="ProgressLine"
      data-size={size}
      data-appearance={appearance}
      className={cn('relative w-full overflow-hidden', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-part="ProgressLine.indicator"
        className="h-full"
        style={{ width: `${v}%`, ...(appearance === 'gradient' ? { backgroundImage: GRADIENT } : null) }}
      />
    </ProgressPrimitive.Root>
  )
}

// ── ProgressCircle ───────────────────────────────────────────────────────────

/** The file's ring: the arc's inner radius as a share of the radius (thickness 4 · 4 · 6 · 8 of 24 · 32 · 48 · 56). */
const INNER: Record<ProgressSize, number> = { xs: 2 / 3, sm: 0.75, default: 0.75, lg: 5 / 7 }

export interface ProgressCircleProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Size: the diameter, 24 · 32 · 48 · 56. */
  size?: ProgressSize
  /** Figma Cap: round or butt arc ends. */
  cap?: ProgressCap
  appearance?: ProgressAppearance
  /** Figma Value, 0–100. */
  value?: number
}

function ProgressCircle({ size = 'default', cap = 'round', appearance = 'solid', value = 0, className, ...props }: ProgressCircleProps) {
  const v = clamp(value)
  const thick = 50 * (1 - INNER[size]) // ring thickness in the 0–100 viewBox (radius 50)
  const r = 50 - thick / 2
  const id = React.useId()
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      data-slot="progress-circle"
      data-escala="ProgressCircle"
      data-size={size}
      data-cap={cap}
      data-appearance={appearance}
      className={cn('relative inline-flex shrink-0', className)}
      {...props}
    >
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden focusable="false">
        {appearance === 'gradient' && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(90 .5 .5)">
              <stop offset="0" style={{ stopColor: 'var(--color-action-primary-default)' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-action-primary-hover)' }} />
            </linearGradient>
          </defs>
        )}
        <circle data-part="ProgressCircle.track" cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth={thick} />
        {v > 0 && (
          <circle
            data-part="ProgressCircle.arc"
            cx="50" cy="50" r={r} fill="none"
            stroke={appearance === 'gradient' ? `url(#${id})` : 'currentColor'}
            strokeWidth={thick}
            strokeLinecap={cap === 'round' && v < 100 ? 'round' : 'butt'}
            pathLength={100}
            strokeDasharray={`${v} ${100 - v}`}
            transform="rotate(-90 50 50)"
          />
        )}
      </svg>
    </div>
  )
}

export { ProgressLine, ProgressCircle }
