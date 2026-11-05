// Takes every focusable element under `ref` out of the Tab order, and keeps it
// out as the subtree re-renders — without `inert`, which would also block the
// pointer hits the board's inspector needs.
//
// The Board's sample screens are pictures of a product built from the tokens:
// their buttons, a fake dialog's Close, a checkbox labelled "Remember me" do
// nothing. Tabbing through them before reaching the inspector was a keyboard
// trap in all but name (audit 2026-11-05). The subtree is also hidden from
// assistive tech by the caller (`aria-hidden`), which is only valid because
// nothing inside it can take keyboard focus any more.

import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'

export function useNoTabStops(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const root = ref.current
    if (!enabled || !root) return
    const touched = new Set<HTMLElement>()
    const sweep = () => {
      root.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => {
        if (el.getAttribute('tabindex') === '-1') return
        if (!el.hasAttribute('data-tabstop-was')) el.setAttribute('data-tabstop-was', el.getAttribute('tabindex') ?? '')
        el.setAttribute('tabindex', '-1')
        touched.add(el)
      })
    }
    sweep()
    const observer = new MutationObserver(sweep)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['tabindex'] })
    return () => {
      observer.disconnect()
      touched.forEach((el) => {
        const was = el.getAttribute('data-tabstop-was')
        el.removeAttribute('data-tabstop-was')
        if (was) el.setAttribute('tabindex', was)
        else el.removeAttribute('tabindex')
      })
    }
  }, [ref, enabled])
}
