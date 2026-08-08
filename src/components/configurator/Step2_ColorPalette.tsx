import { useEffect, useCallback, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateColorScale, recommendStateColors, NAMING_SCHEMES, NEUTRAL_TINTS, type NeutralTint } from '../../lib/colorUtils'
import { useApplyAccentColor, useApplyGrayColor, useApplyPageBackground, useApplyDarkBackground } from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand, STATE_PRESETS,
  BRAND_GROUPS, NEUTRAL_GROUPS, BACKGROUND_GROUPS, darkBackgroundGroups, type OptionGroup,
} from './colorControls'

// ── Scale settings — Contrast shift ─────────────────────────────────────────
// Drives how far every 1–12 ramp travels from the page; changing it regenerates
// all scales so the preview + export track live. Lives in a popover (gear entry
// point in the Primitives quick-edit strip).
//
// The Algorithm and Naming dropdowns that used to sit above this were REMOVED:
// the algorithm is pinned to Radix (`makeDesignDefaults`' own default, and the
// model the whole scale system is documented against), and naming is pinned to
// Radix numeric 1–12 — which store v42 already force-converts every system to,
// so the picker was offering a choice the migration immediately overrode. Both
// values still live in the store and still drive the export; they just aren't
// user-switchable while there's no infrastructure to support the alternatives.

export function ColorControls({
  contrastShift,
  onShift,
  neutralTint,
  onTint,
  tintPreview,
  linkNeutral,
  onLinkNeutral,
  linkedNeutralPreview,
  onMatchStates,
  statesMatched,
}: {
  contrastShift: number
  onShift: (n: number) => void
  /** Omit both to hide the tint block (hosts that don't own the system Base). */
  neutralTint?: NeutralTint
  onTint?: (t: NeutralTint) => void
  /** Page hex each level would produce, for the swatch. Caller computes it so
   *  this stays presentational (no store reads), same as the rest of the file. */
  tintPreview?: (t: NeutralTint) => string
  /** Accent↔Neutral link. Omit both to hide the harmony block. */
  linkNeutral?: boolean
  onLinkNeutral?: (v: boolean) => void
  /** The hex the neutral becomes while linked — so the toggle can SHOW its
   *  consequence instead of describing it. */
  linkedNeutralPreview?: string
  /** One-shot "harmonize the four state colours with the accent". Unlike the
   *  neutral link this stays a button, not a toggle: a state colour is a
   *  deliberate brand decision far more often than a grey is, so it shouldn't
   *  silently move every time the accent does. */
  onMatchStates?: () => void
  /** True when the states already equal what `onMatchStates` would produce —
   *  lets the button say "Matched" instead of inviting a no-op click. */
  statesMatched?: boolean
}) {
  const fill = ((contrastShift + 1) / 2) * 100 // −1…1 → 0…100%

  return (
    <div className="flex flex-col gap-5">
      {/* Harmony — the accent↔neutral link and the states one-shot. Lives HERE,
          in the scale-settings popover, rather than inline in the quick-edit
          strip: a control that only renders while Accent is active shifts the
          ramp beside it 52px right on that one family, which is exactly why the
          old "match states" wand was removed from the strip. The gear is always
          present, and this sits next to Neutral tint — the setting that decides
          how much accent hue a linked neutral even carries. */}
      {linkNeutral !== undefined && onLinkNeutral && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Harmony</span>
          <button
            type="button"
            onClick={() => onLinkNeutral(!linkNeutral)}
            aria-pressed={linkNeutral}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
              linkNeutral ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
            }`}
          >
            <span
              aria-hidden
              className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-black/10"
              style={{ background: linkedNeutralPreview ?? 'transparent' }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-fg">Neutral follows the accent</span>
              <span className="block text-[11px] text-fg-faint leading-snug">
                {linkNeutral
                  ? 'Re-derived on every accent change. Editing it by hand unlinks.'
                  : 'The neutral is set by hand and keeps its own colour.'}
              </span>
            </span>
          </button>
          {onMatchStates && (
            <button
              type="button"
              onClick={onMatchStates}
              disabled={statesMatched}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-line text-left text-[12px] text-fg hover:border-line-strong disabled:opacity-45 disabled:hover:border-line transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint">
                <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
              </svg>
              <span className="min-w-0 flex-1">
                {statesMatched ? 'States already match the accent' : 'Match Error · Warning · Success · Info to accent'}
              </span>
            </button>
          )}
          <span className="text-[10px] text-fg-faint leading-snug">
            States keep their own hue — only saturation is harmonized, so red stays red.
          </span>
        </div>
      )}

      {/* Neutral tint — how much of the Neutral's colour reaches the page.
          Discrete levels, not a slider: this is Radix's "pick a gray family"
          decision (Gray · Mauve · Slate · Sage · Sand), and a free 0–1 value
          would let a system land on a tint nobody chose deliberately. It sits
          ABOVE contrast shift because it moves the page, which every other
          value in the modal is then computed against. */}
      {neutralTint && onTint && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Neutral tint</span>
          <div className="grid grid-cols-2 gap-1.5">
            {NEUTRAL_TINTS.map((t) => {
              const active = t.key === neutralTint
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTint(t.key)}
                  title={t.hint}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg border text-left transition-colors ${
                    active ? 'border-accent-ui bg-accent-ui/[0.08] text-fg' : 'border-line text-fg-muted hover:border-line-strong'
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-black/10"
                    style={{ background: tintPreview?.(t.key) ?? 'transparent' }}
                  />
                  <span className="min-w-0 truncate text-[11px]">{t.label}</span>
                </button>
              )
            })}
          </div>
          <span className="text-[10px] text-fg-faint leading-snug">
            How much of the Neutral's colour reaches the page. Every ramp grows out of it.
          </span>
        </div>
      )}

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
              <h3 className="text-sm font-semibold text-fg">Contrast</h3>
              <p className="text-xs text-fg-faint mt-0.5">
                How far every 1–12 ramp travels from the page background.
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
    colorAlgorithm, contrastShift, colorNaming, setContrastShift, neutralTint,
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
    if (next) regenerateGray(neutralFromBrand(primaryColor, neutralTint))
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
                <ColorControls contrastShift={contrastShift} onShift={setContrastShift} />
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
