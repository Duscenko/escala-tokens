/**
 * A brand's motion, played: a dialog arriving over its backdrop and a list
 * revealing row by row — the two choreographies people feel most. Everything
 * reads the brand's own settings (lib/motion.ts): the dialog through the same
 * `--motion-choreo-*` properties the component sheet uses, the list from the
 * `list-reveal` choreography. Replay remounts it. With reduced motion asked
 * for, it plays the reduced versions (fades, no travel) — the honest preview.
 *
 * The CHROME around it keeps Escala's own motion; only this specimen moves
 * like the system.
 */
import { useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import {
  MOTION_EASINGS, durationMs, matchMotionPreset, motionChoreographies, motionCssVars,
  motionKeyframesCss, resolveMotionRef, type MotionSettings,
} from '../../lib/motion'

/** The keyframes are static, the same for every system: injected once into
 *  the document. Anything that plays a choreography by name calls this. */
export function ensureMotionKeyframes() {
  if (typeof document === 'undefined' || document.getElementById('escala-motion-keyframes')) return
  const el = document.createElement('style')
  el.id = 'escala-motion-keyframes'
  el.textContent = motionKeyframesCss().join('\n')
  document.head.appendChild(el)
}
ensureMotionKeyframes()

const ROWS = 4

export function MotionPreview({ settings, className = '' }: { settings: MotionSettings; className?: string }) {
  const { t } = useI18n()
  const reduced = useReducedMotion() ?? false
  const [run, setRun] = useState(0)
  const vars = motionCssVars(settings, { reduced }) as CSSProperties
  const choreo = motionChoreographies(settings)['list-reveal']
  const body = reduced ? choreo.reducedMotion : choreo
  const child = body.child!
  const pick = resolveMotionRef(child.motion, settings)
  const rowAnimation = (i: number) =>
    `motion-${child.keyframes} ${durationMs(pick.duration, settings)}ms ${MOTION_EASINGS[pick.easing]} ${(body.offset ?? 0) * i}ms both`

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        key={run}
        style={vars}
        aria-hidden
        className="relative grid h-[132px] grid-cols-2 gap-2 overflow-hidden rounded-lg border border-line bg-app p-2"
      >
        {/* Dialog: backdrop fades, the card pops in a beat later. */}
        <div className="relative overflow-hidden rounded-md bg-surface">
          <div className="absolute inset-0 bg-black/40" style={{ animation: 'var(--motion-choreo-dialog-enter-overlay)' }} />
          <div className="absolute inset-x-3 top-1/2 -translate-y-1/2">
            <div
              className="flex flex-col gap-1.5 rounded-md border border-line bg-elevated p-2 shadow-sm"
              style={{ animation: 'var(--motion-choreo-dialog-enter-content)' }}
            >
              <span className="h-1.5 w-2/3 rounded-full bg-fg/60" />
              <span className="h-1.5 w-full rounded-full bg-fg/20" />
              <span className="mt-1 h-3 w-1/2 self-end rounded bg-accent-solid" />
            </div>
          </div>
        </div>
        {/* List: rows arrive one after another (in parallel, reduced). */}
        <div className="flex flex-col justify-center gap-1.5 rounded-md bg-surface p-2">
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded bg-elevated px-1.5 py-1" style={{ animation: rowAnimation(i) }}>
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent-solid/70" />
              <span className="h-1.5 flex-1 rounded-full bg-fg/25" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-mini tabular-nums text-fg-faint">
          {(['quick', 'short', 'medium', 'long'] as const).map((k) => `${durationMs(k, settings)}`).join(' · ')} ms
          {reduced ? ` · ${t('reduced')}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-mini text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Replay')}
        </button>
      </div>
    </div>
  )
}

/** The rail row's summary: the preset's name, or Custom. */
export function motionSummary(settings: MotionSettings): string {
  const key = matchMotionPreset(settings)
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Custom'
}
