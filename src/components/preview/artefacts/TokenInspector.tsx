// Inspector mode — point at something on the canvas, see which semantic roles
// paint it, click one to open its Token Details in the quick rail.
//
// It exists because the canvas and the rail were two lists you had to hold in
// your head at once: 64 roles on the left, a wall of components on the right,
// and nothing connecting them. The rail's shortlist fixed one half of that
// (fewer things to track); this fixes the other (ask the component instead of
// remembering).
//
// TWO PIECES, and the split is what keeps it layout-safe:
//  · `TokenInspector` stamps a `data-inspect` marker and renders NOTHING of
//    its own — `display: contents`, so it generates no box and cannot disturb
//    the grid, flex or `transform: scale()` the collage is built out of. While
//    inspector mode is off it renders the bare children, so the marker isn't
//    even in the DOM.
//  · `InspectorOverlay` is ONE fixed layer over the whole canvas that does the
//    hit-testing (a single delegated `pointermove`, not a listener per
//    specimen) and draws the highlight and the badge.
//
// The alternative — an outline on each wrapper — needs each wrapper to be a
// real box, which is exactly what re-flows a scaled 260px module inside a
// 156px frame. Measuring and drawing separately is what buys layout neutrality.
//
// THREE LEVELS OF ANSWER, because "which token is this?" is three different
// questions depending on what you point at:
//  1. **A control** → only the roles that control actually paints. Pointing at
//     one Solid button used to hand back all ten roles the Button SPECIMEN can
//     reach across its whole axis matrix, six of them belonging to variants
//     that aren't on screen. `inspectElement` measures the render instead, so
//     it answers with `action.primary.default` and `content.on-action`.
//  2. **The container around it** (a collage module) → the union of everything
//     inside, which is the question you're asking when you point at the box
//     rather than at one thing in it. Reachable by pointing at the module's
//     own padding or the gaps between its controls: a control is the finer
//     target and keeps precedence wherever the two overlap.
//  3. **A control INSIDE a pinned container** → the list stays put and the
//     rows for that control light up. That is the payoff of 2 — the union tells
//     you what the cluster costs, then moving across it attributes each role to
//     the thing that spends it, without the list you are reading being replaced
//     on every pointer move.
//
// Clicking PINS the badge (level 2 is unusable otherwise — the container's list
// would vanish the moment the pointer entered a child), and while pinned a
// click on the canvas is swallowed: in inspector mode a click means inspect, so
// it must not also drag the Slider or switch the TabMenu underneath.

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  inspectElement, inspectGroup, INSPECTOR_BLIND_SPOT, type InspectedRole,
} from '../../../lib/tokenInspector'
import type { PreviewTokens } from '../ButtonPreview'

const InspectorActiveContext = createContext(false)

export function InspectorModeProvider({ active, children }: { active: boolean; children: ReactNode }) {
  return <InspectorActiveContext.Provider value={active}>{children}</InspectorActiveContext.Provider>
}

/**
 * Marks a subtree as one catalogue component, for the overlay to hit-test.
 *
 * INERT WHEN OFF: returns the children untouched, so the collage's DOM with
 * inspector mode disabled is byte-identical to before this existed. That
 * matters more here than in most opt-in wrappers — this thing wraps every
 * specimen on the canvas, so "it costs nothing when unused" has to be
 * literally true rather than approximately true.
 */
export function TokenInspector({ component, children }: { component: string; children: ReactNode }) {
  const active = useContext(InspectorActiveContext)
  if (!active) return <>{children}</>
  return <span data-inspect={component} style={{ display: 'contents' }}>{children}</span>
}

/**
 * Attributes that turn an EXISTING container into a group target.
 *
 * Not a wrapper component, deliberately: the containers worth grouping (the
 * collage's module frames) already have a box of their own, and wrapping them
 * in a second one is the layout-disturbing move the header rejects. An
 * attribute costs nothing, and it's still absent while the mode is off.
 *
 * The container carries no LABEL — the badge derives one from the components it
 * actually holds (`inspectGroup`), so a module can't advertise a member it no
 * longer renders.
 */
export function inspectGroupAttrs(active: boolean): Record<string, string> {
  return active ? { 'data-inspect-group': '' } : {}
}

/** Whether inspector mode is on — for a container reaching for
 *  `inspectGroupAttrs`. */
export function useInspectorActive(): boolean {
  return useContext(InspectorActiveContext)
}

/**
 * A `display: contents` element has no box of its own, so `getBoundingClientRect`
 * on it returns zeros. The union of its children is the honest answer, and it's
 * also the right one for a specimen that renders siblings rather than one root.
 */
function rectOf(el: Element): DOMRect | null {
  const own = el.getBoundingClientRect()
  if (own.width || own.height) return own
  const kids = Array.from(el.children)
  if (!kids.length) return null
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const kid of kids) {
    const r = kid.getBoundingClientRect()
    if (!r.width && !r.height) continue
    left = Math.min(left, r.left); top = Math.min(top, r.top)
    right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
  }
  if (left === Infinity) return null
  return new DOMRect(left, top, right - left, bottom - top)
}

/** Checkerboard behind a translucent swatch — the same cue every other alpha
 *  surface in the app uses, so an 8-digit role can't read as a solid. */
const CHECKER: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#0000001a 25%,transparent 25%),linear-gradient(-45deg,#0000001a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#0000001a 75%),linear-gradient(-45deg,transparent 75%,#0000001a 75%)',
  backgroundSize: '6px 6px',
  backgroundPosition: '0 0,0 3px,3px -3px,-3px 0',
}

/** The Themes-hub view glyph left unreferenced when the Variables view was
 *  deleted — it is literally the variables mark, and this is the one action
 *  that leaves the canvas for that table. */
const VARIABLES_MASK = "url('/icons/theme-hub-icons/Icon/variables.svg') center / contain no-repeat"

interface Target {
  kind: 'component' | 'group'
  /** The marked element — identity for pin and containment checks. */
  el: Element
  label: string
  rect: DOMRect
  roles: InspectedRole[]
  /** `false` when the roles are the component's union rather than a
   *  measurement — the one case the blind-spot footnote applies to. */
  measured: boolean
  /** Group only: how many inspectable components are inside. */
  size?: number
}

/** The control being attributed inside a pinned group. */
interface FocusTarget {
  el: Element
  label: string
  rect: DOMRect
  ids: string[]
}

/** Gap between the highlighted element and the badge, and the badge's minimum
 *  inset from the viewport edge — one value, so the panel is never closer to
 *  the screen edge than it is to the thing it describes. */
const GAP = 8
/** Floor for the capped height, so pointing at something in a cramped corner
 *  still yields a usable (scrolling) panel rather than a sliver. */
const MIN_BADGE_H = 160

const SLOT_LABEL: Record<string, string> = { fill: 'fill', ink: 'ink', stroke: 'stroke' }

export function InspectorOverlay({
  active, rootRef, t, onPick, onOpenTable,
}: {
  active: boolean
  /** The scroll container the canvas paints into — hit-testing is scoped to it
   *  so the rail, the header and the chrome are never inspectable. */
  rootRef: React.RefObject<HTMLElement | null>
  t: PreviewTokens
  /** A role was chosen — open it in the quick rail. */
  onPick: (roleId: string) => void
  /** Leave the canvas for the full Semantics table. It takes ONE role because
   *  that is what the table can scroll to; the badge sends whichever row is in
   *  play (the lit control's first role, else the top of the list) rather than
   *  inventing a component-shaped destination the table doesn't have. */
  onOpenTable?: (roleId: string) => void
}) {
  const [hover, setHover] = useState<Target | null>(null)
  const [pin, setPin] = useState<Target | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  // Set while the pointer is inside the badge itself. Without it, reaching for
  // a role dismisses the badge on the way — the pointer leaves the specimen the
  // instant it crosses into the panel floating beside it.
  const overBadge = useRef(false)
  // Listeners are bound once per (active, t); they read the live pin/focus
  // through refs rather than being re-bound on every hover.
  const pinRef = useRef<Target | null>(null)
  const focusRef = useRef<FocusTarget | null>(null)
  const focusHeld = useRef(false)
  pinRef.current = pin
  focusRef.current = focus

  const clearAll = useCallback(() => {
    overBadge.current = false
    focusHeld.current = false
    setHover(null); setPin(null); setFocus(null)
  }, [])

  const buildComponent = useCallback((el: Element): Target | null => {
    const label = el.getAttribute('data-inspect') || ''
    const rect = rectOf(el)
    if (!rect) return null
    const { roles, measured } = inspectElement(t, label, el)
    return { kind: 'component', el, label, rect, roles, measured }
  }, [t])

  const buildGroup = useCallback((el: Element): Target | null => {
    const rect = rectOf(el)
    if (!rect) return null
    const { roles, members } = inspectGroup(t, el)
    if (!members.length) return null
    const unique = Array.from(new Set(members))
    return {
      kind: 'group', el, rect, roles, measured: true, size: members.length,
      // One kind of component in the box names itself; a mixed module has no
      // honest single name, so it reports how many it holds and lets the rows
      // (and the per-control highlight) say the rest.
      label: unique.length === 1 ? unique[0] : `${unique.length} components`,
    }
  }, [t])

  const buildFocus = useCallback((el: Element): FocusTarget | null => {
    const label = el.getAttribute('data-inspect') || ''
    const rect = rectOf(el)
    if (!rect) return null
    return { el, label, rect, ids: inspectElement(t, label, el).roles.map((role) => role.id) }
  }, [t])

  useEffect(() => {
    if (!active) { clearAll(); return }
    const root = rootRef.current
    if (!root) return

    const markers = (node: Element | null) => ({
      leaf: node?.closest?.('[data-inspect]') ?? null,
      group: node?.closest?.('[data-inspect-group]') ?? null,
    })

    const onMove = (e: PointerEvent) => {
      if (overBadge.current) return
      const { leaf, group } = markers(e.target as Element | null)
      const pinned = pinRef.current

      // A pinned group turns its own children into a highlight rather than a
      // new badge — level 3 in the header note.
      if (pinned?.kind === 'group' && leaf && pinned.el.contains(leaf)) {
        if (focusHeld.current) return
        const next = buildFocus(leaf)
        setFocus((prev) => (prev && prev.el === next?.el ? prev : next))
        return
      }
      // Pinned means "I'm working on this": hovering elsewhere no longer
      // re-targets, or the pin would just be a slower hover.
      if (pinned) return

      const target = leaf ? buildComponent(leaf) : group ? buildGroup(group) : null
      if (!target) { setHover(null); return }
      setHover((prev) =>
        prev && prev.el === target.el && prev.rect.top === target.rect.top && prev.rect.left === target.rect.left
          ? prev
          : target,
      )
    }

    // Swallowed in the capture phase so the specimen underneath never sees it:
    // the Slider drags from `pointerdown` and the TabMenu switches on `click`,
    // and neither should happen while you are pointing at them to read a token.
    const swallow = (e: Event) => {
      const { leaf, group } = markers(e.target as Element | null)
      if (leaf || group) e.stopPropagation()
    }

    const onClick = (e: MouseEvent) => {
      const { leaf, group } = markers(e.target as Element | null)
      if (!leaf && !group) { clearAll(); return }
      e.preventDefault()
      e.stopPropagation()
      const pinned = pinRef.current

      if (pinned?.kind === 'group' && leaf && pinned.el.contains(leaf)) {
        const next = buildFocus(leaf)
        if (!next) return
        // Clicking the held control again releases it back to following the
        // pointer, so the same gesture undoes itself.
        const releasing = focusHeld.current && focusRef.current?.el === next.el
        focusHeld.current = !releasing
        setFocus(next)
        return
      }

      const target = leaf ? buildComponent(leaf) : buildGroup(group!)
      if (!target) return
      if (pinned && pinned.el === target.el) { setPin(null); return }
      focusHeld.current = false
      setFocus(null)
      setPin(target)
      setHover(null)
    }

    const onLeave = () => { if (!overBadge.current && !pinRef.current) setHover(null) }
    // A scroll moves every rect at once; re-measuring mid-gesture would lag the
    // highlight behind the content, so the overlay just goes away — pin
    // included, since a pinned ring left behind would be pointing at whatever
    // scrolled into that spot.
    const onScroll = () => clearAll()

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerdown', swallow, true)
    root.addEventListener('click', onClick, true)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('scroll', onScroll, true)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerdown', swallow, true)
      root.removeEventListener('click', onClick, true)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('scroll', onScroll, true)
    }
  }, [active, rootRef, buildComponent, buildGroup, buildFocus, clearAll])

  // Escape unwinds one layer at a time — the held control, then the pin, then
  // the hover — the same "dismiss the transient thing first" order every other
  // overlay here follows. The mode itself is never left from here.
  const target = pin ?? hover
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (focusHeld.current) { focusHeld.current = false; setFocus(null); return }
      if (pinRef.current) { setPin(null); setFocus(null); return }
      overBadge.current = false
      setHover(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target])

  if (!active || !target) return null

  const { rect, roles, label, kind, measured } = target
  const lit = pin?.kind === 'group' && focus ? new Set(focus.ids) : null
  // 240px matches the rail it sends you to.
  const BADGE_W = 240
  // Placement is solved against the room that ACTUALLY exists, not a guessed
  // height — the badge is one row per role and a whole module reports dozens of
  // them, so a fixed estimate (this shipped at 180px first) puts the tail of a
  // long list off the bottom of the screen with no way to reach it. Same
  // measure-then-cap shape `usePopoverPlacement` uses for the colour pickers:
  // take the roomier side, cap `maxHeight` to it, and let the LIST scroll
  // inside a pinned header rather than letting the panel grow past the
  // viewport.
  const roomBelow = window.innerHeight - rect.bottom - GAP * 2
  const roomAbove = rect.top - GAP * 2
  const flip = roomAbove > roomBelow
  const top = flip ? Math.max(GAP, rect.top - GAP) : rect.bottom + GAP
  const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - BADGE_W - GAP)
  const maxHeight = Math.max(flip ? roomAbove : roomBelow, MIN_BADGE_H)
  const tableRole = focus?.ids[0] ?? roles[0]?.id

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* A group is the coarser target, so it gets the quieter ring — with a
          control lit inside it, two rings of equal weight would compete for
          the "this is what the badge is about" reading. */}
      <div
        className={`absolute rounded-[6px] ${kind === 'group' ? 'ring-1 ring-accent-solid/50' : 'ring-2 ring-accent-solid'}`}
        style={{
          left: rect.left - 2, top: rect.top - 2,
          width: rect.width + 4, height: rect.height + 4,
          background: `color-mix(in srgb, var(--accent-solid) ${kind === 'group' ? 4 : 8}%, transparent)`,
        }}
      />
      {focus && (
        <div
          className="absolute rounded-[6px] ring-2 ring-accent-solid"
          style={{
            left: focus.rect.left - 2, top: focus.rect.top - 2,
            width: focus.rect.width + 4, height: focus.rect.height + 4,
            background: 'color-mix(in srgb, var(--accent-solid) 10%, transparent)',
          }}
        />
      )}
      <div
        className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-line bg-rail-section shadow-lg"
        style={{ left, top, width: BADGE_W, maxHeight, transform: flip ? 'translateY(-100%)' : undefined }}
        onPointerEnter={() => { overBadge.current = true }}
        onPointerLeave={() => { overBadge.current = false; if (!pin) setHover(null) }}
      >
        {/* Pinned: the component's NAME is what tells you the badge changed
            when you move between two specimens, so it must not be the thing
            that scrolls away. */}
        <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-caption font-medium text-fg">{label}</span>
          {onOpenTable && tableRole && (
            <button
              type="button"
              onClick={() => { clearAll(); onOpenTable(tableRole) }}
              title={`Open ${tableRole} in the Variables table`}
              aria-label={`Open ${tableRole} in the Variables table`}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <span aria-hidden className="h-3.5 w-3.5 bg-current" style={{ WebkitMask: VARIABLES_MASK, mask: VARIABLES_MASK }} />
            </button>
          )}
          <span className="flex-shrink-0 text-micro tabular-nums text-fg-faint">{roles.length}</span>
          {pin && (
            <button
              type="button"
              onClick={clearAll}
              title="Close"
              aria-label="Close"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {/* The one line that says what the pinned union is FOR: point at a
            control and its rows light up. Without it, level 3 is a feature you
            have to stumble into. */}
        {pin?.kind === 'group' && (
          <p className="m-0 flex-shrink-0 border-b border-line/60 px-3 py-1.5 text-nano text-fg-faint">
            {focus
              ? `${focus.label} — ${focus.ids.length} of ${roles.length} lit`
              : `${pin.size} components. Point at one to light its roles.`}
          </p>
        )}
        {roles.length === 0 ? (
          <p className="m-0 px-3 py-2.5 text-mini text-fg-faint">
            No mapped roles. {INSPECTOR_BLIND_SPOT}
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
            {roles.map((role) => {
              const isLit = lit?.has(role.id) ?? false
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => { clearAll(); onPick(role.id) }}
                    className={`flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                      isLit
                        ? 'bg-accent-ui/10 ring-1 ring-inset ring-accent-ui/40'
                        : `hover:bg-surface ${lit ? 'opacity-45' : ''}`
                    }`}
                  >
                    <span
                      className="h-4 w-4 flex-shrink-0 overflow-hidden rounded ring-1 ring-black/10 dark:ring-white/15"
                      style={role.css.length > 7 ? CHECKER : undefined}
                      aria-hidden
                    >
                      <span className="block h-full w-full" style={{ background: role.css }} />
                    </span>
                    <span className={`min-w-0 flex-1 truncate font-mono text-mini ${isLit ? 'text-fg' : 'text-fg-muted'}`}>{role.id}</span>
                    {role.where && (
                      <span className="flex-shrink-0 text-nano text-fg-faint">{SLOT_LABEL[role.where]}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {/* Only the union can under-report; a measured list is what the element
            actually paints. */}
        {!measured && roles.length > 0 && (
          <p className="m-0 flex-shrink-0 border-t border-line/60 px-3 py-1.5 text-nano text-fg-faint">
            Every role this component can use. {INSPECTOR_BLIND_SPOT}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
