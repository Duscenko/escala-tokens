// Escala component: Sparkline — the Figma set of the same name (design-plans/sparkline-contract.md, 2399:90), 1:1. A compact
// trend next to a value, with no axes or gridlines: a monotone line (round caps and joins) over a soft area that closes to the
// bottom edge, and a dot on the last point. Variant default · secondary · success · critical × Size default (256 × 64) · sm
// (96 × 32) · lg (480 × 128) and the booleans AreaVisible / DotVisible. The file draws one sample path; here `data` is any list
// of numbers and the curve is computed from them (monotone cubic: it never overshoots a point).
// Behaviour (Storybook owns it): role="img" with a required aria-label that states the trend; the width is fixed by Size unless
// `fluid`. The line draws once on mount (`use-reveal`); new data cross-fades the old layer into the new one (`use-color`);
// reduced motion is instant (the roles). Appearance and motion: recipe Sparkline (lib/recipes/dataDisplay.ts, recipes/motion.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const SPARKLINE_VARIANTS = ['default', 'secondary', 'success', 'critical'] as const
export type SparklineVariant = (typeof SPARKLINE_VARIANTS)[number]
export const SPARKLINE_SIZES = ['default', 'sm', 'lg'] as const
export type SparklineSize = (typeof SPARKLINE_SIZES)[number]

export interface SparklineProps extends Omit<React.ComponentProps<'div'>, 'children' | 'aria-label'> {
  /** Figma Variant: `default` binds the neutral chart series, `secondary` is a quiet grey, `success` and `critical` carry meaning (up is good, down is bad). */
  variant?: SparklineVariant
  /** Figma Size: 256 × 64 (default) · 96 × 32 (sm) · 480 × 128 (lg). */
  size?: SparklineSize
  /** The series, oldest first. The curve is scaled so the lowest value sits at the bottom and the highest at the top. */
  data: number[]
  /** Figma AreaVisible. */
  area?: boolean
  /** Figma DotVisible: the dot on the last point. */
  dot?: boolean
  /** Fill the container's width instead of the Size's (the height stays the Size's). */
  fluid?: boolean
  /** What the trend says, e.g. "Daily active users, up 7.2 % this week". Required: the chart has no text of its own. */
  'aria-label': string
}

// ── Geometry ─────────────────────────────────────────────────────────────────
// The file keeps one dot of air above and below the curve (measured 5.3 · 3.1 · 8.8 against a dot of 6 · 4 · 8) and half a dot
// either side, so neither the line nor the dot is ever clipped. The area closes to the bottom edge of the frame.

const fmt = (n: number) => String(Math.round(n * 100) / 100)

/** A monotone cubic Bézier through the points (Fritsch–Carlson, the curve d3 calls curveMonotoneX). */
function monotonePath(pts: readonly [number, number][]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push(dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i])
  }
  const t: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  }
  // The ends: the slope that keeps the first and last segment monotone.
  const end = (slope: number, inner: number) => {
    if (n === 2) return slope
    const e = (3 * slope - inner) / 2
    return e * slope <= 0 ? 0 : Math.abs(e) > 3 * Math.abs(slope) ? 3 * slope : e
  }
  t[0] = end(m[0], t[1])
  t[n - 1] = end(m[n - 2], t[n - 2])
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C ${fmt(pts[i][0] + h)} ${fmt(pts[i][1] + t[i] * h)} ${fmt(pts[i + 1][0] - h)} ${fmt(pts[i + 1][1] - t[i + 1] * h)} ${fmt(pts[i + 1][0])} ${fmt(pts[i + 1][1])}`
  }
  return d
}

interface Shape { line: string; area: string; last: [number, number] | null }

function shapeOf(data: readonly number[], w: number, h: number, dot: number): Shape {
  const values = data.filter((v) => Number.isFinite(v))
  const n = values.length
  if (n === 0 || w <= 0 || h <= 0) return { line: '', area: '', last: null }
  const x0 = dot / 2
  const run = Math.max(0, w - dot)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const room = Math.max(0, h - 2 * dot)
  const pts = values.map((v, i): [number, number] => [
    n === 1 ? w / 2 : x0 + (i * run) / (n - 1),
    hi === lo ? h / 2 : h - dot - ((v - lo) / (hi - lo)) * room,
  ])
  const line = monotonePath(pts)
  const first = pts[0]
  const last = pts[n - 1]
  const area = n > 1 ? `${line} L ${fmt(last[0])} ${fmt(h)} L ${fmt(first[0])} ${fmt(h)} Z` : ''
  return { line, area, last }
}

// ── Motion helpers (the roles live in the recipe; nothing here names a duration) ──

/** Run `done` when the element's current transition ends, or at once when the system gives it none (reduced motion). */
function afterTransition(el: HTMLElement | null, done: () => void): () => void {
  if (!el) { done(); return () => {} }
  const cs = getComputedStyle(el)
  const longest = (list: string) => Math.max(0, ...list.split(',').map((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000) || 0))
  const total = longest(cs.transitionDuration) + longest(cs.transitionDelay)
  if (total === 0) { done(); return () => {} }
  let fired = false
  const finish = () => { if (fired) return; fired = true; el.removeEventListener('transitionend', onEnd); window.clearTimeout(timer); done() }
  const onEnd = (e: TransitionEvent) => { if (e.target === el) finish() }
  el.addEventListener('transitionend', onEnd)
  // The time the element computed, as a net under a `transitionend` that never comes (a hidden tab).
  const timer = window.setTimeout(finish, total)
  return () => { fired = true; el.removeEventListener('transitionend', onEnd); window.clearTimeout(timer) }
}

/** Two frames: the first paints the resting pose, the second changes it, so the transition has something to run from. */
function nextFrames(run: () => void): () => void {
  let second = 0
  const first = requestAnimationFrame(() => { second = requestAnimationFrame(run) })
  return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
}

interface Layer { id: number; data: number[]; on: boolean; drawn: boolean; entering: boolean }

function Sparkline({
  variant = 'default', size = 'default', data, area = true, dot = true, fluid = false, className, ...props
}: SparklineProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 0, h: 0, dot: 0 })
  const key = data.join(',')
  const nextId = React.useRef(1)
  const [seen, setSeen] = React.useState(key)
  const [layers, setLayers] = React.useState<Layer[]>(() => [{ id: 0, data, on: true, drawn: false, entering: false }])

  // New data: the old layers start to fade out, a new one starts off (it fades in on the next frames).
  if (key !== seen) {
    setSeen(key)
    setLayers((ls) => [...ls.map((l) => ({ ...l, on: false })), { id: nextId.current++, data, on: false, drawn: true, entering: true }])
  }

  // The box and the dot, as the recipe sized them (fluid: the width follows the container).
  React.useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      // Layout size, not getBoundingClientRect: a scaled ancestor (the Board's tiles, a zoomed canvas)
      // would shrink the box, and the SVG drawn at that size is then scaled down a second time.
      const r = { width: el.offsetWidth, height: el.offsetHeight }
      const d = el.querySelector<HTMLElement>('[data-part="Sparkline.dot"]')?.offsetWidth ?? 0
      setBox((b) => (b.w === r.width && b.h === r.height && b.dot === d ? b : { w: r.width, h: r.height, dot: d }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size, fluid])

  // First layer: draw the line once. Later layers: fade in, then let the old ones go.
  const fresh = layers.find((l) => l.entering)
  const undrawn = layers.some((l) => !l.drawn)
  const stopRef = React.useRef<() => void>(() => {})
  React.useEffect(() => () => stopRef.current(), [])
  React.useEffect(() => {
    if (!undrawn) return
    return nextFrames(() => setLayers((ls) => ls.map((l) => (l.drawn ? l : { ...l, drawn: true }))))
  }, [undrawn])
  React.useEffect(() => {
    if (!fresh) return
    const id = fresh.id
    return nextFrames(() => {
      setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, on: true, entering: false } : l)))
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-layer="${id}"]`) ?? null
      stopRef.current()
      stopRef.current = afterTransition(el, () => setLayers((ls) => ls.filter((l) => l.on)))
    })
  }, [fresh?.id])

  return (
    <div
      ref={rootRef}
      role="img"
      data-slot="sparkline"
      data-escala="Sparkline"
      data-variant={variant}
      data-size={size}
      className={cn('relative shrink-0', fluid && 'w-full!', className)}
      {...props}
    >
      {layers.map((layer) => {
        const shape = shapeOf(layer.data, box.w, box.h, box.dot)
        const shown = layer.drawn ? 1 : 0
        return (
          <div
            key={layer.id}
            data-layer={layer.id}
            data-part="Sparkline.layer"
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: layer.on ? 1 : 0 }}
          >
            <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} className="absolute inset-0 overflow-visible" focusable="false">
              {area && shape.area ? (
                <path data-part="Sparkline.area" d={shape.area} fill="currentColor" stroke="none" style={{ opacity: shown }} />
              ) : null}
              {shape.line ? (
                <path
                  data-part="Sparkline.line"
                  d={shape.line}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  style={{ strokeWidth: 'var(--escala-stroke-width)', strokeDasharray: '1 1', strokeDashoffset: layer.drawn ? 0 : 1, opacity: shown }}
                />
              ) : null}
            </svg>
            {/* Always rendered so the recipe's box can be measured; hidden when DotVisible is off. */}
            <span
              data-part="Sparkline.dot"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: shape.last ? shape.last[0] : 0,
                top: shape.last ? shape.last[1] : 0,
                opacity: dot && shape.last ? shown : 0,
                visibility: dot ? 'visible' : 'hidden',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export { Sparkline }
