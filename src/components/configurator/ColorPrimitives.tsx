// Primary Color — the Color hub's first tab: the primitive-family editor.
// Top: the accent · link · neutral · background quick bar with the generated
// ramps (relocated from Home). Below: a Figma-style families table (Accent ·
// Neutral · states · custom families) listing every tone as a token row with
// editable light/dark values, eye toggles on the theme columns and a per-row
// picker. "+ Add" creates a custom color family with its own 1–12 scale.
// Token names in the table are the EXACT exported names (tokenGenerator's
// flattenScale prefixes: accent/neutral/error/success/warning/info/<slug>), so
// the table, the semantic sources and tokens.json never disagree.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS } from '../../store/useDesignStore'
import type { ColorScale } from '../../types/tokens'
import { NAMING_SCHEMES, BASE_TONE, recommendStateColors, generateColorScale } from '../../lib/colorUtils'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor, useEnsureColorScales,
} from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, StateColorsSelect, neutralFromBrand, SWATCH,
  usePopoverPlacement, type IntentRole,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup,
} from './colorControls'
import { ColorControls, ScaleSettingsModal } from './Step2_ColorPalette'
import { ColorPickerPanel } from '../ui/ColorField'
import { SlidersIcon, PaletteIcon } from '../ui/icons'
import { resolveThemePalette, themesUsingFamily, familySlotFor } from '../../lib/themeSources'
import { slugify } from '../../lib/utils'

// ── Small icons (mirroring the Alias table's visual language) ────────────────

function EyeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
    </svg>
  )
}


// ── Editable hex cell (swatch + live hex field, draft pattern) ───────────────

function HexCell({ value, onChange, ariaLabel }: { value: string; onChange: (hex: string) => void; ariaLabel: string }) {
  const [draft, setDraft] = useState(value.replace(/^#/, '').toUpperCase())
  const [focused, setFocused] = useState(false)

  // Track outside changes (accent swap regenerates the ramp) unless mid-type.
  useEffect(() => { if (!focused) setDraft(value.replace(/^#/, '').toUpperCase()) }, [value, focused])

  function handle(raw: string) {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setDraft(cleaned.toUpperCase())
    if (cleaned.length === 6) onChange(`#${cleaned.toLowerCase()}`)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={SWATCH} style={{ backgroundColor: value }} />
      <input
        value={draft}
        onChange={(e) => handle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        aria-label={ariaLabel}
        className="w-full min-w-0 bg-app text-[12px] font-mono tabular-nums text-fg rounded-md border border-transparent hover:border-line focus:border-fg px-1.5 py-1 outline-none transition-colors"
      />
    </div>
  )
}

// ── Family model — every primitive ramp the system carries ───────────────────

interface Family {
  key: string
  label: string
  /** Export prefix — the token name is `<tokenPrefix>-<toneLabel>`, matching tokenGenerator. */
  tokenPrefix: string
  base: string
  light: ColorScale
  dark: ColorScale
  setLight: (s: ColorScale) => void
  setDark: (s: ColorScale) => void
  /** Custom-family key — removable from the nav. */
  customKey?: string
}

export default function ColorPrimitives({
  previewTheme = 'light',
  onPreviewThemeChange,
  tabsSlot,
}: {
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** The Color hub's tab pills — rendered between the quick bar and the
   *  families table so the switcher sits right on top of the tokens. */
  tabsSlot?: ReactNode
}) {
  const store = useDesignStore()
  const {
    primaryColor, primaryScale, setPrimaryScale,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    errorColor, errorScale, setErrorScale,
    warningColor, warningScale, setWarningScale,
    successColor, successScale, setSuccessScale,
    infoColor, infoScale, setInfoScale,
    customColors, addCustomColor, updateCustomColor, removeCustomColor,
    pageBackground, themeKinds, themeSources,
    colorAlgorithm, colorNaming, contrastShift,
    setColorAlgorithm, setColorNaming, setContrastShift,
  } = store
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  const applyStateColor = useApplyStateColor()

  // Seed any ramp that's still empty (a fresh system may land here straight
  // from Home's "Start setting tokens" CTA).
  useEnsureColorScales()

  const darkPreview = (themeKinds[previewTheme] ?? 'light') === 'dark'

  // Custom "style themes" carry their own palette — while one is previewed the
  // quick bar reads (and the ScaleRows render) THAT palette, matching where
  // changeAccent/changeNeutral route their writes.
  const pal = resolveThemePalette(themeSources[previewTheme], darkPreview ? 'dark' : 'light', store)
  const accentBase = pal?.brand?.[BASE_TONE] ?? primaryColor
  const neutralBase = pal?.gray?.[BASE_TONE] ?? grayBaseColor
  const brandRamp = pal?.brand ?? primaryScale
  const neutralRamp = pal?.gray ?? (darkPreview ? grayDarkScale : grayLightScale)

  // When ON, the neutral scale auto-derives from the accent. Default ON.
  const [linked, setLinked] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  const changeAccent = (hex: string) => applyAccentColor(hex, linked, previewTheme)
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)
  const toggleLink = () => {
    const next = !linked
    setLinked(next)
    if (next) applyGrayColor(neutralFromBrand(accentBase), previewTheme)
  }

  // Neutral is an intent like the others, but it has no primitive of its own —
  // it IS the Base, so its row writes through the Base applier.
  const changeIntent = (role: IntentRole, hex: string) =>
    role === 'neutral' ? changeNeutral(hex) : applyStateColor(role, hex)

  // "Match to accent" — re-harmonizes every status hue against the current brand.
  const matchStatesToAccent = () => {
    const rec = recommendStateColors(accentBase)
    applyStateColor('error', rec.error)
    applyStateColor('warning', rec.warning)
    applyStateColor('success', rec.success)
    applyStateColor('info', rec.info)
  }

  // ── Families table state ──
  const [activeFamily, setActiveFamily] = useState('accent')
  const [query, setQuery] = useState('')
  const [expandedTone, setExpandedTone] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Only the neutral ramp has a dark twin — colored ramps keep their hue across
  // appearances, so both columns edit the shared scale (the honest model).
  const families: Family[] = useMemo(() => [
    { key: 'accent',  label: 'Accent',  tokenPrefix: 'accent',  base: primaryColor,  light: primaryScale,   dark: primaryScale,   setLight: setPrimaryScale,   setDark: setPrimaryScale },
    { key: 'neutral', label: 'Neutral', tokenPrefix: 'neutral', base: grayBaseColor, light: grayLightScale, dark: grayDarkScale,  setLight: setGrayLightScale, setDark: setGrayDarkScale },
    { key: 'error',   label: 'Error',   tokenPrefix: 'error',   base: errorColor,    light: errorScale,     dark: errorScale,     setLight: setErrorScale,     setDark: setErrorScale },
    { key: 'success', label: 'Success', tokenPrefix: 'success', base: successColor,  light: successScale,   dark: successScale,   setLight: setSuccessScale,   setDark: setSuccessScale },
    { key: 'warning', label: 'Warning', tokenPrefix: 'warning', base: warningColor,  light: warningScale,   dark: warningScale,   setLight: setWarningScale,   setDark: setWarningScale },
    { key: 'info',    label: 'Info',    tokenPrefix: 'info',    base: infoColor,     light: infoScale,      dark: infoScale,      setLight: setInfoScale,      setDark: setInfoScale },
    ...customColors.map((c) => ({
      key: `custom-${c.key}`,
      label: c.label,
      tokenPrefix: c.key,
      base: c.base,
      light: c.scale,
      dark: c.scale,
      setLight: (s: ColorScale) => updateCustomColor(c.key, { scale: s }),
      setDark: (s: ColorScale) => updateCustomColor(c.key, { scale: s }),
      customKey: c.key,
    })),
  ], [
    primaryColor, primaryScale, setPrimaryScale,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    errorColor, errorScale, setErrorScale, successColor, successScale, setSuccessScale,
    warningColor, warningScale, setWarningScale, infoColor, infoScale, setInfoScale,
    customColors, updateCustomColor,
  ])

  const family = families.find((f) => f.key === activeFamily) ?? families[0]
  const totalTokens = families.length * 12

  // ── Folders (Figma-style collections) ──
  // The nav groups families by the ROLE they serve, not by insertion order:
  // Accents (the brand + every custom family a theme reads as its accent),
  // Neutrals (base + theme neutrals), States (the four intents + custom status
  // families) and Custom for free-standing families no theme references yet.
  // Derived from `themeSources`, so a family minted by "Add theme" files itself
  // under the right folder with zero bookkeeping.
  const famGroups = useMemo(() => {
    const groupOf = (f: Family): 'Accents' | 'Neutrals' | 'States' | 'Custom' => {
      if (f.key === 'accent') return 'Accents'
      if (f.key === 'neutral') return 'Neutrals'
      if (!f.customKey) return 'States'
      const slot = familySlotFor(f.customKey, themeSources)
      if (slot === 'brand') return 'Accents'
      if (slot === 'gray') return 'Neutrals'
      if (slot) return 'States'
      return 'Custom'
    }
    return (['Accents', 'Neutrals', 'States', 'Custom'] as const)
      .map((label) => ({ label, items: families.filter((f) => groupOf(f) === label) }))
      .filter((g) => g.items.length > 0)
  }, [families, themeSources])

  const q = query.trim().toLowerCase()
  const tones = Array.from({ length: 12 }, (_, i) => i + 1)
  const rowName = (tone: number) => `${family.tokenPrefix}-${namingLabels[tone - 1] ?? tone}`
  const visibleTones = q ? tones.filter((tone) => rowName(tone).toLowerCase().includes(q)) : tones

  const setTone = (scale: ColorScale, setter: (s: ColorScale) => void, tone: number, hex: string) =>
    setter({ ...scale, [tone]: hex })

  // ── "+ Add" custom-family popover ──
  const addRef = useRef<HTMLDivElement>(null)
  const [addName, setAddName] = useState('')
  const [addHex, setAddHex] = useState('#7f56d9')
  useEffect(() => {
    if (!addOpen) return
    function onDown(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setAddOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [addOpen])

  const addPlace = usePopoverPlacement(addRef, addOpen)

  // ── Per-family colour editing ──
  // The nav used to be selection-only: to retint a family you had to go back up
  // to the quick bar and know which control owned it. Each row now carries a
  // pencil that opens the picker for THAT family, routed to whichever applier
  // owns it.
  const [editFamily, setEditFamily] = useState<string | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const editPlace = usePopoverPlacement(editRef, editFamily)
  useEffect(() => {
    if (!editFamily) return
    function onDown(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditFamily(null)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setEditFamily(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [editFamily])

  const changeFamilyBase = (f: Family, hex: string) => {
    if (f.customKey) {
      try {
        updateCustomColor(f.customKey, { base: hex, scale: generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground) })
      } catch { /* invalid hex — ignore */ }
      return
    }
    if (f.key === 'accent') return changeAccent(hex)
    if (f.key === 'neutral') return changeNeutral(hex)
    applyStateColor(f.key as 'error' | 'warning' | 'success' | 'info', hex)
  }

  const addSlug = slugify(addName)
  const addTaken = RESERVED_COLOR_KEYS.includes(addSlug) || customColors.some((c) => c.key === addSlug)
  const canAdd = addName.trim().length > 0 && !addTaken

  function submitAdd() {
    if (!canAdd) return
    let scale: ColorScale
    try { scale = generateColorScale(addHex, colorAlgorithm, contrastShift, pageBackground) } catch { return }
    addCustomColor({ key: addSlug, label: addName.trim(), base: addHex, scale })
    setActiveFamily(`custom-${addSlug}`)
    setAddName('')
    setAddOpen(false)
  }

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: 'minmax(9rem,1.1fr) repeat(2, minmax(8.5rem,1fr)) 2.75rem',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Quick bar: accent · link · neutral · background + ramps ── */}
      <section className="flex flex-col gap-[24px] rounded-[16px] border border-line p-[24px] shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
          <ColorSelect label="Color families" value={accentBase} groups={brandGroups} onChange={changeAccent} allowCustom />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} accentColor={brandRamp[BASE_TONE] ?? primaryColor} />
          </div>
          <ColorSelect label="Base" value={neutralBase} groups={neutralGroups} onChange={changeNeutral} allowCustom />
          <StateColorsSelect
            label="State Colors"
            neutral={neutralBase}
            error={errorColor}
            warning={warningColor}
            success={successColor}
            info={infoColor}
            onChange={changeIntent}
            onMatchAccent={matchStatesToAccent}
            panelClassName="right-0 w-[320px] max-h-[420px]"
          />
          <div className="relative pb-0.5">
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

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={brandRamp} labels={namingLabels} />
          <ScaleRow scale={neutralRamp} showNumbers={false} size="thin" />
        </div>
      </section>

      {/* Hub tab switcher — right on top of the token table it switches. */}
      {tabsSlot}

      {/* ── Families table — every primitive ramp as token rows ── */}
      <div className="flex flex-col bg-app border border-line rounded-xl overflow-hidden">
        {/* Top bar: active family + add + count + search */}
        <div className="flex items-center justify-between gap-3 h-12 px-4 border-b border-line bg-app flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm text-fg truncate">{family.label}</span>
            <div ref={addRef} className="relative">
              <button
                onClick={() => setAddOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={addOpen}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-fg-faint hover:text-fg border border-line hover:border-line-strong transition-colors"
                title="Add a custom color family with its own 1–12 scale"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
                Add
              </button>
              <AnimatePresence>
                {addOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                    role="dialog"
                    aria-label="Add color family"
                    // Capped and split into three bands: the name and the CTA are
                    // pinned, only the picker scrolls. Unbounded, the panel ran
                    // past the viewport and "Add family" became unreachable.
                    style={{ maxHeight: addPlace.max }}
                    className={`absolute left-0 z-30 w-72 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
                      addPlace.up ? 'bottom-full mb-2' : 'top-full mt-2'
                    }`}
                  >
                    <div className="flex flex-col gap-3 px-4 pt-4 pb-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-fg">Add color family</span>
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }}
                        placeholder="Family name — e.g. Teal"
                        aria-label="Family name"
                        autoFocus
                        className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[13px] text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
                      />
                      {addTaken && (
                        <span className="text-[11px] text-red-500">That name is already in use.</span>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-1">
                      <ColorPickerPanel value={addHex} onChange={setAddHex} />
                    </div>
                    <div className="px-4 pt-3 pb-4 flex-shrink-0 border-t border-line">
                      <button
                        onClick={submitAdd}
                        disabled={!canAdd}
                        className="w-full px-3 py-2 rounded-lg text-[13px] font-semibold bg-fg text-app disabled:opacity-30 transition-opacity"
                      >
                        Add family
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-fg-faint">{totalTokens}</span>
          </div>
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-48 max-w-[45%] focus-within:border-line-strong transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted placeholder:text-fg-faint outline-none"
              aria-label="Filter tokens"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>

        {/* Body: family nav + tone table */}
        <div className="flex items-stretch">
          <nav aria-label="Color families" className="w-44 flex-shrink-0 border-r border-line py-1.5 px-2 flex flex-col bg-app">
            {famGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
            <span className="px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
              {group.label}
            </span>
            {group.items.map((f) => {
              const isActive = family.key === f.key
              return (
                <div key={f.key} className="relative group/fam" ref={editFamily === f.key ? editRef : undefined}>
                  <button
                    onClick={() => { setActiveFamily(f.key); setExpandedTone(null) }}
                    aria-current={isActive}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${f.customKey ? 'pr-12' : 'pr-7'} ${
                      isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                    }`}
                  >
                    <span className={SWATCH} style={{ backgroundColor: f.base }} />
                    <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{f.label}</span>
                  </button>
                  {/* Edit — stays visible on the active row so the affordance is
                      findable without hunting for it on hover. */}
                  <button
                    onClick={() => { setActiveFamily(f.key); setEditFamily((k) => (k === f.key ? null : f.key)) }}
                    aria-haspopup="dialog"
                    aria-expanded={editFamily === f.key}
                    aria-label={`Edit ${f.label} color`}
                    title={`Edit ${f.label} — ${f.base}`}
                    className={`absolute ${f.customKey ? 'right-7' : 'right-1.5'} top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-elevated transition-all ${
                      isActive || editFamily === f.key ? 'opacity-100' : 'opacity-0 group-hover/fam:opacity-100 focus-visible:opacity-100'
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  {f.customKey && (() => {
                    // A theme resolves THROUGH its families, so one in use can't
                    // be deleted — say so on the control instead of leaving a
                    // button that silently does nothing.
                    const usedBy = themesUsingFamily(f.customKey, themeSources)
                    return (
                      <button
                        onClick={() => {
                          if (usedBy.length) return
                          removeCustomColor(f.customKey!)
                          if (isActive) setActiveFamily('accent')
                        }}
                        disabled={usedBy.length > 0}
                        aria-label={usedBy.length ? `${f.label} is used by ${usedBy.join(', ')}` : `Remove ${f.label}`}
                        title={
                          usedBy.length
                            ? `In use by ${usedBy.length === 1 ? 'theme' : 'themes'} ${usedBy.join(', ')} — remove the ${usedBy.length === 1 ? 'theme' : 'themes'} first`
                            : `Remove ${f.label}`
                        }
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                          usedBy.length
                            ? 'text-fg-faint opacity-0 group-hover/fam:opacity-60 cursor-not-allowed'
                            : 'text-fg-faint hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/fam:opacity-100'
                        }`}
                      >
                        {usedBy.length ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
                        )}
                      </button>
                    )
                  })()}
                  <AnimatePresence>
                    {editFamily === f.key && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        role="dialog"
                        aria-label={`Edit ${f.label} color`}
                        style={{ maxHeight: editPlace.max }}
                        className={`absolute left-0 z-30 w-64 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
                          editPlace.up ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 flex-shrink-0">
                          <span className={SWATCH} style={{ backgroundColor: f.base }} />
                          <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{f.label}</span>
                          <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">{f.base.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                          <ColorPickerPanel value={f.base} onChange={(hex) => changeFamilyBase(f, hex)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
            </div>
            ))}
          </nav>

          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="min-w-[24rem]">
              {/* Column header — light/dark eye toggles drive the preview theme */}
              <div className="grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint" style={gridStyle}>
                <span className="pl-4 py-3 border-r border-line">Token name</span>
                {(['light', 'dark'] as const).map((col) => {
                  const isPreviewed = previewTheme === col
                  return (
                    <span key={col} className={`flex items-center px-1.5 py-2 border-r border-line min-w-0 ${isPreviewed ? 'bg-accent-ui/[0.06]' : ''}`}>
                      <button
                        onClick={() => onPreviewThemeChange?.(col)}
                        aria-pressed={isPreviewed}
                        title={isPreviewed ? `${col} — shown in preview` : `Show ${col} in the preview`}
                        className={`flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1 rounded-md transition-colors ${
                          isPreviewed ? 'bg-elevated text-accent-ui shadow-sm' : 'text-fg-faint hover:text-fg-muted hover:bg-elevated/50'
                        }`}
                      >
                        <EyeIcon active={isPreviewed} />
                        <span className="truncate">{col}</span>
                      </button>
                    </span>
                  )
                })}
                <span className="flex items-center justify-center py-3 text-fg-faint" aria-hidden>
                  <SlidersIcon />
                </span>
              </div>

              {visibleTones.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
              ) : (
                visibleTones.map((tone, i) => {
                  const name = rowName(tone)
                  const expanded = expandedTone === tone
                  const isEven = i % 2 === 1
                  // The dark column shows the value the DARK theme resolves at
                  // this position — matching the Alias/Semantics dark column.
                  // Dark themes read every ramp inverted (recDarkTone: position
                  // 1 → tone 12), so row N displays (and edits) tone 13−N of
                  // the family's dark ramp: grayDarkScale for Neutral, the
                  // shared ramp for colored families. accent-1 light is the
                  // near-white page tint; accent-1 dark is the near-black one.
                  const darkTone = 13 - tone
                  // The inline picker edits the column being previewed.
                  const pickTarget = darkPreview
                    ? { value: family.dark[darkTone] ?? '#000000', set: (hex: string) => setTone(family.dark, family.setDark, darkTone, hex) }
                    : { value: family.light[tone] ?? '#ffffff', set: (hex: string) => setTone(family.light, family.setLight, tone, hex) }
                  return (
                    <div key={tone}>
                      <div
                        className={`grid items-stretch border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
                          isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
                        }`}
                        style={gridStyle}
                      >
                        <div className="flex items-center gap-2 py-2.5 pl-4 pr-3 min-w-0 border-r border-line text-fg-faint">
                          <PaletteIcon size={14} />
                          <code className="font-mono text-[12px] text-fg-muted truncate">{name}</code>
                          {tone === BASE_TONE && (
                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-elevated text-fg-faint flex-shrink-0">base</span>
                          )}
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          <HexCell
                            value={family.light[tone] ?? '#ffffff'}
                            onChange={(hex) => setTone(family.light, family.setLight, tone, hex)}
                            ariaLabel={`${name} light value`}
                          />
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          <HexCell
                            value={family.dark[darkTone] ?? '#000000'}
                            onChange={(hex) => setTone(family.dark, family.setDark, darkTone, hex)}
                            ariaLabel={`${name} dark value`}
                          />
                        </div>
                        <button
                          onClick={() => setExpandedTone((cur) => (cur === tone ? null : tone))}
                          aria-expanded={expanded}
                          aria-label={`Edit ${name} with the color picker`}
                          title="Open color picker"
                          className={`flex items-center justify-center w-full h-full transition-colors ${
                            expanded ? 'text-accent-ui' : 'text-fg-faint hover:text-fg'
                          }`}
                        >
                          <SlidersIcon />
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ overflow: 'hidden' }}
                            className="border-t border-line/40"
                          >
                            <div className="px-4 py-4 flex flex-col gap-2 max-w-xs">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
                                {name} — {darkPreview ? 'dark' : 'light'} value
                              </span>
                              <ColorPickerPanel value={pickTarget.value} onChange={pickTarget.set} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
