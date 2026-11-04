import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { burstConfetti } from '../../lib/celebrate'
import { boardTourStep, subscribeBoardTour, tourEvent, TOUR_STEPS, type TourStep } from '../../lib/boardTour'

/** What each step points at: an element carrying `data-tour="<step>"`. The
 *  anchors live in three components (the board toolbar, the Inspector toggle,
 *  the inspector's Ship row); a selector keeps this file from knowing them. */
const COPY: Record<Exclude<TourStep, 'done'>, { title: string; body: string }> = {
  roll: {
    title: 'Pick your brand at random',
    body: 'Roll the die: a new colour, type and shape. Roll as often as you like.',
  },
  inspect: {
    title: 'See which token paints each part',
    body: 'Like it? Turn on the Inspector and point at any component. Not yet? Roll again.',
  },
  ship: {
    title: 'Take it with you',
    body: 'Ship it as CSS, to Figma or to your AI agent.',
  },
}

const GAP = 14
const EDGE = 12
const W = 280

type Rect = { left: number; top: number; width: number; height: number }

/** When a step's control is on screen but COVERED (the pinned inspector sits
 *  over the Ship row; the colour map's graph replaces Random and Inspector),
 *  the ring used to land on whatever covered it. Instead the coach points at
 *  the way back to the control, with copy that says so. */
const DETOURS: Record<Exclude<TourStep, 'done'>, { anchor: string; title: string; body: string }[]> = {
  roll: [{ anchor: 'map-close', title: 'Back to the board', body: 'Close the colour map (Esc) to roll a new brand.' }],
  inspect: [{ anchor: 'map-close', title: 'Back to the board', body: 'Close the colour map (Esc) to turn on the Inspector.' }],
  ship: [{ anchor: 'exit-inspector', title: 'Exit the inspector to ship', body: 'Press Esc or Exit inspector: the Ship row is underneath.' }],
}

/** True when the element's centre is in the viewport and nothing but the
 *  element itself (or the coach) is on top of it there. */
function reachable(el: HTMLElement, r: DOMRect): boolean {
  if (r.width <= 0 || r.height <= 0) return false
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false
  for (const hit of document.elementsFromPoint(x, y)) {
    if (hit instanceof HTMLElement && hit.closest('[data-tour-coach]')) continue
    return el === hit || el.contains(hit)
  }
  return false
}

/** The first visible, uncovered element for a step — the Ship row also
 *  renders on the Code tab, and a hidden copy has an empty rect. */
function findAnchor(step: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${step}"]`)
  for (const el of all) {
    if (reachable(el, el.getBoundingClientRect())) return el
  }
  return null
}

function sameRect(a: Rect | null, b: Rect | null) {
  return a === b || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height)
}

export function useBoardTourStep(): TourStep {
  return useSyncExternalStore(subscribeBoardTour, boardTourStep, () => 'done' as TourStep)
}

/**
 * The first-run guide on the Board: a ring around the control to use and a
 * bubble above it ("1 / 3 · Pick your brand at random"). Not a modal — it
 * steals no focus and blocks nothing, so the board can be watched changing.
 * It shows only while its anchor is on screen; finishing the last step bursts
 * confetti in the brand's colours.
 */
export function BoardTourCoach({ colors }: {
  /** The previewed brand's solids, for the closing confetti. */
  colors: string[]
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const step = useBoardTourStep()
  const [rect, setRect] = useState<Rect | null>(null)
  // Which detour is showing (index into DETOURS[step]), or -1 for the step itself.
  const [detour, setDetour] = useState(-1)
  const lastAnchor = useRef<HTMLElement | null>(null)
  const prevStep = useRef(step)

  // Follow the anchor: the toolbar animates in, the inspector scrolls, the
  // window resizes. A frame loop is the one thing that catches all of them
  // cheaply; it only runs while the tour does.
  useLayoutEffect(() => {
    if (step === 'done') { setRect(null); return }
    let raf = 0
    const tick = () => {
      let el = findAnchor(step)
      let which = -1
      if (!el) {
        DETOURS[step].some((d, i) => {
          el = findAnchor(d.anchor)
          if (el) which = i
          return Boolean(el)
        })
      }
      // Only the step's own control is where a ship lands (confetti origin).
      if (which === -1) lastAnchor.current = el
      setDetour(which)
      const r = el?.getBoundingClientRect()
      const next = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
      setRect((prev) => (sameRect(prev, next) ? prev : next))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [step])

  // The last step closed by shipping: celebrate where it happened.
  useEffect(() => {
    if (prevStep.current === 'ship' && step === 'done') burstConfetti(lastAnchor.current, colors)
    prevStep.current = step
  }, [step, colors])

  const skip = useCallback(() => tourEvent('skip'), [])

  if (step === 'done' || typeof document === 'undefined') return null
  const index = TOUR_STEPS.indexOf(step)
  const copy = detour >= 0 ? DETOURS[step][detour] : COPY[step]

  let bubble: { left: number; bottom: number; arrow: number } | null = null
  if (rect) {
    const centre = rect.left + rect.width / 2
    const left = Math.min(Math.max(centre - W / 2, EDGE), window.innerWidth - W - EDGE)
    bubble = { left, bottom: window.innerHeight - rect.top + GAP, arrow: Math.min(Math.max(centre - left, 18), W - 18) }
  }

  return createPortal(
    <AnimatePresence>
      {rect && bubble && (
        <motion.div key="tour" data-tour-coach="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }}>
          {/* The ring: around the control, letting clicks through to it. */}
          <span
            aria-hidden
            className="pointer-events-none fixed z-[80] rounded-[12px] ring-2 ring-accent-ui shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent-ui)_22%,transparent)] motion-safe:animate-tour-pulse"
            style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
          />
          <motion.div
            key={`${step}-${detour}`}
            role="dialog"
            aria-modal="false"
            aria-label={t('Getting started')}
            aria-live="polite"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="dark fixed z-[85] rounded-xl border border-white/[0.12] bg-[#050506] p-3.5 text-fg shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]"
            style={{ left: bubble.left, bottom: bubble.bottom, width: W }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5" aria-label={t('Step {n} of {total}', { n: index + 1, total: TOUR_STEPS.length })}>
                {TOUR_STEPS.map((s, i) => (
                  <span
                    key={s}
                    aria-hidden
                    className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === index ? 'w-4 bg-accent-ui' : i < index ? 'w-1.5 bg-accent-ui/60' : 'w-1.5 bg-fg/20'}`}
                  />
                ))}
                <span className="ml-1 text-mini font-semibold tabular-nums text-fg-faint">{index + 1} / {TOUR_STEPS.length}</span>
              </span>
              <button
                type="button"
                onClick={skip}
                className="rounded-md px-1.5 py-0.5 text-mini font-medium text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui"
              >
                {t('Skip tour')}
              </button>
            </div>
            <p className="text-ui font-semibold leading-snug text-fg">{t(copy.title)}</p>
            <p className="mt-1 text-body leading-relaxed text-fg-muted">{t(copy.body)}</p>
            {/* The arrow, pointing down at the control. */}
            <span
              aria-hidden
              className="absolute -bottom-[6px] h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/[0.12] bg-[#050506]"
              style={{ left: bubble.arrow }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
