/**
 * The Board plays itself while the inspector is off.
 *
 * Inspecting needs a still board (a specimen holds its Default variant so the
 * trace names the roles of a state the user asked to see). With the inspector
 * off the board has no such job, and a still board cannot show the one
 * foundation that only exists in time: Motion. So an autopilot acts on the
 * real components the way a person would — hovers and presses a button, flips
 * a switch, moves a tab — and every transition that follows is the brand's own
 * (`RecipeScope` supplies `--motion-*`), so a Motion preset is seen, not read.
 *
 * Two halves:
 *  · `useBoardConductor` — DOM autopilot for what a click or a pointer does.
 *  · `useAutoplayStep`   — a counter for specimens whose state is a React prop
 *    (Progress value, OTP digits, Stepper step).
 *
 * Off under `prefers-reduced-motion`, while the tab is hidden, and on the tile
 * the pointer is over (the person is using it). Stopping puts every toggle and
 * selection back where it was, so the inspector opens on the default board.
 */
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

/** True while the board plays itself. `SystemCollage` provides it. */
export const BoardAutoplayContext = createContext(false)

// The person's pause (WCAG 2.2.2 — moving content that runs on its own needs a
// way to stop it). Kept per browser; storage that cannot be read means "plays".
const PAUSE_KEY = 'sd-board-paused'
const pauseListeners = new Set<() => void>()
let paused = (() => {
  try { return localStorage.getItem(PAUSE_KEY) === '1' } catch { return false }
})()

function subscribePause(fn: () => void): () => void {
  pauseListeners.add(fn)
  return () => { pauseListeners.delete(fn) }
}

export function useBoardPaused(): boolean {
  return useSyncExternalStore(subscribePause, () => paused, () => false)
}

export function setBoardPaused(next: boolean): void {
  paused = next
  try {
    if (next) localStorage.setItem(PAUSE_KEY, '1')
    else localStorage.removeItem(PAUSE_KEY)
  } catch { /* the pause still holds for this session */ }
  for (const l of pauseListeners) l()
}

export function useBoardAutoplay(): boolean {
  return useContext(BoardAutoplayContext)
}

/** Whether a tile's scripts may move: on screen and not under the pointer (a
 *  person using a tile keeps what they are looking at). `ScaledModule`
 *  provides it; outside a tile it is always true. */
export const TileLiveContext = createContext(true)

// ONE clock for every script on the board: a single timer, and a step read
// from the time since the board started playing — so two parts running the
// same script (a calendar's day and the event line under it) can never drift
// apart, and a tile that was paused rejoins the board where the board is.
const CLOCK_MS = 100
const listeners = new Set<() => void>()
let clock = 0
let epoch = 0

function subscribeClock(fn: () => void): () => void {
  if (!listeners.size) {
    epoch = performance.now()
    clock = window.setInterval(() => {
      if (!document.hidden) for (const l of listeners) l()
    }, CLOCK_MS)
  }
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
    if (!listeners.size) { window.clearInterval(clock); clock = 0 }
  }
}

/** Counts 0 … `count - 1` and wraps, one step every `ms`, while the board
 *  plays. `null` when it does not: the specimen shows its own default. */
export function useAutoplayStep(count: number, ms: number): number | null {
  const playing = useBoardAutoplay()
  const live = useContext(TileLiveContext)
  const liveRef = useRef(live)
  liveRef.current = live
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!playing) return
    const read = () => {
      if (liveRef.current) setStep(Math.floor((performance.now() - epoch) / ms) % count)
    }
    const stop = subscribeClock(read)
    read()
    // Each run starts from the top.
    return () => { stop(); setStep(0) }
  }, [playing, count, ms])
  return playing ? step : null
}

/** One act somewhere on the board every beat. Long enough that a Calm preset's
 *  transition lands before the next one starts. */
const BEAT_MS = 720
const HOVER_MS = 320
const PRESS_MS = 180
const TILE = '[data-collage-appearance]'
const FORCE = 'data-force-state'

/** A set of options where one is selected: the buttons, and which is on. */
const CHOICES: readonly { root: string; item: string; on: string }[] = [
  { root: '[data-escala="SegmentedControl"]', item: '[role="radio"]', on: '[aria-checked="true"]' },
  { root: '[data-escala="TabMenu"]', item: 'button:not([disabled])', on: '[aria-pressed="true"]' },
  { root: '[data-escala="Pagination"]', item: 'button:not([aria-label]):not([disabled])', on: '[aria-current="page"]' },
]
const TOGGLES = '[data-escala="Switch"], [data-escala="Checkbox"], [data-escala="Chip"]'
const BUTTONS = '[data-escala="Button"]'

/** `el` is what the act touches, so a tile the person is using can be left alone. */
type Act = { el: HTMLElement; run: () => void }

export function useBoardConductor(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const board = ref.current
    if (!active || !board) return
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn() }, ms)
      timers.add(id)
    }
    // What to put back on stop: a toggle's first-seen value, a group's first-seen pick.
    // Toggles are remembered by POSITION: flipping one can remount it (`Live`
    // re-keys its specimen), so the element first seen may be gone on stop.
    const toggled = new Map<number, string | null>()
    const picked = new Map<HTMLElement, HTMLElement | null>()
    const forced = new Set<HTMLElement>()
    const checked = (el: HTMLElement) => el.getAttribute('aria-checked') ?? el.getAttribute('aria-pressed') ?? el.getAttribute('data-state')
    const busy = (el: Element) => !!el.closest(TILE)?.matches(':hover')

    const acts = (): Act[] => {
      const out: Act[] = []
      for (const el of board.querySelectorAll<HTMLElement>(BUTTONS)) {
        if (el.hasAttribute(FORCE) || el.getAttribute('aria-disabled') === 'true') continue
        // Each step goes on only while the attribute is still the one set
        // here: a button that starts Loading mid-act keeps its own state.
        const step = (from: string, to: string | null, ms: number) => later(() => {
          if (el.getAttribute(FORCE) !== from) return
          if (to) el.setAttribute(FORCE, to)
          else { el.removeAttribute(FORCE); forced.delete(el) }
        }, ms)
        out.push({ el, run: () => {
          forced.add(el)
          el.setAttribute(FORCE, 'Hover')
          step('Hover', 'Pressed', HOVER_MS)
          step('Pressed', 'Hover', HOVER_MS + PRESS_MS)
          step('Hover', null, HOVER_MS * 2 + PRESS_MS)
        } })
      }
      board.querySelectorAll<HTMLElement>(TOGGLES).forEach((el, i) => {
        out.push({ el, run: () => {
          if (!toggled.has(i)) toggled.set(i, checked(el))
          el.click()
        } })
      })
      for (const kind of CHOICES) {
        for (const root of board.querySelectorAll<HTMLElement>(kind.root)) {
          const items = Array.from(root.querySelectorAll<HTMLElement>(kind.item))
          if (items.length < 2) continue
          out.push({ el: root, run: () => {
            const at = items.findIndex((i) => i.matches(kind.on))
            if (!picked.has(root)) picked.set(root, items[at] ?? null)
            items[(at + 1) % items.length].click()
          } })
        }
      }
      return out
    }

    // A stride coprime with most counts hops around the board instead of
    // walking it in DOM order (which would animate one tile at a time).
    let cursor = 0
    const beat = window.setInterval(() => {
      if (document.hidden) return
      const list = acts()
      if (!list.length) return
      for (let tries = 0; tries < list.length; tries++) {
        cursor = (cursor + 7) % list.length
        if (busy(list[cursor].el)) continue
        list[cursor].run()
        return
      }
    }, BEAT_MS)

    return () => {
      window.clearInterval(beat)
      for (const id of timers) window.clearTimeout(id)
      for (const el of forced) if (/^(Hover|Pressed)$/.test(el.getAttribute(FORCE) ?? '')) el.removeAttribute(FORCE)
      const toggles = board.querySelectorAll<HTMLElement>(TOGGLES)
      for (const [i, was] of toggled) if (toggles[i] && checked(toggles[i]) !== was) toggles[i].click()
      for (const [, first] of picked) if (first?.isConnected) first.click()
    }
  }, [ref, active])
}
