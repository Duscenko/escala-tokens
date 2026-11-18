// One header per catalogue page. The page's tools (previous · name · next,
// Storybook, Figma, Agent context) ride in the shell's breadcrumb row, so the
// canvas starts right under it instead of under a second row that repeated the
// name. The shell owns the slot; the page portals into it.

import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const SLOT_ID = 'catalogue-stage-actions'

/** Where the page's tools land, in the shell's header. */
export function StageActionsSlot() {
  return <div id={SLOT_ID} className="flex min-w-0 flex-shrink items-center justify-end gap-1.5 empty:hidden" />
}

/** The page's tools. Where the shell has no slot they draw in place. */
export function StageActions({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [looked, setLooked] = useState(false)
  useLayoutEffect(() => {
    setSlot(document.getElementById(SLOT_ID))
    setLooked(true)
  }, [])
  if (slot) return createPortal(children, slot)
  if (!looked) return null
  return <div className="flex items-center justify-end gap-1.5 border-b border-line px-4 py-2">{children}</div>
}
