// The wires of the variable map: an SVG layer over the map's own box that
// joins each primitive plate to the role and the role to every component
// that reads it, the way a Figma variables graph does. The layer owns no
// data — it measures the nodes marked `data-wire` inside the container and
// draws a cubic between each pair it is told about. Pinning a role draws the
// wires in (stroke travels source → target, primitives first, then the
// components in a short cascade); a hover preview only fades them in, so
// skimming the role list never replays the draw. Pointing at a node lights
// its wire and lets the others recede.

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'

export interface Wire {
  /** `data-wire` of the source and the target node. */
  from: string
  to: string
  /** Which cascade the wire belongs to: primitives arrive first. */
  stage: 'primitive' | 'component'
  /** Its place in the cascade, for the stagger. */
  index: number
}

interface Drawn extends Wire { d: string }

/** A cubic from the source's right edge to the target's left edge. When the
 *  target sits below instead, it leaves from the bottom and lands on top. */
function path(a: DOMRect, b: DOMRect, origin: DOMRect): string {
  const sideways = b.left >= a.right - 4
  if (sideways) {
    const x1 = a.right - origin.left
    const y1 = a.top + a.height / 2 - origin.top
    const x2 = b.left - origin.left
    const y2 = b.top + b.height / 2 - origin.top
    const dx = Math.max(20, (x2 - x1) * 0.5)
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
  }
  const x1 = a.left + a.width / 2 - origin.left
  const y1 = a.bottom - origin.top
  const x2 = b.left + b.width / 2 - origin.left
  const y2 = b.top - origin.top
  const dy = Math.max(12, (y2 - y1) * 0.5)
  return `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`
}

export default function MapWires({ containerRef, wires, lit, mode }: {
  containerRef: RefObject<HTMLElement | null>
  wires: readonly Wire[]
  /** The `data-wire` id of the node under the pointer, if any. */
  lit: string | null
  /** `draw` on a pin, `fade` on a hover preview. */
  mode: 'draw' | 'fade'
}) {
  const [drawn, setDrawn] = useState<Drawn[]>([])
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const measure = useCallback(() => {
    const root = containerRef.current
    if (!root) return
    const origin = root.getBoundingClientRect()
    const rect = (id: string) => root.querySelector<HTMLElement>(`[data-wire="${CSS.escape(id)}"]`)?.getBoundingClientRect()
    const next: Drawn[] = []
    for (const wire of wires) {
      const a = rect(wire.from)
      const b = rect(wire.to)
      if (!a || !b) continue
      next.push({ ...wire, d: path(a, b, origin) })
    }
    setDrawn(next)
    setSize({ w: origin.width, h: origin.height })
  }, [containerRef, wires])

  // Before paint, so a freshly pinned role never shows a frame of stale wires.
  useLayoutEffect(() => { measure() }, [measure])

  useEffect(() => {
    const root = containerRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(root)
    for (const node of root.querySelectorAll<HTMLElement>('[data-wire]')) ro.observe(node)
    return () => ro.disconnect()
  }, [containerRef, measure])

  if (!drawn.length) return null
  const anyLit = lit != null && drawn.some((w) => w.from === lit || w.to === lit)
  return (
    <svg
      aria-hidden
      className="map-wires pointer-events-none absolute inset-0 overflow-visible"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      {drawn.map((wire) => {
        const on = lit != null && (wire.from === lit || wire.to === lit)
        const delay = wire.stage === 'primitive' ? wire.index * 60 : 200 + wire.index * 40
        return (
          <path
            key={`${wire.from}>${wire.to}`}
            d={wire.d}
            pathLength={1}
            fill="none"
            vectorEffect="non-scaling-stroke"
            data-on={on ? 'true' : undefined}
            data-off={anyLit && !on ? 'true' : undefined}
            className={`map-wire ${mode === 'draw' ? 'map-wire-draw' : 'map-wire-fade'}`}
            style={{ animationDelay: `${delay}ms` }}
          />
        )
      })}
    </svg>
  )
}
