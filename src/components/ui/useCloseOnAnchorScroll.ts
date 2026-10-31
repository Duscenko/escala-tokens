import { useEffect, useRef, type RefObject } from 'react'

type Anchor = RefObject<HTMLElement | null> | HTMLElement | null

/**
 * Closes a portaled, `fixed` menu as soon as the container its trigger lives
 * in scrolls.
 *
 * Re-measuring on scroll instead (what these menus used to do) kept the menu
 * glued to a trigger that was scrolling out of its table: the menu slid over
 * the sticky headers, or stayed behind with nothing under it. A menu has no
 * state worth keeping through a scroll, so it closes, the way a native select
 * does.
 *
 * Only a scroll whose target CONTAINS the trigger counts. The menu's own list
 * scrolling (it is portaled, so it never contains the trigger) and unrelated
 * panels scrolling elsewhere leave it open.
 */
export function useCloseOnAnchorScroll(open: boolean, anchor: Anchor, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })

  useEffect(() => {
    if (!open) return
    const onScroll = (e: Event) => {
      const el = anchor && 'current' in anchor ? anchor.current : anchor
      if (!el) return
      const target = e.target
      const scrolled = target instanceof Document ? target.documentElement : target
      if (scrolled instanceof Node && scrolled.contains(el)) close.current()
    }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [open, anchor])
}
