// COLOUR SPOTLIGHT — which parts of a rendered component paint with a colour.
// The board's "On the board" view of the colour map lights them in place
// (design-plans/color-role-map.md, phase 5). Pure: it reads a component's
// trace (`tokenTrace`, the inspector's own source — the recipe), never the DOM.

import type { ElementTrace } from './tokenTrace'

export interface LitSlot {
  slot: string
  /** The colour's roles this slot reads, in the recipe's order. A trace of
   *  the resting render (`traceElement`) carries no state rows; when a trace
   *  does, a state's role counts (a hover fill is still where the colour
   *  lands) and keeps its state. */
  roles: { id: string; state?: string }[]
}

/** The slots of a traced component that read any of `roleIds`. */
export function litSlots(trace: ElementTrace, roleIds: ReadonlySet<string>): LitSlot[] {
  const out: LitSlot[] = []
  for (const slot of trace.slots) {
    const seen = new Set<string>()
    const roles: LitSlot['roles'] = []
    for (const row of slot.rows) {
      if (row.kind !== 'color' || !row.ref.startsWith('color.')) continue
      const id = row.ref.slice('color.'.length)
      if (!roleIds.has(id)) continue
      const key = `${id}|${row.state ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      roles.push(row.state ? { id, state: row.state } : { id })
    }
    if (roles.length) out.push({ slot: slot.slot, roles })
  }
  return out
}

export interface SpotRect { x: number; y: number; w: number; h: number; r: number }

/** Drop every rect that sits inside another: the outer one already shows it,
 *  and one outline per lit part keeps the board readable. */
export function outermostRects<T extends SpotRect>(rects: readonly T[]): T[] {
  const inside = (a: SpotRect, b: SpotRect) =>
    a !== b && a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5
  return rects.filter((a, i) => !rects.some((b, j) => j !== i && inside(a, b) && !(inside(b, a) && j > i)))
}

/** The scrim's mask: white (scrim shown) everywhere but a black rounded
 *  hole per rect, as a CSS `mask-image`. A mask, not an even-odd clip: holes
 *  UNION, so two parts that overlap without one containing the other (a card
 *  and the component filling it, a few pixels apart) still both read clear —
 *  in an even-odd path their overlap filled back in. */
export function holesMask(width: number, height: number, rects: readonly SpotRect[]): string {
  const f = (n: number) => Math.round(n * 10) / 10
  const holes = rects.map(({ x, y, w, h, r }) => {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2))
    return `<rect x='${f(x)}' y='${f(y)}' width='${f(w)}' height='${f(h)}' rx='${f(radius)}' fill='black'/>`
  }).join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${f(width)}' height='${f(height)}' viewBox='0 0 ${f(width)} ${f(height)}'>`
    + `<rect width='100%' height='100%' fill='white'/>${holes}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
