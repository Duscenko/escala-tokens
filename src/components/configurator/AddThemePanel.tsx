import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS, type ThemePalette, type ThemeSources } from '../../store/useDesignStore'
import { resolveThemePalette, FAMILY_SLOTS, type FamilySlot } from '../../lib/themeSources'
import {
  BASE_TONE, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, readableInk,
} from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { ColorPickerPanel } from '../ui/ColorField'
import {
  SWATCH, ScaleRow, neutralFromBrand, usePopoverPlacement,
  curatedPaletteFor,
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

/** Rendered width of the slot picker's panel. A literal number rather than
 *  `w-64`, because the panel is `fixed`-positioned and the same value has to
 *  clamp it inside the viewport — and `w-64` is 288px here, not 256 (this app's
 *  root font-size is 18px). */
const PICKER_W = 288

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
  const panelRef = useRef<HTMLDivElement>(null)
  // Tall panel in a narrow 400px column — same measurement the other pickers
  // use rather than a fixed max-height.
  const place = usePopoverPlacement(ref, open)

  // Portaled to <body> and positioned `fixed`, for the same reason
  // `ColumnExportMenu` and Primitives' family picker are: this row lives inside
  // the panel body's `overflow-y-auto`, which CLIPS an absolutely-positioned
  // ~540px panel at that container's bottom edge. No z-index fixes an overflow
  // clip.
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!open) { setRect(null); return }
    const measure = () => { const r = ref.current?.getBoundingClientRect(); if (r) setRect(r) }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      // The panel is no longer a DOM descendant of the row, so checking only
      // the row would close the picker on its own clicks.
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    // Escape closes the PICKER, not the whole panel. Both this and the aside's
    // own Escape handler sit on `document`, so this one runs in the CAPTURE
    // phase — document-capture fires before document-bubble, and stopping
    // propagation there keeps the aside's handler from also firing. Without
    // it, dismissing a colour picker threw away the half-filled theme behind
    // it, which is a lot to lose to one keystroke.
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const panel = open && rect
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            role="dialog"
            aria-label={`${label} color`}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(rect.left, window.innerWidth - PICKER_W - 12),
              ...(place.up
                ? { bottom: window.innerHeight - rect.top + 8 }
                : { top: rect.bottom + 8 }),
              maxHeight: place.max,
              width: PICKER_W,
            }}
            className="z-[60] rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 flex-shrink-0">
              <span className={SWATCH} style={{ backgroundColor: value }} />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{label}</span>
              <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">{value.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
              <ColorPickerPanel value={value} onChange={onChange} suggestions palette={curatedPaletteFor(family)} />
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null

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
          <span className="flex-1 min-w-0 text-left text-[13px] text-fg truncate">{label}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden className={`text-fg-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {panel}
      </div>
      <div className="flex-1 min-w-0">
        <ScaleRow scale={scale} showNumbers={false} ariaLabel={`${label} scale`} />
      </div>
    </div>
  )
}

/** "Add a theme" — DOCKED in the right-hand aside, the same slot `PreviewPanel`
 *  and `SaveSidePanel` occupy (Configurator swaps it in while this is open),
 *  not a centred modal with a backdrop. It used to be a `fixed inset-0` dialog
 *  blocking the whole screen for a task that's really "fill in six colours" —
 *  docking it in the persistent right column matches `SaveSidePanel`'s own
 *  precedent (identity + connections, docked, not modal) and means opening it
 *  doesn't block reading the semantic table you're about to point a new theme
 *  at. Configurator owns the open/closed boolean and mounts/unmounts this
 *  component directly — there's no internal `open` prop any more, since mount
 *  IS open. */
export default function AddThemePanel({
  onClose,
  editKey = null,
  seedFrom = null,
  onRenamed,
}: {
  onClose: () => void
  // When set, the panel edits this existing theme instead of creating a new one.
  editKey?: string | null
  // When set (and editKey isn't), the form pre-fills from this theme's resolved
  // palette but still creates a brand-new theme on submit — a "Duplicate" flow
  // reusing the same load-a-palette logic edit mode already has.
  seedFrom?: string | null
  // Fired after a successful rename so callers can re-point their preview state.
  onRenamed?: (oldKey: string, newKey: string) => void
}) {
  const store = useDesignStore()
  const {
    themes, addTheme, renameTheme, updateTheme, customColors, addCustomColor,
    themeKinds, themeSources,
    primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor,
    colorAlgorithm, contrastShift, pageBackground, darkBackground, neutralTint,
  } = store
  const isEdit = !!editKey
  // light/dark are the export's reserved keys (semantic / semanticDark) — their
  // palette + mode are editable, but the key itself must stay stable.
  const nameLocked = editKey === 'light' || editKey === 'dark'

  // Seeded once, at mount — Configurator mounts a FRESH instance per open (no
  // internal `open` prop to re-seed on any more), so a lazy initializer here
  // does what the old open-keyed `useEffect` did, just without needing the
  // effect at all.
  const sourceKey = editKey ?? seedFrom
  const seed = useMemo(() => {
    if (!sourceKey) return null
    const pal = resolveThemePalette(themeSources[sourceKey], themeKinds[sourceKey] ?? 'light', store)
    const base = (s: ThemePalette[keyof ThemePalette] | undefined, fb: string) =>
      (s?.[BASE_TONE] as string | undefined) ?? fb
    return {
      name: editKey ? sourceKey : '',
      kind: themeKinds[sourceKey] ?? 'light',
      brand: base(pal?.brand, primaryColor), neutral: base(pal?.gray, grayBaseColor),
      error: base(pal?.error, errorColor), warning: base(pal?.warning, warningColor),
      success: base(pal?.success, successColor), info: base(pal?.info, infoColor),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [name, setName] = useState(seed?.name ?? '')
  const [kind, setKind] = useState<'light' | 'dark'>(seed?.kind ?? 'light')
  const [brand, setBrand] = useState(seed?.brand ?? primaryColor)
  const [neutral, setNeutral] = useState(seed?.neutral ?? grayBaseColor)
  const [linked, setLinked] = useState(!seed)
  const [error, setError] = useState(seed?.error ?? errorColor)
  const [warning, setWarning] = useState(seed?.warning ?? warningColor)
  const [success, setSuccess] = useState(seed?.success ?? successColor)
  const [info, setInfo] = useState(seed?.info ?? infoColor)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Live scales, IN THE THEME'S OWN APPEARANCE. This used to call
  // `generateColorScale(hex, …, pageBackground)` unconditionally — the LIGHT
  // generator anchored to the LIGHT page — for every slot, so switching Mode
  // to Dark changed nothing on screen: you picked a dark theme's colours
  // against light ramps and only saw the real ones after creating it. A dark
  // theme resolves through each family's DARK twin (`scaleForFamily`), so the
  // preview has to build those same twins: `generateDarkColorScale` for the
  // neutral (it re-derives the base as a dark neutral) and
  // `generateFamilyDarkScale` for everything else, both anchored to
  // `darkBackground`. Same pair `ColorPrimitives`' "reset to standard" uses,
  // so this preview can't disagree with what the family table will show.
  const dark = kind === 'dark'
  const rampFor = (hex: string, isNeutral: boolean) => {
    try {
      if (dark) {
        return isNeutral
          ? generateDarkColorScale(hex, colorAlgorithm, contrastShift, darkBackground, neutralTint)
          : generateFamilyDarkScale(hex, colorAlgorithm, contrastShift, darkBackground)
      }
      // The light neutral takes the tint too — it's the ramp the page is
      // derived from, and omitting it here would preview a washed-out curve
      // against a fully tinted page (see NEUTRAL_TINTS.chromaLink).
      return generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground, 'light', isNeutral ? neutralTint : undefined)
    } catch { return {} }
  }
  const deps = [dark, colorAlgorithm, contrastShift, pageBackground, darkBackground, neutralTint]
  /* eslint-disable react-hooks/exhaustive-deps */
  const scales: Record<FamilySlot, Record<number, string>> = {
    brand:   useMemo(() => rampFor(brand, false), [brand, ...deps]),
    gray:    useMemo(() => rampFor(neutral, true), [neutral, ...deps]),
    error:   useMemo(() => rampFor(error, false), [error, ...deps]),
    warning: useMemo(() => rampFor(warning, false), [warning, ...deps]),
    success: useMemo(() => rampFor(success, false), [success, ...deps]),
    info:    useMemo(() => rampFor(info, false), [info, ...deps]),
  }
  /* eslint-enable react-hooks/exhaustive-deps */

  const values: Record<FamilySlot, string> = { brand, gray: neutral, error, warning, success, info }
  const setters: Record<FamilySlot, (h: string) => void> = {
    brand: changeBrand,
    gray: (h) => { setNeutral(h); setLinked(false) },
    error: setError, warning: setWarning, success: setSuccess, info: setInfo,
  }

  // The neutral tracks the brand hue until the user edits Neutral by hand
  // (the `gray` setter below clears `linked`). No visible toggle for this any
  // more — it lived as an icon beside the Neutral row's ramp, which shrank
  // that row's available width relative to the other five (same flex row,
  // one more sibling competing for space) and made Neutral's swatches visibly
  // narrower than Accent's/Error's/etc. Silent default-then-detach was worth
  // more than a control that broke the one row it sat on.
  function changeBrand(hex: string) {
    setBrand(hex)
    if (linked) setNeutral(neutralFromBrand(hex, neutralTint))
  }

  function handleCreate() {
    const label = name.trim()
    const key = slugify(label)
    if (!key) { setErr('Name the theme first.'); return }
    // On edit, the key only collides if it points at a *different* theme.
    if (themes[key] && key !== editKey) { setErr(`"${key}" already exists.`); return }
    try {
      // A theme never holds colour — it REFERENCES a primitive family. So each
      // slot resolves to a family key: the matching global when the hex is the
      // system's own, an existing family when one already carries that hex, and
      // otherwise a NEW family minted here so the colour shows up in Primitives
      // where colour is edited. That's what keeps a theme connected.
      const globals: Record<FamilySlot, { key: string; hex: string }> = {
        brand:   { key: 'accent',  hex: primaryColor },
        gray:    { key: 'neutral', hex: grayBaseColor },
        error:   { key: 'error',   hex: errorColor },
        warning: { key: 'warning', hex: warningColor },
        success: { key: 'success', hex: successColor },
        info:    { key: 'info',    hex: infoColor },
      }
      const chosen: Record<FamilySlot, string> = {
        brand, gray: neutral, error, warning, success, info,
      }
      const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
      const minted: { key: string; label: string; base: string; scale: ReturnType<typeof generateColorScale> }[] = []
      const taken = new Set(customColors.map((c) => c.key))
      const refs = {} as ThemeSources
      for (const slot of FAMILY_SLOTS) {
        const hex = chosen[slot]
        const g = globals[slot]
        if (eq(hex, g.hex)) { refs[slot] = g.key; continue }
        const existing = customColors.find((c) => eq(c.base, hex)) ?? minted.find((m) => eq(m.base, hex))
        if (existing) { refs[slot] = existing.key; continue }
        const wanted = slot === 'brand' ? key : `${key}-${slot}`
        let familyKey = wanted
        let n = 2
        while (RESERVED_COLOR_KEYS.includes(familyKey) || taken.has(familyKey)) familyKey = `${wanted}-${n++}`
        taken.add(familyKey)
        minted.push({
          key: familyKey,
          label: familyKey.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
          base: hex,
          scale: generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground),
        })
        refs[slot] = familyKey
      }
      minted.forEach((m) => addCustomColor({ key: m.key, label: m.label, base: m.base, scale: m.scale }))
      if (editKey) {
        if (key !== editKey) { renameTheme(editKey, key); onRenamed?.(editKey, key) }
        updateTheme(key, kind, refs)
      } else {
        addTheme(key, kind, refs)
      }
      onClose()
    } catch {
      setErr('One of the colors is invalid.')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      {/* Header — swatch · title · hex, the SAME three-part shape the family
          edit popover uses (see ColorPrimitives), h-[52px] to line up with
          every other row-2 header (`PreviewPanel`, `SaveSidePanel`). The
          swatch is the theme's accent, so the panel says which theme it is
          before you read a word of it. */}
      <header className="flex items-center gap-2 px-5 h-[52px] border-b border-line/60 flex-shrink-0">
        <span className={SWATCH} style={{ backgroundColor: brand }} />
        <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{isEdit ? 'Edit theme' : 'Add a theme'}</h2>
        <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">{brand.toUpperCase()}</span>
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="ml-2 text-fg-faint hover:text-fg transition-colors w-6 h-6 flex items-center justify-center flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Name + mode */}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-fg-muted">
              Theme name{nameLocked && <span className="text-fg-faint"> · locked (reserved export key)</span>}
            </span>
            <input
              autoFocus={!nameLocked}
              type="text"
              value={name}
              disabled={nameLocked}
              onChange={(e) => { setName(e.target.value); setErr(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder="e.g. Ocean"
              className="h-9 bg-surface border border-line-strong focus:border-fg rounded-[13px] px-3 text-[13px] text-fg outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-fg-muted">Mode</span>
            {/* Switching this repaints the whole preview below — see
                `rampFor`. The eye-style wording matches the Primitives
                columns: it names the appearance you're looking at.
                The ACTIVE side is painted in that mode's real page colour
                (`pageBackground`/`darkBackground`, this system's own, not a
                generic white/black), ink solved against it — so picking
                "Dark" turns that pill dark and picking "Light" turns it
                light, regardless of which theme the app CHROME happens to be
                in. It used to be `bg-fg`/`text-app` on whichever side was
                active — chrome-reactive selected-chip styling, so in a
                light-chrome session BOTH "Light" and "Dark" rendered the
                exact same near-black pill: nothing on screen showed which
                mode was actually selected. */}
            <div className="flex h-9 rounded-[13px] border border-line-strong overflow-hidden">
              {(['light', 'dark'] as const).map((k) => {
                const bg = k === 'dark' ? darkBackground : pageBackground
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    aria-pressed={kind === k}
                    className={`flex-1 text-[12px] font-medium capitalize transition-colors ${
                      kind === k ? '' : 'bg-surface text-fg-muted hover:text-fg'
                    }`}
                    style={kind === k ? { backgroundColor: bg, color: readableInk(bg) } : undefined}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Colors — one card, painted in the THEME'S appearance. `.light`/
            `.dark` are the app's own token sets (index.css), and `.light`
            exists precisely so a subtree can opt back OUT of dark chrome —
            the same trick TokenDetailsModal's per-mode cards use. A ramp is
            judged against the page it ships on, so a dark theme's swatches
            have to sit on a dark page even while the app chrome is light,
            and vice versa. */}
        <section className={`${dark ? 'dark' : 'light'} rounded-xl border border-line bg-app p-4 flex flex-col gap-3`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-fg">Colors</h3>
            <span className="text-[11px] text-fg-faint">{dark ? 'Dark ramps' : 'Light ramps'}</span>
          </div>
          {SLOTS.map(({ slot, label, family }) => (
            <SlotRow
              key={slot}
              label={label}
              family={family}
              value={values[slot]}
              scale={scales[slot]}
              onChange={setters[slot]}
            />
          ))}
        </section>

        {err && <p className="text-[11px] text-red-500">{err}</p>}
      </div>

      {/* Footer — pinned, so Create/Cancel stay reachable without scrolling
          past six colour rows. */}
      <div className="flex items-center justify-end gap-2 px-5 h-14 border-t border-line flex-shrink-0">
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
          {isEdit ? 'Save changes' : 'Create theme'}
        </button>
      </div>
    </div>
  )
}
