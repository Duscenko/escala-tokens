// The selection mark that slides between items (TabMenu, SegmentedControl,
// Pagination, Sidebar): ONE element that travels to the active item, not a
// background that blinks off one and on the next — that is what makes the
// selection read as a single object moving.
//
// The active item carries `data-sliding-active="true"`; the mark measures it.
// Its colours come from the recipe (`data-part` of the owner's `pill` slot), so
// it paints with tokens like everything else. Honors prefers-reduced-motion.
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const PILL_TRANSITION = { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }
const PILL_SNAP = { duration: 0 }

export interface SlidingSelectionProps {
  /** The element whose children include the active item. */
  trackRef: { current: HTMLElement | null }
  /** Changes when the selection moves. */
  selection: string | number
  /** The recipe part this mark paints as (`TabMenu.pill`). */
  part: string
  style?: React.CSSProperties
}

export function SlidingSelection({ trackRef, selection, part, style }: SlidingSelectionProps) {
  const reduce = useReducedMotion() ?? false
  const [box, setBox] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [slide, setSlide] = React.useState(false)
  const prevSel = React.useRef(selection)

  const measure = React.useCallback(() => {
    const track = trackRef.current
    const item = track?.querySelector<HTMLElement>('[data-sliding-active="true"]')
    if (!track || !item) return
    const next = { x: item.offsetLeft, y: item.offsetTop, w: item.offsetWidth, h: item.offsetHeight }
    setBox((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next))
  }, [trackRef])

  React.useLayoutEffect(() => {
    const moved = prevSel.current !== selection
    prevSel.current = selection
    if (moved) setSlide(!reduce)
    measure()
  }, [selection, measure, reduce])

  // The track ref sits on the parent; this child's layout effect can run before
  // it is attached, so measure again after every ref in the commit.
  React.useEffect(() => { measure() }, [selection, measure])

  React.useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(track)
    for (const child of track.children) {
      // The mark itself is aria-hidden; watching it would re-measure mid-tween.
      if (child instanceof HTMLElement && child.getAttribute('aria-hidden') !== 'true') ro.observe(child)
    }
    return () => ro.disconnect()
  }, [measure, trackRef])

  if (!box) return null
  return (
    <motion.span
      aria-hidden
      data-part={part}
      initial={false}
      animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
      transition={slide && !reduce ? PILL_TRANSITION : PILL_SNAP}
      onAnimationComplete={() => setSlide(false)}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', ...style }}
    />
  )
}
