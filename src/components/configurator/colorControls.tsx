// Reusable color-scale controls shared by the Color foundation (Step2) and the
// "Add a theme" modal: a preset-aware color dropdown, the 12-tone BASE scale
// strip, the brand↔neutral link toggle, and the info dot. Kept presentational
// (no store writes) so callers own their own state.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import chroma from 'chroma-js'
import { PRESET_GROUPS } from '../../lib/brandPalette'

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
}: {
  label?: string
  value: string
  groups: OptionGroup[]
  onChange: (hex: string) => void
  variant?: 'full' | 'compact' | 'pill'
  accentColor?: string
}) {
  const compact = variant === 'compact'
  const pill = variant === 'pill'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = findOption(groups, value)
  const hexLabel = value.replace(/^#/, '').toUpperCase()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Pill — label · color dot · hex · chevron, in a rounded outlined pill.
  if (pill) {
    return (
      <div ref={ref} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label ?? 'Color'} — ${hexLabel}`}
          className="w-full flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 transition-colors"
          style={{ ['--tw-ring-color' as string]: accentColor ?? '#0088FF' }}
        >
          {label && <span className="text-[13px] text-fg">{label}</span>}
          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: value }} />
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
                        <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: o.hex }} />
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
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={compact ? (label ? `${label} color` : 'Choose color') : undefined}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-full bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-colors'
              : 'w-full flex items-center gap-2 px-3 py-2 rounded-full bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-colors text-left'
          }
        >
          <span className={`${compact ? 'w-5 h-5' : 'w-4 h-4'} rounded-full flex-shrink-0 ring-1 ring-black/10`} style={{ backgroundColor: value }} />
          {!compact && (
            <span className="flex-1 min-w-0 truncate text-sm text-fg font-mono">
              {value}
              {selected && <span className="text-fg-faint font-sans"> ({selected.label})</span>}
            </span>
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
              className={`absolute z-30 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1.5 ${compact ? 'right-0 w-56' : 'w-full'}`}
            >
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
                          <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: o.hex }} />
                          <span className="flex-1 min-w-0 truncate text-sm text-fg">{o.label}</span>
                          <span className="text-[11px] font-mono text-fg-faint">{o.hex}</span>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Scale row (12 tones, BASE marker) ──────────────────────────────────────

export function ScaleRow({ scale, baseIndex = 6, showNumbers = true, labels }: { scale: Record<number, string>; baseIndex?: number; showNumbers?: boolean; labels?: string[] }) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  return (
    <div className="grid grid-cols-12 gap-1.5">
      {entries.map(([key, color], i) => {
        const k = Number(key)
        const isBase = k === baseIndex
        const onLight = k >= 6 ? '#ffffff' : '#0a0a0a'
        return (
          <div key={key} className="flex flex-col gap-1 min-w-0">
            {showNumbers && (
              <span className="text-[9px] text-fg-faint text-center font-mono tabular-nums leading-none truncate">{labels?.[i] ?? key}</span>
            )}
            <div
              className={`h-11 rounded-lg flex items-center justify-center ${isBase ? 'ring-2 ring-fg/25 ring-offset-1 ring-offset-app' : ''}`}
              style={{ backgroundColor: color }}
              title={`Tone ${key} — ${color}`}
            >
              {isBase && (
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: onLight }}>
                  base
                </span>
              )}
            </div>
          </div>
        )
      })}
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
        className="w-4 h-4 rounded-full border border-line-strong text-fg-faint flex items-center justify-center text-[10px] font-semibold leading-none cursor-help"
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
  const accent = accentColor ?? '#0088FF'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Neutral linked to brand' : 'Link neutral to brand'}
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
