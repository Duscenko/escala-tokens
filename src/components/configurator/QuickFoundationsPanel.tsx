import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { fontStack, loadGoogleFont, FONT_PRESETS } from '../../lib/fonts'
import { withAlpha, BASE_TONE, recommendStateColors } from '../../lib/colorUtils'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor, useEnsureColorScales,
} from '../../lib/colorActions'
import {
  ColorSelect, StateColorsSelect, LinkToggle, neutralFromBrand, type IntentRole,
  BRAND_GROUPS, NEUTRAL_GROUPS,
  type OptionGroup,
} from './colorControls'
import { resolveThemePalette } from '../../lib/themeSources'
import { ARCHITECTURE_OPTIONS, type SemanticArchitecture } from '../../lib/semanticArchitectures'
import { TYPE_SCALE_KEYS } from '../../lib/typographyStandard'
import { RADIUS_PRESETS, matchRadiusPreset } from './StepRadius'
import { SHADOW_PRESETS, matchShadowPreset } from './Step7_Shadow'
import { ICON_LIBRARIES } from '../../lib/iconLibraries'
import { iconName, type IconConcept } from './docs/specimens'

// Quick-edit foundations — shared by two hosts: the Components catalogue's
// popover (default export) and Home's persistent right panel (QuickEditPanel).
// Everything writes straight to the same store fields as their Foundations
// section, so changes show up back there too. The Color Family row applies an
// accent preset with the linked neutral (same path as the Primary Color tab);
// the full family dropdown lives in Foundations · Color.

// Families offered in the quick Font Family rows — the curated presets plus a
// few popular Google families; the full picker lives in Foundations · Font.
const FONT_OPTIONS: string[] = Array.from(
  new Set(['Inter', 'Poppins', 'Roboto', 'Montserrat', ...FONT_PRESETS.map((f) => f.value)]),
)

function FontSelect({ value, onChange, ariaLabel }: { value: string; onChange: (f: string) => void; ariaLabel: string }) {
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

  const options = FONT_OPTIONS.includes(value) ? FONT_OPTIONS : [value, ...FONT_OPTIONS]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-left text-[13px] text-fg hover:bg-elevated/60 transition-colors"
      >
        <span className="truncate" style={{ fontFamily: fontStack(value) }}>{value}</span>
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
            className="absolute z-40 right-0 mt-1 w-44 max-h-56 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1"
          >
            {options.map((f) => (
              <button
                key={f}
                type="button"
                role="option"
                aria-selected={f === value}
                onClick={() => { onChange(f); setOpen(false) }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                  f === value ? 'bg-elevated text-fg font-medium' : 'text-fg hover:bg-surface'
                }`}
                style={{ fontFamily: fontStack(f) }}
              >
                {f}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// A sample glyph from an icon library, via the Iconify API + CSS mask so it
// inherits the button's text color (same technique as the preview TokenIcon).
function LibGlyph({ prefix, concept, size = 14 }: { prefix: string; concept: IconConcept; size?: number }) {
  const url = `https://api.iconify.design/${prefix}/${iconName(prefix, concept)}.svg`
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, display: 'inline-block', flexShrink: 0,
        backgroundColor: 'currentColor',
        maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")`,
        maskSize: 'contain', WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center',
      }}
    />
  )
}

// Icon-library dropdown — same open/close pattern as FontSelect, with a live
// sample glyph per library so the sets are recognizable at a glance.
function IconLibSelect({ value, onChange }: { value: string; onChange: (key: string) => void }) {
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

  const current = ICON_LIBRARIES.find((l) => l.key === value) ?? ICON_LIBRARIES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Icon library"
        className={`w-full flex items-center gap-2 px-2.5 rounded-lg border border-line bg-surface text-left text-[13px] text-fg hover:border-line-strong transition-colors ${ROW_H}`}
      >
        <LibGlyph prefix={current.iconifyPrefix} concept="star" />
        <span className="flex-1 truncate">{current.label}</span>
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
            className="absolute z-40 left-0 right-0 mt-1 rounded-lg border border-line-strong bg-app shadow-lg p-1"
          >
            {ICON_LIBRARIES.map((lib) => (
              <button
                key={lib.key}
                type="button"
                role="option"
                aria-selected={lib.key === value}
                onClick={() => { onChange(lib.key); setOpen(false) }}
                className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                  lib.key === value ? 'bg-elevated text-fg font-medium' : 'text-fg hover:bg-surface'
                }`}
              >
                <LibGlyph prefix={lib.iconifyPrefix} concept="star" />
                <span className="flex-1 truncate">{lib.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const PADDING_SIDES = [
  { key: 'top', label: 'T', name: 'Top' },
  { key: 'right', label: 'R', name: 'Right' },
  { key: 'bottom', label: 'B', name: 'Bottom' },
  { key: 'left', label: 'L', name: 'Left' },
] as const

// Every quick-edit control row shares this height, so the panel reads as an
// even property sheet (SegRows, selects, padding inputs, font rows).
const ROW_H = 'h-[30px]'

// Compact one-row segmented picker — Figma-properties style, so every preset
// control stays a single line and the panel reads as a dense property sheet.
function SegRow<T extends string>({ value, onChange, options, ariaLabel }: {
  value: T | string | null
  onChange: (v: T) => void
  options: { key: T; label: string; title?: string; icon?: ReactNode }[]
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={`flex gap-0.5 rounded-lg border border-line bg-surface p-0.5 ${ROW_H}`}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          title={o.title}
          onClick={() => onChange(o.key)}
          aria-pressed={o.key === value}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 rounded-md text-[11px] leading-none transition-colors ${
            o.key === value ? 'bg-elevated text-fg font-semibold shadow-sm' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.icon}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Color Family — accent preset strip (pixel-matched to the Figma spec) ─────
// A 28px-cell rail on a 2px-padded pill: the current accent leads as a raised
// chip (white cell + soft shadow + 10%-accent halo), the presets follow as
// 10px dots with a white keyline. Picking one applies the accent with the
// linked neutral — the same path the Primary Color tab's dropdown uses.

// The accessible accent set from the Figma header spec — deeper, higher-contrast
// tones (no near-white yellow), so any pick reads well as a solid brand fill.
export const COLOR_FAMILY_PRESETS: { label: string; hex: string }[] = [
  { label: 'Indigo',  hex: '#4f46e6' },
  { label: 'Blue',    hex: '#2b7fff' },
  { label: 'Red',     hex: '#f33f5d' },
  { label: 'Amber',   hex: '#f59d0c' },
  { label: 'Slate',   hex: '#475468' },
  { label: 'Violet',  hex: '#7c3aec' },
  { label: 'Cyan',    hex: '#04b6d5' },
  { label: 'Green',   hex: '#09b980' },
  { label: 'Lime',    hex: '#84cb15' },
  { label: 'Fuchsia', hex: '#d444f1' },
]

function ColorFamilyRow({
  accent,
  onPick,
  onOpenFoundations,
}: {
  accent: string
  onPick: (hex: string) => void
  /** Clicking the already-selected chip jumps to Foundations · Color. */
  onOpenFoundations: () => void
}) {
  const reduce = useReducedMotion() ?? false
  // Segmented picker with FIXED slots (like an effort selector): every preset
  // keeps its position and the raised white thumb slides to the pick, whose
  // dot grows in place. An off-preset (custom) accent takes a leading slot.
  const match = COLOR_FAMILY_PRESETS.find((p) => p.hex.toLowerCase() === accent.toLowerCase())
  const cells = match ? COLOR_FAMILY_PRESETS : [{ label: 'Custom', hex: accent }, ...COLOR_FAMILY_PRESETS]
  const glide = { duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] as const }
  return (
    <div className="flex items-center w-full p-[2px] rounded-[8px] bg-surface border border-line">
      {cells.map((p) => {
        const selected = p.hex.toLowerCase() === accent.toLowerCase()
        return (
          <button
            key={p.label}
            onClick={() => (selected ? onOpenFoundations() : onPick(p.hex))}
            aria-pressed={selected}
            aria-label={selected ? `${p.label} accent selected — edit in Foundations · Color` : `Set accent to ${p.label}`}
            title={selected ? `${p.label} — ${p.hex} · edit in Foundations · Color` : `${p.label} — ${p.hex}`}
            className={`relative size-[28px] flex-shrink-0 flex items-center justify-center rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 ${
              selected ? '' : 'hover:bg-app/70'
            }`}
          >
            {selected && (
              <motion.span
                layoutId="color-family-thumb"
                transition={glide}
                aria-hidden
                className="absolute inset-0 rounded-[6px] bg-app shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]"
              />
            )}
            <motion.span
              aria-hidden
              className="relative"
              initial={false}
              animate={{
                width: selected ? 20 : 10,
                height: selected ? 20 : 10,
                borderRadius: selected ? 4 : 3,
                // The white keyline crossfades into the 10% accent halo as it grows.
                boxShadow: selected ? `0 0 0 3px ${withAlpha(p.hex, 0.1)}` : '0 0 0 1.7px #ffffff',
              }}
              transition={glide}
              style={{ backgroundColor: p.hex }}
            />
          </button>
        )
      })}
    </div>
  )
}

// ── Generic label dropdown (Type scale · Token Architecture) — same open/close
// pattern as FontSelect, styled as a compact pill. ───────────────────────────
function Combo<T extends string>({ value, options, onChange, ariaLabel, leading }: {
  value: T
  options: { key: T; label: string }[]
  onChange: (key: T) => void
  ariaLabel: string
  leading?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const current = options.find((o) => o.key === value) ?? options[0]
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center gap-2 px-2.5 rounded-lg border border-line bg-surface text-left text-[13px] text-fg hover:border-line-strong transition-colors ${ROW_H}`}
      >
        {leading}
        <span className="flex-1 truncate">{current?.label}</span>
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
            className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1"
          >
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={o.key === value}
                onClick={() => { onChange(o.key); setOpen(false) }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                  o.key === value ? 'bg-elevated text-fg font-medium' : 'text-fg hover:bg-surface'
                }`}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// A tinted foundation card — the Figma groups Color Family and Typography into
// bordered cards. Uses the semantic surface so it stays theme-aware.
function Card({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-fg-muted flex-shrink-0">{icon}</span>
        <span className="text-xs text-fg-muted flex-1">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

// One control group. In the shared hosts (Home panel, Components popover) it
// renders FLAT — either a bordered Card (Color Family / Typography) or a plain
// labelled block — exactly as before. In the Workbench's Column 2 it renders as
// a collapsible accordion item so the token controls stack into a tidy stack.
function Group({
  title, icon, action, children, accordion = false, flat = 'plain', defaultOpen = true,
}: {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  accordion?: boolean
  flat?: 'card' | 'plain'
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  // `overflow-hidden` is what makes the height animation work — and what CLIPPED
  // every dropdown inside the group (State Colors, the color selects…). Clip
  // only WHILE animating; once the group has settled at its natural height the
  // wrapper stops clipping so popovers can escape it.
  const [animating, setAnimating] = useState(false)
  const reduce = useReducedMotion() ?? false
  if (!accordion) {
    if (flat === 'card') return <Card icon={icon} title={title} action={action}>{children}</Card>
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">{title}</span>
        {children}
      </div>
    )
  }
  // Two states, two jobs. COLLAPSED borrows SectionRail's row grammar (h-9 ·
  // rounded-xl · 13px · icon + label · same hover), so the stack reads as a
  // wide version of the left rail. OPEN becomes a card that wraps the group's
  // settings — without it, Color Family's controls and Typography's below run
  // together and you can't tell which setting belongs to which group.
  return (
    <div
      className={`flex flex-col rounded-xl transition-all ${
        open ? 'my-1.5 bg-surface border border-line shadow-[0_2px_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-none' : ''
      }`}
    >
      <div
        className={`flex items-center gap-2 h-9 px-2.5 rounded-xl ${
          open ? '' : 'hover:bg-white/60 dark:hover:bg-white/10 transition-colors'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 flex-1 min-w-0 text-left group/acc"
        >
          {icon && <span className={`flex-shrink-0 ${open ? 'text-fg-muted' : 'text-fg-faint'}`}>{icon}</span>}
          <span className={`text-[13px] flex-1 truncate ${open ? 'font-medium text-fg' : 'text-fg-muted group-hover/acc:text-fg'}`}>{title}</span>
        </button>
        {action}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-faint hover:text-fg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            onAnimationStart={() => setAnimating(true)}
            onAnimationComplete={() => setAnimating(false)}
            className={animating ? 'overflow-hidden' : ''}
          >
            <div className="px-3 pt-3.5 pb-4 flex flex-col gap-4 border-t border-line/60">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// The rail's group caption — 10px uppercase, same as VARIABLES / CATEGORIES.
function RailCaption({ label }: { label: string }) {
  return (
    <span className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
      {label}
    </span>
  )
}

const PaletteGlyph = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.012 17.5 2 12 2Z" />
  </svg>
)
const TypeGlyph = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7V5h16v2M9 20h6M12 5v15" />
  </svg>
)
const SurpriseGlyph = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)
// Accordion glyphs for the remaining quick-edit groups (13px, matching above).
const ig = (d: string) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d.split('|').map((p, i) => <path key={i} d={p} />)}</svg>
)
const ShadowGlyph = ig('M3 3h13v13H3z|M8 8h13v13H8')
const RadiusGlyph = ig('M4 20v-8a8 8 0 0 1 8-8h8')
const IconsGlyph = ig('M12 3l2.5 6 6 2.5-6 2.5L12 20l-2.5-6-6-2.5 6-2.5z')
const PaddingGlyph = ig('M4 4h16v16H4z|M8 8h8v8H8z')
const PanelGlyph = ig('M3 4h18v16H3z|M3 9h18')

// ── Type scale — regenerate font sizes from a base size × modular ratio ──────
const TYPE_SCALES: { key: string; label: string; ratio: number }[] = [
  { key: 'majorSecond',   label: 'Major Second',   ratio: 1.125 },
  { key: 'minorThird',    label: 'Minor Third',    ratio: 1.2 },
  { key: 'majorThird',    label: 'Major Third',    ratio: 1.25 },
  { key: 'perfectFourth', label: 'Perfect Fourth', ratio: 1.333 },
  { key: 'golden',        label: 'Golden Ratio',   ratio: 1.618 },
]

// Step of each token relative to the base (text-md = 0), in TYPE_SCALE_KEYS order.
const SCALE_STEPS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8]

function buildTypeScale(base: number, ratio: number): { sizes: Record<string, string>; lineHeights: Record<string, string> } {
  const sizes: Record<string, string> = {}
  const lineHeights: Record<string, string> = {}
  TYPE_SCALE_KEYS.forEach((key, i) => {
    const px = Math.round(base * ratio ** (SCALE_STEPS[i] ?? 0))
    sizes[key] = `${px}px`
    // Display sizes sit tighter; body copy gets more air.
    lineHeights[key] = `${Math.round(px * (px >= 30 ? 1.18 : 1.45))}px`
  })
  return { sizes, lineHeights }
}

// ── Shared quick-edit sections ───────────────────────────────────────────────

export function QuickEditSections({
  onOpenFoundations,
  previewTheme = 'light',
  onThemeChange,
  onAddTheme,
  showPresets = true,
  accordion = false,
}: {
  onOpenFoundations: () => void
  /** Theme currently shown in the host preview — swatch clicks apply to this
   *  theme, so the canvas visibly updates. */
  previewTheme?: string
  /** Switches the previewed theme. Omit to hide the Theme section. */
  onThemeChange?: (theme: string) => void
  /** Opens the theme manager (Alias/Semantics' "+ Theme"). Shows the + cell. */
  onAddTheme?: () => void
  /** When false the inline Presets row is hidden — the host renders it elsewhere
   *  (Home's panel puts it in the header). Default true (Components popover). */
  showPresets?: boolean
  /** Renders each group as a collapsible accordion item (Workbench Column 2).
   *  Default false keeps the flat card/label layout the popover + Home use. */
  accordion?: boolean
}) {
  const store = useDesignStore()
  const {
    themeKinds, themeSources, primaryColor,
    grayBaseColor,
    errorColor, warningColor, successColor, infoColor,
    customColors, removeCustomColor,
    semanticArchitecture, setSemanticArchitecture, neutralTint,
    radius, setRadius, panelBackground, setPanelBackground,
    typography, setTypography,
    iconLibrary, setIconLibrary,
    padding, setPadding,
    shadows, setShadows,
  } = store
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyStateColor = useApplyStateColor()
  useEnsureColorScales()
  const activeRadius = matchRadiusPreset(radius)
  const activeShadow = matchShadowPreset(shadows)

  // While a custom style theme is previewed, the accent/neutral chips read (and
  // the preset clicks write) THAT theme's palette — same routing as the Color hub.
  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'
  const pal = resolveThemePalette(themeSources[previewTheme], darkPreview ? 'dark' : 'light', store)
  const accentBase = pal?.brand?.[BASE_TONE] ?? primaryColor
  const neutralBase = pal?.gray?.[BASE_TONE] ?? grayBaseColor

  // Neutral auto-derives from the accent while linked (default on) — same
  // contract as Foundations · Color's quick bar.
  const [linked, setLinked] = useState(true)
  const changeAccent = (hex: string) => applyAccentColor(hex, linked, previewTheme)
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)
  const toggleLink = () => {
    const next = !linked
    setLinked(next)
    if (next) applyGrayColor(neutralFromBrand(accentBase, neutralTint), previewTheme)
  }
  // Neutral is an intent like the others, but it has no primitive of its own —
  // it IS the Base, so its row writes through the Base applier.
  const changeIntent = (role: IntentRole, hex: string) =>
    role === 'neutral' ? changeNeutral(hex) : applyStateColor(role, hex)
  const matchStatesToAccent = () => {
    const rec = recommendStateColors(accentBase)
    applyStateColor('error', rec.error)
    applyStateColor('warning', rec.warning)
    applyStateColor('success', rec.success)
    applyStateColor('info', rec.info)
  }
  // Surprise — jump to a random preset accent (never the current one).
  const surprise = () => {
    const pool = COLOR_FAMILY_PRESETS.filter((p) => p.hex.toLowerCase() !== accentBase.toLowerCase())
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? COLOR_FAMILY_PRESETS[0]
    changeAccent(pick.hex)
  }

  // Saved custom families lead both color dropdowns, ahead of the tested presets.
  const savedGroup: OptionGroup | null = customColors.length
    ? {
        label: 'Saved',
        options: customColors.map((c) => ({ label: c.label, hex: c.base })),
        onRemove: (hex) => {
          const match = customColors.find((c) => c.base.toLowerCase() === hex.toLowerCase())
          if (match) removeCustomColor(match.key)
        },
      }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  const headingFont = typography.headingFontFamily ?? typography.fontFamily
  const setFont = (role: 'heading' | 'body', family: string) => {
    loadGoogleFont(family)
    setTypography(
      role === 'heading'
        ? { ...typography, headingFontFamily: family }
        : { ...typography, fontFamily: family },
    )
  }

  // Base size + type scale drive the whole size ramp. Base reads from text-md;
  // the ratio is remembered locally (it can't be reversed from sizes alone).
  const baseSize = parseInt(typography.sizes?.['text-md'] ?? '16', 10) || 16
  const [typeScaleKey, setTypeScaleKey] = useState('minorThird')
  const applyScale = (base: number, ratioKey: string) => {
    const ratio = TYPE_SCALES.find((s) => s.key === ratioKey)?.ratio ?? 1.2
    const { sizes, lineHeights } = buildTypeScale(base, ratio)
    setTypography({ ...typography, sizes, lineHeights })
  }

  return (
    <>
      {/* Presets — one-click accent swap; the current accent leads as a raised chip */}
      {showPresets && (
        <div className={accordion ? 'flex flex-col' : 'flex flex-col gap-[8px]'}>
          {accordion
            ? <RailCaption label="Presets" />
            : <span className="text-xs text-fg-muted">Presets</span>}
          <ColorFamilyRow
            accent={accentBase}
            onPick={changeAccent}
            onOpenFoundations={onOpenFoundations}
          />
        </div>
      )}

      {accordion && <RailCaption label="Quick edit" />}

      {/* Color Family card — Surprise · Primary + Neutral (linked) · Background &
          State Colors · Token Architecture. Recycles Foundations · Color's
          ColorSelect / StateColorRows / LinkToggle so writes land in one place. */}
      <Group
        accordion={accordion}
        flat="card"
        icon={PaletteGlyph}
        title="Color Family"
        action={
          <button
            type="button"
            onClick={surprise}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] text-fg bg-elevated hover:bg-elevated/70 transition-colors"
          >
            {SurpriseGlyph}
            Surprise
          </button>
        }
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <ColorSelect label="Primary" value={accentBase} groups={brandGroups} onChange={changeAccent} allowCustom panelClassName="left-0 w-[240px] max-h-72" />
          <div className="pb-0.5">
            <LinkToggle active={linked} onClick={toggleLink} accentColor={accentBase} />
          </div>
          <ColorSelect label="Gray / Neutral" value={neutralBase} groups={neutralGroups} onChange={changeNeutral} allowCustom panelClassName="right-0 w-[240px] max-h-72" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-fg-faint">State Colors</span>
          <StateColorsSelect
            neutral={neutralBase}
            error={errorColor}
            warning={warningColor}
            success={successColor}
            info={infoColor}
            onChange={changeIntent}
            onMatchAccent={matchStatesToAccent}
            panelClassName="left-0 right-0 max-h-[360px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-fg-faint">Token Architecture</span>
          <Combo<SemanticArchitecture>
            value={semanticArchitecture}
            options={ARCHITECTURE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            onChange={setSemanticArchitecture}
            ariaLabel="Token architecture"
          />
        </div>
      </Group>

      {/* Typography card — heading & body family · base size · modular type scale */}
      {/* Only Color Family opens by default — one open card keeps every other
          group visible in the stack instead of pushing them below the fold. */}
      <Group accordion={accordion} flat="card" defaultOpen={false} icon={TypeGlyph} title="Typography">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-fg-faint">Font-family-heading</span>
          <div className={`flex items-center rounded-lg border border-line bg-surface px-1 ${ROW_H}`}>
            <FontSelect value={headingFont} onChange={(f) => setFont('heading', f)} ariaLabel="Heading font family" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-fg-faint">Body font</span>
          <div className={`flex items-center rounded-lg border border-line bg-surface px-1 ${ROW_H}`}>
            <FontSelect value={typography.fontFamily} onChange={(f) => setFont('body', f)} ariaLabel="Body font family" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-fg">Base size</span>
            <span className="text-[12px] text-fg-faint">{baseSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={20}
            step={1}
            value={baseSize}
            onChange={(e) => applyScale(Number(e.target.value), typeScaleKey)}
            aria-label="Base font size"
            className="w-full accent-fg cursor-pointer"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-fg">Type scale</span>
          <Combo
            value={typeScaleKey}
            options={TYPE_SCALES.map((s) => ({ key: s.key, label: s.label }))}
            onChange={(key) => { setTypeScaleKey(key); applyScale(baseSize, key) }}
            ariaLabel="Type scale"
          />
        </div>
      </Group>

      {/* Shadow — elevation ramp presets; full xs–2xl table in Foundations · Shadow */}
      <Group accordion={accordion} defaultOpen={false} title="Shadow" icon={ShadowGlyph}>
        <SegRow
          ariaLabel="Shadow preset"
          value={activeShadow}
          onChange={(label) => {
            const preset = SHADOW_PRESETS.find((p) => p.label === label)
            if (preset) setShadows(preset.values)
          }}
          options={SHADOW_PRESETS.map((p) => ({ key: p.label, label: p.label, title: p.description }))}
        />
      </Group>

      {/* Radius — same presets as Foundations · Radius */}
      <Group accordion={accordion} defaultOpen={false} title="Radius" icon={RadiusGlyph}>
        <SegRow
          ariaLabel="Radius preset"
          value={activeRadius}
          onChange={(label) => {
            const preset = RADIUS_PRESETS.find((p) => p.label === label)
            if (preset) setRadius(preset.values)
          }}
          options={RADIUS_PRESETS.map((p) => ({
            key: p.label,
            label: p.label,
            title: p.description,
            icon: (
              <span
                className="w-2.5 h-2.5 flex-shrink-0 border-t-[1.5px] border-l-[1.5px] border-current"
                style={{ borderTopLeftRadius: p.values.md }}
                aria-hidden
              />
            ),
          }))}
        />
      </Group>

      {/* Icons — the library every content glyph resolves from; full browser
          in Foundations · Icons */}
      <Group accordion={accordion} defaultOpen={false} title="Icons" icon={IconsGlyph}>
        <IconLibSelect value={iconLibrary} onChange={setIconLibrary} />
      </Group>

      {/* Padding — per-side surface inset (cards, tiles, panels); also editable
          in Foundations · Spacing */}
      <Group accordion={accordion} defaultOpen={false} title="Padding" icon={PaddingGlyph}>
        <div className="grid grid-cols-4 gap-1.5">
          {PADDING_SIDES.map((side) => {
            const raw = padding?.[side.key] ?? '20px'
            const value = parseInt(raw, 10)
            return (
              <label key={side.key} className="relative" title={`Padding ${side.name.toLowerCase()}`}>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] uppercase text-fg-faint pointer-events-none" aria-hidden>{side.label}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={Number.isFinite(value) ? value : 20}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(99, Number(e.target.value) || 0))
                    setPadding({ ...padding, [side.key]: `${n}px` })
                  }}
                  aria-label={`Padding ${side.name.toLowerCase()}`}
                  className={`w-full pl-5 pr-1 rounded-lg border border-line bg-surface text-xs text-fg text-center outline-none focus:border-line-strong [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${ROW_H}`}
                />
              </label>
            )
          })}
        </div>
      </Group>

      {/* Panel background — Radix-style solid/translucent/page for surface-1 */}
      <Group accordion={accordion} defaultOpen={false} title="Panel background" icon={PanelGlyph}>
        <SegRow
          ariaLabel="Panel background"
          value={panelBackground}
          onChange={setPanelBackground}
          options={[
            { key: 'solid', label: 'Solid', title: 'Flat token color' },
            { key: 'translucent', label: 'Translucent', title: 'Alpha + backdrop blur' },
            { key: 'page', label: 'Page', title: 'Cards & panels reuse the primitives page background' },
          ] as { key: 'solid' | 'translucent' | 'page'; label: string; title: string }[]}
        />
      </Group>

      <button
        onClick={onOpenFoundations}
        className="w-full text-center px-3 py-2 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-colors"
      >
        More Foundations
      </button>
    </>
  )
}

// ── Header presets — the accent swatch rail that replaces the panel title
// (Figma spec 3538:7234). A "Presets" label + the accessible accent dots inside
// a rounded pill; clicking one applies that accent (linked neutral). ──────────
function HeaderPresets({ previewTheme = 'light' }: { previewTheme?: string }) {
  const store = useDesignStore()
  const { primaryColor, themeSources, themeKinds } = store
  const applyAccentColor = useApplyAccentColor()
  const accentBase = resolveThemePalette(themeSources[previewTheme], (themeKinds[previewTheme] ?? 'light') === 'dark' ? 'dark' : 'light', store)?.brand?.[BASE_TONE] ?? primaryColor
  return (
    <div className="flex-1 min-w-0 flex items-center justify-between gap-2 h-9 pl-3 pr-1 rounded-[9px] bg-surface border border-line">
      <span className="text-[10px] text-fg-faint flex-shrink-0">Presets</span>
      <div className="flex items-center">
        {COLOR_FAMILY_PRESETS.map((p) => {
          const selected = p.hex.toLowerCase() === accentBase.toLowerCase()
          return (
            <button
              key={p.hex}
              onClick={() => applyAccentColor(p.hex, true, previewTheme)}
              aria-pressed={selected}
              aria-label={selected ? `${p.label} accent selected` : `Set accent to ${p.label}`}
              title={`${p.label} — ${p.hex}`}
              className="w-[19px] h-7 flex-shrink-0 flex items-center justify-center rounded-md transition-colors hover:bg-app/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40"
            >
              <span
                aria-hidden
                style={{
                  backgroundColor: p.hex,
                  width: selected ? 13 : 10,
                  height: selected ? 13 : 10,
                  borderRadius: selected ? 4 : 3,
                  boxShadow: selected ? `0 0 0 2.5px ${withAlpha(p.hex, 0.25)}` : '0 0 0 1.7px #ffffff',
                  transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Home's persistent right panel ────────────────────────────────────────────

export function QuickEditPanel({
  onOpenFoundations,
  previewTheme = 'light',
  onThemeChange,
  onCollapse,
  onAddTheme,
}: {
  onOpenFoundations: () => void
  previewTheme?: string
  onThemeChange?: (theme: string) => void
  onCollapse?: () => void
  /** Opens the theme manager (Alias/Semantics) — shows Variable Theme's + cell. */
  onAddTheme?: () => void
}) {
  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      <header className="flex items-center gap-2 px-5 h-[52px] border-b border-line/60 flex-shrink-0">
        <HeaderPresets previewTheme={previewTheme} />
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse quick edit"
            title="Collapse quick edit"
            className="flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>
      {/* p-5 (not p-4): the body's right inset must match the panel header, the
          Components Preview body and the TopNav's px-5 — one shared 22.5px edge
          from the theme switch down to the last control. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
        <QuickEditSections
          onOpenFoundations={onOpenFoundations}
          previewTheme={previewTheme}
          onThemeChange={onThemeChange}
          onAddTheme={onAddTheme}
          showPresets={false}
        />
      </div>
    </div>
  )
}

// ── Components catalogue's quick-edit popover ────────────────────────────────

export default function QuickFoundationsPanel({
  open,
  onClose,
  onOpenFoundations,
  previewTheme = 'light',
  onThemeChange,
  onAddTheme,
}: {
  open: boolean
  onClose: () => void
  onOpenFoundations: () => void
  /** Theme currently shown in the playground (Components' Theme picker). */
  previewTheme?: string
  /** Switches the playground theme — mirrors the header's Theme dropdown. */
  onThemeChange?: (theme: string) => void
  /** Opens the theme manager (Alias/Semantics) — shows Variable Theme's + cell. */
  onAddTheme?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          role="dialog"
          aria-label="Quick edit foundations"
          className="absolute right-0 top-full mt-2 z-30 w-80 max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-line bg-app shadow-xl p-4 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-fg">Quick edit</h3>
              <p className="text-xs text-fg-faint mt-0.5">Straight from your Foundations.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <QuickEditSections
            onOpenFoundations={() => { onOpenFoundations(); onClose() }}
            previewTheme={previewTheme}
            onThemeChange={onThemeChange}
            onAddTheme={onAddTheme ? () => { onAddTheme(); onClose() } : undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
