import { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS } from '../../store/useDesignStore'
import { generateColorScale, accessibleSolidTone } from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { BRAND_TOKEN_TONES } from './Step3_SemanticTokens'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup,
} from './colorControls'

// ── Semantic state card ────────────────────────────────────────────────────

function SemanticRow({
  label,
  color,
  scale,
  presets,
  onColorChange,
}: {
  label: string
  description?: string // accepted (call sites still pass it) but not rendered in the row layout
  color: string
  scale: Record<number, string>
  presets: { hex: string; label: string }[]
  onColorChange: (hex: string) => void
}) {
  const groups: OptionGroup[] = [{ label: '', options: presets }]
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 flex-shrink-0 text-xs font-semibold text-fg">{label}</span>
      <div className="flex-1 min-w-0">
        <ScaleRow scale={scale} />
      </div>
      <ColorSelect variant="compact" label={label} value={color} groups={groups} onChange={onColorChange} />
    </div>
  )
}

// ── Custom color families ───────────────────────────────────────────────────
// User-named colors that auto-generate the same 1–12 scale structure as the
// built-in families and flow into the export (tokens.json / CSS / README).
// Saved customs surface in the Brand/Neutral dropdowns under "Saved".

function AddCustomColorButton() {
  const { customColors, addCustomColor, updateCustomColor, removeCustomColor } = useDesignStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#0ea5e9')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleAdd() {
    const label = name.trim()
    const key = slugify(label)
    if (!key) { setError('Name the color first.'); return }
    if (RESERVED_COLOR_KEYS.includes(key)) { setError(`"${key}" is reserved by a built-in scale.`); return }
    if (customColors.some((c) => c.key === key)) { setError(`"${key}" already exists.`); return }
    try {
      addCustomColor({ key, label, base: hex, scale: generateColorScale(hex) })
      setName('')
      setError(null)
      setOpen(false)
    } catch {
      setError('Invalid color value.')
    }
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs text-fg-muted">Custom</span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setError(null) }}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="w-36 flex items-center gap-2 px-3 py-2 rounded-full border border-dashed border-line-strong text-fg-muted hover:border-fg-faint hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-colors text-left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm truncate">Custom</span>
          {customColors.length > 0 && (
            <span className="ml-auto text-[11px] font-mono text-fg-faint flex-shrink-0">{customColors.length}</span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              role="dialog"
              aria-label="Custom colors"
              className="absolute z-30 right-0 mt-1.5 w-72 rounded-lg border border-line-strong bg-app shadow-lg p-3 flex flex-col gap-3"
            >
              <p className="text-[11px] text-fg-faint leading-snug">
                Name a color and it adopts the same 12-tone scale. Saved colors appear
                in the Brand and Neutral dropdowns under <span className="font-medium text-fg-muted">Saved</span>.
              </p>

              {/* Existing families */}
              {customColors.length > 0 && (
                <div className="flex flex-col gap-1">
                  {customColors.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <label
                        className="relative w-6 h-6 rounded-full ring-1 ring-black/10 cursor-pointer flex-shrink-0 overflow-hidden"
                        title={`${c.label} base — ${c.base}`}
                      >
                        <span className="absolute inset-0" style={{ backgroundColor: c.base }} />
                        <input
                          type="color"
                          value={c.base}
                          onChange={(e) =>
                            updateCustomColor(c.key, { base: e.target.value, scale: generateColorScale(e.target.value) })
                          }
                          aria-label={`${c.label} base color`}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                      <span className="flex-1 min-w-0 truncate text-sm text-fg">{c.label}</span>
                      <span className="text-[11px] font-mono text-fg-faint">{c.base}</span>
                      <button
                        onClick={() => removeCustomColor(c.key)}
                        aria-label={`Remove ${c.label}`}
                        title={`Remove ${c.label}`}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-fg-faint hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="flex items-center gap-2">
                <label className="relative w-8 h-8 rounded-full ring-1 ring-black/10 cursor-pointer flex-shrink-0 overflow-hidden" title="Pick a color">
                  <span className="absolute inset-0" style={{ backgroundColor: hex }} />
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    aria-label="New custom color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="Name — e.g. Teal"
                  aria-label="Custom color name"
                  className="flex-1 min-w-0 bg-surface border border-line focus:border-[#0088FF] rounded-full px-3 py-1.5 text-sm text-fg outline-none transition-colors"
                />
                <button
                  onClick={handleAdd}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#0088FF] text-white hover:bg-[#0070d4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF]"
                >
                  Save
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
    themes, mergeThemeTokens, customColors,
  } = useDesignStore()
  const lightTokens = themes.light ?? {}

  // Saved customs surface in both dropdowns ahead of the Tested presets.
  const savedGroup: OptionGroup | null = customColors.length
    ? { label: 'Saved', options: customColors.map((c) => ({ label: c.label, hex: c.base })) }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  // When ON, the neutral scale auto-derives from the brand color. Default ON.
  const [linked, setLinked] = useState(true)

  const regenerate = useCallback((hex: string) => {
    try {
      const scale = generateColorScale(hex)
      setPrimaryColor(hex)
      setPrimaryScale(scale)
      // Keep already-mapped brand semantic tokens in sync with the new brand so
      // the live preview + export track it (unmapped keys fall back to primaryColor).
      const solid = accessibleSolidTone(scale)
      const updates: Record<string, string> = {}
      for (const [key, tone] of Object.entries(BRAND_TOKEN_TONES)) {
        if (!lightTokens[key]) continue
        const t =
          key === 'bg-brand-solid' ? solid
          : key === 'bg-brand-solid_hover' ? Math.min(solid + 1, 12)
          : tone
        if (scale[t]) updates[key] = scale[t]
      }
      if (Object.keys(updates).length) mergeThemeTokens('light', updates)
      // When linked, re-derive the neutral scale from the new brand.
      if (linked) {
        const n = neutralFromBrand(hex)
        setGrayBaseColor(n)
        setGrayLightScale(generateColorScale(n))
      }
    } catch {}
  }, [setPrimaryColor, setPrimaryScale, lightTokens, mergeThemeTokens, linked, setGrayBaseColor, setGrayLightScale])

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

  function toggleLink() {
    const next = !linked
    setLinked(next)
    if (next) regenerateGray(neutralFromBrand(primaryColor))
  }

  useEffect(() => {
    if (Object.keys(primaryScale).length    === 0) regenerate(primaryColor)
    if (Object.keys(errorScale).length       === 0) regenerateError(errorColor)
    if (Object.keys(warningScale).length     === 0) regenerateWarning(warningColor)
    if (Object.keys(successScale).length     === 0) regenerateSuccess(successColor)
    if (Object.keys(infoScale).length        === 0) regenerateInfo(infoColor)
    if (Object.keys(grayLightScale).length   === 0) regenerateGray(grayBaseColor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When linked + brand scale changes, refresh all state scales so Step3's
  // useEffect re-seeds any empty/stale semantic tokens for error/warning/success/info.
  useEffect(() => {
    if (!linked || !Object.keys(primaryScale).length) return
    regenerateError(errorColor)
    regenerateWarning(warningColor)
    regenerateSuccess(successColor)
    regenerateInfo(infoColor)
  }, [primaryScale, linked]) // eslint-disable-line react-hooks/exhaustive-deps

  const semanticDots = [errorColor, warningColor, successColor, infoColor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Accent scale: heading · Brand/Neutral (+link) · scales ─ */}
      <section className="-mx-8 -mt-8 px-8 pt-8 pb-8 flex flex-col gap-5 border-b border-line">
        <h3 className="text-base font-semibold text-fg">Accent scale</h3>

        {/* Brand · link/info · Neutral · + Custom */}
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <ColorSelect label="Brand Color" value={primaryColor} groups={brandGroups} onChange={regenerate} />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your brand color." />
            <LinkToggle active={linked} onClick={toggleLink} />
          </div>
          <ColorSelect label="Neutral" value={grayBaseColor} groups={neutralGroups} onChange={regenerateGray} />
          <AddCustomColorButton />
        </div>

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={primaryScale} />
          <ScaleRow scale={grayLightScale} showNumbers={false} />
        </div>
      </section>

      {/* ── Color semantics ────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-fg">Color semantics</h3>
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
