import { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS } from '../../store/useDesignStore'
import {
  generateColorScale, accessibleSolidTone, recommendStateColors,
  ALGORITHM_OPTIONS, RECOMMENDED_ALGORITHM, NAMING_SCHEMES,
  type ColorAlgorithm, type ColorNaming,
} from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { BRAND_TOKEN_TONES } from '../../lib/semanticRoles'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup,
} from './colorControls'

// ── Custom color families ───────────────────────────────────────────────────
// User-named colors that auto-generate the same 1–12 scale structure as the
// built-in families and flow into the export (tokens.json / CSS / README).
// Saved customs surface in the Brand/Neutral dropdowns under "Saved".

function AddCustomColorButton() {
  const { customColors, addCustomColor, updateCustomColor, removeCustomColor, colorAlgorithm, contrastShift } = useDesignStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#0ea5e9')
  const [hexDraft, setHexDraft] = useState('0EA5E9')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  function handleHexDraft(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHexDraft(cleaned.toUpperCase())
    if (cleaned.length === 6) setHex(`#${cleaned}`)
  }

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
      addCustomColor({ key, label, base: hex, scale: generateColorScale(hex, colorAlgorithm, contrastShift) })
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
          onClick={() => { setOpen((v) => { if (!v) setHexDraft(hex.replace('#', '').toUpperCase()); return !v }); setError(null) }}
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
              className="absolute z-30 right-0 mt-1.5 w-80 rounded-lg border border-line-strong bg-app shadow-lg p-3 flex flex-col gap-3"
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
                            updateCustomColor(c.key, { base: e.target.value, scale: generateColorScale(e.target.value, colorAlgorithm, contrastShift) })
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
                    onChange={(e) => { setHex(e.target.value); setHexDraft(e.target.value.replace('#', '').toUpperCase()) }}
                    aria-label="New custom color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-surface border border-line focus-within:border-[#0088FF] transition-colors flex-shrink-0">
                  <span className="text-[12px] font-mono text-fg-faint select-none">#</span>
                  <input
                    type="text"
                    value={hexDraft}
                    onChange={(e) => handleHexDraft(e.target.value)}
                    onBlur={() => setHexDraft(hex.replace('#', '').toUpperCase())}
                    aria-label="Hex color value"
                    maxLength={6}
                    className="w-[50px] text-[12px] font-mono text-fg bg-transparent outline-none uppercase"
                    placeholder="0EA5E9"
                  />
                </div>
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

// ── Generic outlined dropdown (Algorithm · Naming) ──────────────────────────

function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((o) => o.key === value)?.label ?? options[0]?.label

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-colors text-left"
      >
        <span className="text-sm text-fg truncate">{active}</span>
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
            className="absolute z-30 left-0 right-0 mt-1.5 rounded-lg border border-line-strong bg-app shadow-lg p-1.5 max-h-72 overflow-y-auto"
          >
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={o.key === value}
                onClick={() => { onChange(o.key); setOpen(false) }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  o.key === value ? 'bg-elevated text-[#0088FF] font-medium' : 'text-fg hover:bg-surface'
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

// ── Color controls card — Algorithm · Naming · Contrast shift ───────────────
// Drives how every 1–12 ramp is generated + how the export names them. Changing
// the algorithm or shift regenerates all scales so the preview + export track live.

function ColorControls({
  algorithm,
  naming,
  contrastShift,
  onAlgorithm,
  onNaming,
  onShift,
}: {
  algorithm: ColorAlgorithm
  naming: ColorNaming
  contrastShift: number
  onAlgorithm: (a: ColorAlgorithm) => void
  onNaming: (n: ColorNaming) => void
  onShift: (n: number) => void
}) {
  const fill = ((contrastShift + 1) / 2) * 100 // −1…1 → 0…100%

  return (
    <div className="rounded-xl border border-line p-4 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
      {/* Algorithm */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Algorithm</span>
          {algorithm === RECOMMENDED_ALGORITHM && (
            <span className="text-[10px] font-medium text-emerald-600">Recommended</span>
          )}
        </div>
        <SelectMenu value={algorithm} options={ALGORITHM_OPTIONS} onChange={onAlgorithm} ariaLabel="Scale algorithm" />
      </div>

      {/* Naming */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Naming</span>
        <SelectMenu
          value={naming}
          options={NAMING_SCHEMES.map((s) => ({ key: s.key, label: s.label }))}
          onChange={onNaming}
          ariaLabel="Token naming scheme"
        />
      </div>

      {/* Contrast shift */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Contrast shift</span>
          <button
            type="button"
            onClick={() => onShift(0)}
            disabled={contrastShift === 0}
            className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg disabled:opacity-40 disabled:hover:text-fg-faint transition-colors"
          >
            Reset
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" /></svg>
          </button>
        </div>
        <span className="text-lg font-bold text-fg tabular-nums leading-none">{contrastShift.toFixed(2)}</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={contrastShift}
          onChange={(e) => onShift(Number(e.target.value))}
          aria-label="Contrast shift"
          className="sd-slider mt-1"
          style={{ ['--sd-fill' as string]: `${fill}%` }}
        />
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
    themes, mergeThemeTokens, customColors, updateCustomColor, removeCustomColor,
    colorAlgorithm, contrastShift, colorNaming, setColorAlgorithm, setContrastShift, setColorNaming,
  } = useDesignStore()
  const lightTokens = themes.light ?? {}

  // Saved customs surface in both dropdowns ahead of the Tested presets.
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

  // When ON, the neutral scale auto-derives from the brand color. Default ON.
  const [linked, setLinked] = useState(true)
  // When ON, the state colors are recommended from (harmonized with) the brand.
  const [statesLinked, setStatesLinked] = useState(true)

  // Tone labels shown above the brand scale, per the active naming scheme.
  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  const regenerate = useCallback((hex: string) => {
    try {
      const scale = generateColorScale(hex, colorAlgorithm, contrastShift)
      setPrimaryColor(hex)
      setPrimaryScale(scale)
      // Keep already-mapped brand semantic tokens in sync with the new brand so
      // the live preview + export track it (unmapped keys fall back to primaryColor).
      const solid = accessibleSolidTone(scale)
      const updates: Record<string, string> = {}
      for (const [key, tone] of Object.entries(BRAND_TOKEN_TONES)) {
        if (!lightTokens[key]) continue
        const t =
          key === 'action-primary' ? solid
          : key === 'action-primary-hover' ? Math.min(solid + 1, 12)
          : tone
        if (scale[t]) updates[key] = scale[t]
      }
      if (Object.keys(updates).length) mergeThemeTokens('light', updates)
      // When linked, re-derive the neutral scale from the new brand.
      if (linked) {
        const n = neutralFromBrand(hex)
        setGrayBaseColor(n)
        setGrayLightScale(generateColorScale(n, colorAlgorithm, contrastShift))
      }
    } catch {}
  }, [setPrimaryColor, setPrimaryScale, lightTokens, mergeThemeTokens, linked, setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift])

  const regenerateError = useCallback((hex: string) => {
    try { setErrorColor(hex); setErrorScale(generateColorScale(hex, colorAlgorithm, contrastShift)) } catch {}
  }, [setErrorColor, setErrorScale, colorAlgorithm, contrastShift])

  const regenerateWarning = useCallback((hex: string) => {
    try { setWarningColor(hex); setWarningScale(generateColorScale(hex, colorAlgorithm, contrastShift)) } catch {}
  }, [setWarningColor, setWarningScale, colorAlgorithm, contrastShift])

  const regenerateSuccess = useCallback((hex: string) => {
    try { setSuccessColor(hex); setSuccessScale(generateColorScale(hex, colorAlgorithm, contrastShift)) } catch {}
  }, [setSuccessColor, setSuccessScale, colorAlgorithm, contrastShift])

  const regenerateInfo = useCallback((hex: string) => {
    try { setInfoColor(hex); setInfoScale(generateColorScale(hex, colorAlgorithm, contrastShift)) } catch {}
  }, [setInfoColor, setInfoScale, colorAlgorithm, contrastShift])

  const regenerateGray = useCallback((hex: string) => {
    try { setGrayBaseColor(hex); setGrayLightScale(generateColorScale(hex, colorAlgorithm, contrastShift)) } catch {}
  }, [setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift])

  function toggleLink() {
    const next = !linked
    setLinked(next)
    if (next) regenerateGray(neutralFromBrand(primaryColor))
  }

  // Recommend harmonized state colors from a brand hex, then regenerate scales.
  function applyStateRecommendations(brandHex: string) {
    const rec = recommendStateColors(brandHex)
    regenerateError(rec.error)
    regenerateWarning(rec.warning)
    regenerateSuccess(rec.success)
    regenerateInfo(rec.info)
  }

  // Brand change → regenerate the brand (+ linked neutral) and, when state
  // colors are linked, re-recommend them so they harmonize with the new brand.
  function changeBrand(hex: string) {
    regenerate(hex)
    if (statesLinked) applyStateRecommendations(hex)
  }

  function toggleStatesLink() {
    const next = !statesLinked
    setStatesLinked(next)
    if (next) applyStateRecommendations(primaryColor)
  }

  useEffect(() => {
    if (Object.keys(primaryScale).length    === 0) regenerate(primaryColor)
    if (Object.keys(errorScale).length       === 0) regenerateError(errorColor)
    if (Object.keys(warningScale).length     === 0) regenerateWarning(warningColor)
    if (Object.keys(successScale).length     === 0) regenerateSuccess(successColor)
    if (Object.keys(infoScale).length        === 0) regenerateInfo(infoColor)
    if (Object.keys(grayLightScale).length   === 0) regenerateGray(grayBaseColor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Algorithm / contrast-shift change → rebuild every ramp from its base color
  // (brand · neutral · state · custom families). Skips the initial mount so it
  // doesn't clobber freshly-seeded scales.
  const algoMounted = useRef(false)
  useEffect(() => {
    if (!algoMounted.current) { algoMounted.current = true; return }
    regenerate(primaryColor)
    if (!linked) regenerateGray(grayBaseColor)
    if (statesLinked) {
      regenerateError(errorColor)
      regenerateWarning(warningColor)
      regenerateSuccess(successColor)
      regenerateInfo(infoColor)
    }
    customColors.forEach((c) =>
      updateCustomColor(c.key, { scale: generateColorScale(c.base, colorAlgorithm, contrastShift) }),
    )
  }, [colorAlgorithm, contrastShift]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Color controls: Algorithm · Naming · Contrast shift ── */}
      <section className="-mx-8 -mt-8 px-8 pt-8 pb-8 flex flex-col gap-5 border-b border-line">
        <ColorControls
          algorithm={colorAlgorithm}
          naming={colorNaming}
          contrastShift={contrastShift}
          onAlgorithm={setColorAlgorithm}
          onNaming={setColorNaming}
          onShift={setContrastShift}
        />

        <h3 className="text-base font-semibold text-fg">Primitives</h3>

        {/* Brand · link/info · Neutral · + Custom */}
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <ColorSelect label="Accent Color" value={primaryColor} groups={brandGroups} onChange={changeBrand} />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} />
          </div>
          <ColorSelect label="Neutral" value={grayBaseColor} groups={neutralGroups} onChange={regenerateGray} />
          <AddCustomColorButton />
        </div>

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={primaryScale} labels={namingLabels} />
          <ScaleRow scale={grayLightScale} showNumbers={false} />
        </div>
      </section>

      {/* ── State colors — compact pills (Error · Success · Warning · info) ── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-fg">State colors</h3>
        <div className="flex items-center gap-3">
          <LinkToggle active={statesLinked} onClick={toggleStatesLink} accentColor={primaryScale[7] ?? primaryColor} />
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            <ColorSelect variant="pill" label="Error" value={errorColor} onChange={regenerateError} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: [
              { hex: '#f04438', label: 'Red 500' }, { hex: '#d92d20', label: 'Red 600' }, { hex: '#ef4444', label: 'Tailwind Red' }, { hex: '#e11d48', label: 'Rose' },
            ] }]} />
            <ColorSelect variant="pill" label="Success" value={successColor} onChange={regenerateSuccess} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: [
              { hex: '#17b26a', label: 'Green 500' }, { hex: '#079455', label: 'Green 600' }, { hex: '#10b981', label: 'Emerald' }, { hex: '#22c55e', label: 'Green 400' },
            ] }]} />
            <ColorSelect variant="pill" label="Warning" value={warningColor} onChange={regenerateWarning} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: [
              { hex: '#f79009', label: 'Amber 500' }, { hex: '#f59e0b', label: 'Amber' }, { hex: '#dc6803', label: 'Orange 600' }, { hex: '#f97316', label: 'Orange' },
            ] }]} />
            <ColorSelect variant="pill" label="Info" value={infoColor} onChange={regenerateInfo} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: [
              { hex: '#2e90fa', label: 'Blue 400' }, { hex: '#3b82f6', label: 'Blue' }, { hex: '#0ea5e9', label: 'Sky' }, { hex: '#06b6d4', label: 'Cyan' },
            ] }]} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
