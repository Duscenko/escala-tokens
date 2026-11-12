/**
 * How the Board arrives: every tile is a skeleton of the catalogue's own
 * `Skeleton` from the first frame, then each one crosses to its content in a
 * diagonal wave timed by the BRAND's motion — `use-stagger-in` (one child of a
 * staggered reveal), the preset's `stagger` and its `enter` distance. So a
 * Snappy brand loads quick and short, a Calm one fades in place.
 *
 * The wave starts when the whole board holds still: the on-demand specimen
 * library is in (Chart, Calendar) and no tile has changed size for `SETTLE_MS`.
 * Measured: the Chart grows 75 → 201 px when Recharts lands and every column's
 * stretched last tile re-fits, so anything already shown would be shoved.
 */
import { createContext } from 'react'
import { MOTION_EASINGS, resolveMotionRole, type MotionSettings } from '../../../lib/motion'

/** No tile resized for this long = the board has settled. */
export const SETTLE_MS = 140
/** From mount: the wave starts by then, settled or not. */
export const REVEAL_CAP_MS = 1500

export interface BoardReveal {
  /** `performance.now()` when the wave starts (band 0). */
  start: number
  /** Delay between two diagonal bands, ms. */
  step: number
  /** The tile's own crossing, ms. */
  ms: number
  easing: string
  /** Distance the content rises while it fades in, px (0 = fade in place). */
  enter: number
  /** Last band's delay + one crossing: the wave is over. */
  span: number
  /** The board has not settled yet: every tile stays a skeleton. */
  held: boolean
}

/** `null` outside a board: a tile shows its content at once, as before. */
export const BoardRevealContext = createContext<BoardReveal | null>(null)

/** The first entry of the page load plays the full wave; a return to the
 *  board in the same session is a short fade. */
let enteredOnce = false
export const boardEnteredOnce = () => enteredOnce
export const markBoardEntered = () => { enteredOnce = true }

export function boardRevealTiming(
  motion: MotionSettings | undefined,
  opts: { start: number; bands: number; quick: boolean; reduced: boolean; held: boolean },
): BoardReveal {
  const { start, bands, quick, reduced, held } = opts
  if (reduced) return { start, step: 0, ms: 120, easing: MOTION_EASINGS.linear, enter: 0, span: 120, held }
  if (quick || !motion) {
    const step = motion ? Math.round(motion.stagger / 4) : 20
    return { start, step, ms: 180, easing: MOTION_EASINGS.entrance, enter: 0, span: step * bands + 180, held }
  }
  const role = resolveMotionRole('use-stagger-in', motion)
  // Half the preset's stagger per band: Snappy 30 ms … Calm 70 ms, so a board
  // of ~10 bands lands in 0.3–0.7 s instead of a 22-tile queue.
  const step = Math.round(motion.stagger / 2)
  return {
    start,
    step,
    ms: role.ms,
    easing: MOTION_EASINGS[role.easing],
    enter: motion.transforms.enter,
    span: step * bands + role.ms,
    held,
  }
}
