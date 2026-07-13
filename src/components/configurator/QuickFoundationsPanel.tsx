import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useApplyAccentColor } from '../../lib/colorActions'
import { BASE_TONE } from '../../lib/colorUtils'
import { BRAND_PRESETS } from '../../lib/brandPalette'
import { fontStack, loadGoogleFont, FONT_PRESETS } from '../../lib/fonts'
import { RADIUS_PRESETS, matchRadiusPreset } from './StepRadius'
import { SHADOW_PRESETS, matchShadowPreset } from './Step7_Shadow'
import { ICON_LIBRARIES } from '../../lib/iconLibraries'
import { iconName, type IconConcept } from './docs/specimens'
import ColorField from '../ui/ColorField'

// Quick-edit foundations — shared by two hosts: the Components catalogue's
// popover (default export) and Home's persistent right panel (QuickEditPanel).
// Everything writes straight to the same store fields as their Foundations
// section, so changes show up back there too. Each accent comes linked with a
// matching neutral, so there's no separate gray picker.

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
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] text-fg hover:bg-elevated/60 transition-colors"
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
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-line bg-surface text-left text-[13px] text-fg hover:border-line-strong transition-colors"
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

// Compact one-row segmented picker — Figma-properties style, so every preset
// control stays a single line and the panel reads as a dense property sheet.
function SegRow<T extends string>({ value, onChange, options, ariaLabel }: {
  value: T | string | null
  onChange: (v: T) => void
  options: { key: T; label: string; title?: string; icon?: ReactNode }[]
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          title={o.title}
          onClick={() => onChange(o.key)}
          aria-pressed={o.key === value}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] leading-none transition-colors ${
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

// ── Shared quick-edit sections ───────────────────────────────────────────────

export function QuickEditSections({
  onOpenFoundations,
  previewTheme = 'light',
  onThemeChange,
}: {
  onOpenFoundations: () => void
  /** Theme currently shown in the host preview — swatch clicks apply to this
   *  theme, so the canvas visibly updates. */
  previewTheme?: string
  /** Switches the previewed theme. Omit to hide the Theme section. */
  onThemeChange?: (theme: string) => void
}) {
  const {
    primaryColor, themes, themeOrder, themePalettes, themeKinds,
    radius, setRadius, panelBackground, setPanelBackground,
    typography, setTypography,
    iconLibrary, setIconLibrary,
    padding, setPadding,
    shadows, setShadows,
  } = useDesignStore()
  const applyAccentColor = useApplyAccentColor()
  const activeRadius = matchRadiusPreset(radius)
  const activeShadow = matchShadowPreset(shadows)
  const themeCols = themeOrder.filter((t) => themes[t])

  // A custom theme carries its own palette — reflect *that* theme's current
  // accent in the swatch selection, not the unrelated global scale.
  const palette = themePalettes[previewTheme]
  const activeAccent = palette?.brand?.[BASE_TONE] ?? primaryColor

  const headingFont = typography.headingFontFamily ?? typography.fontFamily
  const setFont = (role: 'heading' | 'body', family: string) => {
    loadGoogleFont(family)
    setTypography(
      role === 'heading'
        ? { ...typography, headingFontFamily: family }
        : { ...typography, fontFamily: family },
    )
  }

  // Dot color that reads as the theme's look — dark themes show their surface,
  // light ones their accent.
  const themeDot = (t: string): string =>
    (themeKinds[t] ?? 'light') === 'dark'
      ? themes[t]?.['surface-0'] ?? '#111111'
      : themePalettes[t]?.brand?.[BASE_TONE] ?? themes[t]?.['action-primary'] ?? primaryColor

  return (
    <>
      {/* Theme — mirrors the host's theme picker, so edits and preview stay
          pointed at the same DS theme. */}
      {onThemeChange && themeCols.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-muted">Theme</span>
          <div className="flex flex-wrap gap-1.5">
            {themeCols.map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                aria-pressed={t === previewTheme}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  t === previewTheme
                    ? 'bg-elevated ring-2 ring-fg/40 text-fg'
                    : 'bg-surface border border-line text-fg-muted hover:text-fg hover:border-line-strong'
                }`}
              >
                <span className="w-3 h-3 rounded-full ring-1 ring-black/10 flex-shrink-0" style={{ backgroundColor: themeDot(t) }} aria-hidden />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Accent color — each pick also relinks the matching neutral, so the
          theme's surfaces/text/borders re-tint with it. Figma design (node
          14:30): swatches are rounded squares with a soft drop shadow, held in
          a bordered, elevated card. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Accent color</span>
        <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-line bg-surface shadow-[0_2px_3px_0_rgba(0,0,0,0.06)]">
          {BRAND_PRESETS.map((hex) => {
            const active = hex.toLowerCase() === activeAccent.toLowerCase()
            return (
              <button
                key={hex}
                onClick={() => applyAccentColor(hex, true, previewTheme)}
                aria-label={`Accent ${hex}`}
                aria-pressed={active}
                className={`w-6 h-6 rounded-md flex-shrink-0 shadow-[0_1px_1px_0_rgba(0,0,0,0.2)] transition-transform hover:scale-110 ${
                  active ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'ring-1 ring-black/10'
                }`}
                style={{ backgroundColor: hex }}
              />
            )
          })}
          {/* Custom pick — full HSV picker; alpha is dropped since accent scales
              are solid. Square shape + shadow to match the swatch row. */}
          <ColorField
            value={/^#[0-9a-f]{6}$/i.test(activeAccent) ? activeAccent : '#7f56d9'}
            onChange={(hex) => applyAccentColor(hex.slice(0, 7), true, previewTheme)}
            ariaLabel="Custom accent color"
            size={24}
            align="right"
            shape="square"
            swatchClassName="shadow-[0_1px_1px_0_rgba(0,0,0,0.2)]"
          />
        </div>
      </div>

      {/* Font Family — the two family tokens; full type scale in Foundations ·
          Font. No overflow-hidden on this box: it would clip the dropdowns. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Font Family</span>
        <div className="rounded-lg border border-line">
          <div className="flex items-center justify-between gap-2 pl-3 pr-1 py-1 border-b border-line">
            <span className="text-[11px] font-mono text-fg-muted truncate">font-family-heading</span>
            <div className="w-32 flex-shrink-0">
              <FontSelect value={headingFont} onChange={(f) => setFont('heading', f)} ariaLabel="Heading font family" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pl-3 pr-1 py-1">
            <span className="text-[11px] font-mono text-fg-muted truncate">font-family-body</span>
            <div className="w-32 flex-shrink-0">
              <FontSelect value={typography.fontFamily} onChange={(f) => setFont('body', f)} ariaLabel="Body font family" />
            </div>
          </div>
        </div>
      </div>

      {/* Shadow — elevation ramp presets; full xs–2xl table in Foundations · Shadow */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Shadow</span>
        <SegRow
          ariaLabel="Shadow preset"
          value={activeShadow}
          onChange={(label) => {
            const preset = SHADOW_PRESETS.find((p) => p.label === label)
            if (preset) setShadows(preset.values)
          }}
          options={SHADOW_PRESETS.map((p) => ({ key: p.label, label: p.label, title: p.description }))}
        />
      </div>

      {/* Radius — same presets as Foundations · Radius */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Radius</span>
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
      </div>

      {/* Icons — the library every content glyph resolves from; full browser
          in Foundations · Icons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Icons</span>
        <IconLibSelect value={iconLibrary} onChange={setIconLibrary} />
      </div>

      {/* Padding — per-side surface inset (cards, tiles, panels); also editable
          in Foundations · Spacing */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Padding</span>
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
                  className="w-full pl-5 pr-1 py-1.5 rounded-lg border border-line bg-surface text-xs text-fg text-center outline-none focus:border-line-strong [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* Panel background — Radix-style solid/translucent/page for surface-1 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">Panel background</span>
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
      </div>

      <button
        onClick={onOpenFoundations}
        className="w-full text-center px-3 py-2 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-colors"
      >
        More Foundations
      </button>
    </>
  )
}

// ── Home's persistent right panel ────────────────────────────────────────────

export function QuickEditPanel({
  onOpenFoundations,
  previewTheme = 'light',
  onThemeChange,
  onCollapse,
}: {
  onOpenFoundations: () => void
  previewTheme?: string
  onThemeChange?: (theme: string) => void
  onCollapse?: () => void
}) {
  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      <header className="flex items-center gap-2 px-5 h-[60px] border-b border-line/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg">Quick edit</h2>
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse quick edit"
            title="Collapse quick edit"
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
        <QuickEditSections
          onOpenFoundations={onOpenFoundations}
          previewTheme={previewTheme}
          onThemeChange={onThemeChange}
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
}: {
  open: boolean
  onClose: () => void
  onOpenFoundations: () => void
  /** Theme currently shown in the playground (Components' Theme picker). */
  previewTheme?: string
  /** Switches the playground theme — mirrors the header's Theme dropdown. */
  onThemeChange?: (theme: string) => void
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
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
