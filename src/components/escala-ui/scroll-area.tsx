// Escala component: ScrollArea and ScrollBar — the Figma sets of the same names (design-plans/scroll-area-contract.md; 977:572 · 976:27), 1:1.
// A clipping viewport (Radix ScrollArea: the viewport joins the tab order and scrolls with the arrows, PageUp / PageDown, Home / End) with overlay
// ScrollBars 4px from its edge and an optional fade at the scroll end. Size and Appearance cascade to the bars; Orientation picks which bars exist.
// Give the viewport `aria-label` when it holds primary content. Appearance: recipes ScrollArea and ScrollBar (lib/componentRecipes.ts).
import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const SCROLL_AREA_SIZES = ['default', 'sm', 'lg'] as const
export type ScrollAreaSize = (typeof SCROLL_AREA_SIZES)[number]
export const SCROLL_AREA_ORIENTATIONS = ['vertical', 'horizontal', 'both'] as const
export type ScrollAreaOrientation = (typeof SCROLL_AREA_ORIENTATIONS)[number]
export const SCROLL_BAR_ORIENTATIONS = ['vertical', 'horizontal'] as const
export type ScrollBarOrientation = (typeof SCROLL_BAR_ORIENTATIONS)[number]
export const SCROLL_APPEARANCES = ['filled', 'ghost'] as const
export type ScrollAppearance = (typeof SCROLL_APPEARANCES)[number]

// The bars sit 4px from the OUTER edge; the root's 1px border is inside that, so the offsets give it back.
const GAP = 'calc(var(--spacing-gap-tight) - var(--stroke-control, 1px))'
const STEP = 'var(--spacing-gap-tight)'
const THICKNESS: Record<ScrollAreaSize, string> = { default: 'var(--spacing-2)', sm: 'var(--spacing-1_5)', lg: 'var(--spacing-3)' }

const ScrollAreaContext = React.createContext<{ size: ScrollAreaSize; appearance: ScrollAppearance; both: boolean }>({ size: 'default', appearance: 'filled', both: false })

export interface ScrollBarProps extends Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>, 'orientation'> {
  /** Figma Orientation. */
  orientation?: ScrollBarOrientation
  size?: ScrollAreaSize
  appearance?: ScrollAppearance
}

/** Figma ScrollBar: a track (filled) or nothing (ghost) with a thumb; decorative, the viewport carries the keyboard. */
function ScrollBar({ orientation = 'vertical', size, appearance, className, style, ...props }: ScrollBarProps) {
  const ctx = React.useContext(ScrollAreaContext)
  const s = size ?? ctx.size
  const vertical = orientation === 'vertical'
  // 4px from the edge; with both bars each leaves room (4 + thickness + 4) for the other.
  const far = ctx.both ? `calc(${GAP} + ${THICKNESS[s]} + ${STEP})` : GAP
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      aria-hidden
      data-slot="scroll-bar"
      data-escala="ScrollBar"
      data-size={s}
      data-orientation={orientation}
      data-appearance={appearance ?? ctx.appearance}
      className={cn('flex touch-none select-none', vertical ? 'flex-col' : 'flex-row', className)}
      style={vertical ? { top: GAP, right: GAP, bottom: far, left: 'auto', ...style } : { left: GAP, bottom: GAP, right: far, top: 'auto', ...style }}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-part="ScrollBar.thumb" className="relative" />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export interface ScrollAreaProps extends Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Root>, 'type'> {
  /** Figma Size: the bars' thickness 8 · 6 · 12. */
  size?: ScrollAreaSize
  /** Figma Orientation: which bars exist. */
  orientation?: ScrollAreaOrientation
  /** Figma Appearance: filled (a track) · ghost (the thumb alone). */
  appearance?: ScrollAppearance
  /** Figma FadeVisible: a 32px fade into the surface at the scroll end (it goes away once you reach it). */
  fadeVisible?: boolean
  /** The viewport's accessible name. */
  'aria-label'?: string
  /** Figma Content slot. */
  children?: React.ReactNode
}

function ScrollArea({ size = 'default', orientation = 'vertical', appearance = 'filled', fadeVisible = false, 'aria-label': label, className, children, ...props }: ScrollAreaProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [end, setEnd] = React.useState({ bottom: false, right: false })
  const vertical = orientation !== 'horizontal'
  const horizontal = orientation !== 'vertical'
  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    setEnd({ bottom: el.scrollHeight - el.scrollTop - el.clientHeight <= 1, right: el.scrollWidth - el.scrollLeft - el.clientWidth <= 1 })
  }, [])
  React.useEffect(() => {
    const el = ref.current
    if (!el || !fadeVisible) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [fadeVisible, measure])
  const ctx = React.useMemo(() => ({ size, appearance, both: orientation === 'both' }), [size, appearance, orientation])
  return (
    <ScrollAreaContext.Provider value={ctx}>
      <ScrollAreaPrimitive.Root
        type="always"
        data-slot="scroll-area"
        data-escala="ScrollArea"
        data-size={size}
        data-orientation={orientation}
        data-appearance={appearance}
        className={cn('relative overflow-hidden', className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport ref={ref} onScroll={fadeVisible ? measure : undefined} role={label ? 'region' : undefined} aria-label={label} tabIndex={0} className="size-full rounded-[inherit] outline-none [&>div]:!block">
          <div data-part="ScrollArea.content" className={cn('flex flex-col', horizontal ? 'w-max min-w-full' : 'w-full')}>{children}</div>
        </ScrollAreaPrimitive.Viewport>
        {fadeVisible && vertical && !end.bottom && (
          <span aria-hidden data-part="ScrollArea.fade" className="pointer-events-none absolute inset-x-0 bottom-0 h-8" style={{ background: 'linear-gradient(to bottom, transparent, var(--escala-paint))' }} />
        )}
        {fadeVisible && horizontal && !end.right && (
          <span aria-hidden data-part="ScrollArea.fade" className="pointer-events-none absolute inset-y-0 right-0 w-8" style={{ background: 'linear-gradient(to right, transparent, var(--escala-paint))' }} />
        )}
        {vertical && <ScrollBar orientation="vertical" />}
        {horizontal && <ScrollBar orientation="horizontal" />}
      </ScrollAreaPrimitive.Root>
    </ScrollAreaContext.Provider>
  )
}

/** A list row inside the viewport. */
function ScrollAreaRow({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-part="ScrollArea.row" className={cn('block', className)} {...props} />
}

export { ScrollArea, ScrollAreaRow, ScrollBar }
