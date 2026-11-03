// The first-run tour of the Board: roll a brand → inspect it → ship it.
// Three steps, each closed by DOING the thing (a roll, the Inspector, a Ship
// door), never by a Next button. A UI preference like `onboarding.ts`'s
// `sd-onboarded`, kept out of the design store.
//
// Who sees it: a browser that is new to Escala. Existing users are
// grandfathered the same way `hasOnboarded()` does it — read when this module
// loads, before any effect has written the store — and recorded as `done` at
// once, so the answer never changes on a later load.

import { hasOnboarded } from './onboarding'

export type TourStep = 'roll' | 'inspect' | 'ship' | 'done'
export type TourEvent = 'rolled' | 'inspected' | 'shipped' | 'skip'

export const TOUR_STEPS: Exclude<TourStep, 'done'>[] = ['roll', 'inspect', 'ship']

const KEY = 'sd-board-tour'

/** Pure: the step after `event`. Events out of order change nothing, so a
 *  ship before any roll does not skip the roll step's lesson silently — it
 *  only finishes the tour when it IS the ship step (or on skip). */
export function nextTourStep(step: TourStep, event: TourEvent): TourStep {
  if (step === 'done') return 'done'
  if (event === 'skip') return 'done'
  if (step === 'roll' && event === 'rolled') return 'inspect'
  if (step === 'inspect' && event === 'inspected') return 'ship'
  if (step === 'ship' && event === 'shipped') return 'done'
  return step
}

function isStep(v: unknown): v is TourStep {
  return v === 'roll' || v === 'inspect' || v === 'ship' || v === 'done'
}

function read(): TourStep {
  try {
    const stored = localStorage.getItem(KEY)
    if (isStep(stored)) return stored
    const first: TourStep = hasOnboarded() ? 'done' : 'roll'
    localStorage.setItem(KEY, first)
    return first
  } catch {
    return 'done'
  }
}

let step: TourStep = typeof window === 'undefined' ? 'done' : read()
const listeners = new Set<() => void>()

export function boardTourStep(): TourStep {
  return step
}

export function subscribeBoardTour(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Report something the visitor did. A no-op once the tour is done. */
export function tourEvent(event: TourEvent): void {
  const next = nextTourStep(step, event)
  if (next === step) return
  step = next
  try { localStorage.setItem(KEY, next) } catch { /* ignore */ }
  listeners.forEach((fn) => fn())
}
