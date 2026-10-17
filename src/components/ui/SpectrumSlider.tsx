// An OKLCH HUE slider.
//
// It moves the colour along the hue axis while holding what the colour MEANS
// relative to its own hue — how far toward the sRGB wall it sits, and where it
// sits relative to the lightness at which that hue peaks. See `readHuePosition`
// / `colorAtHue` in colorUtils for why absolute L+C is the wrong thing to hold
// (it ratchets chroma down through narrow hues, and draws a muddy track).
//
// Ramp generation is untouched: this only picks the ANCHOR hex that
// `generateColorScale` writes to tone 9.

import { useCallback, useEffect, useRef, useState } from 'react'
import { colorAtHue, readHuePosition, type HuePosition } from '../../lib/colorUtils'

/**
 * The TRACK is a hue AXIS — it answers "which hues exist", so it is always
 * drawn near the gamut wall. It has to be: the Base row edits a near-grey, and
 * a track drawn at that colour's own 4% saturation is a grey smear you cannot
 * aim with. Every hue strip in every picker works this way.
 *
 * The THUMB and the emitted value use the colour's OWN saturation instead, so
 * neither ever overstates what you have — an early build floored both and the
 * Base thumb rendered a blue slate for a neutral that was actually #6c737f.
 */
const TRACK_SATURATION = 0.95
/** Floored only so a pure grey gains a perceptible hue when you drag it; a
 *  true grey has no angle, so without this the control would be inert. */
const MIN_SATURATION = 0.06
/** Stops in the track gradient. 25 is one every 15°, which reads as continuous. */
const STOPS = 25

/** Degrees covered by a `[start, end]` band, read clockwise (so `[355, 55]`
 *  is the 60° that wraps through 0). A full or empty band is the whole wheel. */
function bandSpan([start, end]: [number, number]): number {
  const span = (((end - start) % 360) + 360) % 360
  return span === 0 ? 360 : span
}

/** Where `hue` sits along the band, 0–1. A hue outside it pins to the nearer end. */
function bandRatio(hue: number, band: [number, number]): number {
  const span = bandSpan(band)
  if (span === 360) return (((hue - band[0]) % 360) + 360) % 360 / 360
  const offset = (((hue - band[0]) % 360) + 360) % 360
  if (offset <= span) return offset / span
  return offset - span < (360 - span) / 2 ? 1 : 0
}

function bandHue(ratio: number, band: [number, number]): number {
  return Math.round(band[0] + ratio * bandSpan(band)) % 360
}

export default function SpectrumSlider({
  value,
  onPreview,
  onCommit,
  ariaLabel,
  disabled,
  band = [0, 360],
  colorAt,
}: {
  value: string
  /** Fires continuously while dragging — cheap paints only. The hue rides
   *  along so a caller can derive more than one colour from the same drag. */
  onPreview?: (hex: string, hue: number) => void
  /** Fires once, on release / keypress — this is the one that retints. */
  onCommit: (hex: string, hue: number) => void
  ariaLabel: string
  disabled?: boolean
  /** The hues this slider covers, clockwise. Default: the whole wheel. A
   *  status colour gets a band, so Warning can only move between orange and
   *  yellow and never stops reading as a warning. */
  band?: [number, number]
  /** Replaces the default "hold position, change hue" with the caller's own
   *  colour for a hue — e.g. a value solved for contrast against a theme's
   *  page. Drives the track, the thumb and every emitted hex, so what you see
   *  while dragging is exactly what lands. */
  colorAt?: (hue: number) => string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  // The position is captured on pointerdown and FROZEN for the whole gesture —
  // it rides in state beside the hue rather than being re-read from `value`.
  // Re-reading mid-drag is what caused the original ratchet: each emit became
  // the next read's baseline, so one pass through a narrow hue permanently
  // desaturated the colour.
  const [drag, setDrag] = useState<{ hue: number; position: HuePosition } | null>(null)

  const read = readHuePosition(value)
  const raw: HuePosition = {
    saturation: Math.max(read.position.saturation, MIN_SATURATION),
    lightness: read.position.lightness,
  }
  const position = raw
  const at = useCallback(
    (h: number, held: HuePosition) => (colorAt ? colorAt(h) : colorAtHue(held, h)),
    [colorAt],
  )
  const hue = drag?.hue ?? read.hue
  const live = drag?.position ?? position

  const track = Array.from({ length: STOPS }, (_, i) => {
    const stopH = bandHue(i / (STOPS - 1), band)
    const stop = colorAt ? colorAt(stopH) : colorAtHue({ saturation: TRACK_SATURATION, lightness: live.lightness }, stopH)
    return `${stop} ${(i / (STOPS - 1)) * 100}%`
  }).join(', ')

  // The thumb's CENTRE travels the bar inset by half its width (1rem), so at
  // either end the ring sits fully inside the bar — the same travel the native
  // range thumbs beside it (Neutral tint, Contrast) have. The pointer is mapped
  // onto that travel, over the track's PADDING box (`clientLeft` / `clientWidth`,
  // i.e. inside its 1px border), so the ring stays under the cursor.
  const hueAt = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const thumbPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const travel = el.clientWidth - thumbPx
    if (travel <= 0) return null
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - el.clientLeft - thumbPx / 2) / travel))
    return bandHue(ratio, band)
  }, [band])

  // Move/up listen on the WINDOW, not the track: a 20px-tall bar loses the
  // pointer the moment a drag strays vertically. Same call ScrubInput makes.
  // The live hue also rides in a ref so `up` can read it without the listeners
  // re-attaching on every pointermove (state is what RENDERS the thumb; the ref
  // is what the handlers read). Refs are only ever touched inside handlers.
  const latestHue = useRef(hue)
  const dragging = drag !== null
  const frozen = drag?.position
  useEffect(() => {
    if (!dragging || !frozen) return
    const move = (event: PointerEvent) => {
      const next = hueAt(event.clientX)
      if (next === null) return
      latestHue.current = next
      setDrag((current) => (current ? { ...current, hue: next } : current))
      onPreview?.(at(next, frozen), next)
    }
    const up = (event: PointerEvent) => {
      const next = hueAt(event.clientX) ?? latestHue.current
      setDrag(null)
      onCommit(at(next, frozen), next)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, frozen, hueAt, onCommit, onPreview, at])

  const span = bandSpan(band)
  const ratio = bandRatio(hue, band)
  const emit = (h: number) => {
    const next = ((Math.round(h) % 360) + 360) % 360
    onCommit(at(next, position), next)
  }
  const nudge = (delta: number) => emit(bandHue(Math.min(1, Math.max(0, ratio + delta / span)), band))
  const thumb = at(hue, live)

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={band[0]}
      aria-valuemax={band[0] + span}
      aria-valuenow={Math.round(hue)}
      aria-valuetext={`${Math.round(hue)}°`}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (disabled) return
        const next = hueAt(event.clientX)
        if (next === null) return
        event.preventDefault()
        latestHue.current = next
        setDrag({ hue: next, position })
        onPreview?.(at(next, position), next)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        const step = event.shiftKey ? 10 : 1
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); nudge(-step) }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); nudge(step) }
        if (event.key === 'Home') { event.preventDefault(); emit(bandHue(0, band)) }
        if (event.key === 'End') { event.preventDefault(); emit(bandHue(span === 360 ? 359 / 360 : 1, band)) }
      }}
      className={`relative h-5 rounded-full border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      style={{ background: `linear-gradient(to right, ${track})`, touchAction: 'none' }}
    >
      <span
        aria-hidden
        // Scale and centering ride in ONE transform, or the thumb drifts right
        // as it grows. Same rule as the Slider specimen's knob.
        className="pointer-events-none absolute top-1/2 h-4 w-4 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
        style={{
          left: `calc(0.5rem + ${ratio} * (100% - 1rem))`,
          background: thumb,
          transform: `translate(-50%, -50%) scale(${dragging ? 1.15 : 1})`,
          transition: dragging ? undefined : 'transform 0.12s ease-out',
        }}
      />
    </div>
  )
}
