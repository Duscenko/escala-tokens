import { useLayoutEffect, useRef, useState } from 'react'
import type { PreviewTokens } from '../ButtonPreview'
import type { Artefact } from './types'

/**
 * The width the artefact is rendered at BEFORE it's photographed down to
 * `targetWidth` — a fixed reference (a real phone width), independent of
 * whatever the panel happens to measure today. That's what makes the
 * thumbnail read as "a phone, shrunk" at any panel width, rather than
 * something whose proportions shift with the aside.
 */
const SOURCE_WIDTH = 375

/**
 * One compact card in the carousel — the SAME artefact `DeviceFrame` renders
 * at true size elsewhere, photographed down via `transform: scale()` rather
 * than re-flowed. `DeviceFrame`'s own doc comment has the full case for why
 * that distinction matters; this is the one caller that takes it.
 *
 * The scale factor is fixed (`targetWidth / SOURCE_WIDTH`); what's NOT fixed
 * is the artefact's height — it depends on live tokens (type scale, spacing,
 * how many chars a hex value takes), so it's measured with a `ResizeObserver`
 * rather than assumed. Until that first measurement lands the card renders at
 * 0 opacity instead of a guessed height, so nothing ever shows an empty or
 * clipped frame while it settles.
 */
export function ScaledArtefactCard({
  artefact, t, targetWidth, onExpand,
}: {
  artefact: Artefact
  t: PreviewTokens
  targetWidth: number
  onExpand: () => void
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  const scale = targetWidth / SOURCE_WIDTH

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h) setNaturalHeight(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${artefact.label} to actual size`}
      title={`Expand ${artefact.label} to actual size`}
      className="block flex-shrink-0 rounded-2xl overflow-hidden text-left transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
      style={{
        width: targetWidth,
        height: naturalHeight != null ? naturalHeight * scale : undefined,
        opacity: naturalHeight != null ? 1 : 0,
      }}
    >
      {/* The measured element renders at SOURCE_WIDTH — its true, unscaled
          layout — and the transform shrinks the whole thing visually without
          touching that layout. The outer button's fixed height + `overflow:
          hidden` is what turns "shrunk but still SOURCE_WIDTH tall in the
          document" into "a card exactly `targetWidth × naturalHeight*scale`". */}
      <div
        ref={measureRef}
        style={{ width: SOURCE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {artefact.render({ t, compact: true })}
      </div>
    </button>
  )
}
