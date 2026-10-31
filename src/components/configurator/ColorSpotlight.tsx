// The colour map, ON THE BOARD: every part of the real bento board that paints
// with the mapped colour stays sharp, with a selection outline; everything
// else recedes behind one blurred, page-tinted scrim. Pointing at a lit part
// draws a leader line to a callout naming its roles (design-plans/
// color-role-map.md, phase 5 — the focus pull studied on token-galaxy).
//
// It reads nothing new: each `[data-escala]` component is traced through its
// recipe (`traceElement`, the inspector's source) and `litSlots` keeps the
// slots that read the colour's roles. The overlay is a SIBLING of the board,
// never inside it, so the board's own mutation watch never sees it.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { traceElement } from '../../lib/tokenTrace'
import { holesMask, litSlots, outermostRects, type LitSlot, type SpotRect } from '../../lib/colorSpotlight'
import { COMPONENTS } from '../../lib/componentCatalogue'
import type { PreviewTokens } from '../preview/ButtonPreview'

/** The app's strong ease-out — Emil's curve, the one the chrome already uses. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const
const CARD_W = 288
/** How long the board takes to settle after it mounts (its tiles measure
 *  and scale themselves); the spotlight waits for it. */
const SETTLE_MS = 280
const GAP = 28

export interface SpotlightRole { label: string; css: string }

interface Spot extends SpotRect {
  id: string
  component: string
  roles: LitSlot['roles']
}

export default function ColorSpotlight({ rootRef, tokens, roleIds, roleInfo, veil }: {
  /** The board's content — measured, never written to. */
  rootRef: RefObject<HTMLElement | null>
  /** The board's tokens in the appearance on screen, for the trace. */
  tokens: PreviewTokens
  /** The colour's roles — narrowed by the map's focus (a ramp step). */
  roleIds: ReadonlySet<string>
  /** Role id → its primitive (`accent.8`) and colour, for the callout. */
  roleInfo: ReadonlyMap<string, SpotlightRole>
  /** The page colour the scrim is tinted with. */
  veil: string
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [spots, setSpots] = useState<Spot[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  // The board lays itself out after it mounts (scaled tiles measure, then
  // settle): spotlighting before that drew outlines where parts WERE a frame
  // ago. The spotlight comes in once the board has had that time.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), SETTLE_MS)
    return () => window.clearTimeout(id)
  }, [])
  // The callout fades in once; moving to the next lit part is instant
  // (a tooltip already open skips its delay and its animation).
  const [instant, setInstant] = useState(false)

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const box = root.getBoundingClientRect()
    const out: Spot[] = []
    const seen = new Set<Element>()
    for (const el of root.querySelectorAll('[data-escala]')) {
      const trace = traceElement(tokens, el)
      if (!trace) continue
      const key = el.getAttribute('data-escala') ?? ''
      for (const lit of litSlots(trace, roleIds)) {
        const node = lit.slot === trace.slots[0]?.slot
          ? el
          : el.querySelector(`[data-part="${CSS.escape(`${key}.${lit.slot}`)}"]`) ?? el
        const rect = node.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) continue
        if (seen.has(node)) {
          // Two slots resolved to one node (no part of its own): one spot.
          const spot = out.find((s) => s.id === spotId(node))
          if (spot) spot.roles.push(...lit.roles.filter((r) => !spot.roles.some((x) => x.id === r.id)))
          continue
        }
        seen.add(node)
        // The radius is in the node's own px; tiles are scaled photographs.
        const own = (node as HTMLElement).offsetWidth || rect.width
        const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0
        out.push({
          id: spotId(node),
          component: COMPONENTS.find((c) => c.key === trace.component)?.label ?? trace.component,
          roles: [...lit.roles],
          x: rect.left - box.left,
          y: rect.top - box.top,
          w: rect.width,
          h: rect.height,
          r: radius * (rect.width / own),
        })
      }
    }
    setSpots(out)
    setSize({ w: box.width, h: box.height })
  }, [rootRef, tokens, roleIds])

  // Before paint: a new focus never shows a frame of the old holes.
  useLayoutEffect(() => { measure() }, [measure])

  // The board settles after mount (scaled tiles measure themselves) and
  // repaints on every edit: watch its size and its DOM, one measure a frame.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    const mo = new MutationObserver(schedule)
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'data-state'] })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [rootRef, measure])

  // Hit-testing on the board's own events: the overlay takes no pointer, so
  // the board stays live underneath. The smallest lit part under the
  // pointer wins (a label inside its button).
  useEffect(() => {
    const host = rootRef.current?.parentElement
    if (!host) return
    const onMove = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const box = root.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      const hit = spots
        .filter((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h)
        .sort((a, b) => a.w * a.h - b.w * b.h)[0]
      const next = hit?.id ?? null
      if (next === hoverRef.current) return
      setInstant(hoverRef.current != null && next != null)
      hoverRef.current = next
      setHover(next)
    }
    const onLeave = () => { hoverRef.current = null; setHover(null); setInstant(false) }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [rootRef, spots])

  // Every lit part cuts its hole (a mask unions them); only the outermost
  // get an outline, so a label inside its lit button is not boxed twice.
  const holes = outermostRects(spots).map((s) => pad(s, 3))
  const mask = holesMask(size.w, size.h, spots.map((s) => pad(s, 3)))
  const hovered = spots.find((s) => s.id === hover) ?? null
  if (!size.w || !settled) return null

  // The callout sits beside the part — right if it fits, else left — at the
  // part's middle, kept inside the board.
  const card = hovered ? (() => {
    const right = hovered.x + hovered.w + GAP + CARD_W <= size.w
    const x = right ? hovered.x + hovered.w + GAP : Math.max(0, hovered.x - GAP - CARD_W)
    const height = 44 + hovered.roles.length * 22
    const y = Math.min(Math.max(0, hovered.y + hovered.h / 2 - height / 2), Math.max(0, size.h - height))
    return { x, y, right, height }
  })() : null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {/* The scrim: the board minus a hole per lit part (a luminance mask —
          white shows the scrim, black cuts it). Blur is the focus
          pull; reduced motion keeps only the dim (it is a state, not motion,
          but blur is the costly half and adds nothing a dim does not say). */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, ease: EASE_OUT }}
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskMode: 'luminance',
          background: `color-mix(in srgb, ${veil} 62%, transparent)`,
          backdropFilter: reduce ? undefined : 'blur(3px) saturate(0.5)',
          WebkitBackdropFilter: reduce ? undefined : 'blur(3px) saturate(0.5)',
        }}
      />

      {/* Nothing lit is an answer too (a pressed state, a role no part on
          this board reads at rest) — say so, or the bare scrim reads broken. */}
      <AnimatePresence>
        {spots.length === 0 && (
          <motion.p
            key="none"
            className="sticky top-4 mx-auto mt-4 w-fit rounded-full border border-line bg-elevated/95 px-3 py-1.5 text-caption text-fg-muted shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
          >
            {t('Nothing on this board paints with these roles at rest.')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* A selection outline over each hole, with Figma's corner handles. */}
      <AnimatePresence>
        {holes.map((h, i) => (
          <motion.div
            key={h.id}
            className="absolute rounded-[inherit]"
            style={{ left: h.x, top: h.y, width: h.w, height: h.h, borderRadius: h.r, transformOrigin: 'center' }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.98)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
            transition={{ duration: 0.22, ease: EASE_OUT, delay: Math.min(i * 0.025, 0.3) }}
          >
            <span
              className={`absolute inset-0 rounded-[inherit] transition-[box-shadow] duration-150 ${
                hovered && overlaps(hovered, h) ? 'ring-2 ring-accent-ui' : 'ring-1 ring-accent-ui/80'
              }`}
            />
            {CORNERS.map((c) => (
              <span key={c} className={`absolute h-[5px] w-[5px] border border-accent-ui bg-app ${c}`} />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Pointing at a lit part: a leader line out to its roles. */}
      <AnimatePresence>
        {hovered && card && (
          <motion.div
            key="callout"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: instant || reduce ? 0 : 0.15, ease: EASE_OUT }}
          >
            <svg className="absolute inset-0 overflow-visible" width={size.w} height={size.h}>
              <line
                x1={card.right ? hovered.x + hovered.w + 3 : hovered.x - 3}
                y1={hovered.y + hovered.h / 2}
                x2={card.right ? card.x : card.x + CARD_W}
                y2={card.y + card.height / 2}
                stroke="var(--accent-ui)"
                strokeWidth={1}
              />
              <circle cx={card.right ? hovered.x + hovered.w + 3 : hovered.x - 3} cy={hovered.y + hovered.h / 2} r={2.5} fill="var(--accent-ui)" />
            </svg>
            <div
              className="absolute flex flex-col gap-1.5 rounded-xl border border-accent-ui/60 bg-elevated/95 p-2.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-sm"
              style={{ left: card.x, top: card.y, width: CARD_W }}
            >
              <p className="truncate text-caption font-medium text-fg">{hovered.component}</p>
              <ul className="flex flex-col gap-1">
                {hovered.roles.map((role) => {
                  const info = roleInfo.get(role.id)
                  return (
                    <li key={`${role.id}|${role.state ?? ''}`} className="flex min-w-0 items-center gap-1.5 text-micro">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px] ring-1 ring-inset ring-fg/15" style={{ background: info?.css }} />
                      <span className="min-w-0 flex-1 truncate font-mono text-fg">{role.id}</span>
                      {role.state && <span className="text-fg-faint">{role.state}</span>}
                      {info && <span className="flex-shrink-0 font-mono text-fg-faint">{info.label}</span>}
                    </li>
                  )
                })}
              </ul>
              {hovered.roles.length === 0 && <p className="text-micro text-fg-faint">{t('No role reads it')}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const CORNERS = [
  '-left-[3px] -top-[3px]',
  '-right-[3px] -top-[3px]',
  '-left-[3px] -bottom-[3px]',
  '-right-[3px] -bottom-[3px]',
]

/** A stable id for a lit node, for keys and hover. */
const ids = new WeakMap<Element, string>()
let next = 0
function spotId(node: Element): string {
  let id = ids.get(node)
  if (!id) { id = `spot-${++next}`; ids.set(node, id) }
  return id
}

function pad<T extends Spot>(s: T, by: number): T {
  return { ...s, x: s.x - by, y: s.y - by, w: s.w + by * 2, h: s.h + by * 2, r: s.r ? s.r + by : by }
}

function overlaps(a: SpotRect, b: SpotRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
