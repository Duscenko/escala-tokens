// ─── Motion of the Generator's right-hand inspector ─────────────────────────
// ONE spec for everything that moves inside the inspector column. Three layers
// stack over its panel slot — the pinned token trace (z-10), Token Details
// (z-20) and the CSS · Figma · Agent ship panel (z-30) — and they used to move
// three different ways: 0.16s `easeOut` with no exit, 0.18s `easeOut` under a
// second fade, and no motion at all. The accordion folded rows out in 0.18s
// while unfolding the next one in 0.26s, so their summed height dipped and the
// rows below bounced back down after the motion had "ended".
//
// Rules this file holds:
// - Every layer ENTERS and LEAVES the same way: from 8px right, fading in.
//   Leaving is quicker than arriving (nothing below a layer depends on it).
// - An accordion body folds and unfolds HEIGHT at one duration and one curve.
//   With equal timing, one row shrinking while another grows sums to a
//   monotone height, so nothing under them can overshoot and come back.
// - The curve is the chrome's own `--ease-out-quint` (index.css), no overshoot.
// - Reduced motion: no travel, no height animation, instant.
//
// The chrome keeps its own motion; a brand's Motion foundation never drives it.

/** `--ease-out-quint` in index.css, as a Framer Motion cubic-bezier. */
export const INSPECTOR_EASE = [0.22, 1, 0.36, 1] as const

/** Seconds. */
export const INSPECTOR_DURATION = {
  /** A layer arriving over the panel. */
  layerIn: 0.2,
  /** A layer leaving. */
  layerOut: 0.14,
  /** An accordion body's height, in AND out. */
  fold: 0.24,
  /** An accordion body's fade on the way out (opacity never moves layout). */
  foldFadeOut: 0.12,
} as const

/** Horizontal travel of a layer, px. */
const LAYER_TRAVEL = 8

/** Milliseconds until a fold has landed — when a scroll-into-view may measure. */
export const INSPECTOR_FOLD_SETTLE_MS = Math.round(INSPECTOR_DURATION.fold * 1000) + 20

/** Props for a layer stacked over the inspector's panel (`motion.div`). */
export function inspectorLayerMotion(reduce: boolean | null | undefined) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
      transition: { duration: 0 },
    } as const
  }
  return {
    initial: { opacity: 0, x: LAYER_TRAVEL },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: LAYER_TRAVEL, transition: { duration: INSPECTOR_DURATION.layerOut, ease: INSPECTOR_EASE } },
    transition: { duration: INSPECTOR_DURATION.layerIn, ease: INSPECTOR_EASE },
  } as const
}

/** Props for an accordion body unfolding from its header (`motion.div`). */
export function inspectorFoldMotion(reduce: boolean | null | undefined) {
  if (reduce) {
    return {
      initial: false as const,
      animate: { height: 'auto', opacity: 1 },
      exit: { opacity: 0, transition: { duration: 0 } },
      transition: { duration: 0 },
    }
  }
  const height = { duration: INSPECTOR_DURATION.fold, ease: INSPECTOR_EASE }
  return {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: {
      height: 0,
      opacity: 0,
      transition: { height, opacity: { duration: INSPECTOR_DURATION.foldFadeOut, ease: INSPECTOR_EASE } },
    },
    transition: height,
  }
}
