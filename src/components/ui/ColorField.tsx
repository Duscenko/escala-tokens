// Rich custom color picker — a swatch trigger + popover with an HSV canvas,
// hue & opacity sliders, a hex input and the user's saved-swatch library.
// Drop-in replacement for the native <input type="color">; reused by the accent
// quick-edit and the Gradients foundation (gradient stops). Uses chroma-js
// (already a dependency) for all color math, so grays keep their hue while the
// saturation is zero.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import chroma from 'chroma-js'
import { useDesignStore } from '../../store/useDesignStore'
import { accessibleVariants } from '../../lib/colorUtils'

type HSVA = { h: number; s: number; v: number; a: number }

const CHECKER =
  'repeating-conic-gradient(#bcbcc0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px'

function toHsva(hex: string): HSVA {
  try {
    const c = chroma(hex)
    const [h, s, v] = c.hsv()
    return { h: Number.isNaN(h) ? 0 : h, s, v, a: c.alpha() }
  } catch {
    return { h: 265, s: 0.6, v: 0.85, a: 1 }
  }
}

function toHex({ h, s, v, a }: HSVA): string {
  const c = chroma.hsv(h, s, v).alpha(a)
  // chroma emits an 8-digit hex only when alpha < 1 — exactly what we want.
  return a >= 1 ? c.hex('rgb') : c.hex('rgba')
}

/** Fractional position (0–1) of a pointer event within an element's box. */
function ratioIn(el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
  }
}

export function ColorPickerPanel({
  value,
  onChange,
  suggestions = false,
}: {
  value: string
  onChange: (hex: string) => void
  /** Show the curated accessible alternatives of the current colour. Opt-in,
   *  and only meaningful where the value being edited is a family's BASE (the
   *  anchor a whole ramp is grown from) — Accent, Neutral and the states. A
   *  single tone inside a ramp, or a gradient stop, has no white-ink guarantee
   *  to keep, so offering "more accessible" versions there would be noise. */
  suggestions?: boolean
}) {
  // Only the user's own saved swatches live here now. The system's ramps used
  // to be listed below as a "Palette" block, but this picker's job is authoring
  // a NEW raw colour — offering existing tokens in the same popover mixed two
  // different tasks. That grid moved to colorControls' `SystemRampGrid`, where
  // the semantic Token Details modal (which IS about choosing an existing
  // token) uses it instead.
  const { savedColors, addSavedColor, removeSavedColor } = useDesignStore()
  const [hsva, setHsva] = useState<HSVA>(() => toHsva(value))
  const [hexDraft, setHexDraft] = useState('')

  // The colour this panel OPENED with — captured once, on mount, never
  // touched by the outside-resync effect below. Every call site that passes
  // `suggestions` mounts this panel fresh per popover open (`{open && <.../>}`
  // / a portal keyed to the editing target), so "on mount" reliably means "the
  // hex the user had searched/typed/picked before touching anything in here."
  // It exists so clicking a Muted/Vivid/High-contrast suggestion — which
  // overwrites the field with a DIFFERENT hex — isn't a one-way trip back to
  // whatever was found by eye.
  const [initialHsva] = useState<HSVA>(() => toHsva(value))
  const initialHex = useMemo(() => toHex(initialHsva), [initialHsva])

  // Resync from the outside value only when it represents a different color than
  // what we're already showing (avoids clobbering mid-drag / on gray hue loss).
  useEffect(() => {
    if (toHex(hsva).toLowerCase() !== value.toLowerCase()) setHsva(toHsva(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const hex = useMemo(() => toHex(hsva), [hsva])
  const hueColor = useMemo(() => chroma.hsv(hsva.h, 1, 1).hex(), [hsva.h])
  // Recomputed as the user drags — the four options are always alternatives to
  // what's on screen RIGHT NOW, not to whatever the field held on open.
  const variants = useMemo(
    () => (suggestions ? accessibleVariants(hex.slice(0, 7)) : []),
    [suggestions, hex],
  )

  function apply(next: HSVA) {
    setHsva(next)
    onChange(toHex(next))
  }

  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const alphaRef = useRef<HTMLDivElement>(null)

  // Generic drag: reads the pointer ratio in `ref` and pipes it to `handle`
  // until pointer-up, so the SV canvas and both sliders share one code path.
  function startDrag(
    ref: React.RefObject<HTMLDivElement | null>,
    handle: (x: number, y: number) => void,
  ) {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      const el = ref.current
      if (!el) return
      const move = (clientX: number, clientY: number) => {
        const { x, y } = ratioIn(el, clientX, clientY)
        handle(x, y)
      }
      move(e.clientX, e.clientY)
      const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY)
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }

  function handleHex(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 8)
    setHexDraft(cleaned.toUpperCase())
    if ((cleaned.length === 6 || cleaned.length === 8) && chroma.valid(`#${cleaned}`)) {
      apply(toHsva(`#${cleaned}`))
    }
  }

  const displayHex = (hexDraft || hex.replace(/^#/, '')).toUpperCase().replace(/^#/, '')

  return (
    <div className="flex flex-col gap-3 w-full" onPointerDown={(e) => e.stopPropagation()}>
      {/* Saturation / Value canvas */}
      <div
        ref={svRef}
        onPointerDown={startDrag(svRef, (x, y) => apply({ ...hsva, s: x, v: 1 - y }))}
        className="relative w-full h-36 rounded-lg cursor-crosshair touch-none overflow-hidden ring-1 ring-black/10"
        style={{ background: hueColor }}
        role="slider"
        aria-label="Saturation and brightness"
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
        <span
          className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow pointer-events-none"
          style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: chroma.hsv(hsva.h, hsva.s, hsva.v).hex() }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={startDrag(hueRef, (x) => apply({ ...hsva, h: x * 360 }))}
        className="relative w-full h-3 rounded-full cursor-pointer touch-none ring-1 ring-black/10"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        role="slider"
        aria-label="Hue"
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow pointer-events-none"
          style={{ left: `${(hsva.h / 360) * 100}%`, background: hueColor }}
        />
      </div>

      {/* Opacity slider */}
      <div
        ref={alphaRef}
        onPointerDown={startDrag(alphaRef, (x) => apply({ ...hsva, a: x }))}
        className="relative w-full h-3 rounded-full cursor-pointer touch-none ring-1 ring-black/10"
        style={{ background: CHECKER }}
        role="slider"
        aria-label="Opacity"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${chroma.hsv(hsva.h, hsva.s, hsva.v).hex()})` }}
        />
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow pointer-events-none"
          style={{ left: `${hsva.a * 100}%`, background: hex }}
        />
      </div>

      {/* Hex + opacity readout */}
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-md flex-shrink-0 ring-1 ring-black/10" style={{ background: `linear-gradient(${hex},${hex}), ${CHECKER}` }} />
        {/* `min-w-0` is load-bearing: without it this flex child can't shrink
            below the <input>'s intrinsic width (~20 chars), so the row stayed
            wider than the popover and pushed the opacity field past its right
            edge — the slider and the % box visibly hung outside the panel. The
            input's own min-w-0 isn't enough; the whole chain needs it. */}
        <div className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-line bg-surface">
          <span className="text-[11px] font-mono text-fg-faint">#</span>
          <input
            value={displayHex}
            onChange={(e) => handleHex(e.target.value)}
            onBlur={() => setHexDraft('')}
            spellCheck={false}
            aria-label="Hex value"
            className="flex-1 min-w-0 bg-transparent text-[12px] font-mono tabular-nums text-fg outline-none"
          />
        </div>
        <div className="w-16 flex-shrink-0 flex items-center gap-0.5 px-2 py-1.5 rounded-lg border border-line bg-surface">
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(hsva.a * 100)}
            onChange={(e) => apply({ ...hsva, a: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })}
            aria-label="Opacity percent"
            className="flex-1 min-w-0 bg-transparent text-[12px] font-mono tabular-nums text-fg outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[10px] text-fg-faint flex-shrink-0">%</span>
        </div>
      </div>

      {/* Saved swatches — the user's own reusable colors. The action reads
          "Save current" and carries the live swatch: a bare "Add" collided with
          the two other Adds this panel can sit inside (add family / add row),
          and never said WHAT it added. */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-line">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-fg-muted">Saved</span>
          <button
            type="button"
            onClick={() => addSavedColor(hex)}
            disabled={savedColors.includes(hex)}
            title={savedColors.includes(hex) ? `${hex} is already saved` : `Save ${hex} to your swatches`}
            className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border border-line text-[11px] text-fg-muted hover:text-fg hover:border-line-strong disabled:opacity-40 disabled:hover:text-fg-muted disabled:hover:border-line transition-colors"
          >
            <span
              aria-hidden
              className="w-3 h-3 rounded-full ring-1 ring-black/10 flex-shrink-0"
              style={{ background: `linear-gradient(${hex},${hex}), ${CHECKER}` }}
            />
            {savedColors.includes(hex) ? 'Saved' : 'Save current'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {savedColors.length === 0 && (
            <span className="text-[11px] text-fg-faint leading-snug">
              Save a color to reuse it across families.
            </span>
          )}
          {savedColors.map((c) => (
            <span key={c} className="relative group/sw">
              <button
                type="button"
                onClick={() => apply(toHsva(c))}
                onContextMenu={(e) => { e.preventDefault(); removeSavedColor(c) }}
                title={c}
                aria-label={`Use ${c}`}
                className="w-5 h-5 rounded-full block flex-shrink-0 ring-1 ring-black/10 transition-transform hover:scale-110"
                style={{ background: `linear-gradient(${c},${c}), ${CHECKER}` }}
              />
              <button
                type="button"
                onClick={() => removeSavedColor(c)}
                aria-label={`Remove ${c}`}
                title={`Remove ${c}`}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-fg text-app text-[9px] leading-none flex items-center justify-center opacity-0 group-hover/sw:opacity-100 focus:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Curated alternatives — same hue, tuned so the anchor itself carries
          white ink at AA/AAA. Sits BELOW Saved deliberately: "Saved" is the
          user's own library (a memory), this is a recommendation about the
          colour currently in the field, so it reads as a consequence of what's
          above it rather than another palette to browse. */}
      {suggestions && (variants.length > 0 || hex.toLowerCase() !== initialHex.toLowerCase()) && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-line">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-fg-muted">Accessible options</span>
            {/* Only appears once the field has actually moved away from what
                this panel opened with — a Reset that's always visible reads as
                "there's something to undo" even when there isn't. */}
            {hex.toLowerCase() !== initialHex.toLowerCase() && (
              <button
                type="button"
                onClick={() => apply(initialHsva)}
                title={`Back to ${initialHex.toUpperCase()} — what you had before picking a suggestion`}
                className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                </svg>
                Reset
              </button>
            )}
          </div>
          {variants.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {variants.map((v) => (
                <button
                  key={v.hex}
                  type="button"
                  onClick={() => apply(toHsva(v.hex))}
                  title={`${v.hex.toUpperCase()} — ${v.note} (${v.contrast.toFixed(2)}:1)`}
                  className="flex items-center gap-1.5 min-w-0 pl-1 pr-1.5 py-1 rounded-lg border border-line hover:border-line-strong hover:bg-elevated transition-colors text-left"
                >
                  <span
                    aria-hidden
                    className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-black/10"
                    style={{ background: v.hex }}
                  />
                  <span className="min-w-0 truncate text-[10px] text-fg-muted">{v.label}</span>
                </button>
              ))}
            </div>
          )}
          {variants.length > 0 && (
            <span className="text-[10px] text-fg-faint leading-snug">
              Same hue, tuned so white text passes on the solid.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Swatch trigger + popover ─────────────────────────────────────────────────

export default function ColorField({
  value,
  onChange,
  ariaLabel = 'Pick a color',
  size = 24,
  align = 'left',
  swatchClassName = '',
  className = '',
  icon,
}: {
  value: string
  onChange: (hex: string) => void
  ariaLabel?: string
  size?: number
  align?: 'left' | 'right'
  /** Extra classes on the trigger swatch (shadow, selected ring…). */
  swatchClassName?: string
  className?: string
  /** When set, the trigger reads as an action button — a solid bordered chip
   *  showing this icon instead of a color fill. The picker still opens on the
   *  current `value`. */
  icon?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        title={icon ? ariaLabel : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        // Rounded square, like every other color chip in the app (colorControls'
        // SWATCH) — a color swatch is never a dot here.
        className={`rounded-md flex-shrink-0 flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
          icon
            ? 'border border-line bg-surface text-fg-muted shadow-[0_2px_3px_0_rgba(0,0,0,0.06)] hover:text-fg hover:border-line-strong'
            : 'ring-1 ring-black/10'
        } ${swatchClassName}`}
        style={
          icon
            ? { width: size, height: size }
            : { width: size, height: size, background: `linear-gradient(${value},${value}), ${CHECKER}` }
        }
      >
        {icon}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="dialog"
            aria-label={ariaLabel}
            className={`absolute z-50 mt-2 w-64 rounded-2xl border border-line-strong bg-app shadow-xl p-3 ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            <ColorPickerPanel value={value} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
