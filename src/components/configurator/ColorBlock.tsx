// One colour, one block — the swatch, its name and its hex in a single field,
// like Figma's fill row. Typing in the hex sets the colour; the swatch opens
// `FloatingColorPicker`, which floats BESIDE the inspector (never over it), so
// the rail you came from and the board both stay in view while you pick, and
// its header drags it anywhere. Colour roles (ColorRolesPanel) and the extra
// brand palettes share both.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import chroma from 'chroma-js'
import { useI18n } from '../../lib/i18n'
import { FIELD_CONTROL, FIELD_CONTROL_ON, FIELD_CONTROL_REST, FIELD_LEAD } from '../ui/PickerField'
import { THUMB_CENTER, THUMB_CLASS, along, ratioIn } from '../ui/ColorField'
import { INSPECTOR_ID } from './WorkspaceInspector'

const HEX_RE = /^#?([0-9a-f]{6})$/i

/** A typed hex, normalised, or null when it is not one. */
function parseHex(raw: string): string | null {
  const match = HEX_RE.exec(raw.trim())
  return match ? `#${match[1].toLowerCase()}` : null
}

function HexInput({ hex, label, readOnly, readOnlyTitle, onHex, onFocus, inputRef, className }: {
  hex: string
  label: string
  readOnly?: boolean
  readOnlyTitle?: string
  onHex: (hex: string) => void
  onFocus?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  className: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // Leaving the field writes only a CHANGED, valid hex. Writing back what was
  // shown is not a no-op: the neutral's dark row shows a derived tone, and
  // committing it would set the neutral itself and unlink it from the accent.
  const save = () => {
    if (draft == null) return
    const next = parseHex(draft)
    if (next && next !== hex.toLowerCase()) onHex(next)
    setDraft(null)
  }
  return (
    <input
      ref={inputRef}
      value={draft ?? hex.toUpperCase()}
      onFocus={(event) => { onFocus?.(); setDraft(hex.toUpperCase()); event.currentTarget.select() }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') { setDraft(null); event.currentTarget.blur() }
      }}
      spellCheck={false}
      readOnly={readOnly}
      title={readOnly ? readOnlyTitle : undefined}
      aria-label={`${label} hex`}
      className={className}
    />
  )
}

export function ColorBlock({
  label, hex, active = false, open = false, readOnly, readOnlyTitle,
  landing = 0, index = 0, anchorRef, onSwatch, onFocusHex, onHex,
}: {
  label: string
  hex: string
  /** The row the preview highlights. */
  active?: boolean
  /** Its picker is open. */
  open?: boolean
  readOnly?: boolean
  readOnlyTitle?: string
  /** Bumped when the whole palette lands at once; 0 = no landing. */
  landing?: number
  /** Row position — the delay of the swatch's landing. */
  index?: number
  /** The block, for the picker to place itself against. */
  anchorRef?: RefObject<HTMLDivElement | null>
  onSwatch: () => void
  onFocusHex?: () => void
  onHex: (hex: string) => void
}) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const lit = active || open
  return (
    // The whole block is the field: a click anywhere but the swatch types.
    // The swatch is a SIBLING of the input, never around it — an input nested
    // in a <button> is invalid.
    <div
      ref={anchorRef}
      onClick={() => input.current?.focus()}
      // The panel's own field (`FIELD_CONTROL`): same height, inset and
      // swatch as Font or Radius. The ring is for an open picker or a hex
      // being typed — not for "the selected role", which Accent always is.
      className={`${FIELD_CONTROL} w-full cursor-text ${open ? FIELD_CONTROL_ON : `${FIELD_CONTROL_REST} focus-within:shadow-[inset_0_0_0_1px_var(--line-selected)]`}`}
    >
      <button
        key={landing}
        type="button"
        onClick={(event) => { event.stopPropagation(); onSwatch() }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('{name} — open colour picker', { name: label })}
        title={t('Open colour picker')}
        className={`${FIELD_LEAD} cursor-pointer border border-fg/10 transition-[background-color] duration-200 ease-[var(--ease-out-quint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 motion-reduce:transition-none ${landing ? 'swatch-land' : ''}`}
        style={{ background: hex, '--swatch-i': index } as CSSProperties}
      />
      {/* One line: the name, then the hex pushed right, so every row's hex
          lines up in one column. */}
      <span className={`min-w-0 truncate text-ui transition-colors ${lit ? 'text-fg' : 'text-fg-muted group-hover:text-fg'}`}>
        {label}
      </span>
      <HexInput
        inputRef={input}
        hex={hex}
        label={label}
        readOnly={readOnly}
        readOnlyTitle={readOnlyTitle}
        onHex={onHex}
        onFocus={onFocusHex}
        className="w-0 min-w-[4.5rem] flex-1 bg-transparent text-right text-ui tabular-nums text-fg outline-none"
      />
    </div>
  )
}

// ── The floating picker ─────────────────────────────────────────────────────

const PICKER_W = 256
/** Where the role pickers sit. ONE spot for every colour: switching from
 *  Accent to Neutral or a state opens the next picker exactly where the last
 *  one was, instead of jumping to its own row. A drag moves the spot. Kept
 *  for the session; `clamp` fits it back into a resized window. */
let sharedPickerPos: { left: number; top: number } | null = null
const EDGE = 8

type Hsv = { h: number; s: number; v: number }

/** `hex` as HSV. A grey has no hue, so it keeps `hue` — the canvas does not
 *  snap to red every time the saturation reaches zero. */
function readHsv(hex: string, hue = 0): Hsv {
  try {
    const [h, s, v] = chroma(hex).hsv()
    return { h: Number.isNaN(h) ? hue : h, s, v }
  } catch {
    return { h: hue, s: 0, v: 0 }
  }
}
const hsvHex = ({ h, s, v }: Hsv) => chroma.hsv(h, s, v).hex()

/** Saturation × brightness at the colour's own hue — this theme's exact hex.
 *  Previews while dragging, lands once on release: every write is an Undo step. */
function SaturationCanvas({ hex, disabled, onPreview, onCommit }: {
  hex: string
  disabled?: boolean
  onPreview?: (hex: string | null) => void
  onCommit: (hex: string) => void
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [hsv, setHsv] = useState(() => readHsv(hex))
  const [dragging, setDragging] = useState(false)
  // A hex from outside (typed, the hue strip, Undo) moves the thumb — but not
  // mid-drag, when the outside value is this canvas's own preview.
  // Compared during render — React's "adjust state when a prop changes".
  const [seen, setSeen] = useState(hex)
  if (hex !== seen && !dragging) {
    setSeen(hex)
    if (hsvHex(hsv) !== hex.toLowerCase()) setHsv(readHsv(hex, hsv.h))
  }

  const land = (from: string, next: Hsv) => {
    onPreview?.(null)
    const out = hsvHex(next)
    if (out !== from.toLowerCase()) onCommit(out)
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={t('Saturation and brightness')}
      aria-valuetext={`${Math.round(hsv.s * 100)}% · ${Math.round(hsv.v * 100)}%`}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        const el = ref.current
        if (disabled || !el) return
        event.preventDefault()
        el.focus()
        const from = hex
        let last = hsv
        const at = (x: number, y: number) => {
          const r = ratioIn(el, x, y)
          last = { h: hsv.h, s: r.x, v: 1 - r.y }
          setHsv(last)
          onPreview?.(hsvHex(last))
        }
        setDragging(true)
        at(event.clientX, event.clientY)
        const move = (e: PointerEvent) => at(e.clientX, e.clientY)
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
          setDragging(false)
          land(from, last)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        const step = event.shiftKey ? 0.1 : 0.01
        const clamp = (n: number) => Math.min(1, Math.max(0, n))
        const next = {
          ArrowLeft: { ...hsv, s: clamp(hsv.s - step) },
          ArrowRight: { ...hsv, s: clamp(hsv.s + step) },
          ArrowDown: { ...hsv, v: clamp(hsv.v - step) },
          ArrowUp: { ...hsv, v: clamp(hsv.v + step) },
        }[event.key]
        if (!next) return
        event.preventDefault()
        setHsv(next)
        onPreview?.(hsvHex(next))
      }}
      onKeyUp={(event) => {
        if (!disabled && event.key.startsWith('Arrow')) land(hex, hsv)
      }}
      className={`relative h-36 w-full touch-none overflow-hidden rounded-lg ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 ${disabled ? 'opacity-50' : 'cursor-crosshair'}`}
      style={{ background: chroma.hsv(hsv.h, 1, 1).hex() }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
      <span
        className={THUMB_CLASS}
        style={{ left: along(hsv.s), top: along(1 - hsv.v), transform: THUMB_CENTER, background: hsvHex(hsv) }}
      />
    </div>
  )
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }
const eyeDropper = () => (typeof window === 'undefined'
  ? undefined
  : (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper)

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      {children}
    </button>
  )
}

export function FloatingColorPicker({
  anchor, keepOpenWithin, label, hex, readOnly, readOnlyTitle,
  onClose, onHex, onHexPreview, strip, children,
}: {
  /** The block it opened from: placed beside it, and clicking it does not close. */
  anchor: RefObject<HTMLElement | null>
  /** More of the page whose clicks keep it open — the role list, so another
   *  row's swatch switches the picker instead of closing it. */
  keepOpenWithin?: RefObject<HTMLElement | null>
  label: string
  hex: string
  readOnly?: boolean
  readOnlyTitle?: string
  onClose: () => void
  onHex: (hex: string) => void
  /** The canvas's colour while it is being dragged; null when it lands. */
  onHexPreview?: (hex: string | null) => void
  /** The hue control, under the canvas. */
  strip: ReactNode
  /** Under the hex field: rules, checks, links. */
  children?: ReactNode
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const clamp = (left: number, top: number) => {
    const height = panel.current?.offsetHeight ?? 0
    return {
      left: Math.max(EDGE, Math.min(left, window.innerWidth - PICKER_W - EDGE)),
      top: Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE)),
    }
  }

  // Placed before paint: docked flush against the inspector's left edge,
  // level with the row — where Figma puts its fill picker. After that it stays
  // put while the rail scrolls, until you drag it. No room on the left: under
  // the row.
  useLayoutEffect(() => {
    const place = () => {
      if (sharedPickerPos) {
        setPos(clamp(sharedPickerPos.left, sharedPickerPos.top))
        return
      }
      const block = anchor.current
      if (!block) return
      // Level with the top of the colour list (Accent), not the row clicked,
      // so the first spot is the same whichever colour opened it.
      const row = (keepOpenWithin?.current ?? block).getBoundingClientRect()
      const inspector = document.getElementById(INSPECTOR_ID)
      const column = inspector?.contains(block) ? inspector.getBoundingClientRect() : null
      const left = column ? column.left - PICKER_W : row.left - PICKER_W - EDGE
      setPos(left >= EDGE ? clamp(left, row.top) : clamp(row.left, row.bottom + EDGE))
    }
    place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every placement, drag and fit is the next picker's starting spot.
  useEffect(() => { if (pos) sharedPickerPos = pos }, [pos])

  // Keep the whole picker on screen. It grows after it is placed (a Fine-tune
  // slider opening, a rule wrapping), and placing it once let that growth run
  // off the bottom of the window — read as a bug. Any change in its height or
  // in the window moves it back up; past the window's height it scrolls inside.
  useEffect(() => {
    const keep = () => setPos((current) => (current ? clamp(current.left, current.top) : current))
    window.addEventListener('resize', keep)
    const observer = new ResizeObserver(keep)
    if (panel.current) observer.observe(panel.current)
    return () => {
      window.removeEventListener('resize', keep)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    function onDown(event: MouseEvent) {
      const target = event.target as Node
      if (panel.current?.contains(target) || anchor.current?.contains(target) || keepOpenWithin?.current?.contains(target)) return
      onClose()
    }
    // Escape closes the PICKER, not the surface behind it: capture phase, and
    // stopped, like ColorPickerPopover.
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [anchor, keepOpenWithin, onClose])

  const startDrag = (event: React.PointerEvent) => {
    if (!pos || (event.target as HTMLElement).closest('button, input')) return
    event.preventDefault()
    const dx = event.clientX - pos.left
    const dy = event.clientY - pos.top
    const move = (e: PointerEvent) => setPos(clamp(e.clientX - dx, e.clientY - dy))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const Picker = eyeDropper()
  const pick = () => {
    if (!Picker) return
    new Picker().open()
      .then(({ sRGBHex }) => {
        const next = chroma.valid(sRGBHex) ? chroma(sRGBHex).hex() : null
        if (next && next !== hex.toLowerCase()) onHex(next)
      })
      .catch(() => { /* dismissed */ })
  }

  return createPortal(
    <motion.div
      ref={panel}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-label={t('{name} colour', { name: label })}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        width: PICKER_W,
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        visibility: pos ? undefined : 'hidden',
      }}
      // Docked against the inspector, so the shadow falls to the left and down,
      // over the board. Strong enough to read on a dark board, where the
      // default `shadow-xl` vanished.
      className="z-[60] flex flex-col overflow-hidden rounded-xl border border-line-strong bg-app shadow-[-16px_20px_48px_-12px_rgba(0,0,0,0.55),-4px_6px_16px_-4px_rgba(0,0,0,0.35)]"
    >
      {/* The header is the handle. */}
      <div
        onPointerDown={startDrag}
        className="flex h-10 flex-shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-line pl-3 pr-1.5 active:cursor-grabbing"
      >
        <span aria-hidden className="h-4 w-4 flex-shrink-0 rounded-[4px] border border-fg/40" style={{ background: hex }} />
        <h2 className="min-w-0 flex-1 truncate text-ui font-medium text-fg">{label}</h2>
        {Picker && !readOnly && (
          <HeaderButton label={t('Pick a colour from the screen')} onClick={pick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
            </svg>
          </HeaderButton>
        )}
        <HeaderButton label={t('Close')} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </HeaderButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 scrollbar-thin">
        <SaturationCanvas hex={hex} disabled={readOnly} onPreview={onHexPreview} onCommit={onHex} />
        {strip}
        <div className="flex h-7 items-center gap-2 rounded-lg bg-surface pl-2.5 pr-2.5">
          <span className="flex-shrink-0 text-caption text-fg-faint">Hex</span>
          <HexInput
            hex={hex}
            label={label}
            readOnly={readOnly}
            readOnlyTitle={readOnlyTitle}
            onHex={onHex}
            className="min-w-0 flex-1 bg-transparent text-ui tabular-nums text-fg outline-none"
          />
        </div>
        {children}
      </div>
    </motion.div>,
    document.body,
  )
}
