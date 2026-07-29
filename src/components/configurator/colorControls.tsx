// Reusable color-scale controls shared by the Color foundation (Step2) and the
// "Add a theme" modal: a preset-aware color dropdown, the 12-tone BASE scale
// strip, the brand↔neutral link toggle, and the info dot. Kept presentational
// (no store writes) so callers own their own state.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import chroma from 'chroma-js'
import { BASE_TONE } from '../../lib/colorUtils'
import { PRESET_GROUPS } from '../../lib/brandPalette'
import { ColorPickerPanel } from '../ui/ColorField'

// ── Gray flavor options for the neutral scale ──────────────────────────────
export const GRAY_FLAVORS: { label: string; hex: string }[] = [
  { label: 'Gray Blue',    hex: '#4e5ba6' },
  { label: 'Gray Cool',    hex: '#5d6b98' },
  { label: 'Gray Modern',  hex: '#697586' },
  { label: 'Gray Neutral', hex: '#6c737f' },
  { label: 'Gray Iron',    hex: '#70707b' },
  { label: 'Gray True',    hex: '#737373' },
  { label: 'Gray Warm',    hex: '#79716b' },
]

// ── Page-background options (Radix custom-palette "background" input) ──────
// The surface every ramp is generated against: tone 1 anchors to its lightness
// and the exported alpha ramps composite over it. White = the classic default.
export const BACKGROUND_OPTIONS: { label: string; hex: string }[] = [
  { label: 'Pure White', hex: '#ffffff' },
  { label: 'Snow',       hex: '#fcfcfc' },
  { label: 'Cool Gray',  hex: '#f8fafc' },
  { label: 'Warm Gray',  hex: '#faf9f7' },
  { label: 'Cream',      hex: '#fdfbf7' },
  { label: 'Ivory',      hex: '#fffcf0' },
]

// ── State-colour presets ───────────────────────────────────────────────────
// The curated options per status role, shared by Foundations · Color's pills and
// Home's Background & State Colors panel so both offer the same swatches.
/** The status/intent set components render against — neutral included, because
 *  a neutral badge/alert is as much an intent as a destructive one. Neutral's
 *  value IS the Base (there is no separate neutral primitive), so its presets
 *  are the gray flavors and editing it routes to the Base applier. */
export type IntentRole = 'neutral' | 'error' | 'warning' | 'success' | 'info'

export const STATE_PRESETS: Record<IntentRole, { label: string; hex: string }[]> = {
  neutral: GRAY_FLAVORS,
  error: [
    { hex: '#f04438', label: 'Red 500' }, { hex: '#d92d20', label: 'Red 600' },
    { hex: '#ef4444', label: 'Tailwind Red' }, { hex: '#e11d48', label: 'Rose' },
  ],
  success: [
    { hex: '#17b26a', label: 'Green 500' }, { hex: '#079455', label: 'Green 600' },
    { hex: '#10b981', label: 'Emerald' }, { hex: '#22c55e', label: 'Green 400' },
  ],
  warning: [
    { hex: '#f79009', label: 'Amber 500' }, { hex: '#f59e0b', label: 'Amber' },
    { hex: '#dc6803', label: 'Orange 600' }, { hex: '#f97316', label: 'Orange' },
  ],
  info: [
    { hex: '#2e90fa', label: 'Blue 400' }, { hex: '#3b82f6', label: 'Blue' },
    { hex: '#0ea5e9', label: 'Sky' }, { hex: '#06b6d4', label: 'Cyan' },
  ],
}

// The system's color chip — a rounded SQUARE, never a dot. Every swatch in
// these controls (trigger · dropdown option · custom row · state row) shares it,
// so the shape can't drift apart again.
export const SWATCH = 'w-[18px] h-[18px] rounded-[4px] flex-shrink-0 ring-1 ring-black/10'

export type Option = { label: string; hex: string }
// `badge` marks a group's provenance in the dropdown — 'Tested' for the
// curated presets vs the user's own 'Saved' customs.
export type OptionGroup = { label: string; badge?: string; options: Option[]; onRemove?: (hex: string) => void }

export const BRAND_GROUPS: OptionGroup[] = PRESET_GROUPS.map((g) => ({
  label: g.label,
  badge: 'Tested',
  options: g.colors.map((c) => ({ label: c.label, hex: c.hex })),
}))
export const NEUTRAL_GROUPS: OptionGroup[] = [{ label: 'Grays', badge: 'Tested', options: GRAY_FLAVORS }]
export const BACKGROUND_GROUPS: OptionGroup[] = [{ label: 'Backgrounds', badge: 'Tested', options: BACKGROUND_OPTIONS }]

// ── Dark page-background options ───────────────────────────────────────────
// The dark twin of BACKGROUND_OPTIONS: it anchors tone 12 of the dark neutral
// ramp (= surface-0 in dark). Unlike the light list these are DERIVED from the
// accent — they hold its hue at near-black lightness with a rising chroma, so
// the dark page reads as "your brand, at night" rather than a generic gray.
// Ordered from neutral to tinted; L stays in the 0.17–0.24 band that keeps text
// contrast comfortable.
export function darkBackgroundOptions(accentHex: string): Option[] {
  let hue = 0
  try {
    const h = chroma(accentHex).oklch()[2]
    if (!Number.isNaN(h)) hue = h
  } catch { /* invalid accent — fall back to a hueless near-black */ }
  const at = (l: number, c: number) => chroma.oklch(l, c, hue).hex()
  return [
    { label: 'Pure Black', hex: '#000000' },
    { label: 'Obsidian',   hex: at(0.17, 0.006) },
    { label: 'Ink',        hex: at(0.20, 0.018) },
    { label: 'Slate',      hex: at(0.24, 0.032) },
    { label: 'Twilight',   hex: at(0.22, 0.055) },
    { label: 'Midnight',   hex: at(0.19, 0.080) },
  ]
}

export function darkBackgroundGroups(accentHex: string): OptionGroup[] {
  return [{ label: 'Dark backgrounds', badge: 'From accent', options: darkBackgroundOptions(accentHex) }]
}

export function findOption(groups: OptionGroup[], hex: string): Option | null {
  const target = hex.toLowerCase()
  for (const g of groups) {
    const hit = g.options.find((o) => o.hex.toLowerCase() === target)
    if (hit) return hit
  }
  return null
}

// ── Color dropdown ─────────────────────────────────────────────────────────

export function ColorSelect({
  label,
  value,
  groups,
  onChange,
  variant = 'full',
  accentColor,
  allowCustom = false,
  previewSwatches,
  extras,
  panelClassName,
  groupsLabel,
}: {
  label?: string
  value: string
  groups: OptionGroup[]
  onChange: (hex: string) => void
  variant?: 'full' | 'compact' | 'pill'
  accentColor?: string
  /** Renders a "Custom" row (native picker + hex field) as the dropdown's first option. */
  allowCustom?: boolean
  /** Extra content appended below the option groups (e.g. the state-colour editors). */
  extras?: ReactNode
  /** Overrides the dropdown panel's width/height — for panels carrying `extras`. */
  panelClassName?: string
  /** Heading shown above the preset groups when the panel holds more than one section. */
  groupsLabel?: string
  /**
   * Read-only companion swatches shown next to `value` on the trigger button
   * (e.g. the status colors alongside Background) — decorative preview only,
   * the dropdown still edits `value` alone. Replaces the hex/label text.
   */
  previewSwatches?: { hex: string; label: string }[]
}) {
  const compact = variant === 'compact'
  const pill = variant === 'pill'
  const [open, setOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = findOption(groups, value)
  const hexLabel = value.replace(/^#/, '').toUpperCase()

  function openToggle() {
    setOpen((v) => {
      if (!v) setCustomDraft(hexLabel)
      return !v
    })
  }

  // Free-typed hex — applies live once 6 valid digits are in.
  function handleCustomDraft(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setCustomDraft(cleaned.toUpperCase())
    if (cleaned.length === 6) onChange(`#${cleaned.toLowerCase()}`)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Pill — label · color dot · hex · chevron, in a rounded outlined field.
  // Radius matches the `full` variant's `rounded-[13px]` deliberately: these
  // sit directly under the Color families / Gray-Neutral dropdowns in Picker
  // Color, and a pill-vs-field mismatch there read as two different controls.
  if (pill) {
    return (
      <div ref={ref} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label ?? 'Color'} — ${hexLabel}`}
          className="w-full flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-[13px] bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 transition-colors"
          style={{ ['--tw-ring-color' as string]: accentColor ?? '#111111' }}
        >
          {label && <span className="text-[13px] text-fg">{label}</span>}
          <span className={SWATCH} style={{ backgroundColor: value }} />
          <span className="text-[13px] font-mono text-fg-muted tabular-nums">{hexLabel}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`ml-auto text-fg-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              role="listbox"
              className="absolute z-30 left-0 bottom-full mb-1.5 w-56 max-h-56 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1.5"
            >
              {groups.map((g) => (
                <div key={g.label || 'all'}>
                  {g.options.map((o) => {
                    const isSel = o.hex.toLowerCase() === value.toLowerCase()
                    return (
                      <button
                        key={o.hex}
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        onClick={() => { onChange(o.hex); setOpen(false) }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${isSel ? 'bg-elevated' : 'hover:bg-surface'}`}
                      >
                        <span className={SWATCH} style={{ backgroundColor: o.hex }} />
                        <span className="flex-1 min-w-0 truncate text-sm text-fg">{o.label}</span>
                        <span className="text-[11px] font-mono text-fg-faint">{o.hex}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && !compact && <span className="text-xs text-fg-muted">{label}</span>}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={openToggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={compact ? (label ? `${label} color` : 'Choose color') : undefined}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-full bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg transition-colors'
              : 'w-full flex items-center gap-2 px-3 py-2 rounded-[13px] bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg transition-colors text-left'
          }
        >
          {previewSwatches ? (
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className={SWATCH} style={{ backgroundColor: value }} title={`Background — ${value}`} />
              {previewSwatches.map((s) => (
                <span key={s.label} className={SWATCH} style={{ backgroundColor: s.hex }} title={`${s.label} — ${s.hex}`} />
              ))}
            </span>
          ) : (
            <>
              <span className={SWATCH} style={{ backgroundColor: value }} />
              {!compact && (
                <span className="flex-1 min-w-0 truncate text-sm text-fg font-mono">
                  {value}
                  {selected && <span className="text-fg-faint font-sans"> ({selected.label})</span>}
                </span>
              )}
            </>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-fg-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              role="listbox"
              // min-w-[17rem]: the panel matches the trigger's width, but the
              // Custom row (swatch · label · # · hex field · chevron) needs more
              // than a narrow trigger gives — and `overflow-y-auto` computes
              // overflow-x to auto, which CLIPPED the hex field. The panel is
              // absolutely positioned, so it just grows past the trigger.
              className={`absolute z-30 mt-1.5 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1.5 ${panelClassName ?? (compact ? 'right-0 w-56 max-h-72' : 'w-full min-w-[17rem] max-h-72')}`}
            >
              {allowCustom && (
                <div className="mb-1 border-b border-line pb-1.5">
                  {/* Header row — click the swatch/chevron to reveal the full HSV
                      picker inline (the dropdown scrolls, so a nested popover would
                      clip). Same ColorPickerPanel the Quick-edit accent swatch uses. */}
                  <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomOpen((v) => !v)}
                      aria-label={`Toggle custom ${label ?? 'color'} picker`}
                      aria-expanded={customOpen}
                      className={SWATCH}
                      style={{ backgroundColor: /^#[0-9a-f]{6,8}$/i.test(value) ? value : undefined, background: /^#[0-9a-f]{6,8}$/i.test(value) ? value : 'conic-gradient(#f04438, #f79009, #17b26a, #06aed4, #2e90fa, #7a5af8, #f04438)' }}
                    />
                    <button type="button" onClick={() => setCustomOpen((v) => !v)} className="flex-1 min-w-0 truncate text-left text-sm text-fg">Custom</button>
                    <span className="text-[11px] font-mono text-fg-faint flex-shrink-0">#</span>
                    <input
                      value={customDraft}
                      onChange={(e) => handleCustomDraft(e.target.value)}
                      placeholder="7F56D9"
                      spellCheck={false}
                      aria-label={`Custom ${label ?? 'color'} hex`}
                      className="w-[4.5rem] flex-shrink-0 text-[12px] font-mono tabular-nums bg-surface border border-line rounded-md px-1.5 py-1 text-fg outline-none focus:border-line-strong"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomOpen((v) => !v)}
                      aria-label={customOpen ? 'Hide picker' : 'Show picker'}
                      className="flex-shrink-0 text-fg-faint hover:text-fg transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${customOpen ? 'rotate-180' : ''}`}>
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {customOpen && (
                    <div className="px-2 pt-1">
                      <ColorPickerPanel value={value} onChange={(hex) => { onChange(hex); setCustomDraft(hex.replace(/^#/, '').toUpperCase()) }} />
                    </div>
                  )}
                </div>
              )}
              {groupsLabel && (
                <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-semibold text-fg">{groupsLabel}</div>
              )}
              {groups.map((g) => (
                <div key={g.label || 'all'}>
                  {g.label && (
                    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                      <span className="text-[10px] text-fg-faint uppercase tracking-wider">{g.label}</span>
                      {g.badge && (
                        <span className="text-[9px] px-1.5 rounded-full bg-elevated text-fg-faint border border-line leading-relaxed">
                          {g.badge}
                        </span>
                      )}
                    </div>
                  )}
                  {g.options.map((o) => {
                    const isSel = o.hex.toLowerCase() === value.toLowerCase()
                    return (
                      <div key={o.hex} className="relative group/opt">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSel}
                          onClick={() => { onChange(o.hex); setOpen(false) }}
                          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${g.onRemove ? 'pr-8' : ''} ${
                            isSel ? 'bg-elevated' : 'hover:bg-surface'
                          }`}
                        >
                          <span className={SWATCH} style={{ backgroundColor: o.hex }} />
                          <span className="flex-1 min-w-0 truncate text-sm text-fg">{o.label}</span>
                          <span className="text-[11px] font-mono text-fg-faint flex-shrink-0">{o.hex}</span>
                        </button>
                        {g.onRemove && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); g.onRemove!(o.hex) }}
                            aria-label={`Remove ${o.label}`}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-fg-faint hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/opt:opacity-100 transition-all"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
              {extras}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── State-colour editors (the Background & State Colors panel's lower half) ──
// One row per status role: a swatch that expands the full HSV picker inline, a
// live hex field, and the curated presets. Rendered INSIDE ColorSelect's
// scrolling dropdown, so everything expands in place — a nested popover would
// clip against the panel's overflow.

function StateColorRow({ role, label, value, onChange }: { role: string; label: string; value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value.replace(/^#/, '').toUpperCase())

  // Keep the field in step when the value changes from outside (preset click,
  // "match to accent"), but never fight the user mid-type.
  useEffect(() => { if (!open) setDraft(value.replace(/^#/, '').toUpperCase()) }, [value, open])

  function handleDraft(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setDraft(cleaned.toUpperCase())
    if (cleaned.length === 6) onChange(`#${cleaned.toLowerCase()}`)
  }

  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Toggle ${label} picker`}
          aria-expanded={open}
          className={SWATCH}
          style={{ backgroundColor: value }}
        />
        <span className="flex-1 min-w-0 truncate text-sm text-fg">{label}</span>
        <span className="text-[11px] font-mono text-fg-faint flex-shrink-0">#</span>
        <input
          value={draft}
          onChange={(e) => handleDraft(e.target.value)}
          spellCheck={false}
          aria-label={`${label} hex`}
          className="w-[4.5rem] flex-shrink-0 text-[12px] font-mono tabular-nums bg-surface border border-line rounded-md px-1.5 py-1 text-fg outline-none focus:border-line-strong"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Hide ${label} picker` : `Show ${label} picker`}
          className="flex-shrink-0 text-fg-faint hover:text-fg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {STATE_PRESETS[role as keyof typeof STATE_PRESETS].map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => onChange(p.hex)}
                title={`${p.label} — ${p.hex}`}
                aria-label={`${label}: ${p.label}`}
                className={`w-[18px] h-[18px] rounded-[4px] flex-shrink-0 ring-1 transition-shadow ${
                  p.hex.toLowerCase() === value.toLowerCase() ? 'ring-fg ring-offset-1 ring-offset-app' : 'ring-black/10'
                }`}
                style={{ backgroundColor: p.hex }}
              />
            ))}
          </div>
          <ColorPickerPanel value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

export function StateColorRows({
  neutral, error, warning, success, info, onChange, onMatchAccent, bare = false,
}: {
  /** The Base hex. Omit to hide the Neutral row (hosts that don't own the Base). */
  neutral?: string
  error: string; warning: string; success: string; info: string
  onChange: (role: IntentRole, hex: string) => void
  onMatchAccent?: () => void
  /** Drops the divider that separates these rows from content above them —
   *  set when the rows ARE the whole panel (StateColorsSelect). */
  bare?: boolean
}) {
  const rows: { role: IntentRole; label: string; value: string }[] = [
    ...(neutral ? [{ role: 'neutral' as const, label: 'Neutral', value: neutral }] : []),
    { role: 'error',   label: 'Error',   value: error },
    { role: 'success', label: 'Success', value: success },
    { role: 'warning', label: 'Warning', value: warning },
    { role: 'info',    label: 'Info',    value: info },
  ]
  return (
    <div className={bare ? '' : 'mt-1 border-t border-line pt-1.5'}>
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1">
        <span className="text-[11px] font-semibold text-fg">State colors</span>
        {onMatchAccent && (
          <button
            type="button"
            onClick={onMatchAccent}
            className="text-[11px] text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
          >
            Match to accent
          </button>
        )}
      </div>
      {rows.map((r) => (
        <StateColorRow key={r.role} role={r.role} label={r.label} value={r.value} onChange={(hex) => onChange(r.role, hex)} />
      ))}
    </div>
  )
}

// ── Popover placement ───────────────────────────────────────────────────────
// Panels carrying a ColorPickerPanel are ~540px — taller than the room under a
// trigger sitting low on the page, which is how "Add color family" ended up
// with its primary button below the fold. Measure on open, flip above when
// there's more room there, and cap the panel to the space that actually exists
// (the caller scrolls its body inside the remainder).
export function usePopoverPlacement(
  anchor: RefObject<HTMLElement | null>,
  open: unknown,
  { min = 240, max = 520, prefer = 320 }: { min?: number; max?: number; prefer?: number } = {},
) {
  const [place, setPlace] = useState<{ up: boolean; max: number }>({ up: false, max })
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom - 16
      const above = r.top - 16
      const up = below < prefer && above > below
      setPlace({ up, max: Math.max(min, Math.min(max, up ? above : below)) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return place
}

// ── State Colors select ─────────────────────────────────────────────────────
// A ColorSelect-shaped trigger that owns FOUR values instead of one, so it
// can't reuse ColorSelect (which edits a single hex). It used to be the
// "Background & State Colors" control, but the page background is now DERIVED
// from the base (see `backgroundFromBase`) — so the background swatch is gone
// and what's left is exactly the four status colors.
export function StateColorsSelect({
  neutral, error, warning, success, info, onChange, onMatchAccent, label, panelClassName,
}: {
  neutral?: string
  error: string; warning: string; success: string; info: string
  onChange: (role: IntentRole, hex: string) => void
  onMatchAccent?: () => void
  label?: string
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const swatches = [
    ...(neutral ? [{ hex: neutral, label: 'Neutral' }] : []),
    { hex: error, label: 'Error' },
    { hex: success, label: 'Success' },
    { hex: warning, label: 'Warning' },
    { hex: info, label: 'Info' },
  ]

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <span className="text-xs text-fg-muted">{label}</span>}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="State colors"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[13px] bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg transition-colors text-left"
        >
          <span className="flex-1 min-w-0 flex items-center gap-1.5">
            {swatches.map((s) => (
              <span key={s.label} className={SWATCH} style={{ backgroundColor: s.hex }} title={`${s.label} — ${s.hex}`} />
            ))}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-fg-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-30 mt-1.5 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1.5 ${panelClassName ?? 'w-full min-w-[17rem] max-h-[360px]'}`}
            >
              <StateColorRows
                bare
                neutral={neutral}
                error={error}
                warning={warning}
                success={success}
                info={info}
                onChange={onChange}
                onMatchAccent={onMatchAccent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Scale row (12 tones, ANCHOR marker — the tone pinned to the input color,
// always tone 9/BASE_TONE by construction; "anchor" names what the badge
// shows without colliding with `grayBaseColor`'s "Base" label) ─────────────

/** Ink that stays legible on `hex` — used by the `numbersInside` variant, whose
 *  whole point is showing the tone number ON the tone so contrast is visible. */
function readableInkOn(hex: string): string {
  try {
    // Alpha tones composite over the page, so judge the composite, not the
    // overlay: a 10%-alpha swatch reads as the page, not as the raw color.
    const c = chroma(hex)
    return c.alpha() < 0.5 || c.luminance() > 0.42 ? '#0a0a0a' : '#ffffff'
  } catch {
    return '#0a0a0a'
  }
}

export function ScaleRow({
  scale, baseIndex = BASE_TONE, showNumbers = true, labels, size = 'default',
  numbersInside = false, ariaLabel,
}: {
  scale: Record<number, string>
  baseIndex?: number
  showNumbers?: boolean
  labels?: string[]
  size?: 'default' | 'thin'
  /** Renders the tone number INSIDE its swatch (instead of as a caption above)
   *  so the number doubles as a live contrast check against the tone itself.
   *  Taller (`h-11`) to fit the label, but the SAME `rounded-md` corner as
   *  every other ScaleRow — a one-off `rounded-[13px]` here (matched to the
   *  ColorSelect dropdown above it) read as inconsistent with the state-color
   *  ramps sitting directly below it, on the same tab. */
  numbersInside?: boolean
  ariaLabel?: string
}) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  const thin = size === 'thin'
  return (
    <div className="grid grid-cols-12 gap-1" role="group" aria-label={ariaLabel}>
      {entries.map(([key, color], i) => {
        const k = Number(key)
        const isBase = k === baseIndex
        const onLight = k >= BASE_TONE ? '#ffffff' : '#0a0a0a'
        const label = labels?.[i] ?? key
        return (
          <div key={key} className="flex flex-col gap-0.5 min-w-0">
            {showNumbers && !numbersInside && (
              <span className="text-[9px] text-fg-faint text-center font-mono tabular-nums leading-none truncate">{label}</span>
            )}
            <div
              className={`${numbersInside ? 'h-11' : thin ? 'h-4' : 'h-8'} rounded-md flex items-center justify-center overflow-hidden ${
                isBase ? 'ring-2 ring-fg/25 ring-offset-1 ring-offset-app' : ''
              }`}
              style={{ backgroundColor: color }}
              title={isBase ? `Anchor — tone ${key} — ${color}` : `Tone ${key} — ${color}`}
            >
              {numbersInside ? (
                /* The NUMBER only — never "9 Anchor". At 12 cells across the
                   center column the anchor cell has ~29px of room and the word
                   needs ~58px, so it truncated to "9 …" and cost the one thing
                   this variant exists to show: the step number, legible on its
                   own tone. The ring + dot mark the anchor; the word lives in
                   the title tooltip and the token table's row badge. */
                <span
                  className="px-1 text-[10px] font-mono tabular-nums leading-none"
                  style={{ color: readableInkOn(color) }}
                >
                  {label}
                </span>
              ) : (
                /* No text in the compact variants — "anchor" doesn't fit any of
                   the 12 cells at that size (tried it; clips even truncated).
                   The ring IS the persistent marker; the word lives in the
                   title tooltip and the token table's row badge, which has room. */
                isBase && !thin && (
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: onLight }} aria-hidden />
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Same checkerboard used by Foundations · Opacity's "Opacity Scale" strip
// (`Step6_Opacity.tsx`) — reused verbatim so a translucent swatch reads as
// transparent everywhere in the app, not just on one page.
const CHECKER = {
  backgroundImage: 'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
} as const

/** The brand ramp's alpha twin, rendered as a labeled strip over a checkerboard
 *  — Picker Color's mirror of Opacity's own "Opacity Scale" strip, so the same
 *  visual language ("this has a checker behind it → it's translucent") means
 *  the same thing in both places. A `ScaleRow` of solid-looking swatches read
 *  as just another color ramp with no way to tell it apart from the brand ramp
 *  above it; painting it on a flat page color (rather than a checker) had the
 *  same problem AND silently broke across light/dark preview, since an alpha
 *  value is only correct against the specific page it was solved for. */
export function TransparencyStrip({ scale, labels }: { scale: Record<number, string>; labels?: string[] }) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  return (
    <div className="flex rounded-lg overflow-hidden border border-line" style={{ ...CHECKER, backgroundSize: '12px 12px' }}>
      {entries.map(([key, color], i) => (
        <div key={key} className="flex-1 flex flex-col items-center min-w-0">
          <div className="w-full h-9" style={{ backgroundColor: color }} title={`Tone ${key} — ${color}`} />
          <span className="text-[9px] font-mono text-fg-faint py-1 bg-surface w-full text-center border-t border-line truncate">
            {labels?.[i] ?? key}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Accent-scale link affordances ──────────────────────────────────────────

// A low-saturation neutral that keeps a hint of the brand hue — used when the
// neutral scale is "linked" to the brand.
export function neutralFromBrand(hex: string): string {
  try {
    return chroma(hex).set('hsl.s', 0.08).set('hsl.l', 0.46).hex()
  } catch {
    return hex
  }
}

export function InfoDot({ tip }: { tip: string }) {
  return (
    <span className="relative group inline-flex">
      <span
        className="w-4 h-4 rounded-full border border-line-strong text-fg-muted flex items-center justify-center text-[10px] font-semibold leading-none cursor-help"
        aria-label={tip}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 rounded-lg bg-fg text-app text-[11px] leading-snug px-2.5 py-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity z-40 shadow-lg"
      >
        {tip}
      </span>
    </span>
  )
}

export function LinkToggle({ active, onClick, accentColor }: { active: boolean; onClick: () => void; accentColor?: string }) {
  const accent = accentColor ?? '#111111'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Neutral linked to accent' : 'Link neutral to accent'}
      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 ${
        active ? '' : 'bg-surface border-line-strong text-fg-faint hover:text-fg hover:border-fg-faint'
      }`}
      style={active
        ? { backgroundColor: `${accent}18`, borderColor: accent, color: accent, ['--tw-ring-color' as string]: accent }
        : { ['--tw-ring-color' as string]: accent }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
      </svg>
    </button>
  )
}
