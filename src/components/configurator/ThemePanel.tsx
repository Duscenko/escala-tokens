import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS, type ThemePalette, type ThemeSources } from '../../store/useDesignStore'
import { resolveThemePalette, FAMILY_SLOTS, type FamilySlot } from '../../lib/themeSources'
import { mintTheme, slotsFromAccent, type MintPages } from '../../lib/themeMint'
import { THEME_STYLE_PRESETS, presetStates } from '../../lib/themePresets'
import { adoptPreset } from '../../lib/adoptPreset'
export { mintTheme, slotsFromAccent, type MintPages }
import {
  BASE_TONE, backgroundFromBase, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, previewHarmony, readableInk,
  type NeutralTint,
} from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { MY_THEME_FULL_ERROR, MY_THEME_HARD_CAP, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { INDUSTRY_SPECTRUM, accentCuratedPalette } from '../../lib/industryPacks'
import SpectrumSlider from '../ui/SpectrumSlider'
import { ColorPickerPanel } from '../ui/ColorField'
import { TOP_NAV_H } from './TopNav'
import { SELECT_FOCUS, SELECT_LIST, SELECT_SHELL } from './themeWorkspaceLayout'
import {
  SWATCH, ScaleRow, curatedPaletteFor, ColorPickerPopover,
  COLOR_RAIL_WIDTH, COLOR_RAIL_COLLAPSED_WIDTH,
} from './colorControls'

// The six slots a theme references, in the order they read on screen: the two
// that define the theme's character first, then the four intents.
//
// `curated` is NOT a hand-written preset list any more. This file used to
// carry its own copy of the four status palettes (Red 500 · Red 600 · …),
// character-for-character identical to `STATE_PRESETS` in `colorControls` —
// two lists that had to be edited in lockstep and no mechanism saying so.
// `curatedPaletteFor` is the one source now, shared with Primitives' own
// family pickers, so "the curated reds" means the same four hexes wherever
// you open a picker.
const SLOTS: { slot: FamilySlot; label: string; family: string }[] = [
  { slot: 'brand',   label: 'Accent',  family: 'accent' },
  { slot: 'gray',    label: 'Neutral', family: 'neutral' },
  { slot: 'error',   label: 'Error',   family: 'error' },
  { slot: 'warning', label: 'Warning', family: 'warning' },
  { slot: 'success', label: 'Success', family: 'success' },
  { slot: 'info',    label: 'Info',    family: 'info' },
]

/** One slot's row: a clickable swatch + name + hex that opens the SAME
 *  `ColorPickerPanel` popover Primitives' family rows use, over the ramp that
 *  slot resolves to. Same interaction, same panel, same curated palette — this
 *  panel used to offer a bespoke `ColorSelect` dropdown here instead, so
 *  picking a theme's accent and picking a family's accent were two different
 *  controls for the same decision. */
function SlotRow({
  label, family, value, scale, onChange,
}: {
  label: string
  family: string
  value: string
  scale: Record<number, string>
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="flex items-center gap-3">
      <div ref={ref} className="relative w-[132px] flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Edit ${label} color`}
          title={`${label} — ${value.toUpperCase()}`}
          className={`w-full h-9 pl-2 pr-2.5 flex items-center gap-2 ${SELECT_SHELL} ${SELECT_FOCUS} ${open ? 'border-line-strong bg-elevated' : ''}`}
        >
          <span className={SWATCH} style={{ backgroundColor: value }} />
          <span className="flex-1 min-w-0 text-left text-ui text-fg truncate">{label}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden className={`text-fg-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <ColorPickerPopover
          open={open}
          onClose={() => setOpen(false)}
          anchor={ref}
          label={label}
          value={value}
          onChange={onChange}
          palette={curatedPaletteFor(family)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <ScaleRow scale={scale} showNumbers={false} ariaLabel={`${label} scale`} />
      </div>
    </div>
  )
}

/** Rendered width of the docked panel. See the dock geometry note on
 *  `ThemePanel` for why this is a fixed number and not measured. */
const PANEL_W = 360

type ThemeFormProps = {
  onClose: () => void
  /** When set, the panel edits this existing theme instead of creating one. */
  editKey?: string | null
  /** Appearance the panel opens on when creating (the previewed theme's kind). */
  appearance?: 'light' | 'dark'
  /** Fired once, with the new theme's key, after a successful create. */
  onCreated?: (key: string) => void
  /** Fired after a successful rename so callers can re-point preview state. */
  onRenamed?: (oldKey: string, newKey: string) => void
  /** Create as the FIRST STEP of a guided setup: name, mode and accent only
   *  (the full picker and the six slots behind "More colour options"), and the
   *  confirm reads Continue — the rest is set on the Theme board. */
  firstStep?: boolean
}

/**
 * THE theme panel — one component for create AND edit.
 *
 * There used to be two, and they agreed on almost nothing: `AddThemePicker`
 * (288px, no header, bare "Name" input, one accent picker, footer "Add theme")
 * and `AddThemeForm` (400px, swatch/title/hex header, labelled "Theme name",
 * six slot rows, footer "Create theme" / "Save changes"). Same concept, three
 * different names for the confirm action, two different answers to "what if I
 * leave the name blank", and two different minting implementations — see
 * `mintTheme` for the export defect that second one caused.
 *
 * The shape is the create picker's, because that's the common case: pick ONE
 * accent and the other five slots derive from it (`slotsFromAccent`, the same
 * `previewHarmony` the accent↔neutral/states links use). The six-slot control
 * the edit form owned isn't lost — it's the "Adjust colours" section below,
 * disclosed rather than always-on, so refining a slot is one click away
 * without making the common case pay for it.
 */

/** "Style · Scratch ⇅" — one row that opens the list of Escala's styles.
 *  Scratch first; each style shows its accent and its one-line description. */
function StylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  const current = THEME_STYLE_PRESETS.find((p) => p.id === value)
  const options = [
    { id: '', label: t('Scratch'), note: t('A blank system from your accent'), accent: '' },
    ...THEME_STYLE_PRESETS.map((p) => ({ id: p.id, label: p.shortLabel, note: p.description, accent: p.accent })),
  ]
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <span className="text-ui text-fg-muted">{t('Style')}</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 text-ui font-medium text-fg">
          {current && <span aria-hidden className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: current.accent }} />}
          <span className="truncate">{current ? current.shortLabel : t('Scratch')}</span>
        </span>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint"><path d="M2 5l3-3 3 3M2 9l3 3 3-3" /></svg>
      </button>
      {open && (
        <div role="listbox" aria-label={t('Style')} className={`absolute left-0 right-0 top-full z-30 mt-1.5 flex max-h-72 flex-col overflow-y-auto ${SELECT_LIST}`}>
          <p className="px-2 pb-1 pt-1.5 text-mini font-medium uppercase tracking-wide text-fg-faint">{t('Escala inspirations')}</p>
          {options.map((o) => (
            <button
              key={o.id || 'scratch'}
              type="button"
              role="option"
              aria-selected={o.id === value}
              onClick={() => { onChange(o.id); setOpen(false) }}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${o.id === value ? 'bg-elevated text-fg' : 'text-fg-muted hover:bg-elevated hover:text-fg'}`}
            >
              {o.accent
                ? <span aria-hidden className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: o.accent }} />
                : <span aria-hidden className="flex h-3 w-3 flex-shrink-0 items-center justify-center text-ui leading-none">+</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui font-medium">{o.label}</span>
                <span className="block truncate text-mini text-fg-faint">{o.note}</span>
              </span>
              {o.id === value && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-accent-ui"><path d="M2.5 6.5l2.5 2.5L9.5 3.5" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ThemeForm({
  onClose,
  editKey = null,
  appearance = 'light',
  onCreated,
  onRenamed,
  firstStep = false,
}: ThemeFormProps) {
  const { t } = useI18n()
  const store = useDesignStore()
  const {
    themes, themeKinds, themeSources, neutralTint,
    primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor,
    colorAlgorithm, contrastShift,
  } = store
  const isEdit = !!editKey
  // light/dark are the export's reserved keys (semantic / semanticDark) — their
  // palette and mode stay editable, but the key itself must not move.
  const nameLocked = editKey === 'light' || editKey === 'dark'

  // Seeded once at mount; the panel is keyed per open, so a lazy initializer
  // reseeds without an effect.
  const seed = useMemo(() => {
    if (!editKey) return null
    const pal = resolveThemePalette(themeSources[editKey], themeKinds[editKey] ?? 'light', store)
    const base = (s: ThemePalette['brand'] | undefined, fb: string) =>
      (s?.[BASE_TONE] as string | undefined) ?? fb
    return {
      kind: themeKinds[editKey] ?? 'light',
      slots: {
        brand: base(pal?.brand, primaryColor),
        gray: base(pal?.gray, grayBaseColor),
        error: base(pal?.error, errorColor),
        warning: base(pal?.warning, warningColor),
        success: base(pal?.success, successColor),
        info: base(pal?.info, infoColor),
      } as Record<FamilySlot, string>,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [name, setName] = useState(editKey ?? '')
  const [kind, setKind] = useState<'light' | 'dark'>(seed?.kind ?? appearance)
  const [slots, setSlots] = useState<Record<FamilySlot, string>>(
    () => seed?.slots ?? slotsFromAccent(primaryColor, neutralTint),
  )
  // Which slots still FOLLOW the accent. Creating starts with all five
  // following (that's what "one colour, a whole theme" means); editing starts
  // with none, because every slot already holds a value someone chose — moving
  // the accent must not silently repaint them. Hand-editing a slot detaches it,
  // the same detach-on-manual-edit rule `useApplyGrayColor` follows.
  const [derived, setDerived] = useState<Set<FamilySlot>>(
    () => (seed ? new Set<FamilySlot>() : new Set(FAMILY_SLOTS.filter((s) => s !== 'brand'))),
  )
  const [adjustOpen, setAdjustOpen] = useState(false)
  // "Start from": a blank system, or one of Escala's styles as the base. A
  // style fills the colours here and — once created — every edition of the
  // setup, which then walks its six steps from there.
  const [styleId, setStyleId] = useState('')
  const startPreset = styleId ? THEME_STYLE_PRESETS.find((p) => p.id === styleId) : undefined
  function pickStyle(id: string) {
    setErr(null)
    setStyleId(id)
    const preset = id ? THEME_STYLE_PRESETS.find((p) => p.id === id) : undefined
    if (!preset) {
      setSlots(slotsFromAccent(primaryColor, neutralTint))
      setDerived(new Set(FAMILY_SLOTS.filter((s) => s !== 'brand')))
      return
    }
    const next = slotsFromAccent(preset.accent, preset.neutralTint, presetStates(preset))
    if (preset.neutral) next.gray = preset.neutral
    setSlots(next)
    setKind(preset.preferredAppearance)
    setDerived(new Set())
  }
  // First step: the compact accent chooser until the user asks for more.
  const [moreOpen, setMoreOpen] = useState(!firstStep)
  const curated = useMemo(() => accentCuratedPalette(slots.brand), [slots.brand])
  const [err, setErr] = useState<string | null>(null)

  // A theme's page belongs to its Neutral, not to whichever system happened
  // to be open while the theme was created. Tone 1 is the page anchor for
  // every family, so using the global purple page here made newly minted
  // green/orange/blue themes keep a purple first step forever.
  const themePages = useMemo(() => ({
    light: backgroundFromBase(slots.gray, 'light', neutralTint),
    dark: backgroundFromBase(slots.gray, 'dark', neutralTint),
  }), [slots.gray, neutralTint])

  function setAccent(hex: string) {
    setErr(null)
    setSlots((prev) => {
      const next = { ...prev, brand: hex }
      if (derived.size) {
        const harmony = slotsFromAccent(hex, neutralTint)
        derived.forEach((slot) => { next[slot] = harmony[slot] })
      }
      return next
    })
  }

  function setSlot(slot: FamilySlot, hex: string) {
    setErr(null)
    if (slot === 'brand') { setAccent(hex); return }
    setDerived((prev) => {
      if (!prev.has(slot)) return prev
      const next = new Set(prev)
      next.delete(slot)
      return next
    })
    setSlots((prev) => ({ ...prev, [slot]: hex }))
  }

  // Live ramps, IN THE THEME'S OWN APPEARANCE — the same generator split
  // `mintTheme` commits with, so the preview cannot disagree with what the
  // family table shows after saving.
  const dark = kind === 'dark'
  const rampFor = (hex: string, isNeutral: boolean) => {
    try {
      if (dark) {
        return isNeutral
          ? generateDarkColorScale(hex, colorAlgorithm, contrastShift, themePages.dark, neutralTint)
          : generateFamilyDarkScale(hex, colorAlgorithm, contrastShift, themePages.dark)
      }
      return generateColorScale(hex, colorAlgorithm, contrastShift, themePages.light, 'light', isNeutral ? neutralTint : undefined)
    } catch { return {} }
  }
  const deps = [dark, colorAlgorithm, contrastShift, themePages.light, themePages.dark, neutralTint]
  /* eslint-disable react-hooks/exhaustive-deps */
  const scales: Record<FamilySlot, Record<number, string>> = {
    brand:   useMemo(() => rampFor(slots.brand, false), [slots.brand, ...deps]),
    gray:    useMemo(() => rampFor(slots.gray, true), [slots.gray, ...deps]),
    error:   useMemo(() => rampFor(slots.error, false), [slots.error, ...deps]),
    warning: useMemo(() => rampFor(slots.warning, false), [slots.warning, ...deps]),
    success: useMemo(() => rampFor(slots.success, false), [slots.success, ...deps]),
    info:    useMemo(() => rampFor(slots.info, false), [slots.info, ...deps]),
  }
  /* eslint-enable react-hooks/exhaustive-deps */

  function handleSubmit() {
    setErr(null)
    if (startPreset && !isEdit) {
      // Untouched colour → the style exactly as the web adopts it. A moved
      // accent → minted from these colours, with the style's foundations on top.
      const untouched = slots.brand.toLowerCase() === startPreset.accent.toLowerCase()
      let res: { key: string } | { error: string }
      if (untouched) {
        res = adoptPreset(startPreset, kind)
      } else {
        res = mintTheme(slots, kind, name || startPreset.label, null, startPreset.neutralTint, themePages)
        if (!('error' in res)) useDesignStore.getState().setThemeFoundations(res.key, startPreset.foundations)
      }
      if ('error' in res) { setErr(t(res.error, { count: MY_THEME_HARD_CAP })); return }
      if (name.trim()) useDesignStore.getState().setThemeLabel(res.key, name.trim())
      onCreated?.(res.key)
      onClose()
      return
    }
    const result = mintTheme(slots, kind, name, editKey, neutralTint, themePages)
    if ('error' in result) {
      setErr(t(result.error, { count: MY_THEME_HARD_CAP }))
      return
    }
    // The key is a slug ("test guide"); the name on screen is what was typed,
    // capitals included ("Test Guide").
    if (!isEdit && name.trim()) useDesignStore.getState().setThemeLabel(result.key, name.trim())
    if (result.renamedFrom) onRenamed?.(result.renamedFrom, result.key)
    else if (!isEdit) onCreated?.(result.key)
    onClose()
  }

  const page = dark ? themePages.dark : themePages.light

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header — swatch · title · hex · close. The swatch is the theme's own
          accent, so the panel says WHICH theme it is before you read a word.
          Create used to have no header at all, which is why the two panels
          read as unrelated surfaces. */}
      <header className="flex items-center gap-2 px-4 h-[52px] border-b border-line flex-shrink-0">
        <span className={SWATCH} style={{ backgroundColor: slots.brand }} />
        <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">
          {isEdit ? 'Edit theme' : 'New theme'}
        </h2>
        <span className="text-caption font-mono tabular-nums text-fg-faint flex-shrink-0">
          {slots.brand.toUpperCase()}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="ml-1 text-fg-faint hover:text-fg transition-colors w-6 h-6 flex items-center justify-center flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-always p-4 flex flex-col gap-3">
        {/* Identity — name + mode on one row. `flex-shrink-0` on every child
            of this scroll column: it is a COLUMN flex container, so a child with
            the default `flex-shrink: 1` gets crushed when the siblings overflow.
            The accent card is ~540px on its own, which squashed the "Adjust
            colours" row below it to its 2px borders — present in the DOM, its
            own button overflowing past the container, and unreachable however
            far you scrolled. */}
        {firstStep && !isEdit && (
          <div className="flex-shrink-0">
            <StylePicker value={styleId} onChange={pickStyle} />
            {startPreset && <p className="mt-1.5 text-mini leading-relaxed text-fg-faint">{startPreset.detail}</p>}
          </div>
        )}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <input
            type="text"
            value={name}
            disabled={nameLocked}
            onChange={(e) => { setName(e.target.value); setErr(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Name"
            aria-label="Theme name"
            title={nameLocked ? 'Locked — reserved export key' : undefined}
            autoFocus={!nameLocked}
            spellCheck={false}
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-line bg-surface text-body text-fg outline-none placeholder:text-fg-faint focus:border-fg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {/* The ACTIVE side is painted in that mode's real page colour, ink
              solved against it — so the selection is visible regardless of
              which theme the app CHROME happens to be in. */}
          <div className="flex flex-shrink-0 rounded-lg border border-line overflow-hidden" role="group" aria-label="Theme mode">
            {(['light', 'dark'] as const).map((k) => {
              const on = kind === k
              const bg = k === 'dark' ? themePages.dark : themePages.light
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={on}
                  className={`px-2 py-1.5 text-caption font-medium capitalize transition-colors ${
                    on ? '' : 'bg-surface text-fg-muted hover:text-fg'
                  }`}
                  style={on ? { backgroundColor: bg, color: readableInk(bg) } : undefined}
                >
                  {k}
                </button>
              )
            })}
          </div>
        </div>
        {nameLocked && (
          <p className="text-mini text-fg-faint -mt-1.5">Name locked — reserved export key.</p>
        )}

        {/* Accent — the one required decision. `.light`/`.dark` are the app's
            own token sets (index.css); `.light` exists precisely so a subtree
            can opt back OUT of dark chrome. A ramp is judged against the page
            it ships on, so the card is painted in the theme's appearance even
            while the chrome is the other one. */}
        <section
          className={`${dark ? 'dark' : 'light'} flex-shrink-0 rounded-xl border border-line p-3 transition-[background-color,border-color] duration-200`}
          style={{ backgroundColor: page }}
          aria-live="polite"
        >
          <p className="text-mini font-semibold uppercase tracking-widest text-fg-faint mb-2.5">
            {dark ? 'Dark theme' : 'Light theme'} · accent
          </p>
          {/* The SAME accent picker the Primitives family-edit drawer shows
              for the Accent family: the curated palette is DYNAMIC — a strip
              tuned to the current hue with the selection box and the
              Muted / Vivid / High contrast options — not a static swatch list.
              `dynamicAccentPalette` + `palette={[]}` is exactly that call. */}
          {!moreOpen ? (
            // The first step's chooser: a hue strip that keeps the colour vivid
            // at every angle (the Theme rail's own control) and six curated
            // neighbours of the current hue. The full picker is one click away.
            <div className="flex flex-col gap-3">
              <SpectrumSlider value={slots.brand} ariaLabel="Accent hue" onCommit={setAccent} />
              <div className="flex gap-1.5" role="group" aria-label="Curated accents">
                {curated.map((c) => {
                  const on = c.hex.toLowerCase() === slots.brand.toLowerCase()
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setAccent(c.hex)}
                      aria-pressed={on}
                      aria-label={c.label}
                      title={c.label}
                      className={`h-8 flex-1 rounded-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${on ? 'ring-2 ring-fg ring-offset-2 ring-offset-[var(--app)]' : ''}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="self-start rounded-md px-1 py-0.5 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                More colour options
              </button>
            </div>
          ) : (
          <ColorPickerPanel
            value={slots.brand}
            onChange={setAccent}
            suggestions
            palette={[]}
            dynamicAccentPalette
            followAccent
            linkOnPick={false}
            appearance={kind}
            fieldAppearance={kind}
          />
          )}
        </section>

        {/* The six slots — disclosed, not always-on. Five of them follow the
            accent until touched, so the common case needs nothing here; this
            is where you refine one, or re-point it at another family. */}
        {moreOpen && (
        <div className="flex-shrink-0 rounded-xl border border-line overflow-hidden">
          <button
            type="button"
            onClick={() => setAdjustOpen((v) => !v)}
            aria-expanded={adjustOpen}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-elevated/50 transition-colors"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-body font-medium text-fg">Adjust colours</span>
              <span className="block text-mini text-fg-faint">
                {derived.size === FAMILY_SLOTS.length - 1
                  ? 'Neutral and the four states follow the accent'
                  : `${FAMILY_SLOTS.length - 1 - derived.size} set by hand`}
              </span>
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-fg-faint flex-shrink-0 transition-transform ${adjustOpen ? '' : '-rotate-90'}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <AnimatePresence initial={false}>
            {adjustOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <section className={`${dark ? 'dark' : 'light'} border-t border-line p-3 flex flex-col gap-2.5`} style={{ backgroundColor: page }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Slots</span>
                    <span className="text-mini text-fg-faint">{dark ? 'Dark ramps' : 'Light ramps'}</span>
                  </div>
                  {SLOTS.map(({ slot, label, family }) => (
                    <SlotRow
                      key={slot}
                      label={label}
                      family={family}
                      value={slots[slot]}
                      scale={scales[slot]}
                      onChange={(hex) => setSlot(slot, hex)}
                    />
                  ))}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {firstStep && (
          <p className="flex-shrink-0 text-caption text-fg-faint">
            Next, set font, radius, spacing, shadow and icons on the Theme board — each one repaints it live.
          </p>
        )}

        {err ? <p className="text-caption text-status-danger">{err}</p> : null}
      </div>

      {/* Pinned footer — the commit stays reachable without scrolling past the
          picker, whether or not the slots section is open. */}
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-line bg-app">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-opacity"
        >
          {isEdit ? 'Save changes' : firstStep ? 'Continue' : 'Create theme'}
        </button>
      </div>
    </div>
  )
}

/**
 * The theme panel's DOCK — one fixed position, from every trigger.
 *
 * It used to be a popover anchored to whatever you clicked: the Semantics
 * table's far-right `+` (floating over the very table it was about to change,
 * and moving with horizontal scroll), each column header's pencil, and now the
 * Primitives rail's CTA. Five entry points, five places the same panel could
 * appear — so "where does the theme editor live" had no answer.
 *
 * It docks flush against the Color Variables column instead: the left edge of
 * the canvas, top-aligned with that column, full height down to the footer. No
 * anchor to measure, no flip-up/flip-down, no clamping against the viewport —
 * and it reads as a drawer sliding out of the column that lists the very
 * families it mints.
 *
 * `DOCK_LEFT` is `COLOR_RAIL_WIDTH`, imported rather than repeated, so a
 * collapsed rail (56px) can't leave the panel floating over it. `DOCK_TOP` is
 * measured off the rail itself when it's on screen and falls back to the
 * shell's own two-row height (`TOP_NAV_H` + 52px toolbar) when it isn't — the
 * panel opens from Semantics and Gradients too, where that `<nav>` isn't
 * rendered.
 */
const SHELL_ROWS = TOP_NAV_H + 52
/** Bottom inset — clears the shell's 28px attribution footer (`h-7`) plus the
 *  panel's usual 8px gap, so the drawer stops above the "Built by…" line.
 *  ColorPrimitives' family-edit drawer uses the identical value. */
const DOCK_BOTTOM = 28 + 8

export default function ThemePanel({
  open,
  onClose,
  editKey = null,
  onRenamed,
  onCreated,
  appearance = 'light',
  railCollapsed = false,
  dockLeftOverride,
  dockToSelector,
  dockSide = 'left',
  dockRightOverride = 0,
}: {
  open: boolean
  onClose: () => void
  editKey?: string | null
  appearance?: 'light' | 'dark'
  onCreated?: (key: string) => void
  onRenamed?: (oldKey: string, newKey: string) => void
  /** Primitives' family column can collapse to a swatch strip; the dock
   *  follows it so the panel never overlaps the column it sits beside. */
  railCollapsed?: boolean
  /** Alternate rail boundary for callers outside Color (Themes Library). */
  dockLeftOverride?: number
  /**
   * Element to vertically align the drawer to. The panel matches its `top` and
   * `bottom` so it is exactly as tall as that column. Defaults to Color's
   * `nav[aria-label="Color families"]`; the Themes Library passes its own
   * `<aside>` so the drawer tracks the rail's real height instead of a
   * hardcoded row offset.
   */
  dockToSelector?: string
  /** Which edge the drawer slides out of. The Generator docks it against the
   *  right-hand inspector (`dockRightOverride` = its width), so editing a theme
   *  opens beside the panel that lists it, over the canvas card. */
  dockSide?: 'left' | 'right'
  dockRightOverride?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dockTop, setDockTop] = useState(SHELL_ROWS)
  const [dockBottom, setDockBottom] = useState<number>(DOCK_BOTTOM)

  useLayoutEffect(() => {
    if (!open) return
    const sel = dockToSelector === '' ? '' : (dockToSelector ?? 'nav[aria-label="Color families"]')
    const measure = () => {
      const el = sel ? document.querySelector(sel) : null
      const r = el?.getBoundingClientRect()
      // Match the reference column's box: same top, same bottom, so the drawer
      // is exactly its height. Fall back to the shell rows / footer inset when
      // the column isn't mounted (the panel opens from Semantics/Gradients too).
      setDockTop(r && r.top > 0 ? r.top : SHELL_ROWS)
      setDockBottom(
        r && r.bottom > 0 ? Math.max(0, window.innerHeight - r.bottom) : DOCK_BOTTOM,
      )
    }
    measure()
    window.addEventListener('resize', measure)
    // The rail can grow/shrink (theme list length, sync footer) without a
    // resize — observe it so the drawer keeps pace.
    const el = sel ? document.querySelector(sel) : null
    const ro = el ? new ResizeObserver(measure) : null
    if (el && ro) ro.observe(el)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [open, dockToSelector])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      // Slot pickers and the accent picker portal to <body> (this panel's body
      // clips overflow), so a click inside one is another `role="dialog"` —
      // don't throw the form away.
      if (t instanceof Element && t.closest('[role="dialog"]')) return
      onClose()
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

  if (typeof document === 'undefined') return null

  const dockLeft = dockLeftOverride ?? (railCollapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH)
  const effectiveDockTop = dockTop
  const right = dockSide === 'right'
  const dockInset = right ? dockRightOverride : dockLeft
  const width = typeof window === 'undefined'
    ? PANEL_W
    : Math.min(PANEL_W, Math.max(280, window.innerWidth - dockInset - 16))
  const slide = right ? 16 : -16

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key={editKey ?? 'new'}
          ref={panelRef}
          initial={{ opacity: 0, x: slide }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slide }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="dialog"
          aria-label={editKey ? 'Edit theme' : 'New theme'}
          style={{
            position: 'fixed',
            ...(right ? { right: dockInset } : { left: dockLeft }),
            top: effectiveDockTop,
            bottom: dockBottom,
            width,
          }}
          className={`z-50 border border-line bg-app flex flex-col overflow-hidden ${right
            ? 'rounded-l-2xl border-r-0 shadow-[-16px_0_48px_-12px_rgba(0,0,0,0.28)]'
            : 'rounded-r-2xl border-l-0 shadow-[16px_0_48px_-12px_rgba(0,0,0,0.28)]'}`}
        >
          <ThemeForm
            key={editKey ?? 'new'}
            onClose={onClose}
            editKey={editKey}
            appearance={appearance}
            onCreated={onCreated}
            onRenamed={onRenamed}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
