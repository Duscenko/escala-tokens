import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { apcaLc, wcagRatio } from '../../lib/color/apca'
import { RADIUS_ROLE_PRESETS, RADIUS_STANDARD } from '../../lib/layoutTokens'

/* The six small animated pictures of the About page's "What the foundations
 * take care of" carousel. Each one loops through a few real states of one
 * foundation: the numbers on screen (contrast ratios, APCA Lc, radius px,
 * spacing px) are computed or read from the same modules the editor uses,
 * never typed. They only run while on screen and stand still under reduced
 * motion (first state shown). */

const EASE = [0.22, 1, 0.36, 1] as const
const SPRING = { duration: 0.6, ease: EASE }

/** Runs only while at least 40 % of the picture is visible. */
function useLive() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion() ?? false
  return { ref, live: inView && !reduce }
}

/** Steps 0 → count-1 every `ms` while live; holds otherwise. */
function useStep(count: number, ms: number, live: boolean) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setI(v => (v + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [count, ms, live])
  return i
}

function Stage({ stageRef, children }: { stageRef: React.RefObject<HTMLDivElement | null>; children: ReactNode }) {
  return (
    <div ref={stageRef} aria-hidden className="flex h-full w-full items-center justify-center select-none">
      {children}
    </div>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="font-mono text-mini text-fg-faint">{children}</span>
}

/* ── 1 · Ramps in both appearances ───────────────────────────────────────── */

const RAMP_SEEDS = ['#874FFF', '#0E9F8E', '#E8590C']
// How much of the seed each step carries, toward the page (1–8) and toward
// the text end (10–12). Step 9 is the seed itself.
const TO_PAGE = [5, 10, 16, 24, 34, 46, 60, 76]
const TO_TEXT = [86, 66, 42]

function rampOf(seed: string, page: string, text: string) {
  return [
    ...TO_PAGE.map(p => `color-mix(in oklab, ${seed} ${p}%, ${page})`),
    seed,
    ...TO_TEXT.map(p => `color-mix(in oklab, ${seed} ${p}%, ${text})`),
  ]
}

export function RampsArt() {
  const { ref, live } = useLive()
  const seed = RAMP_SEEDS[useStep(RAMP_SEEDS.length, 2600, live)]
  const rows = [
    { name: 'Light', steps: rampOf(seed, '#ffffff', '#0b0b10') },
    { name: 'Dark', steps: rampOf(seed, '#101014', '#ffffff') },
  ]
  return (
    <Stage stageRef={ref}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex flex-col gap-1.5">
          {rows.map(row => (
            <div key={row.name} className="flex items-center gap-2.5">
              <span className="w-8 text-right font-mono text-mini text-fg-faint">{row.name}</span>
              <div className="flex gap-[3px]">
                {row.steps.map((c, i) => (
                  <motion.span
                    key={i}
                    className="block h-8 w-[15px] rounded-[4px]"
                    animate={{ backgroundColor: c }}
                    initial={false}
                    transition={{ duration: 0.7, ease: EASE, delay: i * 0.025 }}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          ))}
          {/* Step 9 bracket: 8 swatches + gaps past the label column. */}
          <span
            className="pointer-events-none absolute -top-1 -bottom-1 rounded-[6px] border-[1.5px] border-fg/80"
            style={{ left: `calc(2rem + 10px + ${8 * 18}px - 3px)`, width: 21 }}
          />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-surface px-2.5 py-1 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <motion.span className="h-3 w-3 rounded-full" animate={{ backgroundColor: seed }} initial={false} transition={SPRING} />
          <span className="font-mono text-mini text-fg-muted">step 9 = {seed.toLowerCase()}</span>
        </div>
      </div>
    </Stage>
  )
}

/* ── 2 · Roles solved for contrast ───────────────────────────────────────── */

const ROLE_SEEDS = ['#874FFF', '#FFD60A', '#22D3EE', '#0F7B6C']
const INKS = ['#ffffff', '#16161a']

export function ContrastRoleArt() {
  const { ref, live } = useLive()
  const fill = ROLE_SEEDS[useStep(ROLE_SEEDS.length, 2200, live)]
  const ink = INKS.reduce((best, c) => (wcagRatio(c, fill) > wcagRatio(best, fill) ? c : best))
  const ratio = wcagRatio(ink, fill)
  return (
    <Stage stageRef={ref}>
      <div className="flex w-[232px] flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <span className="h-2 w-24 rounded-full bg-fg/15" />
          <span className="h-2 w-36 rounded-full bg-fg/10" />
        </div>
        <motion.div
          className="flex h-9 items-center justify-center rounded-lg text-ui font-medium"
          animate={{ backgroundColor: fill, color: ink }}
          initial={false}
          transition={SPRING}
        >
          Save changes
        </motion.div>
        <div className="flex items-center justify-between">
          <Caption>label ink {ink === '#ffffff' ? 'white' : 'near-black'}</Caption>
          <motion.span
            key={fill}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-md bg-status-success/10 px-1.5 py-0.5 font-mono text-mini font-medium text-status-success"
          >
            AA {ratio.toFixed(1)}:1
          </motion.span>
        </div>
      </div>
    </Stage>
  )
}

/* ── 3 · WCAG and APCA, side by side ─────────────────────────────────────── */

// Picked because the two metrics disagree on two of them (measured).
const METRIC_PAIRS = [
  { fg: '#9b9ba3', bg: '#16161a' }, // WCAG 6.5 pass · Lc 48 fail
  { fg: '#ffffff', bg: '#ef6c00' }, // WCAG 3.1 fail · Lc 62 pass
  { fg: '#71717a', bg: '#ffffff' }, // both pass
]

function Meter({ label, value, display, max, pass }: { label: string; value: number; display: string; max: number; pass: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-caption font-medium text-fg-muted">{label}</span>
        <span className={`font-mono text-mini font-medium ${pass ? 'text-status-success' : 'text-status-danger'}`}>
          {display} {pass ? 'pass' : 'fail'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fg/10">
        <motion.div
          className={`h-full rounded-full ${pass ? 'bg-status-success-solid' : 'bg-status-danger-solid'}`}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          initial={false}
          transition={SPRING}
        />
      </div>
    </div>
  )
}

export function MetricsArt() {
  const { ref, live } = useLive()
  const pair = METRIC_PAIRS[useStep(METRIC_PAIRS.length, 2600, live)]
  const ratio = wcagRatio(pair.fg, pair.bg)
  const lc = Math.abs(apcaLc(pair.fg, pair.bg))
  return (
    <Stage stageRef={ref}>
      <div className="flex w-[240px] flex-col gap-4">
        <motion.div
          className="flex h-16 items-center justify-center rounded-xl border border-line text-[22px] font-medium tracking-[-0.01em]"
          animate={{ backgroundColor: pair.bg, color: pair.fg }}
          initial={false}
          transition={SPRING}
        >
          Readable?
        </motion.div>
        <Meter label="WCAG 2" value={ratio} display={`${ratio.toFixed(1)}:1`} max={10} pass={ratio >= 4.5} />
        <Meter label="APCA" value={lc} display={`Lc ${Math.round(lc)}`} max={100} pass={lc >= 60} />
      </div>
    </Stage>
  )
}

/* ── 4 · A type scale with a density dial ────────────────────────────────── */

const DENSITIES = [
  { name: 'Compact', f: 0.82 },
  { name: 'Cozy', f: 0.91 },
  { name: 'Default', f: 1 },
  { name: 'Comfortable', f: 1.09 },
  { name: 'Spacious', f: 1.18 },
]
const TYPE_LINES = [
  { text: 'Display', size: 30, weight: 500, tone: 'text-fg' },
  { text: 'Section heading', size: 17, weight: 500, tone: 'text-fg' },
  { text: 'Body text keeps its rhythm.', size: 12, weight: 400, tone: 'text-fg-muted' },
  { text: 'Caption', size: 9.5, weight: 400, tone: 'text-fg-faint' },
]

export function TypeScaleArt() {
  const { ref, live } = useLive()
  // Ping-pong across the five steps so the thumb never jumps back.
  const tick = useStep(8, 1300, live)
  const idx = [2, 3, 4, 3, 2, 1, 0, 1][tick]
  const d = DENSITIES[idx]
  return (
    <Stage stageRef={ref}>
      <div className="flex w-[244px] flex-col gap-5">
        <div className="flex h-[124px] flex-col justify-end">
          {TYPE_LINES.map(l => (
            <motion.span
              key={l.text}
              className={`block whitespace-nowrap tracking-[-0.01em] ${l.tone}`}
              style={{ fontWeight: l.weight }}
              animate={{ fontSize: l.size * d.f, lineHeight: `${Math.round(l.size * d.f * 1.3)}px` }}
              initial={false}
              transition={SPRING}
            >
              {l.text}
            </motion.span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative mx-1 h-4">
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
            {DENSITIES.map((_, i) => (
              <span key={i} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/25" style={{ left: `${(i / 4) * 100}%` }} />
            ))}
            <motion.span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-ui bg-app"
              animate={{ left: `${(idx / 4) * 100}%` }}
              initial={false}
              transition={SPRING}
            />
          </div>
          <div className="flex justify-between">
            <Caption>density</Caption>
            <Caption>{d.name}</Caption>
          </div>
        </div>
      </div>
    </Stage>
  )
}

/* ── 5 · Radius on three axes ────────────────────────────────────────────── */

const pxOf = (step: string) => parseFloat((RADIUS_STANDARD as Record<string, string>)[step] ?? '0') || 0

export function RadiusArt() {
  const { ref, live } = useLive()
  const presets = RADIUS_ROLE_PRESETS
  const p = presets[useStep(presets.length, 2200, live)]
  const box = pxOf(p.picks.boxes)
  const field = pxOf(p.picks.fields)
  const selector = pxOf(p.picks.selectors)
  return (
    <Stage stageRef={ref}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-end gap-5">
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="flex h-[92px] w-[104px] flex-col justify-end gap-1.5 border border-line bg-surface p-2.5"
              animate={{ borderRadius: Math.min(box, 28) }}
              initial={false}
              transition={SPRING}
            >
              <span className="h-1.5 w-12 rounded-full bg-fg/15" />
              <span className="h-1.5 w-16 rounded-full bg-fg/10" />
            </motion.div>
            <Caption>boxes {box}</Caption>
          </div>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="flex h-8 w-[84px] items-center justify-center bg-accent-solid text-caption font-medium text-accent-ink"
              animate={{ borderRadius: Math.min(field, 16) }}
              initial={false}
              transition={SPRING}
            >
              Button
            </motion.div>
            <Caption>fields {field}</Caption>
          </div>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="flex h-[22px] w-[22px] items-center justify-center bg-accent-solid text-accent-ink"
              animate={{ borderRadius: Math.min(selector, 11) }}
              initial={false}
              transition={SPRING}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
            </motion.div>
            <Caption>sel. {selector}</Caption>
          </div>
        </div>
        <motion.span
          key={p.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="rounded-full bg-surface px-2.5 py-1 text-caption font-medium text-fg-muted"
        >
          {p.label}
        </motion.span>
      </div>
    </Stage>
  )
}

/* ── 6 · Spacing that tightens on mobile ─────────────────────────────────── */

// section-md per viewport (24 / 16 / 12) and the frame width that stands for it.
const VIEWPORTS = [
  { name: 'Desktop', gap: 24, width: 236 },
  { name: 'Tablet', gap: 16, width: 176 },
  { name: 'Mobile', gap: 12, width: 112 },
]

export function SpacingArt() {
  const { ref, live } = useLive()
  const tick = useStep(4, 1800, live)
  const v = VIEWPORTS[[0, 1, 2, 1][tick]]
  // Half scale, so the frame fits the stage.
  const gap = v.gap / 2
  return (
    <Stage stageRef={ref}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-[150px] items-center">
          <motion.div
            className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface"
            animate={{ width: v.width, padding: gap, gap }}
            initial={false}
            transition={SPRING}
          >
            <span className="h-2 w-2/3 rounded-full bg-fg/20" />
            <motion.div className="grid grid-cols-2" animate={{ gap }} initial={false} transition={SPRING}>
              <span className="h-9 rounded-md bg-accent-ui/25" />
              <span className="h-9 rounded-md bg-accent-ui/15" />
            </motion.div>
            <span className="h-6 rounded-md bg-fg/10" />
          </motion.div>
        </div>
        <div className="flex items-center gap-3">
          {VIEWPORTS.map(x => (
            <span key={x.name} className={`text-caption transition-colors duration-300 ${x.name === v.name ? 'font-medium text-fg' : 'text-fg-faint'}`}>
              {x.name}
            </span>
          ))}
        </div>
        <Caption>section gap {v.gap}px</Caption>
      </div>
    </Stage>
  )
}
