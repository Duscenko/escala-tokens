import { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateColorScale } from '../../lib/colorUtils'
import { PRESET_GROUPS } from '../../lib/brandPalette'

// ── Gray flavor options for the neutral scale ──────────────────────────────
const GRAY_FLAVORS: { label: string; hex: string }[] = [
  { label: 'Gray Blue',    hex: '#4e5ba6' },
  { label: 'Gray Cool',    hex: '#5d6b98' },
  { label: 'Gray Modern',  hex: '#697586' },
  { label: 'Gray Neutral', hex: '#6c737f' },
  { label: 'Gray Iron',    hex: '#70707b' },
  { label: 'Gray True',    hex: '#737373' },
  { label: 'Gray Warm',    hex: '#79716b' },
]

type Option = { label: string; hex: string }
type OptionGroup = { label: string; options: Option[] }

const BRAND_GROUPS: OptionGroup[] = PRESET_GROUPS.map((g) => ({
  label: g.label,
  options: g.colors.map((c) => ({ label: c.label, hex: c.hex })),
}))
const NEUTRAL_GROUPS: OptionGroup[] = [{ label: '', options: GRAY_FLAVORS }]

function findOption(groups: OptionGroup[], hex: string): Option | null {
  const target = hex.toLowerCase()
  for (const g of groups) {
    const hit = g.options.find((o) => o.hex.toLowerCase() === target)
    if (hit) return hit
  }
  return null
}

// ── Color dropdown ─────────────────────────────────────────────────────────

function ColorSelect({
  label,
  value,
  groups,
  onChange,
}: {
  label?: string
  value: string
  groups: OptionGroup[]
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = findOption(groups, value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <span className="text-xs text-fg-muted">{label}</span>}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-full bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-colors text-left"
        >
          <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: value }} />
          <span className="flex-1 min-w-0 truncate text-sm text-fg font-mono">
            {value}
            {selected && <span className="text-fg-faint font-sans"> ({selected.label})</span>}
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
              role="listbox"
              className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-lg border border-line-strong bg-app shadow-lg p-1.5"
            >
              {groups.map((g) => (
                <div key={g.label || 'all'}>
                  {g.label && (
                    <div className="text-[10px] text-fg-faint uppercase tracking-wider px-2 pt-2 pb-1">{g.label}</div>
                  )}
                  {g.options.map((o) => {
                    const isSel = o.hex.toLowerCase() === value.toLowerCase()
                    return (
                      <button
                        key={o.hex}
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        onClick={() => { onChange(o.hex); setOpen(false) }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                          isSel ? 'bg-elevated' : 'hover:bg-surface'
                        }`}
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
    </div>
  )
}

// ── Scale row (12 tones, BASE marker) ──────────────────────────────────────

function ScaleRow({ scale, baseIndex = 6 }: { scale: Record<number, string>; baseIndex?: number }) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length === 0) return null
  return (
    <div className="grid grid-cols-12 gap-1.5">
      {entries.map(([key, color]) => {
        const k = Number(key)
        const isBase = k === baseIndex
        const onLight = k >= 6 ? '#ffffff' : '#0a0a0a'
        return (
          <div key={key} className="flex flex-col gap-1 min-w-0">
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
            <span className="text-[9px] text-fg-faint text-center font-mono tabular-nums leading-none">{key}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Semantic state card ────────────────────────────────────────────────────

function SemanticRow({
  label,
  description,
  color,
  scale,
  presets,
  onColorChange,
}: {
  label: string
  description: string
  color: string
  scale: Record<number, string>
  presets: { hex: string; label: string }[]
  onColorChange: (hex: string) => void
}) {
  const groups: OptionGroup[] = [{ label: '', options: presets }]
  return (
    <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-fg uppercase tracking-wide">{label}</span>
        <span className="text-xs text-fg-faint">{description}</span>
      </div>
      <ColorSelect value={color} groups={groups} onChange={onColorChange} />
      <ScaleRow scale={scale} />
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step2_ColorPalette() {
  const {
    primaryColor, primaryScale, setPrimaryColor, setPrimaryScale,
    errorColor,   errorScale,   setErrorColor,   setErrorScale,
    warningColor, warningScale, setWarningColor, setWarningScale,
    successColor, successScale, setSuccessColor, setSuccessScale,
    infoColor,    infoScale,    setInfoColor,    setInfoScale,
    grayBaseColor, grayLightScale, setGrayBaseColor, setGrayLightScale,
  } = useDesignStore()

  const regenerate = useCallback((hex: string) => {
    try { setPrimaryColor(hex); setPrimaryScale(generateColorScale(hex)) } catch {}
  }, [setPrimaryColor, setPrimaryScale])

  const regenerateError = useCallback((hex: string) => {
    try { setErrorColor(hex); setErrorScale(generateColorScale(hex)) } catch {}
  }, [setErrorColor, setErrorScale])

  const regenerateWarning = useCallback((hex: string) => {
    try { setWarningColor(hex); setWarningScale(generateColorScale(hex)) } catch {}
  }, [setWarningColor, setWarningScale])

  const regenerateSuccess = useCallback((hex: string) => {
    try { setSuccessColor(hex); setSuccessScale(generateColorScale(hex)) } catch {}
  }, [setSuccessColor, setSuccessScale])

  const regenerateInfo = useCallback((hex: string) => {
    try { setInfoColor(hex); setInfoScale(generateColorScale(hex)) } catch {}
  }, [setInfoColor, setInfoScale])

  const regenerateGray = useCallback((hex: string) => {
    try { setGrayBaseColor(hex); setGrayLightScale(generateColorScale(hex)) } catch {}
  }, [setGrayBaseColor, setGrayLightScale])

  useEffect(() => {
    if (Object.keys(primaryScale).length    === 0) regenerate(primaryColor)
    if (Object.keys(errorScale).length       === 0) regenerateError(errorColor)
    if (Object.keys(warningScale).length     === 0) regenerateWarning(warningColor)
    if (Object.keys(successScale).length     === 0) regenerateSuccess(successColor)
    if (Object.keys(infoScale).length        === 0) regenerateInfo(infoColor)
    if (Object.keys(grayLightScale).length   === 0) regenerateGray(grayBaseColor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const semanticDots = [errorColor, warningColor, successColor, infoColor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Source colors + accent scale: one block, separated below ─ */}
      <section className="-mx-8 -mt-8 px-8 pt-8 pb-8 flex flex-col gap-8 border-b border-line">
        {/* Source colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <ColorSelect label="Brand Color" value={primaryColor} groups={BRAND_GROUPS} onChange={regenerate} />
          <ColorSelect label="Neutral suggested" value={grayBaseColor} groups={NEUTRAL_GROUPS} onChange={regenerateGray} />
        </div>

        {/* Accent + neutral scales */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-fg">Accent scale</h3>
            <span className="text-xs text-fg-faint font-mono">1 = lightest · 12 = darkest</span>
          </div>
          <ScaleRow scale={primaryScale} />
          <ScaleRow scale={grayLightScale} />
        </div>
      </section>

      {/* ── Color semantics ────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-fg">Color Semantics</h3>
          <div className="flex gap-1.5">
            {semanticDots.map((c, i) => (
              <span key={i} className="w-3 h-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SemanticRow
            label="Error"
            description="Destructive actions, validation errors, removal states."
            color={errorColor}
            scale={errorScale}
            onColorChange={regenerateError}
            presets={[
              { hex: '#f04438', label: 'Red 500' },
              { hex: '#d92d20', label: 'Red 600' },
              { hex: '#ef4444', label: 'Tailwind Red' },
              { hex: '#e11d48', label: 'Rose' },
            ]}
          />
          <SemanticRow
            label="Warning"
            description="Potentially destructive or 'on-hold' actions and confirmations."
            color={warningColor}
            scale={warningScale}
            onColorChange={regenerateWarning}
            presets={[
              { hex: '#f79009', label: 'Amber 500' },
              { hex: '#f59e0b', label: 'Amber' },
              { hex: '#dc6803', label: 'Orange 600' },
              { hex: '#f97316', label: 'Orange' },
            ]}
          />
          <SemanticRow
            label="Success"
            description="Positive actions, successful confirmations, positive trends."
            color={successColor}
            scale={successScale}
            onColorChange={regenerateSuccess}
            presets={[
              { hex: '#17b26a', label: 'Green 500' },
              { hex: '#079455', label: 'Green 600' },
              { hex: '#10b981', label: 'Emerald' },
              { hex: '#22c55e', label: 'Green 400' },
            ]}
          />
          <SemanticRow
            label="Info"
            description="Informational messages, neutral highlights, tips and hints."
            color={infoColor}
            scale={infoScale}
            onColorChange={regenerateInfo}
            presets={[
              { hex: '#2e90fa', label: 'Blue 400' },
              { hex: '#3b82f6', label: 'Blue' },
              { hex: '#0ea5e9', label: 'Sky' },
              { hex: '#06b6d4', label: 'Cyan' },
            ]}
          />
        </div>
      </div>
    </motion.div>
  )
}
