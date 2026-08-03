import { useEffect, useCallback, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  generateColorScale, recommendStateColors,
  ALGORITHM_OPTIONS, RECOMMENDED_ALGORITHM, NAMING_SCHEMES,
  type ColorAlgorithm, type ColorNaming,
} from '../../lib/colorUtils'
import { useApplyAccentColor, useApplyGrayColor, useApplyPageBackground, useApplyDarkBackground } from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand, STATE_PRESETS,
  BRAND_GROUPS, NEUTRAL_GROUPS, BACKGROUND_GROUPS, darkBackgroundGroups, type OptionGroup,
} from './colorControls'

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
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface border border-line-strong hover:border-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg transition-colors text-left"
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

// ── Scale settings — Algorithm · Naming · Contrast shift ────────────────────
// Drives how every 1–12 ramp is generated + how the export names them. Changing
// the algorithm or shift regenerates all scales so the preview + export track live.
// Lives in a modal (gear entry point next to the Primitives heading).

export function ColorControls({
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
    <div className="flex flex-col gap-5">
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

// Anchored popover for the scale settings — mirrors QuickFoundationsPanel's
// style exactly (no backdrop overlay; Esc/click-outside to dismiss). Entry
// point is the filter-icon button in the Primitives header, which this must
// render right next to (parent wraps both in a `relative` container).
export function ScaleSettingsModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
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
          aria-label="Scale settings"
          className="absolute right-0 top-full mt-2 z-30 w-80 rounded-2xl border border-line bg-app shadow-xl p-5 flex flex-col gap-6"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-fg">Scale settings</h3>
              <p className="text-xs text-fg-faint mt-0.5">
                How every 1–12 ramp is generated and how tokens are named in the export.
              </p>
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
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step2_ColorPalette({ previewTheme = 'light' }: { previewTheme?: string }) {
  const {
    primaryColor, primaryScale,
    errorColor,   errorScale,   setErrorColor,   setErrorScale,
    warningColor, warningScale, setWarningColor, setWarningScale,
    successColor, successScale, setSuccessColor, setSuccessScale,
    infoColor,    infoScale,    setInfoColor,    setInfoScale,
    grayBaseColor, grayLightScale, grayDarkScale,
    customColors, updateCustomColor, removeCustomColor,
    colorAlgorithm, contrastShift, colorNaming, setColorAlgorithm, setContrastShift, setColorNaming,
    pageBackground, darkBackground, themeKinds,
  } = useDesignStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyPageBackground = useApplyPageBackground()
  const applyDarkBackground = useApplyDarkBackground()

  // Mirrors Home: previewing a dark theme means you're editing the DARK page
  // background (accent-derived presets) and looking at the dark neutral ramp.
  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'

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
    applyAccentColor(hex, linked)
  }, [applyAccentColor, linked])

  const regenerateError = useCallback((hex: string) => {
    try { setErrorColor(hex); setErrorScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setErrorColor, setErrorScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateWarning = useCallback((hex: string) => {
    try { setWarningColor(hex); setWarningScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setWarningColor, setWarningScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateSuccess = useCallback((hex: string) => {
    try { setSuccessColor(hex); setSuccessScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setSuccessColor, setSuccessScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateInfo = useCallback((hex: string) => {
    try { setInfoColor(hex); setInfoScale(generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)) } catch {}
  }, [setInfoColor, setInfoScale, colorAlgorithm, contrastShift, pageBackground])

  const regenerateGray = applyGrayColor

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
  // doesn't clobber freshly-seeded scales. Background changes regenerate via
  // useApplyPageBackground (shared with Home's picker) — not this effect, so
  // the pipeline runs even when this section isn't mounted.
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
      updateCustomColor(c.key, { scale: generateColorScale(c.base, colorAlgorithm, contrastShift, pageBackground) }),
    )
  }, [colorAlgorithm, contrastShift]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      <section className="-mx-8 -mt-8 px-8 pt-8 pb-8 flex flex-col gap-5 border-b border-line">
        {/* Primitives header — the scale-settings entry point */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg">Primitives</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                aria-label="Scale settings — algorithm, naming, contrast shift"
                title="Scale settings"
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                  settingsOpen ? 'bg-elevated border-line-strong text-fg' : 'border-line-strong bg-surface text-fg-muted hover:text-fg hover:border-fg-faint'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </button>
              <ScaleSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
                <ColorControls
                  algorithm={colorAlgorithm}
                  naming={colorNaming}
                  contrastShift={contrastShift}
                  onAlgorithm={setColorAlgorithm}
                  onNaming={setColorNaming}
                  onShift={setContrastShift}
                />
              </ScaleSettingsModal>
            </div>
          </div>
        </div>

        {/* Accent · link/info · Neutral · Background */}
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-3 items-end">
          <ColorSelect label="Accent Color" value={primaryColor} groups={brandGroups} onChange={changeBrand} allowCustom />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} />
          </div>
          <ColorSelect label="Neutral" value={grayBaseColor} groups={neutralGroups} onChange={regenerateGray} allowCustom />
          <ColorSelect
            label={darkPreview ? 'Background (dark)' : 'Background'}
            value={darkPreview ? darkBackground : pageBackground}
            groups={darkPreview ? darkBackgroundGroups(primaryColor) : BACKGROUND_GROUPS}
            onChange={darkPreview ? applyDarkBackground : applyPageBackground}
            allowCustom
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={primaryScale} labels={namingLabels} />
          <ScaleRow scale={darkPreview ? grayDarkScale : grayLightScale} showNumbers={false} />
        </div>
      </section>

      {/* ── State colors — compact pills (Error · Success · Warning · info) ── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-fg">State colors</h3>
        <div className="flex items-center gap-3">
          <LinkToggle active={statesLinked} onClick={toggleStatesLink} accentColor={primaryScale[7] ?? primaryColor} />
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            <ColorSelect variant="pill" label="Error" value={errorColor} onChange={regenerateError} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.error }]} />
            <ColorSelect variant="pill" label="Success" value={successColor} onChange={regenerateSuccess} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.success }]} />
            <ColorSelect variant="pill" label="Warning" value={warningColor} onChange={regenerateWarning} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.warning }]} />
            <ColorSelect variant="pill" label="Info" value={infoColor} onChange={regenerateInfo} accentColor={primaryScale[7] ?? primaryColor} groups={[{ label: '', options: STATE_PRESETS.info }]} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
