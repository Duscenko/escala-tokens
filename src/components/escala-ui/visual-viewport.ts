// The visible part of the page, for floating layers that must stay above a software keyboard (Sheet, the phone field's country list).
import * as React from 'react'

/**
 * The visible part of the page, in px: `window.visualViewport` shrinks when a software keyboard opens (the layout viewport
 * does not on iOS), so a bottom sheet capped at `100vh` would slide under it. `bottom` is how far the visible part ends
 * above the layout viewport's bottom edge (the keyboard's height). `null` before the first read and where there is no
 * visualViewport: the CSS falls back to `100dvh` and `0`.
 */
export function useVisualViewport(enabled = true): { height: number; bottom: number } | null {
  const [box, setBox] = React.useState<{ height: number; bottom: number } | null>(null)
  React.useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!enabled || !vv) return
    const read = () => setBox({ height: Math.round(vv.height), bottom: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) })
    read()
    vv.addEventListener('resize', read)
    vv.addEventListener('scroll', read)
    return () => { vv.removeEventListener('resize', read); vv.removeEventListener('scroll', read) }
  }, [enabled])
  return box
}

