import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  desktopArtefactWidthPx,
  extractBreakpoints,
  resolveGridFrame,
  type GridViewport,
} from '../../../lib/layoutTokens'
import { radiusRoleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

/** Widest a mobile frame is allowed to get. Phones top out around here (a Pro
 *  Max is 430pt), and past it the frame stops reading as a phone and starts
 *  reading as a narrow desktop window. It is a CAP, not a target — in the 400px
 *  aside the column is always the binding constraint. */
const MOBILE_MAX = 420

/** Width the compact carousel photographs a mobile artefact at — a real phone
 *  width, independent of the panel. Tablet photographs at iPad portrait.
 *  Desktop photographs at `desktopArtefactWidthPx`. */
export const MOBILE_ARTEFACT_SOURCE = 375
export const TABLET_ARTEFACT_SOURCE = 768

function platformCaption(platform: GridViewport): string {
  return platform === 'mobile' ? 'Mobile' : platform === 'tablet' ? 'Tablet' : 'Desktop'
}

/** CSS px the artefact lays out at BEFORE any photograph-scale. Mobile is the
 *  phone source; tablet is iPad portrait; desktop is the grid container. */
export function artefactSourceWidth(t: PreviewTokens): number {
  const platform: GridViewport = t.previewPlatform ?? 'desktop'
  if (platform === 'mobile') return MOBILE_ARTEFACT_SOURCE
  if (platform === 'tablet') return TABLET_ARTEFACT_SOURCE
  const bps = extractBreakpoints(t.grid)
  const frame = resolveGridFrame('desktop', t.gridFrame, t.spacing, bps)
  return desktopArtefactWidthPx(frame, bps, t.breakpointRoles?.desktop ?? 'md')
}

/** Outer board for Theme Preview collage / Variables specimens. Uses the
 *  PLATFORM grid frame (columns + page margin) without claiming true-size
 *  type — ScaledModule photographs already ran at their own source width. */
export function PlatformBoard({
  t, children, fit = 'viewport',
}: {
  t: PreviewTokens
  children: ReactNode
  /** `viewport` caps to the phone / desktop container. `fill` only applies
   *  the page margin — the Variables aside is ~20rem, not a 1280px canvas. */
  fit?: 'viewport' | 'fill'
}) {
  const platform: GridViewport = t.previewPlatform ?? 'desktop'
  const bps = extractBreakpoints(t.grid)
  const frame = resolveGridFrame(platform, t.gridFrame, t.spacing, bps)
  const isMobile = platform === 'mobile'
  const isTablet = platform === 'tablet'
  const desktopWidth = desktopArtefactWidthPx(frame, bps, t.breakpointRoles?.desktop ?? 'md')
  const maxWidth = fit === 'fill' ? undefined : (isMobile ? MOBILE_MAX : isTablet ? TABLET_ARTEFACT_SOURCE : desktopWidth)

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div
        style={{
          width: '100%',
          maxWidth,
          margin: '0 auto',
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          borderRadius: radiusRoleOf(t, 'container', '16px'),
          padding: frame.margin,
          // Specimens (collage elevation, Variables cards) paint past the
          // content box; clipping would hide the shadow this board exists to
          // frame.
          overflow: 'visible',
        }}
      >
        {children}
      </div>
      <p className="text-mini text-fg-faint text-center tabular-nums">
        {platformCaption(platform)} · {frame.columns} col · page margin {frame.margin} from Grid
      </p>
    </div>
  )
}

/** Photograph `DeviceFrame` at the PLATFORM's true width, then `scale()` it
 *  into the canvas. Theme Preview is ~500px; a 1280 desktop board must not
 *  re-flow the collage into three columns and call that desktop. */
export function ScaledPlatformBoard({
  t, children,
}: {
  t: PreviewTokens
  children: ReactNode
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [hostW, setHostW] = useState(0)
  const [naturalH, setNaturalH] = useState<number | null>(null)
  const sourceWidth = artefactSourceWidth(t)
  const scale = hostW > 0 ? Math.min(1, hostW / sourceWidth) : 0
  const platform: GridViewport = t.previewPlatform ?? 'desktop'
  const bps = extractBreakpoints(t.grid)
  const frame = resolveGridFrame(platform, t.gridFrame, t.spacing, bps)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setHostW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const read = () => {
      const h = el.offsetHeight
      if (h) setNaturalH(h)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sourceWidth])

  return (
    <div ref={hostRef} className="flex flex-col gap-2 min-w-0 w-full">
      <div
        className="mx-auto overflow-hidden"
        style={{
          width: scale ? sourceWidth * scale : '100%',
          height: naturalH != null && scale ? naturalH * scale : undefined,
          opacity: naturalH != null && scale ? 1 : 0,
          borderRadius: (parseFloat(radiusRoleOf(t, 'container', '16px')) || 0) * (scale || 1),
        }}
      >
        <div
          ref={measureRef}
          style={{
            width: sourceWidth,
            transform: scale ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
          }}
        >
          <DeviceFrame t={t} compact>{children}</DeviceFrame>
        </div>
      </div>
      <p className="text-mini text-fg-faint text-center tabular-nums">
        {platformCaption(platform)} · {frame.columns} col · page margin {frame.margin} from Grid
      </p>
    </div>
  )
}

/** Photograph a `DeviceFrame` down to `targetWidth` without re-flow. Theme
 *  Preview's mobile collage uses several of these in a row so Live / Inspector
 *  still hit the specimens (no expand overlay). */
export function ScaledDeviceFrame({
  t, targetWidth, children,
}: {
  t: PreviewTokens
  targetWidth: number
  children: ReactNode
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [naturalH, setNaturalH] = useState<number | null>(null)
  const sourceWidth = artefactSourceWidth(t)
  const scale = targetWidth / sourceWidth
  const frameRadius = (parseFloat(radiusRoleOf(t, 'container', '16px')) || 0) * scale

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const read = () => {
      const h = el.offsetHeight
      if (h) setNaturalH(h)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sourceWidth])

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: targetWidth,
        height: naturalH != null ? naturalH * scale : undefined,
        opacity: naturalH != null ? 1 : 0,
        borderRadius: frameRadius,
      }}
    >
      <div
        ref={measureRef}
        style={{ width: sourceWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <DeviceFrame t={t} compact>{children}</DeviceFrame>
      </div>
    </div>
  )
}

/**
 * The artefact's viewport — a plain rounded rectangle, painted in the system's
 * own page surface, radius and border. No notch, no status bar, no simulated
 * hardware: every pixel of invented device chrome is a pixel that isn't a token,
 * competing for attention in a panel whose entire job is showing you tokens.
 *
 * **This component itself never re-flows to fit a size.** Mobile lays out at
 * 100% of its immediate container (capped at `MOBILE_MAX`). Desktop lays out
 * at the grid container's px — a fixed width, so type and control heights are
 * computed at the desktop cut rather than squeezed into the aside. A 16px
 * label stays 16px; a narrow column that couldn't hold the frame scrolls.
 * `GridPreview` reaches the opposite conclusion for the right reason: it draws
 * a layout DIAGRAM, whose percentage insets stay a true scale model at any
 * size — an artefact contains type, which has no percentage equivalent.
 *
 * A CALLER may still shrink the whole rendered result for display — the
 * carousel's `ScaledArtefactCard` does, via a CSS `transform: scale()` applied
 * AFTER this component has already laid out at its one true scale. That's a
 * photograph of the real thing at a smaller size, not a re-flow, and it's the
 * `compact` prop's only job: swap the caption so a shrunk photo doesn't claim
 * to be "true size."
 *
 * The page inset is the system's OWN grid margin for the previewed platform
 * (`resolveGridFrame`), not a number chosen here — so flipping PLATFORM, or
 * editing Grid · Mobile / Desktop, visibly moves the screen.
 */
export function DeviceFrame({
  t, children, compact = false,
}: {
  t: PreviewTokens
  children: ReactNode
  compact?: boolean
}) {
  const platform: GridViewport = t.previewPlatform ?? 'desktop'
  const bps = extractBreakpoints(t.grid)
  const frame = resolveGridFrame(platform, t.gridFrame, t.spacing, bps)
  const sourceWidth = artefactSourceWidth(t)
  const fluid = platform !== 'desktop'

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div
        style={{
          width: fluid ? '100%' : sourceWidth,
          maxWidth: platform === 'mobile' ? MOBILE_MAX : sourceWidth,
          margin: '0 auto',
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          // The frame is a container, so it takes the container radius role —
          // the same token a Card or Modal resolves.
          borderRadius: radiusRoleOf(t, 'container', '16px'),
          padding: frame.margin,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {/* Names the two numbers the frame is built from. Without it, "this is at
          true size" and "this margin came from your Grid tokens" are both
          claims you'd have to take on faith. In `compact` the caption drops
          BOTH claims — a scaled photo is neither true size nor showing its
          margin in real px, and the text is illegible at that scale anyway. */}
      {!compact && (
        <p className="text-mini text-fg-faint text-center tabular-nums">
          {platformCaption(platform)} · true size · page margin {frame.margin} from Grid
        </p>
      )}
    </div>
  )
}
