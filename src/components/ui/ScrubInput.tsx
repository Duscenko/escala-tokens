// The token tables' value field, with a Figma-style scrub handle: drag the
// glyph left/right and the number follows. Typing still works exactly as
// before — this is an affordance ON a text input, not a replacement for it,
// which is what keeps a value like `9999px` or `0 1px 2px rgba(…)` editable.
//
// Why a handle and not "drag anywhere on the field": the field is a text input.
// Dragging across text means selecting text, and hijacking that would break
// click-to-place-caret and double-click-to-select-word — the two things people
// actually do in these cells. Figma splits it the same way (drag the label,
// type in the field), so the handle is both the affordance and the hit target.

import { useRef, useState } from 'react'

/** Number + optional unit, and NOTHING else — `12`, `4px`, `1.5rem`, `100%`.
 *  Deliberately strict: a compound CSS value (`0 1px 2px rgba(10,13,18,0.05)`)
 *  has no single number to scrub, and a font family has none at all. Those keep
 *  a plain input rather than getting a handle that would have to guess which
 *  number it owns. The check is on the VALUE, so no table has to declare which
 *  of its rows are numeric — a section can't drift from its own data. */
const NUMERIC_RE = /^(-?\d*\.?\d+)([a-z%]*)$/i

type Parsed = { n: number; unit: string }

export function parseNumeric(value: string): Parsed | null {
  const m = value.trim().match(NUMERIC_RE)
  if (!m) return null
  const n = parseFloat(m[1])
  return Number.isFinite(n) ? { n, unit: m[2] ?? '' } : null
}

export const isScrubbable = (value: string): boolean => parseNumeric(value) !== null

/** Step per pixel of drag, by unit. `rem`/`em` move in tenths because 1rem is a
 *  whole type step — dragging one would blow past every value worth landing on. */
function stepFor(unit: string): number {
  const u = unit.toLowerCase()
  if (u === 'rem' || u === 'em') return 0.1
  return 1
}

/** Trims float noise (0.30000000000000004) without forcing decimals on integers. */
const format = (n: number, unit: string) => `${Math.round(n * 1000) / 1000}${unit}`

export default function ScrubInput({
  value,
  onChange,
  ariaLabel,
  mono = true,
  reserveHandle,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel?: string
  mono?: boolean
  /** Force the handle's slot to exist even when THIS value isn't numeric, so a
   *  group with mixed rows keeps every input on the same x. Undefined = the slot
   *  exists only when there's a handle to put in it. */
  reserveHandle?: boolean
}) {
  const parsed = parseNumeric(value)
  const [dragging, setDragging] = useState(false)
  // Drag origin. Kept in a ref, not state: it's read on every pointermove and
  // must not trigger a render of its own.
  const origin = useRef<{ x: number; n: number; unit: string; clamp: boolean } | null>(null)

  const showSlot = reserveHandle ?? !!parsed

  const commit = (next: number) => {
    const o = origin.current
    if (!o) return
    onChange(format(o.clamp ? Math.max(0, next) : next, o.unit))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!parsed) return
    e.preventDefault()
    // Clamp at zero only when the value STARTED non-negative. Every token in
    // these tables (spacing, radius, sizes, grid) is non-negative and a
    // negative one is invalid CSS, but inferring it from the value keeps this
    // component honest if it's ever pointed at something that can go below 0.
    origin.current = { x: e.clientX, n: parsed.n, unit: parsed.unit, clamp: parsed.n >= 0 }
    setDragging(true)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    // Pointer capture rather than window listeners: the handle keeps receiving
    // moves once the cursor leaves it, which it does immediately — the whole
    // gesture is horizontal and the handle is ~14px wide. Best-effort and
    // AFTER the state above: it throws on a pointerId the browser no longer
    // considers active, and a throw here would abort the handler and leave the
    // drag half-armed (no origin, body cursor never restored).
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* drag still works over the handle */ }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const o = origin.current
    if (!o) return
    // Figma's modifiers: Shift coarse, Alt fine.
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    // Round the TRAVEL to whole pixels, then price each pixel at one step.
    // `clientX` is fractional on a scaled/HiDPI display, and unrounded that
    // leaks straight into the token — an early drag here produced `101.668px`
    // for what should be a whole-pixel spacing step. Quantising the travel
    // (rather than snapping the RESULT to absolute multiples) is also what
    // keeps Shift honest: it moves in 10s from wherever the value started,
    // instead of jumping to the nearest multiple of 10 the moment it's held.
    const travelled = Math.round(e.clientX - o.x)
    commit(o.n + travelled * stepFor(o.unit) * mult)
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!origin.current) return
    origin.current = null
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // The keyboard path to the same capability. The drag is pointer-only, so
  // without this the handle would be an affordance no keyboard user can reach;
  // arrows on the input itself is both the standard spinner behaviour and what
  // Figma's fields do.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    if (!parsed) return
    e.preventDefault()
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * stepFor(parsed.unit) * mult
    const next = parsed.n + delta
    onChange(format(parsed.n >= 0 ? Math.max(0, next) : next, parsed.unit))
  }

  return (
    <div className="flex items-center gap-1 w-full min-w-0">
      {showSlot && (
        <span className="w-3.5 flex-shrink-0 flex items-center justify-center">
          {parsed && (
            <span
              role="presentation"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              title="Drag to change · Shift ×10 · Alt ×0.1"
              className={`cursor-ew-resize touch-none transition-colors ${
                dragging ? 'text-accent-ui' : 'text-fg-faint hover:text-fg'
              }`}
            >
              {/* The double-chevron reads as "this moves horizontally" at 11px,
                  where a full arrow with a shaft turns to mush. */}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 3 1.5 6 4 9M8 3l2.5 3L8 9" />
              </svg>
            </span>
          )}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        className={`w-full min-w-0 bg-app text-[13px] ${mono ? 'font-mono' : ''} text-fg rounded-md border border-transparent hover:border-line focus:border-fg px-2 py-1 outline-none transition-colors`}
      />
    </div>
  )
}
