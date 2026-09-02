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

export default function SpectrumSlider({
  value,
  onPreview,
  onCommit,
  ariaLabel,
  disabled,
}: {
  value: string
  /** Fires continuously while dragging — cheap paints only. */
  onPreview?: (hex: string) => void
  /** Fires once, on release / keypress — this is the one that retints. */
  onCommit: (hex: string) => void
  ariaLabel: string
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  // The position is captured on pointerdown and FROZEN for the whole gesture —
  // it rides in state beside the hue rather than being re-read from `value`.
  // Re-reading mid-drag is what caused the original ratchet: each emit became
  // the next read's baseline, so one pass through a narrow hue permanently
  // desaturated the colour.
  const [drag, setDrag] = useState<{ hue: number; position: HuePosition } | null>(null)

  const read = readHuePosition(value)
  const position: HuePosition = {
    saturation: Math.max(read.position.saturation, MIN_SATURATION),
    lightness: read.position.lightness,
  }
  const hue = drag?.hue ?? read.hue
  const live = drag?.position ?? position

  const track = Array.from({ length: STOPS }, (_, i) => {
    const stopH = (i / (STOPS - 1)) * 360
    const stop = colorAtHue({ saturation: TRACK_SATURATION, lightness: live.lightness }, stopH)
    return `${stop} ${(i / (STOPS - 1)) * 100}%`
  }).join(', ')

  const hueAt = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(ratio * 360) % 360
  }, [])

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
      onPreview?.(colorAtHue(frozen, next))
    }
    const up = (event: PointerEvent) => {
      const next = hueAt(event.clientX) ?? latestHue.current
      setDrag(null)
      onCommit(colorAtHue(frozen, next))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, frozen, hueAt, onCommit, onPreview])

  const nudge = (delta: number) => onCommit(colorAtHue(position, hue + delta))
  const thumb = colorAtHue(live, hue)

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={360}
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
        onPreview?.(colorAtHue(position, next))
      }}
      onKeyDown={(event) => {
        if (disabled) return
        const step = event.shiftKey ? 10 : 1
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); nudge(-step) }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); nudge(step) }
        if (event.key === 'Home') { event.preventDefault(); onCommit(colorAtHue(position, 0)) }
        if (event.key === 'End') { event.preventDefault(); onCommit(colorAtHue(position, 359)) }
      }}
      className={`relative h-5 rounded-full border border-line/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      style={{ background: `linear-gradient(to right, ${track})`, touchAction: 'none' }}
    >
      <span
        aria-hidden
        // Scale and centering ride in ONE transform, or the thumb drifts right
        // as it grows. Same rule as the Slider specimen's knob.
        className="pointer-events-none absolute top-1/2 h-4 w-4 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
        style={{
          left: `${(hue / 360) * 100}%`,
          background: thumb,
          transform: `translate(-50%, -50%) scale(${dragging ? 1.15 : 1})`,
          transition: dragging ? undefined : 'transform 0.12s ease-out',
        }}
      />
    </div>
  )
}
