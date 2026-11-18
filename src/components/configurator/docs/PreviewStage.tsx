// The preview canvas every component and block page shares. It behaves like a
// design tool's canvas, not like a box in a document:
//
//  · It opens FITTED: whatever is on it, a button or a 1440 window, is whole on
//    screen. The canvas takes the page's height, so a tall modal has room.
//  · The zoom reads true pixels (100 % = 1:1). ⌘/Ctrl + wheel or a pinch zooms at
//    the pointer; + and − step; Shift+1 fits; Shift+2 goes to 100 %.
//  · Drag the empty canvas, or hold Space and drag anywhere, to pan. A plain wheel
//    pans only while the content overflows, and otherwise scrolls the page, so the
//    documentation under the canvas stays reachable.
//  · Expand gives the canvas the whole work area and keeps the right-hand panel.
//
// Scale is CSS `zoom` (crisp text, `--stage-zoom` for portaled layers) and the pan
// is `left` / `top`: a `transform` here would become the containing block of every
// fixed popover the specimen opens.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

export const STAGE_ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const MIN_ZOOM = STAGE_ZOOM_STEPS[0]
const MAX_ZOOM = STAGE_ZOOM_STEPS[STAGE_ZOOM_STEPS.length - 1]
/** Clear space around fitted content: at the sides, under the canvas's name, and above the tool bar. */
const FIT_PAD = 32
const NAME_ROOM = 44
const BAR_ROOM = 68
/** How much of the content a pan always leaves on screen. */
const PAN_KEEP = 72
/** How far the content's size may drift between zooms before it counts as a new layout. */
const MEASURE_TOLERANCE = 0.02
/** The strip under the canvas, and the shortest canvas worth drawing. */
const STATUS_H = 36
const MIN_STAGE_H = 420

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface StageControls {
  /** The scale on screen, in true pixels (1 = 100 %). */
  zoom: number
  /** True while the stage follows the canvas size. */
  fitted: boolean
  setZoom: (zoom: number) => void
  fit: () => void
  expanded: boolean
  toggleExpanded: () => void
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

/** A scroller inside the specimen (a phone's screen, a long list) keeps its own wheel until it reaches its end. */
function innerScrollerTakes(target: EventTarget | null, stop: Element, dx: number, dy: number): boolean {
  let el = target as Element | null
  while (el && el !== stop) {
    const style = getComputedStyle(el)
    if (dy && /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
    }
    if (dx && /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      if (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true
    }
    el = el.parentElement
  }
  return false
}

export function PreviewStage({
  rootRef, canvasClassName = '', canvasStyle, fitCap = 1, resetKey, contentWidth, contentMaxWidth, grid = true, title, ink = 'var(--fg)', bar, status, aside, children,
}: {
  /** What is on the canvas, named at its corner like a Figma frame. */
  title?: string
  /** The canvas's own ink: it paints the brand's appearance, which may not be the site's. */
  ink?: string
  /** The canvas element, for the inspector's hit-testing. */
  rootRef?: RefObject<HTMLDivElement | null>
  canvasClassName?: string
  canvasStyle?: CSSProperties
  /** The largest scale Fit uses: a button is not blown up to fill the canvas. */
  fitCap?: number
  /** A new value goes back to Fit and recentres (another block, frame or variant). */
  resetKey?: string
  /** The width the content is laid out at (a frame); omit to hug it. */
  contentWidth?: number
  /** The widest a hugging content may lay out before it wraps. */
  contentMaxWidth?: number
  /** The canvas's dot grid; off where the backdrop is part of the preview. */
  grid?: boolean
  bar: (controls: StageControls) => ReactNode
  /** The strip under the canvas: what is on it. */
  status?: ReactNode
  /** Mounted over the canvas, outside the zoomed content (dialogs, inspector layers). */
  aside?: ReactNode
  children: ReactNode
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [manual, setManual] = useState<number | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [expanded, setExpanded] = useState(false)
  const [expandedRect, setExpandedRect] = useState<CSSProperties | null>(null)
  const [pageHeight, setPageHeight] = useState(0)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  const hovered = useRef(false)

  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node
    if (rootRef) rootRef.current = node
  }, [rootRef])

  // The canvas takes the height of the scroll view it sits in, less the status strip.
  useLayoutEffect(() => {
    const scroller = shellRef.current?.closest('[data-stage-scroller]')
    if (!scroller) return
    const measure = () => setPageHeight(scroller.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The content's own size, read at scale 1 whatever the zoom on screen is. Read after every
  // commit as well as on resize: a new frame must fit in the same paint, not one observer later.
  const measureContent = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const current = parseFloat(el.style.zoom) || 1
    const rect = el.getBoundingClientRect()
    const w = rect.width / current
    const h = rect.height / current
    // Text measures a little differently at each zoom, and the fit follows this size: reacting to that
    // rounding made a Table re-fit itself forever. Only a real change of layout moves the fit.
    const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, a * MEASURE_TOLERANCE)
    setNatural((prev) => (same(prev.w, w) && same(prev.h, h) ? prev : { w, h }))
  }, [])
  useLayoutEffect(measureContent)
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(measureContent)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureContent])

  useEffect(() => { setManual(null); setPan({ x: 0, y: 0 }) }, [resetKey])

  const fitScale = view.w && natural.w
    ? clamp(Math.min(fitCap, (view.w - FIT_PAD * 2) / natural.w, (view.h - NAME_ROOM - BAR_ROOM) / natural.h), 0.05, fitCap)
    : fitCap
  const scale = manual ?? fitScale
  // Centred between the name and the tool bar while it fits, in the whole canvas once it does not.
  const barShift = natural.h * scale <= view.h - NAME_ROOM - BAR_ROOM + 1 ? (BAR_ROOM - NAME_ROOM) / 2 : 0
  // A drag may push the content almost off the canvas; a sliver always stays to grab.
  const limit = useCallback((next: { x: number; y: number }, at: number) => {
    const roomX = Math.max(0, (view.w + natural.w * at) / 2 - PAN_KEEP)
    const roomY = Math.max(0, (view.h + natural.h * at) / 2 - PAN_KEEP)
    return { x: clamp(next.x, -roomX, roomX), y: clamp(next.y, -roomY, roomY) }
  }, [natural, view])
  // The wheel only travels the overflow, then hands back to the page.
  const limitWheel = useCallback((next: { x: number; y: number }, at: number) => {
    const roomX = Math.max(0, (natural.w * at - view.w) / 2 + FIT_PAD)
    const roomY = Math.max(0, (natural.h * at - view.h) / 2 + FIT_PAD)
    return { x: clamp(next.x, -roomX, roomX), y: clamp(next.y, -roomY, roomY) }
  }, [natural, view])
  const left = Math.round((view.w - natural.w * scale) / 2 + pan.x)
  const top = Math.round((view.h - natural.h * scale) / 2 - barShift + pan.y)

  // Zooms keeping the point under `at` (viewport pixels from the canvas's centre) in place.
  const zoomAround = useCallback((nextRaw: number, at = { x: 0, y: 0 }) => {
    const next = clamp(nextRaw, MIN_ZOOM, MAX_ZOOM)
    const ratio = next / scale
    setManual(next)
    setPan((prev) => limit({ x: at.x - (at.x - prev.x) * ratio, y: at.y - (at.y - prev.y) * ratio }, next))
  }, [scale, limit])

  const fit = useCallback(() => { setManual(null); setPan({ x: 0, y: 0 }) }, [])
  const setZoom = useCallback((z: number) => zoomAround(z), [zoomAround])

  // The wheel has to be a native listener: React's is passive and cannot keep the page still.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const box = el.getBoundingClientRect()
        zoomAround(scale * Math.exp(-e.deltaY * 0.01), { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 })
        return
      }
      if (innerScrollerTakes(e.target, el, e.deltaX, e.deltaY)) return
      if (natural.w * scale <= view.w && natural.h * scale <= view.h) return
      const next = limitWheel({ x: pan.x - e.deltaX, y: pan.y - e.deltaY }, scale)
      // At the content's edge the wheel goes back to the page.
      if (next.x === pan.x && next.y === pan.y) return
      e.preventDefault()
      setPan(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scale, natural, view, pan, limitWheel, zoomAround])

  // Keys act on the canvas under the pointer, never while someone is typing.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) { setExpanded(false); return }
      if (!hovered.current || isTyping(e.target)) return
      if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); fit() }
      else if (e.shiftKey && e.code === 'Digit2') { e.preventDefault(); setZoom(1) }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(STAGE_ZOOM_STEPS.find((z) => z > scale + 0.001) ?? scale) }
      else if (e.key === '-') { e.preventDefault(); setZoom([...STAGE_ZOOM_STEPS].reverse().find((z) => z < scale - 0.001) ?? scale) }
    }
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [expanded, fit, setZoom, scale])

  // Expanded covers the work area: the left rail and the page header go, the top bar and the right-hand panel stay.
  useLayoutEffect(() => {
    if (!expanded) { setExpandedRect(null); return }
    const measure = () => {
      const main = shellRef.current?.closest('main')?.getBoundingClientRect()
      if (!main) return
      setExpandedRect({ position: 'fixed', zIndex: 40, left: 0, top: main.top, width: main.right, bottom: 0 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [expanded])

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const empty = target === viewportRef.current || target.hasAttribute('data-stage-backdrop')
    if (!(e.button === 1 || (e.button === 0 && (spaceHeld || empty)))) return
    if (target.closest('[role="toolbar"]')) return
    e.preventDefault()
    const from = { px: e.clientX, py: e.clientY, x: pan.x, y: pan.y }
    const node = e.currentTarget
    node.setPointerCapture(e.pointerId)
    setPanning(true)
    const move = (ev: PointerEvent) => setPan(limit({ x: from.x + ev.clientX - from.px, y: from.y + ev.clientY - from.py }, scale))
    const end = () => {
      setPanning(false)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', end)
      node.removeEventListener('pointercancel', end)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', end)
    node.addEventListener('pointercancel', end)
  }

  const height = Math.max(MIN_STAGE_H, pageHeight - STATUS_H)
  const dot = 20 * scale
  const dots: CSSProperties = grid
    ? {
        backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${ink} 16%, transparent) 1px, transparent 1.2px)`,
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${left}px ${top}px`,
      }
    : {}

  return (
    <div ref={shellRef} className="flex flex-col">
      {/* Holds the place in the page while the canvas is lifted out of it. */}
      <div style={{ height }}>
        <div
          ref={setViewportNode}
          data-preview-stage=""
          onPointerDown={startPan}
          onPointerEnter={() => { hovered.current = true }}
          onPointerLeave={() => { hovered.current = false; setSpaceHeld(false) }}
          className={`relative h-full touch-none overflow-hidden ${canvasClassName}`}
          style={{
            ...canvasStyle,
            ...dots,
            ...(expanded && expandedRect ? { ...expandedRect, height: 'auto' } : null),
            cursor: panning ? 'grabbing' : spaceHeld ? 'grab' : canvasStyle?.cursor,
          }}
        >
          {/* The empty canvas: something to pan by, and nothing for the inspector to select. */}
          <div data-stage-backdrop="" data-inspect-exempt="" className="absolute inset-0" aria-hidden />
          <div className="absolute" style={{ left, top, visibility: natural.w ? 'visible' : 'hidden' }}>
            <div
              ref={contentRef}
              data-escala-stage=""
              style={{
                zoom: scale,
                width: contentWidth ?? 'max-content',
                maxWidth: contentWidth ? undefined : contentMaxWidth,
                '--stage-zoom': scale,
              } as CSSProperties}
            >
              {children}
            </div>
          </div>
          {title && (
            <span data-inspect-exempt="" className="pointer-events-none absolute left-4 top-3 z-10 max-w-[60%] truncate text-caption font-medium" style={{ color: ink }}>
              {title}
            </span>
          )}
          {/* While Space is held the specimen must not take the drag. */}
          {spaceHeld && <div className="absolute inset-0 z-20" aria-hidden />}
          {aside}
          {bar({ zoom: scale, fitted: manual === null, setZoom, fit, expanded, toggleExpanded: () => setExpanded((v) => !v) })}
        </div>
      </div>
      {status && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line px-4 text-mini text-fg-faint" style={{ height: STATUS_H }}>
          {status}
        </div>
      )}
    </div>
  )
}
