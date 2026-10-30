import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Hover waits a beat so passing over a toolbar does not flash every label;
 *  moving from one button to the next shows the next at once. */
const OPEN_DELAY = 350
let lastClosedAt = 0
const GAP = 8
const EDGE = 8

export type HintSide = 'top' | 'left' | 'right'

/**
 * A tool's name, and its shortcut when it has one, on hover or keyboard focus:
 * a small dark pill beside the control, like Figma's toolbar ("Text  T"). It
 * replaces the browser's `title`, which shows late, unstyled and without keys.
 *
 * The control keeps its own `aria-label`; this is a visual hint only
 * (`aria-hidden`), so a screen reader does not hear the name twice. It stays
 * dark in both appearances, as in Figma, so it reads as a hint over any board.
 */
export function HintTip({ label, shortcut, side = 'top', block = false, children }: {
  label: string
  /** Keys as drawn on the caps, e.g. "⌘Z". */
  shortcut?: string
  /** Where the pill opens. It flips to the opposite side when that one is
   *  off-screen (`top` falls below). */
  side?: HintSide
  /** Fill the parent's width (a full-width row) instead of hugging the control. */
  block?: boolean
  children: ReactNode
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(undefined)
  const [open, setOpen] = useState(false)

  const show = useCallback((immediate: boolean) => {
    window.clearTimeout(timer.current)
    const instant = immediate || performance.now() - lastClosedAt < 300
    if (instant) setOpen(true)
    else timer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY)
  }, [])
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setOpen((was) => {
      if (was) lastClosedAt = performance.now()
      return false
    })
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [open, hide])

  // Placed on mount by the ref itself: measuring needs the pill in the DOM,
  // and writing its style directly keeps one render per open.
  const place = useCallback((tip: HTMLDivElement | null) => {
    const a = anchor.current?.getBoundingClientRect()
    if (!tip || !a) return
    const t = tip.getBoundingClientRect()
    const clampX = (x: number) => Math.min(Math.max(x, EDGE), window.innerWidth - t.width - EDGE)
    const clampY = (y: number) => Math.min(Math.max(y, EDGE), window.innerHeight - t.height - EDGE)
    let left: number
    let top: number
    if (side === 'top') {
      left = clampX(a.left + a.width / 2 - t.width / 2)
      const above = a.top - t.height - GAP
      top = above >= EDGE ? above : a.bottom + GAP
    } else {
      top = clampY(a.top + a.height / 2 - t.height / 2)
      const toLeft = a.left - t.width - GAP
      const toRight = a.right + GAP
      const fitsLeft = toLeft >= EDGE
      const fitsRight = toRight + t.width <= window.innerWidth - EDGE
      left = side === 'left' ? (fitsLeft || !fitsRight ? toLeft : toRight) : (fitsRight || !fitsLeft ? toRight : toLeft)
    }
    tip.style.left = `${left}px`
    tip.style.top = `${top}px`
    tip.style.visibility = 'visible'
  }, [side])

  return (
    <span
      ref={anchor}
      className={block ? 'flex' : 'inline-flex'}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') show(false) }}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) show(true) }}
      onBlur={hide}
    >
      {children}
      {open && createPortal(
        <div
          ref={place}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[90] flex items-center gap-3 whitespace-nowrap rounded-lg bg-[#1c1d20] px-3 py-2 text-caption font-medium text-white shadow-[0_6px_18px_-4px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
          style={{ visibility: 'hidden' }}
        >
          {label}
          {shortcut && <span className="text-white/55">{shortcut}</span>}
        </div>,
        document.body,
      )}
    </span>
  )
}
