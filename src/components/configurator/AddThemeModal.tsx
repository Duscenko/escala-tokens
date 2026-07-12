import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, type ThemePalette } from '../../store/useDesignStore'
import { generateColorScale } from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup,
} from './colorControls'

// Semantic-state preset swatches — mirrors the Color foundation (Step2).
const SEMANTIC_FIELDS: { key: 'error' | 'warning' | 'success' | 'info'; label: string; presets: OptionGroup[] }[] = [
  { key: 'error',   label: 'Error',   presets: [{ label: '', options: [
    { hex: '#f04438', label: 'Red 500' }, { hex: '#d92d20', label: 'Red 600' },
    { hex: '#ef4444', label: 'Tailwind Red' }, { hex: '#e11d48', label: 'Rose' }] }] },
  { key: 'warning', label: 'Warning', presets: [{ label: '', options: [
    { hex: '#f79009', label: 'Amber 500' }, { hex: '#f59e0b', label: 'Amber' },
    { hex: '#dc6803', label: 'Orange 600' }, { hex: '#f97316', label: 'Orange' }] }] },
  { key: 'success', label: 'Success', presets: [{ label: '', options: [
    { hex: '#17b26a', label: 'Green 500' }, { hex: '#079455', label: 'Green 600' },
    { hex: '#10b981', label: 'Emerald' }, { hex: '#22c55e', label: 'Green 400' }] }] },
  { key: 'info',    label: 'Info',    presets: [{ label: '', options: [
    { hex: '#2e90fa', label: 'Blue 400' }, { hex: '#3b82f6', label: 'Blue' },
    { hex: '#0ea5e9', label: 'Sky' }, { hex: '#06b6d4', label: 'Cyan' }] }] },
]

export default function AddThemeModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    themes, addTheme, customColors,
    primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor,
    colorAlgorithm, contrastShift, pageBackground,
  } = useDesignStore()
  const reduce = useReducedMotion() ?? false

  const [name, setName] = useState('')
  const [kind, setKind] = useState<'light' | 'dark'>('light')
  const [brand, setBrand] = useState(primaryColor)
  const [neutral, setNeutral] = useState(grayBaseColor)
  const [linked, setLinked] = useState(true)
  const [error, setError] = useState(errorColor)
  const [warning, setWarning] = useState(warningColor)
  const [success, setSuccess] = useState(successColor)
  const [info, setInfo] = useState(infoColor)
  const [err, setErr] = useState<string | null>(null)

  // Saved custom families surface in the Brand/Neutral dropdowns under "Saved".
  const savedGroup: OptionGroup | null = customColors.length
    ? { label: 'Saved', options: customColors.map((c) => ({ label: c.label, hex: c.base })) }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  // Reset to the current global colors each time the modal opens.
  useEffect(() => {
    if (!open) return
    setName(''); setKind('light'); setLinked(true); setErr(null)
    setBrand(primaryColor); setNeutral(grayBaseColor)
    setError(errorColor); setWarning(warningColor); setSuccess(successColor); setInfo(infoColor)
  }, [open, primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Live scales (BASE = tone 9, the Radix solid step).
  const scale = (hex: string) => { try { return generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground) } catch { return {} } }
  const brandScale = useMemo(() => scale(brand), [brand, colorAlgorithm, contrastShift, pageBackground]) // eslint-disable-line react-hooks/exhaustive-deps
  const neutralScale = useMemo(() => scale(neutral), [neutral, colorAlgorithm, contrastShift, pageBackground]) // eslint-disable-line react-hooks/exhaustive-deps
  const semanticScales = {
    error: useMemo(() => scale(error), [error, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    warning: useMemo(() => scale(warning), [warning, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    success: useMemo(() => scale(success), [success, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    info: useMemo(() => scale(info), [info, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
  }

  // When linked, the neutral tracks the brand hue.
  function changeBrand(hex: string) {
    setBrand(hex)
    if (linked) setNeutral(neutralFromBrand(hex))
  }
  function toggleLink() {
    const next = !linked
    setLinked(next)
    if (next) setNeutral(neutralFromBrand(brand))
  }

  function handleCreate() {
    const label = name.trim()
    const key = slugify(label)
    if (!key) { setErr('Name the theme first.'); return }
    if (themes[key]) { setErr(`"${key}" already exists.`); return }
    try {
      const palette: ThemePalette = {
        brand: generateColorScale(brand, colorAlgorithm, contrastShift, pageBackground),
        gray: generateColorScale(neutral, colorAlgorithm, contrastShift, pageBackground),
        error: generateColorScale(error, colorAlgorithm, contrastShift, pageBackground),
        warning: generateColorScale(warning, colorAlgorithm, contrastShift, pageBackground),
        success: generateColorScale(success, colorAlgorithm, contrastShift, pageBackground),
        info: generateColorScale(info, colorAlgorithm, contrastShift, pageBackground),
      }
      addTheme(key, kind, palette)
      onClose()
    } catch {
      setErr('One of the colors is invalid.')
    }
  }

  const semanticState = { error, warning, success, info }
  const setSemantic: Record<string, (h: string) => void> = {
    error: setError, warning: setWarning, success: setSuccess, info: setInfo,
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Add a theme"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-line bg-app shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-line flex-shrink-0">
              <h2 className="text-sm font-semibold text-fg">Add a theme</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-fg-faint hover:text-fg transition-colors w-6 h-6 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
              {/* Name + mode */}
              <div className="flex items-end gap-3">
                <label className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-xs text-fg-muted">Theme name</span>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErr(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                    placeholder="e.g. Ocean"
                    className="bg-surface border border-line-strong focus:border-fg rounded-full px-4 py-2 text-sm text-fg outline-none transition-colors"
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Mode</span>
                  <div className="flex rounded-full border border-line-strong overflow-hidden">
                    {(['light', 'dark'] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setKind(k)}
                        className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                          kind === k ? 'bg-fg text-app' : 'bg-surface text-fg-muted hover:text-fg'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accent scale — Brand / link / Neutral + 12-tone scales */}
              <section className="flex flex-col gap-4 pt-1">
                <h3 className="text-sm font-semibold text-fg">Accent scale</h3>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <ColorSelect label="Accent Color" value={brand} groups={brandGroups} onChange={changeBrand} />
                  <div className="flex flex-col items-center gap-1.5 pb-1.5">
                    <InfoDot tip="Auto-matches the neutral scale to your accent color." />
                    <LinkToggle active={linked} onClick={toggleLink} />
                  </div>
                  <ColorSelect label="Neutral" value={neutral} groups={neutralGroups} onChange={(h) => { setNeutral(h); setLinked(false) }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <ScaleRow scale={brandScale} />
                  <ScaleRow scale={neutralScale} showNumbers={false} />
                </div>
              </section>

              {/* Color semantics */}
              <section className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-fg">Color semantics</h3>
                <div className="flex flex-col gap-4">
                  {SEMANTIC_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="w-14 flex-shrink-0 text-xs font-semibold text-fg">{f.label}</span>
                      <div className="flex-1 min-w-0">
                        <ScaleRow scale={semanticScales[f.key]} showNumbers={false} />
                      </div>
                      <ColorSelect
                        variant="compact"
                        label={f.label}
                        value={semanticState[f.key]}
                        groups={f.presets}
                        onChange={setSemantic[f.key]}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {err && <p className="text-[11px] text-red-500">{err}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 h-14 border-t border-line flex-shrink-0">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors"
              >
                Create theme
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
