// Reusable color-scale controls shared by the Color foundation (Step2) and the
// "Add a theme" modal: a preset-aware color dropdown, the 12-tone BASE scale
// strip, the brand↔neutral link toggle, and the info dot. Kept presentational
// (no store writes) so callers own their own state.

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import chroma from 'chroma-js'
import { BASE_TONE, DEFAULT_NEUTRAL_TINT, neutralTintSpec, type NeutralTint } from '../../lib/colorUtils'
import { PRESET_GROUPS } from '../../lib/brandPalette'
import { INDUSTRY_SPECTRUM } from '../../lib/industryPacks'
import { ColorPickerPanel } from '../ui/ColorField'
import { THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'

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

// Which swatches `ColorPickerPanel`'s "Curated palette" bar offers for a given
// family/slot. Accent and custom families get `INDUSTRY_SPECTRUM` — the same
// vetted hexes as the scale-guide agent, in `BRAND_SPECTRUM` hue order for
// the bar. An INTENT does not: the hue IS the meaning, so a red drifting toward green
// stops reading as an error (the same rule `recommendStateColors` follows when
// it blends chroma but never hue). Those slots therefore offer `STATE_PRESETS`,
// the exact list the State Colors dropdown already shows, so no two entry
// points can recommend different reds. Neutral is in that map for the same
// reason — it's an intent (see CLAUDE.md), and a rainbow bar under a gray
// ramp is as wrong as one under a red.
//
// It lives HERE, beside `STATE_PRESETS`, rather than in either caller: both
// Primitives' family pickers and "Add a theme"'s slot pickers need it, and a
// second copy is exactly how `AddThemeModal` ended up hand-duplicating all four
// status preset lists in the first place.
const INTENT_KEYS: readonly string[] = ['neutral', 'error', 'warning', 'success', 'info']
export function curatedPaletteFor(familyKey: string) {
  return INTENT_KEYS.includes(familyKey)
    ? STATE_PRESETS[familyKey as IntentRole]
    : INDUSTRY_SPECTRUM
}

// The system's color chip — a rounded SQUARE, never a dot. Every swatch in
// these controls (trigger · dropdown option · custom row · state row) shares it,
// so the shape can't drift apart again.
export const SWATCH = 'w-[18px] h-[18px] rounded-[4px] flex-shrink-0 ring-1 ring-black/10'

// ── The Color hub's left column, in its two states ──────────────────────────
// Lives HERE, not in one tab, because the column is shared: Primitives lists
// families, Semantics lists token categories, and both collapse the same rail
// to the same widths. It's also what `Configurator` sizes TopNav's brand block
// from — the brand block's right border IS this column's divider continued up
// through the header, so a magic number in two files is a broken line waiting
// to happen.
export const COLOR_RAIL_WIDTH = 240
// 56px = the nav's own `px-2` (16) + a 40px row that centres an 18px swatch or
// a 15px glyph. Deliberately NOT the 32px dead strip `PreviewPanel` collapses
// to: that panel is a read-only specimen, so collapsing it costs nothing but
// sight, whereas this column is NAVIGATION — at 32px there's no room for the
// swatches/icons and switching would mean expanding first, every time. Keeping
// them is what makes this a collapse rather than a hide (the same call
// `FoundationIconRail` already makes: drop the labels, keep the glyphs).
export const COLOR_RAIL_COLLAPSED_WIDTH = 56

/** The collapse/expand control. Lives in the family-heading row's trailing slot —
 *  that row was already `justify-between` around a lone label, i.e. the slot
 *  was reserved and empty.
 *  Same glyph as `PreviewPanel`'s own collapse button (a panel split by a
 *  divider), not a directional chevron — a chevron reads as "step in this
 *  direction," but this and `PreviewPanel`'s control do the identical job
 *  (toggle a side column's width), so they need the identical icon, not two
 *  icons for one action. `PreviewPanel` never flips its glyph either: it only
 *  renders this button in the expanded state (the collapsed state is a
 *  separate outer strip with its own chevron, a different affordance one
 *  level up) — this one stays inline in both states, so the icon stays fixed
 *  and only `aria-label`/`title` carry which way a click will go. */
export function RailToggle({
  collapsed,
  onClick,
  // What the rail actually lists. Defaults to the Variables wording every
  // pre-existing call site relies on; the component showcase passes its own,
  // because "collapse the variable list" is a lie next to a component filter.
  noun = 'variable list',
  expandedHint = 'Collapse sidebar — give the table more width',
}: {
  collapsed: boolean
  onClick?: () => void
  noun?: string
  expandedHint?: string
}) {
  if (!onClick) return null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand the ${noun}` : `Collapse the ${noun}`}
      title={collapsed ? 'Expand sidebar' : expandedHint}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-faint hover:text-fg hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    </button>
  )
}

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
          {label && <span className="text-ui text-fg">{label}</span>}
          <span className={SWATCH} style={{ backgroundColor: value }} />
          <span className="text-ui font-mono text-fg-muted tabular-nums">{hexLabel}</span>
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
                        <span className="text-caption font-mono text-fg-faint">{o.hex}</span>
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
                    <span className="text-caption font-mono text-fg-faint flex-shrink-0">#</span>
                    <input
                      value={customDraft}
                      onChange={(e) => handleCustomDraft(e.target.value)}
                      placeholder="9522E9"
                      spellCheck={false}
                      aria-label={`Custom ${label ?? 'color'} hex`}
                      className="w-[4.5rem] flex-shrink-0 text-body font-mono tabular-nums bg-surface border border-line rounded-md px-1.5 py-1 text-fg outline-none focus:border-line-strong"
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
                <div className="px-2 pt-1.5 pb-0.5 text-caption font-semibold text-fg">{groupsLabel}</div>
              )}
              {groups.map((g) => (
                <div key={g.label || 'all'}>
                  {g.label && (
                    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                      <span className="text-mini text-fg-faint uppercase tracking-wider">{g.label}</span>
                      {g.badge && (
                        <span className="text-micro px-1.5 rounded-full bg-elevated text-fg-faint border border-line leading-relaxed">
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
                          <span className="text-caption font-mono text-fg-faint flex-shrink-0">{o.hex}</span>
                        </button>
                        {g.onRemove && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); g.onRemove!(o.hex) }}
                            aria-label={`Remove ${o.label}`}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-fg-faint hover:text-status-danger hover:bg-status-danger/10 opacity-0 group-hover/opt:opacity-100 transition-all"
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
        <span className="text-caption font-mono text-fg-faint flex-shrink-0">#</span>
        <input
          value={draft}
          onChange={(e) => handleDraft(e.target.value)}
          spellCheck={false}
          aria-label={`${label} hex`}
          className="w-[4.5rem] flex-shrink-0 text-body font-mono tabular-nums bg-surface border border-line rounded-md px-1.5 py-1 text-fg outline-none focus:border-line-strong"
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
          {/* Same family-base rule as Primitives' edit popover: this row IS a
              family anchor (Neutral / a state), so the curated accessible
              alternatives belong here too.
              `palette={[]}` suppresses the picker's own "Curated palette" bar,
              though — this row already renders `STATE_PRESETS[role]` as the
              swatch strip directly above, and the bar would be that identical
              list a second time inside the same expanded block. */}
          <ColorPickerPanel value={value} onChange={onChange} suggestions palette={[]} />
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
        <span className="text-caption font-semibold text-fg">State colors</span>
        {onMatchAccent && (
          <button
            type="button"
            onClick={onMatchAccent}
            className="text-caption text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
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
// `side` is for a panel docked BESIDE its trigger rather than under it. The
// vertical budget is then measured from the trigger's own TOP (a side-docked
// panel top-aligns with it) instead of from its bottom edge — using the
// stacked numbers there would under-report the room by the trigger's height
// and cap a panel that had space to spare. `up` keeps its meaning in both
// modes: "grow upward from the anchored edge".
export function usePopoverPlacement(
  anchor: RefObject<HTMLElement | null>,
  open: unknown,
  { min = 240, max = 520, prefer = 320, side = false }:
    { min?: number; max?: number; prefer?: number; side?: boolean } = {},
) {
  const [place, setPlace] = useState<{ up: boolean; max: number }>({ up: false, max })
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - (side ? r.top : r.bottom) - 16
      const above = (side ? r.bottom : r.top) - 16
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

/** Width of a docked `ColorPickerPanel`. Shared so the two callers can't drift. */
export const COLOR_PICKER_W = 288

/**
 * THE portaled `ColorPickerPanel` popover — one implementation, two callers
 * (`ThemePanel`'s slot rows and the Themes-workspace quick-settings Accent
 * swatch). It was written once inside `ThemePanel.SlotRow`; the moment the
 * quick rail needed the same thing the choice was a sibling import or a forked
 * copy, so it lives here with `usePopoverPlacement` / `TokenDetailsModal` /
 * `DeleteThemeModal` for the same stated reason.
 *
 * Portaled to `<body>` and positioned `fixed`: both call sites sit inside an
 * `overflow-y-auto` column, which CLIPS a ~540px absolutely-positioned panel at
 * its own bottom edge. No z-index fixes an overflow clip.
 */
export function ColorPickerPopover({
  open, onClose, anchor, label, value, onChange, palette, suggestions = true, appearance,
}: {
  open: boolean
  onClose: () => void
  anchor: RefObject<HTMLElement | null>
  label: string
  value: string
  onChange: (hex: string) => void
  palette?: { label: string; hex: string }[]
  suggestions?: boolean
  appearance?: 'light' | 'dark'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const place = usePopoverPlacement(anchor, open)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // `useLayoutEffect`, so the first measurement lands BEFORE paint and the panel
  // never shows for a frame at the previous trigger's position. A stale `rect`
  // while closed is harmless — nothing renders (see the `!open` guard below) and
  // this re-measures ahead of the next paint — which is why there is no reset
  // here: clearing it in an effect would be a setState-in-effect cascade for a
  // value no one can see.
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => { const r = anchor.current?.getBoundingClientRect(); if (r) setRect(r) }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    function onDown(event: MouseEvent) {
      const target = event.target as Node
      // The panel is not a DOM descendant of the trigger, so checking only the
      // trigger would close the picker on its own clicks.
      if (anchor.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    // Escape closes the PICKER, not whatever surface is behind it. Both this and
    // the host panel's own Escape handler sit on `document`, so this one runs in
    // the CAPTURE phase and stops propagation — otherwise dismissing a colour
    // picker also threw away the half-filled theme behind it.
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
  }, [open, anchor, onClose])

  if (!open || !rect) return null
  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        role="dialog"
        aria-label={`${label} color`}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          position: 'fixed',
          left: Math.min(rect.left, window.innerWidth - COLOR_PICKER_W - 12),
          ...(place.up
            ? { bottom: window.innerHeight - rect.top + 8 }
            : { top: rect.bottom + 8 }),
          maxHeight: place.max,
          width: COLOR_PICKER_W,
        }}
        className="z-[60] rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 flex-shrink-0">
          <span className={SWATCH} style={{ backgroundColor: value }} />
          <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{label}</span>
          <span className="text-caption font-mono tabular-nums text-fg-faint flex-shrink-0">{value.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          <ColorPickerPanel
            value={value}
            onChange={onChange}
            suggestions={suggestions}
            palette={palette}
            appearance={appearance}
            fieldAppearance={appearance}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
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
  numbersInside = false, joined = false, ariaLabel, selectedIndex, recommendedIndex, onSelect, checkerboard = false,
}: {
  scale: Record<number, string>
  baseIndex?: number
  showNumbers?: boolean
  labels?: string[]
  /** `md` = `h-9`, same outer box as Color Agent (`size-icon`). Used by the
   *  primitives quick-edit strip so hex · ramp · agent share one height. */
  size?: 'default' | 'thin' | 'md'
  /** Renders the tone number INSIDE its swatch (instead of as a caption above)
   *  so the number doubles as a live contrast check against the tone itself.
   *  Default is `h-11`; the primitives strip passes `size="md"` (`h-9`) so the
   *  ramp matches Color Agent and the hex chip. Same `rounded-md` as other
   *  ScaleRows — a one-off `rounded-[13px]` here (matched to the ColorSelect
   *  dropdown above it) read as inconsistent with the state-color ramps
   *  sitting directly below it, on the same tab. */
  numbersInside?: boolean
  /** Renders the 12 tones as ONE continuous bar — no gaps between swatches,
   *  only the outer corners rounded — so the ramp reads as a single gradient
   *  strip rather than 12 separate chips. Pairs with `numbersInside`: with no
   *  gutters there's nowhere for a caption to sit, so the number moves onto
   *  its own tone (which is also what makes it a live contrast check). */
  joined?: boolean
  ariaLabel?: string
  /** "What's currently picked" for an interactive caller (e.g. a semantic
   *  token's tone) — deliberately separate from `baseIndex` (the PRIMITIVE's
   *  own tone-9 anchor, unrelated to any particular picker's selection).
   *  Only meaningful together with `onSelect`. */
  selectedIndex?: number | null
  /** A hint, shown as a tinted number — independent of `selectedIndex` (a
   *  tone can be recommended, selected, both, or neither). */
  recommendedIndex?: number | null
  /** Present ⇒ every cell becomes a button and the row is a picker (Token
   *  Details' tone ramps). Absent ⇒ ScaleRow stays the read-only strip every
   *  other caller (Picker Color, AddThemeModal) already relies on — adding
   *  interactivity never changes their rendering. */
  onSelect?: (tone: number, hex: string) => void
  /** For a translucent scale (Accent-Alpha): paints the SAME `CHECKER` pattern
   *  `FamilySwatch`'s nav chip and `AlphaHexCell`'s table cells already use
   *  behind every cell, then layers the tone's real rgba on top — the one
   *  visual language this app uses for "this is see-through," now consistent
   *  across the nav chip, the table and this promoted quick-edit ramp. Without
   *  it a translucent cell painted flat against `bg-app`/`bg-surface` reads as
   *  just another solid swatch, and — worse — silently lies about the color:
   *  step 2 of Accent-Alpha is `rgba(88,5,222,0.06)`, which paints as
   *  near-white on the app's own near-white background, nowhere near what it
   *  actually renders as once placed over real content. */
  checkerboard?: boolean
}) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  const thin = size === 'thin'
  const Cell = onSelect ? 'button' : 'div'
  return (
    <div className={`grid grid-cols-12 ${joined ? 'gap-0' : 'gap-1'}`} role="group" aria-label={ariaLabel}>
      {entries.map(([key, color], i) => {
        const k = Number(key)
        const isBase = k === baseIndex
        const isSelected = k === selectedIndex
        const isRecommended = k === recommendedIndex
        const onLight = k >= BASE_TONE ? '#ffffff' : '#0a0a0a'
        const label = labels?.[i] ?? key
        // Joined: square up the inner seams so the 12 cells form one bar,
        // keeping the radius only on the two ends of the strip.
        const corner = !joined
          ? 'rounded-md'
          : i === 0
          ? 'rounded-l-[10px]'
          : i === entries.length - 1
          ? 'rounded-r-[10px]'
          : ''
        return (
          <div key={key} className="flex flex-col gap-0.5 min-w-0">
            {showNumbers && !numbersInside && (
              <span
                className={`text-micro text-center font-mono tabular-nums leading-none truncate ${
                  isSelected ? 'text-accent-ui font-semibold' : isRecommended ? 'text-accent-ui/70' : 'text-fg-faint'
                }`}
              >
                {label}
              </span>
            )}
            <Cell
              {...(onSelect ? { onClick: () => onSelect(k, color), type: 'button' as const } : {})}
              className={`${thin ? 'h-4' : numbersInside ? (size === 'md' ? 'h-9' : 'h-11') : 'h-8'} w-full ${corner} relative flex items-center justify-center overflow-hidden transition-transform ${
                // The anchor ring goes INSET when joined — an offset ring would
                // punch a gap through the seams the joined variant exists to
                // close. Tone 9 stays marked either way (see CLAUDE.md).
                // `z-[1]` — local seam only. `z-10` leaked over sticky table
                // headers when overview ramps scrolled underneath them.
                isBase ? (joined ? 'ring-2 ring-inset ring-fg/30 relative z-[1]' : 'ring-2 ring-fg/25 ring-offset-1 ring-offset-app') : ''
              } ${
                isSelected
                  ? 'ring-2 ring-accent-ui ring-offset-1 ring-offset-app'
                  // The number caption is the recommended-tone signal, but
                  // it's gone whenever `showNumbers` is off (ToneAxisRow
                  // prints one shared axis for several ramps instead) — a
                  // faint ring keeps the hint visible on the swatch itself.
                  // Only when nothing stronger (selected) already owns the ring.
                  : isRecommended && !showNumbers ? 'ring-1 ring-accent-ui/50' : ''
              } ${
                onSelect ? 'hover:scale-105 cursor-pointer' : ''
              }`}
              style={checkerboard ? undefined : { backgroundColor: color }}
              title={isBase ? `Anchor — tone ${key} — ${color}` : `Tone ${key} — ${color}${isRecommended ? ' · recommended' : ''}`}
              aria-label={onSelect ? `Use tone ${key}${isRecommended ? ' (recommended)' : ''}${isSelected ? ' (selected)' : ''}` : undefined}
              aria-pressed={onSelect ? isSelected : undefined}
            >
              {checkerboard && (
                <>
                  {/* Same two-layer trick as `AlphaHexCell`/`FamilySwatch`: a
                      checker backdrop, then the real rgba painted on top of it
                      — never composited into one flat color, so a cell stays
                      provably translucent instead of a solid guess at what it
                      "probably" looks like on white. Sized to the cell height,
                      same ratio the other two callers scale their own swatch
                      by (~cell-height ÷ 4). */}
                  <span
                    className="absolute inset-0"
                    style={{ ...CHECKER, backgroundSize: numbersInside ? '10px 10px' : thin ? '4px 4px' : '7px 7px' }}
                    aria-hidden
                  />
                  <span className="absolute inset-0" style={{ backgroundColor: color }} aria-hidden />
                </>
              )}
              {numbersInside ? (
                /* The NUMBER only — never "9 Anchor". At 12 cells across the
                   center column the anchor cell has ~29px of room and the word
                   needs ~58px, so it truncated to "9 …" and cost the one thing
                   this variant exists to show: the step number, legible on its
                   own tone. The ring + dot mark the anchor; the word lives in
                   the title tooltip and the token table's row badge. */
                <span
                  className="px-1 text-mini font-mono tabular-nums leading-none"
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
            </Cell>
          </div>
        )
      })}
    </div>
  )
}

// Same checkerboard used by Foundations · Opacity's "Opacity Scale" strip
// (`Step6_Opacity.tsx`) — reused verbatim so a translucent swatch reads as
// transparent everywhere in the app, not just on one page.
export const CHECKER = {
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
          <span className="text-micro font-mono text-fg-faint py-1 bg-surface w-full text-center border-t border-line truncate">
            {labels?.[i] ?? key}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Accent-scale link affordances ──────────────────────────────────────────

// A low-saturation neutral that keeps a hint of the brand hue — used when the
// neutral scale is "linked" to the brand. How MUCH hue it keeps is the system's
// `neutralTint` (see NEUTRAL_TINTS): the linked neutral and the page it derives
// have to agree on the level, or a "Vivid" system would still flatten the
// neutral to a near-gray the moment the accent moved. Defaults to `subtle`,
// whose 0.08 is the pre-tint constant verbatim.
// Moved to `colorUtils` (pure colour math, and the store's v47 migration needs
// it). Re-exported here so the existing import sites keep working — and so
// there's still exactly ONE implementation, which is the point.
export { neutralFromBrand } from '../../lib/colorUtils'

export function InfoDot({ tip }: { tip: string }) {
  return (
    <span className="relative group inline-flex">
      <span
        className="w-4 h-4 rounded-full border border-line-strong text-fg-muted flex items-center justify-center text-mini font-semibold leading-none cursor-help"
        aria-label={tip}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 rounded-lg bg-fg text-app text-caption leading-snug px-2.5 py-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity z-40 shadow-lg"
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

// ── System ramp grid ────────────────────────────────────────────────────────
// One labelled row per primitive family, twelve tone cells each, over a single
// shared 1–12 axis. Every cell is a real token, so picking one is a direct
// "use {family.tone}" — no intermediate "first choose a family, then choose a
// tone" step, and every family stays visible for comparison while you choose.
//
// This started life inside ColorPickerPanel as its "Palette — your system's
// ramps" block. It was the wrong home: that picker exists to author a NEW raw
// colour, so offering the system's existing tokens there mixed two different
// jobs in one popover. It belongs where you're genuinely choosing an existing
// token — the semantic Token Details modal — so it moved here to be shared.
export function SystemRampGrid({
  ramps,
  selected = null,
  onPick,
  ariaLabel,
}: {
  /** Families in display order; empty ramps are skipped. */
  ramps: { key: string; scale: Record<number, string> | undefined }[]
  /** The currently-referenced token, ringed in the grid. */
  selected?: { family: string; tone: number } | null
  onPick: (family: string, tone: number, hex: string) => void
  ariaLabel?: string
}) {
  const rows = ramps.filter((r) => r.scale && Object.keys(r.scale).length > 0)
  if (!rows.length) return null
  // A translucent swatch on the near-black dialog card reads as an empty cell,
  // so alpha rows (`accent-a`, `black-a`, …) get the SAME checkerboard the
  // Accent-Alpha strip and every alpha table cell already use — "checker behind
  // it → it's translucent", one visual language app-wide.
  const isAlphaRow = (key: string) => /-a$/.test(key)

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid items-center"
      style={{ gridTemplateColumns: '4.25rem repeat(12, minmax(0, 1fr))', columnGap: 3, rowGap: 4 }}
    >
      {rows.map((row) => (
        <Fragment key={row.key}>
          {/* Platform UI font, not mono: these are family LABELS ("accent",
              "neutral-dark"), not code identifiers the way the dialog's Name
              row and CSS-var chip are. Mono here made the dialog read as two
              unrelated typefaces stacked. */}
          <span className="text-micro font-medium text-fg-faint truncate pr-1" title={row.key}>{row.key}</span>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((tone) => {
            const hex = row.scale?.[tone]
            if (!hex) return <span key={tone} style={{ gridColumn: tone + 1 }} />
            const on = selected?.family === row.key && selected?.tone === tone
            const alpha = isAlphaRow(row.key)
            return (
              <button
                key={tone}
                type="button"
                onClick={() => onPick(row.key, tone, hex)}
                title={`${row.key}.${tone} — ${hex}`}
                aria-label={`Use ${row.key}.${tone}`}
                aria-pressed={on}
                className={`h-4 w-full min-w-0 rounded-[4px] overflow-hidden transition-all ${
                  on
                    ? 'ring-2 ring-accent-ui ring-offset-1 ring-offset-app'
                    : 'ring-1 ring-black/10 dark:ring-white/10 hover:ring-black/25 dark:hover:ring-white/25'
                }`}
                style={{ gridColumn: tone + 1, ...(alpha ? { ...CHECKER, backgroundSize: '5px 5px' } : { background: hex }) }}
              >
                {alpha && <span className="block h-full w-full" style={{ background: hex }} />}
              </button>
            )
          })}
        </Fragment>
      ))}
      {/* Shared tone axis — printed once for every ramp above it, the same
          1–12 the scale editors number. */}
      <span aria-hidden />
      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
        <span
          key={`axis-${n}`}
          className="text-nano tabular-nums leading-none text-center text-fg-faint"
          style={{ gridColumn: n + 1 }}
          aria-hidden
        >
          {n}
        </span>
      ))}
    </div>
  )
}

// ── Token Details modal ───────────────────────────────────────────────────
// Lives here (not in Step3) because it is the ONE "open a token, edit its
// value" surface for the whole Color hub: Semantics' role rows AND Primitives'
// tone rows both open it. Primitives used to expand its rows inline instead —
// two different interactions for the same job, on two tabs of the same hub —
// which is exactly the inconsistency this move removes. The shell owns the
// header, Name, CSS var and Description; the per-mode value editors are passed
// in as `sections`, so each caller keeps its own already-correct read/write
// logic (flat's TonePicker, the architecture view's ArchModeEditor,
// Primitives' light/dark ColorPickerPanel) and only WHERE they render is
// shared.

/** Light/dark polarity glyph for a mode's header — the shared `light-mode.svg`
 *  / `dark-mode.svg` assets (hard-#white strokes) painted with `currentColor`
 *  via a CSS mask, so one file serves the tint (amber for the sun, indigo for
 *  the moon — the colour is still what tells the two apart at a glance). */
export function KindIcon({ kind }: { kind: 'light' | 'dark' }) {
  const src = kind === 'light' ? '/icons/settings/light-mode.svg' : '/icons/settings/dark-mode.svg'
  const mask = `url('${src}') center / contain no-repeat`
  return (
    <span
      aria-hidden
      className={`h-[11px] w-[11px] flex-shrink-0 bg-current ${kind === 'light' ? 'text-status-warning' : 'text-indigo-400'}`}
      style={{ WebkitMask: mask, mask }}
    />
  )
}

// Dialog width. Was 256 (w-64, borrowed from the "Edit family color" popover),
// which left the 12-tone ramp grid ~136px for twelve cells + gaps — swatches
// under 9px, unpickable and unreadable. 360 gives the grid ~240px (20px cells)
// while still fitting beside the table on a laptop window.
const PANEL_W = 360
const THEME_DRAWER_LEFT = THEME_LIBRARY_WIDTH
const THEME_DRAWER_TOP = 72
const THEME_DRAWER_BOTTOM = 36

/** One mode's value editor, in a collapsible card. See `TokenDetailsModal`. */
export type TokenDetailSection = {
  key: string
  label: string
  kind?: 'light' | 'dark'
  content: ReactNode
}

/** Copyable CSS-variable chip — the token's code syntax, e.g. `var(--surface-0)`. */
export function CssVarChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const cssVar = `var(--${name})`
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(cssVar)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
      title={`Copy ${cssVar}`}
      aria-label={`Copy CSS variable ${cssVar}`}
      className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface border border-line text-mini font-mono text-fg-faint hover:text-fg-muted hover:border-line-strong transition-colors max-w-full"
    >
      {copied ? (
        <>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-success flex-shrink-0"><path d="M2.5 6.5 5 9l4.5-5.5" /></svg>
          <span className="text-status-success">copied</span>
        </>
      ) : (
        <>
          <span className="truncate">--{name}</span>
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="flex-shrink-0 opacity-70"><rect x="4.5" y="4.5" width="7" height="7" rx="1.4" /><path d="M9.5 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h1.5" strokeLinecap="round" /></svg>
        </>
      )}
    </button>
  )
}

export function TokenDetailsModal({
  name, cssVarName, description, onReset, resetDisabled, onClose, reduce, sections, initialOpenKey,
}: {
  name: string
  /** The Figma mock doesn't show this, but the inline editor it replaces did
   *  — dropping it would be a feature regression the redesign never asked
   *  for, so it rides along the Name row instead (the other "identifier"
   *  for this token). */
  cssVarName: string
  description: string
  onReset: () => void
  resetDisabled: boolean
  onClose: () => void
  reduce: boolean
  /** One card per mode (light · dark · every custom theme). */
  sections: TokenDetailSection[]
  /** Which section starts expanded. Defaults to the first; callers pass the
   *  mode currently being PREVIEWED, so the dialog opens on the value the
   *  user can actually see change. */
  initialOpenKey?: string
  /** Kept for call-site compatibility. Token details now always use the
   *  shared Themes Library drawer position rather than a table-local popover. */
  anchorRef?: RefObject<HTMLElement | null>
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Only the FIRST mode opens by default. A system with light + dark + two
  // custom themes stacked four full ramp grids into one dialog, so the mode
  // you actually came to edit could be an entire screen-height of scrolling
  // away; collapsed peers keep every mode reachable in one view.
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = sections.find((s) => s.key === initialOpenKey) ?? sections[0]
    return new Set(first ? [first.key] : [])
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
      onMouseDown={onClose}
      // This is an editing task, so it shares ThemePanel's left-docked drawer
      // position. A token-detail panel should never appear as a third modal
      // language beside “New theme” and “Edit family color”.
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Token Details"
    >
      <motion.div
        style={{
          position: 'fixed',
          left: THEME_DRAWER_LEFT,
          top: THEME_DRAWER_TOP,
          bottom: THEME_DRAWER_BOTTOM,
          width: `min(${PANEL_W}px, calc(100vw - ${THEME_DRAWER_LEFT + 16}px))`,
        }}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative h-full flex flex-col rounded-r-2xl border border-l-0 border-line bg-app shadow-[16px_0_48px_-12px_rgba(0,0,0,0.28)] overflow-hidden"
      >
        {/* Header — title + Reset, matching the Figma dialog. Close sits
            absolutely in the corner (same position the design uses) rather
            than in the flex row, so Reset stays flush right regardless of
            title length. */}
        <div className="flex items-center justify-between gap-3 pl-4 pr-10 h-10 border-b border-line flex-shrink-0">
          <h2 className="text-ui font-semibold text-fg truncate">Token Details</h2>
          <button
            onClick={onReset}
            disabled={resetDisabled}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-6 rounded-lg border border-line text-mini text-fg-muted hover:text-accent-ui hover:border-line-strong disabled:opacity-30 disabled:hover:text-fg-muted disabled:hover:border-line transition-colors"
          >
            Reset
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 1 1 2.6 6.36" />
              <path d="M3 21v-6h6" />
            </svg>
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {/* Name + Description — read-only: both are catalogue metadata (the
              role's fixed key/label and its fixed description), not per-token
              user text, so there's nothing here to save. Shown for context,
              styled like the Figma input/textarea so the dialog still reads
              as an editor, not just a viewer. */}
          <div className="flex flex-col gap-2 px-4 pt-3.5 pb-3.5 border-b border-line/60">
            <div className="flex h-6 rounded-md border border-line overflow-hidden">
              <span className="px-2 flex items-center bg-elevated text-mini text-fg-faint border-r border-line flex-shrink-0">Name</span>
              <span className="px-2 flex items-center flex-1 min-w-0 text-caption text-fg-muted font-mono truncate" title={name}>{name}</span>
            </div>
            {/* Below the Name row, not beside it — at this width (w-64,
                matching the Edit-family-color popover) a copy chip sharing
                the row with the name pill left ~2 characters of the name
                visible on anything longer than "error". */}
            <CssVarChip name={cssVarName} />
            <div className="flex flex-col gap-1">
              <span className="text-mini text-fg-faint">Description</span>
              <p className="px-2 py-1.5 rounded-md border border-line text-caption text-fg-muted leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
            <span className="text-caption font-semibold text-fg">Values</span>
            {sections.map((s) => {
              const isOpen = open.has(s.key)
              return (
                // Each card is painted in ITS OWN appearance — `light`/`dark`
                // re-declare the palette vars for this subtree only (see
                // index.css), so a dark mode's ramps are judged on the dark
                // page they actually ship against, and the light card stays
                // light even while the app chrome is dark. Not a hardcoded
                // colour: it's the same two token sets the whole app uses.
                <div key={s.key} className={`${s.kind ?? 'light'} bg-app rounded-xl border border-line overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => setOpen((prev) => {
                      const next = new Set(prev)
                      if (next.has(s.key)) next.delete(s.key)
                      else next.add(s.key)
                      return next
                    })}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center gap-1.5 px-2.5 h-8 text-mini font-semibold uppercase tracking-widest transition-colors ${
                      isOpen ? 'text-fg-muted bg-surface' : 'text-fg-faint hover:text-fg-muted hover:bg-surface/60'
                    }`}
                  >
                    {s.kind && <KindIcon kind={s.kind} />}
                    <span className="flex-1 text-left truncate">{s.label}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-2.5 pt-2 pb-2.5 border-t border-line/60">{s.content}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Delete-theme confirmation ──
// Shared: Semantics deletes a theme from its column header, Primitives from
// the theme FOLDER in its family rail. Same destructive action, same warning —
// forking it would let one entry point under-state what the other destroys.──────────────────────────────────────────
// deleteTheme() used to fire straight off the header's X — one misclick
// silently wiped every semantic value mapped to that theme, with no undo.
export function DeleteThemeModal({
  name, isPreviewed, onConfirm, onCancel,
}: {
  name: string
  isPreviewed: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onCancel}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Delete theme"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-2xl bg-app border border-line shadow-2xl overflow-hidden"
      >
        <div className="p-5 flex items-start gap-3">
          <span className="flex-shrink-0 w-9 h-9 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center" aria-hidden>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
          </span>
          <div className="min-w-0 flex flex-col gap-1 pt-0.5">
            <h2 className="text-strong font-semibold text-fg">Delete "{name}"?</h2>
            <p className="text-body text-fg-muted leading-relaxed">
              Every semantic value mapped to this theme will be deleted too. This can't be undone.
              {isPreviewed && ' The preview will switch to another theme.'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-surface/50">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-ui font-medium border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg text-ui font-semibold bg-status-danger-solid text-white hover:bg-status-danger-solid/90 transition-colors"
          >
            Delete theme
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
