import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS, type ThemePalette, type ThemeSources } from '../../store/useDesignStore'
import { resolveThemePalette, FAMILY_SLOTS, type FamilySlot } from '../../lib/themeSources'
import {
  BASE_TONE, backgroundFromBase, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, previewHarmony, readableInk,
  type NeutralTint,
} from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { INDUSTRY_SPECTRUM } from '../../lib/industryPacks'
import { ColorPickerPanel } from '../ui/ColorField'
import { TOP_NAV_H } from './TopNav'
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
          className={`w-full h-9 pl-2 pr-2.5 rounded-[13px] border bg-surface flex items-center gap-2 transition-colors ${
            open ? 'border-fg-faint' : 'border-line-strong hover:border-fg-faint'
          }`}
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

function uniqueKey(wanted: string, taken: Set<string>): string {
  const base = wanted || 'theme'
  let key = base
  let n = 2
  while (taken.has(key) || RESERVED_COLOR_KEYS.includes(key)) key = `${base}-${n++}`
  return key
}

function titleCaseKey(key: string) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function labelForAccent(hex: string): string {
  const h = hex.slice(0, 7).toLowerCase()
  return INDUSTRY_SPECTRUM.find((p) => p.hex.toLowerCase() === h)?.label ?? 'Theme'
}

/** Derive the five non-accent slots from an accent, the way "one colour, a
 *  whole theme" implies. Same `previewHarmony` the accent↔neutral/states links
 *  use, so a theme minted from an accent lands on the colours the rest of the
 *  system would have picked for it. */
export function slotsFromAccent(hex: string, tint: NeutralTint): Record<FamilySlot, string> {
  const h = previewHarmony(hex, tint)
  return {
    brand: hex,
    gray: h.neutral,
    error: h.states.error,
    warning: h.states.warning,
    success: h.states.success,
    info: h.states.info,
  }
}

/**
 * THE minting path — create AND edit. There used to be two:
 * `mintThemeFromAccent` (create) and `AddThemeForm.handleCreate` (edit), and
 * they disagreed on the two things that matter.
 *
 * 1. **The dark twin.** The edit path minted families with `scale` only, no
 *    `darkScale`. `tokenGenerator` gates `<key>-dark-*` on that field being
 *    non-empty, so an export or an auto-sync fired between the save and the
 *    next `ColorPrimitives` mount (where `useEnsureColorScales`, a `[]`-deps
 *    effect, happens to backfill it) shipped the family's ENTIRE dark ramp
 *    missing. Measured: `lightSteps: 12, darkSteps: 0` in the persisted
 *    snapshot right after saving a re-pointed Error slot.
 * 2. **The gray slot is not a generic family.** Only `generateDarkColorScale`
 *    re-derives the base as a dark neutral, and only the neutral carries
 *    `neutralTint`'s chroma link — the generic `generateFamilyDarkScale` the
 *    backfill uses for everything is wrong for it (see NEUTRAL_TINTS).
 *
 * Both are handled here, once, so neither entry point can drift again.
 */
/**
 * The two pages a minted family's ramps are anchored to.
 *
 * Normally the SYSTEM's pages — a theme is a reading of one set of primitives,
 * and they all sit on the same paper. A System Style is the exception: it
 * brings its own neutral AND its own `neutralTint`, and the page is derived
 * from exactly that pair (`backgroundFromBase`). Anchoring a warm `tinted`
 * neutral to the open system's white page is what made every style adopt
 * identically — the same defect `stylePreviewOverlay` carried, and it has to be
 * fixed in BOTH or "Add to system" stops matching what was previewed.
 */
export interface MintPages { light: string; dark: string }

function scalesForSlot(
  slot: FamilySlot,
  hex: string,
  s: ReturnType<typeof useDesignStore.getState>,
  neutralTint: NeutralTint = s.neutralTint,
  pages: MintPages = { light: s.pageBackground, dark: s.darkBackground },
) {
  if (slot === 'gray') {
    return {
      scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light, 'light', neutralTint),
      darkScale: generateDarkColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark, neutralTint),
    }
  }
  return {
    scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light),
    darkScale: generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark),
  }
}

export function mintTheme(
  chosen: Record<FamilySlot, string>,
  kind: 'light' | 'dark',
  nameLabel: string,
  editKey: string | null,
  neutralTint?: NeutralTint,
  pages?: MintPages,
): { key: string; renamedFrom?: string } | { error: string } {
  const s = useDesignStore.getState()
  const typed = nameLabel.trim()
  // An unnamed theme still gets a name: the accent's own industry label, or
  // "Theme". Erroring on a blank field was the edit form's rule and the create
  // picker's opposite — one behaviour now, and it's the forgiving one.
  const label = typed || labelForAccent(chosen.brand)
  const baseKey = slugify(label)
  if (!baseKey) return { error: 'Name the theme first.' }
  // On edit the key only collides when it points at a DIFFERENT theme.
  if (typed && s.themes[baseKey] && baseKey !== editKey) return { error: `"${baseKey}" already exists.` }
  const key = typed || editKey
    ? baseKey
    : uniqueKey(baseKey, new Set(Object.keys(s.themes)))

  const globals: Record<FamilySlot, { key: string; hex: string }> = {
    brand:   { key: 'accent',  hex: s.primaryColor },
    gray:    { key: 'neutral', hex: s.grayBaseColor },
    error:   { key: 'error',   hex: s.errorColor },
    warning: { key: 'warning', hex: s.warningColor },
    success: { key: 'success', hex: s.successColor },
    info:    { key: 'info',    hex: s.infoColor },
  }
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

  try {
    const taken = new Set(s.customColors.map((c) => c.key))
    const refs = {} as ThemeSources
    for (const slot of FAMILY_SLOTS) {
      const slotHex = chosen[slot]
      const g = globals[slot]
      // A theme never HOLDS colour — it references a family. The system's own
      // global when the hex matches it, an existing family that already
      // carries it, else a new family minted so the colour is editable in
      // Primitives where colour is edited.
      if (eq(slotHex, g.hex)) { refs[slot] = g.key; continue }
      const existing = s.customColors.find((c) => eq(c.base, slotHex))
      if (existing) { refs[slot] = existing.key; continue }
      const familyKey = uniqueKey(slot === 'brand' ? key : `${key}-${slot}`, taken)
      taken.add(familyKey)
      s.addCustomColor({
        key: familyKey,
        label: titleCaseKey(familyKey),
        base: slotHex,
        ...scalesForSlot(slot, slotHex, s, neutralTint, pages),
      })
      refs[slot] = familyKey
    }
    if (editKey) {
      const renamed = key !== editKey
      if (renamed) s.renameTheme(editKey, key)
      s.updateTheme(key, kind, refs)
      return renamed ? { key, renamedFrom: editKey } : { key }
    }
    s.addTheme(key, kind, refs)
    return { key }
  } catch {
    return { error: 'One of the colors is invalid.' }
  }
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
function ThemeForm({
  onClose,
  editKey = null,
  appearance = 'light',
  onCreated,
  onRenamed,
}: ThemeFormProps) {
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
    const base = (s: ThemePalette[keyof ThemePalette] | undefined, fb: string) =>
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
    const result = mintTheme(slots, kind, name, editKey, neutralTint, themePages)
    if ('error' in result) { setErr(result.error); return }
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
          <ColorPickerPanel
            value={slots.brand}
            onChange={setAccent}
            suggestions
            palette={curatedPaletteFor('accent')}
            followAccent
            linkOnPick={false}
            appearance={kind}
            fieldAppearance={kind}
          />
        </section>

        {/* The six slots — disclosed, not always-on. Five of them follow the
            accent until touched, so the common case needs nothing here; this
            is where you refine one, or re-point it at another family. */}
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
          {isEdit ? 'Save changes' : 'Create theme'}
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
  dockTopOverride,
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
  /** Alternate shell row boundary for callers outside Color. */
  dockTopOverride?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dockTop, setDockTop] = useState(SHELL_ROWS)

  useLayoutEffect(() => {
    if (!open) return
    if (dockTopOverride != null) return
    const measure = () => {
      const nav = document.querySelector('nav[aria-label="Color families"]')
      const t = nav?.getBoundingClientRect().top
      setDockTop(typeof t === 'number' && t > 0 ? t : SHELL_ROWS)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, dockTopOverride])

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
  const effectiveDockTop = dockTopOverride ?? dockTop
  const width = typeof window === 'undefined'
    ? PANEL_W
    : Math.min(PANEL_W, Math.max(280, window.innerWidth - dockLeft - 16))

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key={editKey ?? 'new'}
          ref={panelRef}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="dialog"
          aria-label={editKey ? 'Edit theme' : 'New theme'}
          style={{
            position: 'fixed',
            left: dockLeft,
            top: effectiveDockTop,
            bottom: DOCK_BOTTOM,
            width,
          }}
          className="z-50 rounded-r-2xl border border-l-0 border-line bg-app shadow-[16px_0_48px_-12px_rgba(0,0,0,0.28)] flex flex-col overflow-hidden"
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
