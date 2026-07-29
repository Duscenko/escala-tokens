// Picker Color — the Color hub's palette-DEFINITION tab (first in the switcher
// order): decide your base colors here, see how they're USED in Primary Color.
// Houses what used to be Primary Color's quick bar (Color families · link ·
// Gray/Neutral) plus State Colors expanded — every one of Neutral/Error/
// Success/Warning/Info shown with its full 1–12 scale always visible, not
// hidden behind a popover. No Background field (removed, not disabled — see
// ColorPrimitives' history) and no usage table: that's Primary Color's job.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { NAMING_SCHEMES, BASE_TONE, recommendStateColors, generateAlphaScale } from '../../lib/colorUtils'
import { useApplyAccentColor, useApplyGrayColor, useApplyStateColor } from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, TransparencyStrip, InfoDot, LinkToggle, neutralFromBrand, STATE_PRESETS,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup, type IntentRole,
} from './colorControls'
import { ColorControls, ScaleSettingsModal } from './Step2_ColorPalette'
import { resolveThemePalette } from '../../lib/themeSources'
import { SlidersIcon } from '../ui/icons'

export type PickerFocusTarget = 'accent' | 'neutral' | 'error' | 'warning' | 'success' | 'info' | null

export default function PickerColor({
  previewTheme = 'light',
  onPreviewThemeChange,
  focusTarget,
  onFocusHandled,
}: {
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** Set by Primary Color's "Edit in Picker Color" link — scrolls that section
   *  into view and pulses it once. */
  focusTarget?: PickerFocusTarget
  /** Called once the focus request above has been acted on, so the shell can
   *  clear it (re-visiting the tab later shouldn't re-trigger the pulse). */
  onFocusHandled?: () => void
}) {
  const store = useDesignStore()
  const {
    primaryColor, primaryScale, primaryDarkScale,
    grayBaseColor, grayLightScale, grayDarkScale,
    errorColor, errorScale, errorDarkScale,
    warningColor, warningScale, warningDarkScale,
    successColor, successScale, successDarkScale,
    infoColor, infoScale, infoDarkScale,
    customColors, removeCustomColor,
    themeKinds, themeSources,
    colorAlgorithm, colorNaming, contrastShift,
    setColorAlgorithm, setColorNaming, setContrastShift,
  } = store
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyStateColor = useApplyStateColor()

  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'
  // Custom "style themes" carry their own palette — while one is previewed the
  // quick bar reads (and the ScaleRows render) THAT palette, matching where
  // changeAccent/changeNeutral route their writes (same contract ColorPrimitives
  // used to follow here before this module split).
  const pal = resolveThemePalette(themeSources[previewTheme], darkPreview ? 'dark' : 'light', store)
  const accentBase = pal?.brand?.[BASE_TONE] ?? primaryColor
  const neutralBase = pal?.gray?.[BASE_TONE] ?? grayBaseColor
  const brandRamp = pal?.brand ?? (darkPreview ? primaryDarkScale : primaryScale)
  const neutralRamp = pal?.gray ?? (darkPreview ? grayDarkScale : grayLightScale)
  // Alpha twin of the brand ramp, solved against the page it renders on — an
  // alpha value only means anything relative to its own background, so this
  // re-derives whenever the previewed appearance flips.
  const transparencyRamp = useMemo(
    () => generateAlphaScale(brandRamp, darkPreview ? store.darkBackground : store.pageBackground, darkPreview ? 'dark' : 'light'),
    [brandRamp, darkPreview, store.darkBackground, store.pageBackground],
  )

  const [linked, setLinked] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  const changeAccent = (hex: string) => applyAccentColor(hex, linked, previewTheme)
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)
  const toggleLink = () => {
    const next = !linked
    setLinked(next)
    if (next) applyGrayColor(neutralFromBrand(accentBase), previewTheme)
  }
  const changeIntent = (role: IntentRole, hex: string) =>
    role === 'neutral' ? changeNeutral(hex) : applyStateColor(role, hex)
  const matchStatesToAccent = () => {
    const rec = recommendStateColors(accentBase)
    applyStateColor('error', rec.error)
    applyStateColor('warning', rec.warning)
    applyStateColor('success', rec.success)
    applyStateColor('info', rec.info)
  }

  // ── "Edit in Picker Color" focus — scroll the requested section into view
  // and pulse its border once, then tell the shell to clear the request. ──
  const sectionRefs = {
    accent: useRef<HTMLDivElement>(null),
    neutral: useRef<HTMLDivElement>(null),
    error: useRef<HTMLDivElement>(null),
    warning: useRef<HTMLDivElement>(null),
    success: useRef<HTMLDivElement>(null),
    info: useRef<HTMLDivElement>(null),
  }
  const [pulsing, setPulsing] = useState<PickerFocusTarget>(null)
  useEffect(() => {
    if (!focusTarget) return
    const el = sectionRefs[focusTarget]?.current
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setPulsing(focusTarget)
    onFocusHandled?.()
    const t = setTimeout(() => setPulsing(null), 1600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget])

  const pulseClass = (key: PickerFocusTarget) =>
    pulsing === key ? 'ring-2 ring-accent-ui ring-offset-2 ring-offset-app transition-shadow' : 'ring-2 ring-transparent transition-shadow'

  const STATES: { role: IntentRole; label: string; value: string; scale: Record<number, string> }[] = [
    { role: 'neutral', label: 'Neutral', value: neutralBase, scale: neutralRamp },
    { role: 'error', label: 'Error', value: errorColor, scale: darkPreview ? errorDarkScale : errorScale },
    { role: 'success', label: 'Success', value: successColor, scale: darkPreview ? successDarkScale : successScale },
    { role: 'warning', label: 'Warning', value: warningColor, scale: darkPreview ? warningDarkScale : warningScale },
    { role: 'info', label: 'Info', value: infoColor, scale: darkPreview ? infoDarkScale : infoScale },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Color families + Gray/Neutral quick bar — the brand ramp and its
          transparency twin. Borderless and with no section title on purpose:
          this is the tab's opening control row, so the heading only repeated
          the ColorSelect label directly under it. The scale settings gear sits
          at the FAR RIGHT of this same row, baseline-aligned with the two
          dropdowns, instead of floating in a header of its own. ── */}
      <section
        ref={sectionRefs.accent}
        className={`flex flex-col gap-3 rounded-[16px] ${pulseClass('accent')}`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <ColorSelect label="Color families" value={accentBase} groups={brandGroups} onChange={changeAccent} allowCustom />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} accentColor={brandRamp[BASE_TONE] ?? primaryColor} />
          </div>
          <ColorSelect label="Gray / Neutral" value={neutralBase} groups={neutralGroups} onChange={changeNeutral} allowCustom />
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              aria-label="Scale settings — algorithm, naming, contrast shift"
              title="Scale settings"
              className={`w-9 h-9 rounded-[13px] flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                settingsOpen ? 'bg-elevated border-line-strong text-fg' : 'border-line-strong bg-surface text-fg-muted hover:text-fg hover:border-fg-faint'
              }`}
            >
              <SlidersIcon />
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

        <div className="flex flex-col gap-2">
          {/* Numbers ride INSIDE the brand swatches so each label doubles as a
              live contrast check on its own tone. */}
          <ScaleRow scale={brandRamp} labels={namingLabels} numbersInside ariaLabel="Brand scale" />
          <span className="text-[10px] uppercase tracking-wide text-fg-faint px-0.5">Transparency scale</span>
          {/* The transparency twin of the ramp above, NOT a second independent
              neutral row (which is what used to sit here and read as a stray
              gray ramp with no control of its own). Each step is its brand tone
              re-expressed as an alpha over the current page, via the same
              `generateAlphaScale` the export ships as `accent-a*`, so what's on
              screen is exactly what lands in tokens.json. Rendered on the same
              checkerboard as Foundations · Opacity's "Opacity Scale" strip — a
              flat swatch grid read as just another solid ramp with no way to
              tell it was translucent, and a solid page-color backdrop instead
              of the checker broke the moment the previewed appearance flipped
              (an alpha value only composites correctly against the specific
              page it was solved for, so it silently looked wrong on the other
              theme). The checker makes the transparency legible regardless of
              which page is behind it. */}
          <TransparencyStrip scale={transparencyRamp} labels={namingLabels} />
        </div>
      </section>

      {/* ── State colors, expanded — every scale visible, no popover, no tab
          switch needed to see what Error/Success/Warning/Info actually are. ── */}
      <section className="flex flex-col gap-5 rounded-[16px] border border-line p-[24px] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-fg">State colors</h3>
          <button
            type="button"
            onClick={matchStatesToAccent}
            className="text-[12px] text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
          >
            Match to accent
          </button>
        </div>
        {STATES.map((s) => (
          <div
            key={s.role}
            ref={sectionRefs[s.role]}
            className={`flex flex-col gap-2 rounded-xl p-1 ${pulseClass(s.role)}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-16 flex-shrink-0 text-[13px] font-medium text-fg">{s.label}</span>
              <ColorSelect
                variant="pill"
                value={s.value}
                onChange={(hex) => changeIntent(s.role, hex)}
                groups={[{ label: '', options: STATE_PRESETS[s.role] }]}
                allowCustom
              />
            </div>
            <ScaleRow scale={s.scale} labels={namingLabels} />
          </div>
        ))}
      </section>
    </motion.div>
  )
}
