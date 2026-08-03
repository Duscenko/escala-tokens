// Primary Color — the Color hub's "Primitives" tab: a Figma-style families
// table (Accent · Neutral · State · custom families) listing every tone as a
// token row with editable light/dark values, eye toggles on the theme
// columns and a per-row picker. The family nav on the left doubles as the
// promoted DEFINE surface Picker Color used to own — a quick-edit strip above
// the table (hex field, "match states" wand, scale, algorithm settings) edits
// whichever family is active, so palette definition and usage now live on one
// screen. "+ Add" (in the nav header) creates a custom color family with its
// own 1–12 scale. Token names in the table are the EXACT exported names
// (tokenGenerator's flattenScale prefixes: accent/neutral/error/success/
// warning/info/<slug>), so the table, the semantic sources and tokens.json
// never disagree.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS, DEFAULT_THEME_SOURCES } from '../../store/useDesignStore'
import type { ThemeSources } from '../../store/useDesignStore'
import type { ColorScale } from '../../types/tokens'
import {
  NAMING_SCHEMES, BASE_TONE, generateColorScale, generateAlphaScale,
  generateFamilyDarkScale, detectSeedKind, solidFromSeed, type SeedKind,
} from '../../lib/colorUtils'
import {
  useApplyAccentColor, useApplyGrayColor, useApplyStateColor, useEnsureColorScales,
} from '../../lib/colorActions'
import { SWATCH, CHECKER, ScaleRow, usePopoverPlacement } from './colorControls'
import { ColorPickerPanel } from '../ui/ColorField'
import { SlidersIcon, PaletteIcon } from '../ui/icons'
import { themesUsingFamily, familySlotFor } from '../../lib/themeSources'
import { slugify } from '../../lib/utils'
import { ColorControls, ScaleSettingsModal } from './Step2_ColorPalette'

// ── Family folders ──────────────────────────────────────────────────────────
// The nav's folders are DERIVED from `themeSources` (see `familySlotFor`), not
// stored on the family — a custom family reads as "Accents" precisely because
// some theme's `brand` slot points at it. So "which folder should this go in?"
// is really "which ROLE should it serve", and answering anything but Custom
// means minting a theme that references it in that slot. That's the same move
// NewTokenWizard's "Add as a secondary accent" makes, and the only
// non-destructive one: re-pointing an EXISTING theme's slot would repaint the
// user's current accent/neutral instead of adding alongside it.
export const FAMILY_GROUPS = ['Accents', 'Neutrals', 'States', 'Custom'] as const
export type FamilyGroup = (typeof FAMILY_GROUPS)[number]

/** Status intents — "States" is four distinct slots, so it needs a sub-choice. */
const STATE_INTENTS = ['error', 'warning', 'success', 'info'] as const
type StateIntent = (typeof STATE_INTENTS)[number]

/** The theme slot a destination group writes, and the word its name counts from. */
const GROUP_SLOT: Record<Exclude<FamilyGroup, 'Custom'>, (intent: StateIntent) => keyof ThemeSources> = {
  Accents: () => 'brand',
  Neutrals: () => 'gray',
  States: (intent) => intent,
}
const GROUP_BASE_NAME: Record<FamilyGroup, (intent: StateIntent) => string> = {
  Accents: () => 'Accent',
  Neutrals: () => 'Neutral',
  States: (intent) => intent.charAt(0).toUpperCase() + intent.slice(1),
  Custom: () => '',
}

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

// ── Radix role bands — which tones (1-12) serve which purpose. Drives the
// families table's group captions; the tone NUMBER always means this,
// independent of whatever the active naming scheme displays for it. ────────
const TONE_BANDS: { max: number; label: string }[] = [
  { max: 2, label: 'Backgrounds' },
  { max: 5, label: 'Interactive components' },
  { max: 8, label: 'Borders' },
  { max: 10, label: 'Solid colors' },
  { max: 12, label: 'Accessible text' },
]
function toneBand(tone: number): string {
  return TONE_BANDS.find((b) => tone <= b.max)?.label ?? ''
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

// ── Read-only alpha cell — an alpha value is SOLVED against the page it
// renders on (see colorUtils' alphaColorOver), never independently editable,
// so this has no input, just the swatch (over a checkerboard, so the
// translucency itself stays legible instead of reading as a flat, wrong-
// looking color) and the hex as static text. ──
function AlphaHexCell({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`${SWATCH} relative overflow-hidden flex-shrink-0`} style={{ ...CHECKER, backgroundSize: '6px 6px' }}>
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
      </span>
      <span className="w-full min-w-0 truncate text-[12px] font-mono tabular-nums text-fg-muted px-1.5 py-1" title={`${value} — derived, not directly editable`}>
        {value.replace(/^#/, '').toUpperCase()}
      </span>
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
  /** Derived alpha twin (e.g. Accent-Alpha) — solved from another family
   *  against the page it renders on, never independently set. Cells render
   *  read-only, over a checkerboard so the translucency stays legible instead
   *  of reading as a flat (and page-appearance-dependent) wrong color. */
  isAlpha?: boolean
}

export default function ColorPrimitives({
  previewTheme = 'light',
  onPreviewThemeChange,
  focusFamilyKey,
  tabBar,
}: {
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** External request to switch the active family (e.g. NewTokenWizard just
   *  created it) — a family key (`custom-<slug>`), re-applied whenever it
   *  changes to a new value. */
  focusFamilyKey?: string | null
  /** The Primitives/Semantics/Gradients tab pill bar, rendered by ColorHub —
   *  passed down instead of pre-wrapped so it can share a row with "Groups"
   *  (matches the Figma reference: same line, 198px nav-aligned left portion
   *  + tabs/search on the right) instead of sitting in its own full-width row. */
  tabBar?: ReactNode
}) {
  const store = useDesignStore()
  const {
    primaryColor, primaryScale, setPrimaryScale,
    primaryDarkScale, setPrimaryDarkScale,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    errorColor, errorScale, errorDarkScale, setErrorScale, setErrorDarkScale,
    warningColor, warningScale, warningDarkScale, setWarningScale, setWarningDarkScale,
    successColor, successScale, successDarkScale, setSuccessScale, setSuccessDarkScale,
    infoColor, infoScale, infoDarkScale, setInfoScale, setInfoDarkScale,
    customColors, addCustomColor, updateCustomColor, removeCustomColor,
    pageBackground, darkBackground, themeKinds, themeSources, themes, addTheme,
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

  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  // Per-row edits here are deliberate, single-family changes — unlike Picker
  // Color's quick bar (which offers a link toggle for broad-strokes editing),
  // retinting Accent from this table's pencil popover never cascades to
  // Neutral. Picker Color is where "move both together" lives.
  const changeAccent = (hex: string) => applyAccentColor(hex, false, previewTheme)
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)

  // ── Families table state ──
  const [activeFamily, setActiveFamily] = useState('accent')
  const [query, setQuery] = useState('')
  const [expandedTone, setExpandedTone] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  // Scale-settings gear (algorithm/naming/contrast shift) — promoted from
  // Picker Color into the quick-edit strip below.
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Which nav folders (Accents/Neutrals/States/Custom) are collapsed — all
  // expanded by default, same as before this was collapsible at all.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<FamilyGroup>>(new Set())
  const toggleGroup = (label: FamilyGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // A family created elsewhere (NewTokenWizard) requests focus — switch to it
  // so the table actually shows the family + names the user just picked,
  // instead of silently staying on whatever was active before.
  useEffect(() => {
    if (focusFamilyKey) setActiveFamily(focusFamilyKey)
  }, [focusFamilyKey])

  // A no-op setter for derived families (Accent-Alpha) — never actually
  // invoked since every edit affordance (pencil, per-row expand) is guarded
  // off for `isAlpha` families below; it exists only to satisfy `Family`'s
  // shape without special-casing every call site that expects a setter.
  const noopSet = useCallback((_s: ColorScale) => {}, [])

  // EVERY family carries both scales (the Radix two-scale model) — the light
  // column edits the light ramp, the dark column its own dark twin.
  const families: Family[] = useMemo(() => [
    { key: 'accent',  label: 'Accent',  tokenPrefix: 'accent',  base: primaryColor,  light: primaryScale,   dark: primaryDarkScale, setLight: setPrimaryScale,   setDark: setPrimaryDarkScale },
    {
      key: 'accent-alpha', label: 'Accent-Alpha', tokenPrefix: 'accent-a', base: primaryColor,
      // Solved against each appearance's own page — see colorUtils'
      // alphaColorOver — never independently set, so both scales are derived
      // live rather than stored.
      light: generateAlphaScale(primaryScale, pageBackground, 'light'),
      dark: generateAlphaScale(primaryDarkScale, darkBackground, 'dark'),
      setLight: noopSet, setDark: noopSet, isAlpha: true,
    },
    { key: 'neutral', label: 'Neutral', tokenPrefix: 'neutral', base: grayBaseColor, light: grayLightScale, dark: grayDarkScale,    setLight: setGrayLightScale, setDark: setGrayDarkScale },
    { key: 'error',   label: 'Error',   tokenPrefix: 'error',   base: errorColor,    light: errorScale,     dark: errorDarkScale,   setLight: setErrorScale,     setDark: setErrorDarkScale },
    { key: 'success', label: 'Success', tokenPrefix: 'success', base: successColor,  light: successScale,   dark: successDarkScale, setLight: setSuccessScale,   setDark: setSuccessDarkScale },
    { key: 'warning', label: 'Warning', tokenPrefix: 'warning', base: warningColor,  light: warningScale,   dark: warningDarkScale, setLight: setWarningScale,   setDark: setWarningDarkScale },
    { key: 'info',    label: 'Info',    tokenPrefix: 'info',    base: infoColor,     light: infoScale,      dark: infoDarkScale,    setLight: setInfoScale,      setDark: setInfoDarkScale },
    ...customColors.map((c) => ({
      key: `custom-${c.key}`,
      label: c.label,
      tokenPrefix: c.key,
      base: c.base,
      light: c.scale,
      dark: c.darkScale ?? c.scale,
      setLight: (s: ColorScale) => updateCustomColor(c.key, { scale: s }),
      setDark: (s: ColorScale) => updateCustomColor(c.key, { darkScale: s }),
      customKey: c.key,
    })),
  ], [
    primaryColor, primaryScale, setPrimaryScale,
    primaryDarkScale, setPrimaryDarkScale,
    pageBackground, darkBackground, noopSet,
    grayBaseColor, grayLightScale, grayDarkScale, setGrayLightScale, setGrayDarkScale,
    primaryDarkScale, setPrimaryDarkScale,
    errorColor, errorScale, errorDarkScale, setErrorScale, setErrorDarkScale,
    successColor, successScale, successDarkScale, setSuccessScale, setSuccessDarkScale,
    warningColor, warningScale, warningDarkScale, setWarningScale, setWarningDarkScale,
    infoColor, infoScale, infoDarkScale, setInfoScale, setInfoDarkScale,
    customColors, updateCustomColor,
  ])

  const family = families.find((f) => f.key === activeFamily) ?? families[0]

  // ── Folders (Figma-style collections) ──
  // The nav groups families by the ROLE they serve, not by insertion order:
  // Accents (the brand + every custom family a theme reads as its accent),
  // Neutrals (base + theme neutrals), States (the four intents + custom status
  // families) and Custom for free-standing families no theme references yet.
  // States stays here too — this rail is EVERY color primitive's usage table
  // (Backgrounds/Interactive/Borders/Solid/Text bands), and Error/Success/
  // Warning/Info are primitives same as Accent/Neutral; Picker Color showing
  // their full scale for quick editing doesn't remove them from usage.
  // Derived from `themeSources`, so a family minted by "Add theme" files
  // itself under the right folder with zero bookkeeping.
  const groupOf = useCallback(
    (f: Family): FamilyGroup => {
      if (f.key === 'accent' || f.key === 'accent-alpha') return 'Accents'
      if (f.key === 'neutral') return 'Neutrals'
      if (!f.customKey) return 'States'
      const slot = familySlotFor(f.customKey, themeSources)
      if (slot === 'brand') return 'Accents'
      if (slot === 'gray') return 'Neutrals'
      if (slot) return 'States'
      return 'Custom'
    },
    [themeSources],
  )
  const famGroups = useMemo(
    () =>
      FAMILY_GROUPS
        .map((label) => ({ label, items: families.filter((f) => groupOf(f) === label) }))
        .filter((g) => g.items.length > 0),
    [families, groupOf],
  )

  const q = query.trim().toLowerCase()
  const tones = Array.from({ length: 12 }, (_, i) => i + 1)
  const rowName = (tone: number) => `${family.tokenPrefix}-${namingLabels[tone - 1] ?? tone}`
  const visibleTones = q ? tones.filter((tone) => rowName(tone).toLowerCase().includes(q)) : tones

  const setTone = (scale: ColorScale, setter: (s: ColorScale) => void, tone: number, hex: string) =>
    setter({ ...scale, [tone]: hex })

  // ── "+ Add" custom-family popover ──
  const addRef = useRef<HTMLDivElement>(null)
  const [addName, setAddName] = useState('')
  const [addHex, setAddHex] = useState('#9522e9')
  const [addGroup, setAddGroup] = useState<FamilyGroup>('Custom')
  const [addIntent, setAddIntent] = useState<StateIntent>('error')
  // Whether the user has typed their own name. The suggestion follows the
  // destination group, but only until they take over — re-suggesting over a
  // typed name would silently discard it.
  const [addNameDirty, setAddNameDirty] = useState(false)

  /** First free `<Base>`, `<Base> 2`, `<Base> 3`… — free meaning its SLUG is
   *  free, since that's what actually has to be unique (`addTaken`). */
  const suggestName = useCallback(
    (group: FamilyGroup, intent: StateIntent): string => {
      const base = GROUP_BASE_NAME[group](intent)
      if (!base) return '' // Custom keeps the empty field + placeholder.
      const free = (label: string) => {
        const s = slugify(label)
        return !!s && !RESERVED_COLOR_KEYS.includes(s) && !customColors.some((c) => c.key === s)
      }
      if (free(base)) return base
      for (let n = 2; n < 100; n++) {
        if (free(`${base} ${n}`)) return `${base} ${n}`
      }
      return base
    },
    [customColors],
  )

  // Opening seeds the destination from WHERE you opened it: adding while a
  // family under Accents is selected means you're adding an accent, so it
  // shouldn't land in Custom and need reclassifying by hand.
  useEffect(() => {
    if (!addOpen) return
    const g = groupOf(family)
    const intent: StateIntent =
      g === 'States' && (STATE_INTENTS as readonly string[]).includes(family.key)
        ? (family.key as StateIntent)
        : 'error'
    setAddGroup(g)
    setAddIntent(intent)
    setAddName(suggestName(g, intent))
    setAddNameDirty(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen])

  // Changing the destination re-suggests the name — "Accent 2" filed under
  // States would be a lie about what it is.
  const changeAddGroup = (g: FamilyGroup, intent = addIntent) => {
    setAddGroup(g)
    setAddIntent(intent)
    if (!addNameDirty) setAddName(suggestName(g, intent))
  }

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

  // Same picker, opened from the quick-edit strip's own hex field (its
  // dropdown chevron) instead of the nav row's pencil — same edit, second
  // entry point, own popover instance so it anchors where it's clicked.
  const [stripEditOpen, setStripEditOpen] = useState(false)
  const stripEditRef = useRef<HTMLDivElement>(null)
  const stripEditPlace = usePopoverPlacement(stripEditRef, stripEditOpen)
  useEffect(() => {
    if (!stripEditOpen) return
    function onDown(e: MouseEvent) {
      if (stripEditRef.current && !stripEditRef.current.contains(e.target as Node)) setStripEditOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setStripEditOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [stripEditOpen])

  const changeFamilyBase = (f: Family, hex: string) => {
    // Derived (Accent-Alpha) — nothing to set independently.
    if (f.isAlpha) return
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

  // What the pasted colour IS decides how the family is built — see SeedKind.
  // Detected from the value, but the user owns the call.
  const detectedKind = useMemo(
    () => detectSeedKind(addHex, pageBackground, darkBackground),
    [addHex, pageBackground, darkBackground],
  )
  const [seedKind, setSeedKind] = useState<SeedKind | null>(null)
  const activeSeedKind: SeedKind = seedKind ?? detectedKind

  function submitAdd() {
    if (!canAdd) return
    // An alpha seed is composited back to the solid it renders as; a dark seed
    // anchors the DARK ramp (step 9) and the light one is derived from it.
    const solid = solidFromSeed(addHex, activeSeedKind, pageBackground, darkBackground)
    let scale: ColorScale
    let darkScale: ColorScale
    try {
      if (activeSeedKind === 'dark') {
        darkScale = generateFamilyDarkScale(solid, colorAlgorithm, contrastShift, darkBackground)
        scale = generateColorScale(solid, colorAlgorithm, contrastShift, pageBackground)
      } else {
        scale = generateColorScale(solid, colorAlgorithm, contrastShift, pageBackground)
        darkScale = generateFamilyDarkScale(solid, colorAlgorithm, contrastShift, darkBackground)
      }
    } catch { return }
    addCustomColor({ key: addSlug, label: addName.trim(), base: solid, scale, darkScale })
    // A family lands in a folder by being REFERENCED, never by carrying a group
    // field — so anything but Custom mints a theme identical to the defaults
    // except for the one slot pointing here (`familySlotFor` then folders it).
    if (addGroup !== 'Custom') {
      let themeKey = addSlug
      let n = 2
      while (themes[themeKey]) themeKey = `${addSlug}-${n++}`
      const slot = GROUP_SLOT[addGroup](addIntent)
      addTheme(themeKey, 'light', { ...DEFAULT_THEME_SOURCES, [slot]: addSlug } as ThemeSources)
    }
    setActiveFamily(`custom-${addSlug}`)
    setAddName('')
    setAddNameDirty(false)
    setSeedKind(null)
    setAddOpen(false)
  }

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: 'minmax(9rem,1.1fr) repeat(2, minmax(8.5rem,1fr)) 2.75rem',
  }

  return (
    // No enter animation on the tab panel itself. The three Color tabs now
    // share an identical three-row chrome, and `centerKey` (Configurator) is
    // `f-color` for all of them — so the OUTER fade only fires when you switch
    // foundations, which is what should animate. Animating here too made the
    // rail, strip and header fade+slide 12px on every tab click even though
    // they render in the same place: the chrome appeared to jump while only
    // the content had actually changed.
    <div className="h-full flex flex-col">
      {/* ── Quick-edit strip — FULL WIDTH, matching the icon-toolbar row's
          width above it (not indented to just the table column). Promoted
          from Picker Color: names + edits whichever family is active in the
          nav, with a wand to re-harmonize Neutral + States off Accent and
          the scale-settings gear. Read-only for Accent-Alpha (see
          AlphaHexCell) — an alpha value is solved against its page, never
          independently set.
          The 198px/flex-1 split — and that `border-r` — is the SAME one
          the Groups/nav row and the nav column below use; lining all three
          up is what makes the left edge read as one continuous column
          instead of the accent field floating unaligned above it. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{family.label} color</span>
          {family.isAlpha ? (
            <div className="w-full h-9 px-2.5 rounded-[13px] border border-line-strong bg-surface flex items-center">
              <AlphaHexCell value={(darkPreview ? family.dark[BASE_TONE] : family.light[BASE_TONE]) ?? '#000000'} />
            </div>
          ) : (
            <div ref={stripEditRef} className="relative w-full">
              <div className="h-9 pl-2.5 pr-1.5 rounded-[13px] border border-line-strong bg-surface flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <HexCell
                    value={family.base}
                    onChange={(hex) => changeFamilyBase(family, hex)}
                    ariaLabel={`${family.label} base color`}
                  />
                </div>
                {/* Same edit surface the nav row's pencil opens, reachable
                    from the field showing the value too — like a native
                    <select>, the chevron signals "pick a color," even
                    though the hex text itself stays directly editable. */}
                <button
                  type="button"
                  onClick={() => setStripEditOpen((o) => !o)}
                  aria-haspopup="dialog"
                  aria-expanded={stripEditOpen}
                  aria-label={`Open color picker for ${family.label}`}
                  title="Open color picker"
                  className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-fg-faint hover:text-fg transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <AnimatePresence>
                {stripEditOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                    role="dialog"
                    aria-label={`Edit ${family.label} color`}
                    style={{ maxHeight: stripEditPlace.max }}
                    className={`absolute left-0 z-30 w-64 rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
                      stripEditPlace.up ? 'bottom-full mb-2' : 'top-full mt-2'
                    }`}
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                      <ColorPickerPanel value={family.base} onChange={(hex) => changeFamilyBase(family, hex)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* No "match states to accent" wand here any more: it only rendered
            while Accent was active, so the ramp beside it started 52px further
            right on that ONE family and every other family's ramp read as
            misaligned against it. The strip is the same shape for every family
            now. (The action itself — recommendStateColors + neutralFromBrand
            in one click — is gone with it, not relocated.) */}
        {/* pr-3 (12px), not the old px-6/lg:px-8 (24-32px) and not flush
            either: the gear needs SOME clearance from the edge — sitting
            dead flush like the table's trailing icon column (which has a
            fixed-width cell to center within) reads as clipped for a
            free-floating button with no such cell. 12px is the minimum gap
            that still avoids that. */}
        <div className="flex-1 min-w-0 flex items-center gap-4 pl-6 lg:pl-8 pr-3 py-5 flex-wrap">
        <div className="flex-1 min-w-[10rem]">
          <ScaleRow
            scale={darkPreview ? family.dark : family.light}
            labels={namingLabels}
            ariaLabel={`${family.label} scale`}
            joined
            numbersInside
          />
        </div>

        <div className="relative flex-shrink-0">
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
      </div>

      {/* ── "Groups" shares a row with the tab pill bar + search — same line,
          per the Figma reference — instead of each owning a separate row.
          The 198px left portion aligns with the nav directly below it; the
          right portion holds `tabBar` (passed down from ColorHub so it can
          render here instead of its own full-width row) + search. ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line">
        <div className="w-[198px] flex-shrink-0 flex items-center justify-between px-4 h-[52px] border-r border-line">
          <span className="text-[13px] font-semibold text-fg">Groups</span>
          <div ref={addRef} className="relative">
            <button
              onClick={() => setAddOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={addOpen}
              aria-label="Add color family"
              title="Add a custom color family with its own 1–12 scale"
              className="flex items-center justify-center w-6 h-6 rounded-md text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
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
                      onChange={(e) => { setAddName(e.target.value); setAddNameDirty(true) }}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }}
                      placeholder="Family name — e.g. Teal"
                      aria-label="Family name"
                      autoFocus
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[13px] text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
                    />
                    {addTaken && (
                      <span className="text-[11px] text-red-500">That name is already in use.</span>
                    )}

                    {/* Destination folder. Pre-set from the family you opened
                        this on, so adding a second accent from Accent lands
                        under Accents instead of needing reclassifying. */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-fg-muted">Add to…</span>
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
                        {FAMILY_GROUPS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => changeAddGroup(g)}
                            aria-pressed={addGroup === g}
                            className={`flex-1 px-1 py-1 rounded-md text-[10px] font-medium transition-colors ${
                              addGroup === g ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      {/* "States" is four separate slots, not one — so it asks
                          which intent rather than guessing. */}
                      {addGroup === 'States' && (
                        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
                          {STATE_INTENTS.map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => changeAddGroup('States', i)}
                              aria-pressed={addIntent === i}
                              className={`flex-1 px-1 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                                addIntent === i ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                              }`}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-fg-faint leading-snug">
                        {addGroup === 'Custom'
                          ? 'A free-standing palette — no role until you assign one.'
                          : `Mints a theme using this as its ${GROUP_SLOT[addGroup](addIntent)}, which is what files it under ${addGroup}.`}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-fg-muted">This color is my…</span>
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
                        {(['light', 'dark', 'alpha'] as SeedKind[]).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setSeedKind(k)}
                            aria-pressed={activeSeedKind === k}
                            title={
                              k === 'light' ? 'Light-theme solid — the dark ramp is derived from it'
                              : k === 'dark' ? 'Dark-theme solid — anchors the dark ramp instead'
                              : 'A translucent value — composited over the page to recover its solid'
                            }
                            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                              activeSeedKind === k ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-fg-faint leading-snug">
                        {seedKind === null ? 'Detected from the value — change it if that\'s not what you meant.' : null}
                      </span>
                    </div>
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
        </div>
        {/* items-stretch + no left padding: the active tab's tint has to reach
            this cell's top, bottom and left edge to read as a block rather than
            a floating pill (see ColorHub's tabBar). The search re-centers
            itself with `self-center` since it shouldn't stretch. */}
        {/* Same edge rule as row 1's gear: pr-3 (12px) clearance, not flush. */}
        <div className="flex-1 min-w-0 flex items-stretch gap-3 pr-3">
          <div className="flex-1 min-w-0">{tabBar}</div>
          <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-48 max-w-[45%] focus-within:border-line-strong transition-colors flex-shrink-0">
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
      </div>

      {/* ── nav + table, filling the remaining height ── */}
      <div className="flex-1 min-h-0 flex items-stretch">
      <nav aria-label="Color families" className="w-[198px] flex-shrink-0 h-full overflow-y-auto border-r border-line py-1.5 px-2 flex flex-col bg-app">
        {famGroups.map((group) => {
          const collapsed = collapsedGroups.has(group.label)
          return (
            <div key={group.label} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              aria-expanded={!collapsed}
              className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint hover:text-fg-muted transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
              </svg>
              <span className="flex-1 text-left">{group.label}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
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
                      findable without hunting for it on hover. Not offered for
                      Accent-Alpha: it's derived (see AlphaHexCell), nothing to
                      retint independently. */}
                  {!f.isAlpha && (
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
                  )}
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
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )
        })}
          </nav>

          <div className="flex-1 min-w-0 h-full overflow-auto">
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
                  // Radix role-ordering: a step means the same thing in both
                  // appearances (1–2 app background … 9 solid … 11–12 text), so
                  // the dark column reads the SAME step of the family's dark
                  // ramp. `accent-25` is the subtlest background either way —
                  // near-white in light, near-black in dark. No inversion: that
                  // was the workaround for colours not having a dark ramp.
                  const darkTone = tone
                  // The inline picker edits the column being previewed.
                  const pickTarget = darkPreview
                    ? { value: family.dark[darkTone] ?? '#000000', set: (hex: string) => setTone(family.dark, family.setDark, darkTone, hex) }
                    : { value: family.light[tone] ?? '#ffffff', set: (hex: string) => setTone(family.light, family.setLight, tone, hex) }
                  // A new role band starts here — caption it, so the 12 rows
                  // read as 5 grouped ranges (Radix's own breakdown) instead of
                  // an undifferentiated list. Keyed off the TONE, not the
                  // active naming scheme's label, so it holds regardless of
                  // whether the row name reads accent-9 or accent-700.
                  const band = toneBand(tone)
                  const newBand = i === 0 || band !== toneBand(visibleTones[i - 1])
                  return (
                    <div key={tone}>
                      {newBand && (
                        <div className="px-4 pt-3 pb-1 border-t border-line/40 bg-surface/60">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{band}</span>
                        </div>
                      )}
                      <div
                        className={`grid items-stretch group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
                          newBand ? '' : 'border-t border-line/40'
                        } ${isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}`}
                        style={gridStyle}
                      >
                        <div className="flex items-center gap-2 py-2.5 pl-4 pr-3 min-w-0 border-r border-line text-fg-faint">
                          <PaletteIcon size={14} />
                          <code className="font-mono text-[12px] text-fg-muted truncate">{name}</code>
                          {tone === BASE_TONE && (
                            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-elevated text-fg-faint flex-shrink-0">anchor</span>
                          )}
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          {family.isAlpha ? (
                            <AlphaHexCell value={family.light[tone] ?? '#00000000'} />
                          ) : (
                            <HexCell
                              value={family.light[tone] ?? '#ffffff'}
                              onChange={(hex) => setTone(family.light, family.setLight, tone, hex)}
                              ariaLabel={`${name} light value`}
                            />
                          )}
                        </div>
                        <div className="flex items-center px-2.5 py-1.5 border-r border-line min-w-0">
                          {family.isAlpha ? (
                            <AlphaHexCell value={family.dark[darkTone] ?? '#00000000'} />
                          ) : (
                            <HexCell
                              value={family.dark[darkTone] ?? '#000000'}
                              onChange={(hex) => setTone(family.dark, family.setDark, darkTone, hex)}
                              ariaLabel={`${name} dark value`}
                            />
                          )}
                        </div>
                        {family.isAlpha ? (
                          // Derived, not editable — see AlphaHexCell.
                          <div aria-hidden className="flex items-center justify-center w-full h-full text-fg-faint/40">
                            <SlidersIcon />
                          </div>
                        ) : (
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
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {!family.isAlpha && expanded && (
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
  )
}
