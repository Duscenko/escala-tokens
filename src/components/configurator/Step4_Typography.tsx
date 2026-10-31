import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF, SELECT_OPTION_ON } from './themeWorkspaceLayout'
import { PLATFORM_FONT_DEFAULTS, fontFamilyFor, headingFontFamilyFor } from '../../lib/platformAxis'
import ScrubInput from '../ui/ScrubInput'
import { useCloseOnAnchorScroll } from '../ui/useCloseOnAnchorScroll'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import { fontStack, loadGoogleFont, POPULAR_GOOGLE_FONTS } from '../../lib/fonts'
import { AddFontButton, AddFontDialog } from './AddFontDialog'
import { useDesignStore } from '../../store/useDesignStore'
import VariableCollectionRail from './VariableCollectionRail'
import {
  TABLE_CELL_DIVIDER, TABLE_GROUP_LABEL, TABLE_HEAD_CELL,
  tableHeaderClass, tableMatchClass, tableRowClass,
} from './tableChrome'
import {
  TYPE_SCALE_KEYS,
  FONT_SIZE_STANDARD,
  LINE_HEIGHT_STANDARD,
  FONT_WEIGHT_STANDARD,
  FONT_WEIGHT_ROWS,
  FONT_FAMILY_ROWS,
  TYPO_CATEGORIES,
  letterSpacingFor,
  type TypoCategory,
} from '../../lib/typographyStandard'
import { typePrimitivesForViewport, type TypeWeightKey } from '../../lib/typeRoles'
import { usePreviewViewport } from './ViewportRail'

const GRID = 'grid grid-cols-[minmax(10rem,1fr)_8rem_minmax(8rem,1.6fr)_3rem]'

// ── Small reusable bits ─────────────────────────────────────────────────────

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

function ResetButton({ modified, onReset, title }: { modified: boolean; onReset: () => void; title: string }) {
  return (
    <button
      onClick={onReset}
      disabled={!modified}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-full h-full py-3 text-fg-faint hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint transition-colors"
    >
      <ResetIcon />
    </button>
  )
}

/** Inline px / numeric editor — reveals a border box on hover/focus, and
 *  carries the same scrub handle the token tables use (sizes and line heights
 *  are exactly the values you want to drag). `ScrubInput` decides per value
 *  whether there's a number to scrub, so the font-FAMILY rows that share this
 *  component get a plain field with no handle and no reserved slot. */
function ValueInput({ value, onChange, mono = true }: { value: string; onChange: (v: string) => void; mono?: boolean }) {
  return <ScrubInput value={value} onChange={onChange} mono={mono} />
}

// ── Google Font picker popover ──────────────────────────────────────────────

const FONT_MENU_W = 288
const FONT_MENU_GAP = 6
/** List inset (p-1) + option inset (px-2.5): the menu shifts left by this so
 *  the family names line up with the trigger's text. */
const FONT_MENU_INSET = 14

/** Portaled to <body> and placed `fixed` off its trigger: inside the table
 *  cell it was clipped by the scroll column and spilled over the name column.
 *  Opens below, or above when there is more room there, clamped to the window.
 *  Scrolling the table closes it (`useCloseOnAnchorScroll`): following the
 *  trigger slid the menu over the sticky headers. */
function FontPickerPopover({
  anchor,
  value,
  onSelect,
  onClose,
  onAddFont,
}: {
  /** The family button it drops from. */
  anchor: RefObject<HTMLElement | null>
  value: string
  onSelect: (family: string) => void
  onClose: () => void
  /** Opens AddFontDialog (the parent owns it: this popover closes on any
   *  click outside itself, the dialog included). */
  onAddFont: () => void
}) {
  const fontSources = useDesignStore((s) => s.fontSources) ?? []
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number; maxList: number } | null>(null)
  const [cursor, setCursor] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  // Focus the search once the menu is placed: it mounts hidden while it
  // measures, and a hidden field cannot take focus (autoFocus missed it).
  const placed = place != null
  useEffect(() => { if (placed) searchRef.current?.focus() }, [placed])

  useLayoutEffect(() => {
    const measure = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.max(FONT_MENU_GAP, Math.min(r.left - FONT_MENU_INSET, window.innerWidth - FONT_MENU_W - FONT_MENU_GAP))
      const below = window.innerHeight - r.bottom - FONT_MENU_GAP * 2
      const above = r.top - FONT_MENU_GAP * 2
      // Search (40px) and the add-font foot (44px) ride outside the list.
      const chrome = 84
      const down = below >= 320 || below >= above
      const room = (down ? below : above) - chrome
      setPlace({
        left,
        ...(down ? { top: r.bottom + FONT_MENU_GAP } : { bottom: window.innerHeight - r.top + FONT_MENU_GAP }),
        maxList: Math.max(120, Math.min(288, room)),
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [anchor])
  useCloseOnAnchorScroll(true, anchor, onClose)

  const q = query.trim().toLowerCase()
  // Families this system added come first, then the Google list.
  const all = [...fontSources.map((f) => f.family).filter((f) => !POPULAR_GOOGLE_FONTS.includes(f)), ...POPULAR_GOOGLE_FONTS]
  const matches = q ? all.filter((f) => f.toLowerCase().includes(q)) : all
  const exact = all.some((f) => f.toLowerCase() === q)
  const stackOf = (f: string) => fontStack(f, fontSources.find((s) => s.family === f)?.category)

  // Lazy-load each option's webfont as it scrolls into view (avoids 200 requests).
  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          const fam = (e.target as HTMLElement).dataset.family
          if (fam) loadGoogleFont(fam)
        }
      }),
      { root, rootMargin: '120px' },
    )
    root.querySelectorAll('[data-family]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [matches.length])

  // Close on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      // The trigger toggles itself; closing here too would reopen it.
      if (rootRef.current?.contains(target) || anchor.current?.contains(target)) return
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
  }, [onClose, anchor])

  // ↑ ↓ walk the list from the search field, Enter picks; the field keeps
  // focus so typing never stops.
  const options = q && !exact ? [query.trim(), ...matches] : matches
  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = options.length
      if (!n) return
      setCursor((at) => {
        const next = e.key === 'ArrowDown' ? (at + 1) % n : (at - 1 + n) % n
        listRef.current?.querySelectorAll('[data-option]')[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter' && cursor >= 0 && options[cursor]) {
      e.preventDefault()
      onSelect(options[cursor])
    }
  }

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Choose a font family"
      className={`fixed z-[70] flex flex-col overflow-hidden ${SELECT_LIST} !p-0`}
      style={{
        width: FONT_MENU_W,
        left: place?.left ?? -9999,
        top: place?.top,
        bottom: place?.bottom,
        visibility: place ? 'visible' : 'hidden',
      }}
    >
      <div className="flex items-center gap-2 px-3 h-10 flex-shrink-0 border-b border-line">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(-1) }}
          onKeyDown={onSearchKey}
          placeholder="Search Google Fonts…"
          aria-label="Search Google Fonts"
          className="flex-1 min-w-0 bg-transparent text-ui text-fg placeholder:text-fg-faint outline-none"
        />
      </div>
      <div ref={listRef} role="listbox" aria-label="Font families" className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain p-1" style={{ maxHeight: place?.maxList ?? 288 }}>
        {q && !exact && (
          <button
            type="button"
            data-option
            onClick={() => onSelect(query.trim())}
            onPointerEnter={() => setCursor(0)}
            className={`${SELECT_OPTION} flex items-center gap-2 text-ui ${cursor === 0 ? 'bg-surface text-fg' : SELECT_OPTION_OFF}`}
          >
            <span className="text-fg-faint">Use</span>
            <span className="font-medium text-fg" style={{ fontFamily: fontStack(query.trim()) }}>“{query.trim()}”</span>
          </button>
        )}
        {matches.map((f, i) => {
          const active = f === value
          const at = (q && !exact ? 1 : 0) + i
          return (
            <button
              key={f}
              type="button"
              role="option"
              aria-selected={active}
              data-option
              data-family={f}
              onClick={() => onSelect(f)}
              onPointerEnter={() => setCursor(at)}
              style={{ fontFamily: stackOf(f) }}
              className={`${SELECT_OPTION} flex items-center justify-between gap-2 text-ui ${
                active ? SELECT_OPTION_ON : cursor === at ? 'bg-surface text-fg' : SELECT_OPTION_OFF
              }`}
            >
              <span className="truncate">{f}</span>
              {active && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-accent-ui" aria-hidden>
                  <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
        {matches.length === 0 && !q && (
          <p className="px-3 py-6 text-center text-ui text-fg-faint">No fonts</p>
        )}
      </div>
      <div className="flex-shrink-0 border-t border-line p-1">
        <AddFontButton onOpen={() => { onClose(); onAddFont() }} />
      </div>
    </div>,
    document.body,
  )
}

// ── Column header ───────────────────────────────────────────────────────────

// This file used to carry its OWN copy of `TableHeader`, `GroupLabel` and
// `rowClass` — byte-identical to `VariablesTable`'s, which is exactly how the
// two drifted apart. Both read from `tableChrome` now; see the audit note at
// the top of that file.
//
// `stacked` (later groups in the "All" view) drops the column header below
// the sticky group label so both can pin without overlapping. The FIRST
// visible table never stacks: its TOKEN NAME row pins at top-0 so it lines
// up with “Text variables”, matching Radius.
function TableHeader({ valueLabel, stacked = false }: { valueLabel: string; stacked?: boolean }) {
  return (
    <div className={tableHeaderClass(GRID, { stacked })}>
      <span className={`${TABLE_HEAD_CELL} pl-4`}>Token name</span>
      <span className={`${TABLE_HEAD_CELL} px-3`}>{valueLabel}</span>
      <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
      <span aria-hidden />
    </div>
  )
}

// ── Group sub-header (used in the "All" view) ───────────────────────────────

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className={TABLE_GROUP_LABEL}>
      <span className="text-caption font-semibold uppercase tracking-widest text-fg-muted">{label}</span>
      <span className="text-caption font-mono tabular-nums text-fg-faint">{count}</span>
    </div>
  )
}

// ── Row wrapper (zebra + hover + platform mark, same as VariablesTable) ─────

const rowClass = (index: number, match: boolean | null = null) =>
  `${tableRowClass(index, GRID)} ${tableMatchClass(match)}`

const nameCell = `flex items-center py-2.5 pl-4 pr-3 min-w-0 ${TABLE_CELL_DIVIDER}`
const valueCell = `flex items-center px-2.5 py-1.5 ${TABLE_CELL_DIVIDER}`
// `overflow-hidden`: a 48px “Design” sample spilled out of its cell and widened
// the whole table's scroll.
const previewCell = `flex items-center px-3 py-1.5 min-w-0 overflow-hidden ${TABLE_CELL_DIVIDER}`

// ── Main ────────────────────────────────────────────────────────────────────

export default function Step4_Typography({
  tabBar,
  query: externalQuery,
  previewTheme,
}: {
  tabBar?: ReactNode
  query?: string
  previewTheme?: string
}) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const typography = foundations.typography
  const setTypography = (value: typeof typography) => patch({ typography: value })

  const [activeCategory, setActiveCategory] = useState<TypoCategory>('all')
  const [pickerRole, setPickerRole] = useState<'display' | 'body' | null>(null)
  const pickerAnchor = useRef<HTMLButtonElement>(null)
  const [addFontFor, setAddFontFor] = useState<'display' | 'body' | null>(null)
  const query = externalQuery ?? ''

  // On a native platform the two family rows edit THAT OS's family
  // (system-wide, lib/platformAxis); the root rows are the web family.
  const previewPlatform = usePreviewViewport()?.previewPlatform ?? 'web'
  const platformAxis = useDesignStore((st) => st.platformAxis)
  const setPlatformAxis = useDesignStore((st) => st.setPlatformAxis)
  const onNative = previewPlatform !== 'web'
  const bodyFont = fontFamilyFor(platformAxis, previewPlatform, typography.fontFamily)
  const displayFont = headingFontFamilyFor(platformAxis, previewPlatform, typography.headingFontFamily ?? typography.fontFamily, typography.fontFamily)
  const sizes = typography.sizes ?? FONT_SIZE_STANDARD
  const lineHeights = typography.lineHeights ?? LINE_HEIGHT_STANDARD
  const weights = typography.weights ?? FONT_WEIGHT_STANDARD
  // Both active families are already loaded app-wide by useLoadActiveFonts()
  // (mounted in Configurator.tsx) — no local effect needed here.

  // ── setters ──
  const setFamily = (role: 'display' | 'body', family: string) => {
    if (onNative) {
      const field = role === 'display' ? 'headingFontFamily' : 'fontFamily'
      setPlatformAxis({ [field]: { ...platformAxis[field], [previewPlatform]: family } })
      return
    }
    setTypography(
      role === 'display'
        ? { ...typography, headingFontFamily: family }
        : { ...typography, fontFamily: family },
    )
  }
  /** Drop the native override, so the row reads the OS default again. */
  const resetFamily = (role: 'display' | 'body') => {
    if (!onNative) { setFamily(role, 'Inter'); return }
    const field = role === 'display' ? 'headingFontFamily' : 'fontFamily'
    const { [previewPlatform]: _dropped, ...rest } = platformAxis[field]
    setPlatformAxis({ [field]: rest })
  }
  const familyDefault = (role: 'display' | 'body') =>
    !onNative ? 'Inter'
    : role === 'display' ? fontFamilyFor(platformAxis, previewPlatform, typography.fontFamily)
    : PLATFORM_FONT_DEFAULTS[previewPlatform]
  const setSize = (key: string, v: string) => setTypography({ ...typography, sizes: { ...sizes, [key]: v } })
  const setLineHeight = (key: string, v: string) => setTypography({ ...typography, lineHeights: { ...lineHeights, [key]: v } })
  const setWeight = (base: string, n: number) => setTypography({ ...typography, weights: { ...weights, [base]: n } })

  const platform = usePreviewViewport()
  const used = useMemo(
    () => (platform ? typePrimitivesForViewport(typography.roles, platform.previewViewport) : null),
    [platform, typography.roles],
  )
  const q = query.trim().toLowerCase()
  const match = (name: string) => !q || name.toLowerCase().includes(q)
  const hit = (on: boolean) => (used ? on : null)


  // ── per-category tables ──
  // `lead` = first visible table: skip the group label so TOKEN NAME sits
  // on the same 52px row as “Text variables”, matching Radius. Later groups
  // in the All view still get the sticky label + stacked header.
  const familyTable = (lead = false) => {
    const rows = FONT_FAMILY_ROWS.filter((r) => match(r.key))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && !lead && <GroupLabel label="Font family" count={FONT_FAMILY_ROWS.length} />}
        <TableHeader valueLabel="Family" stacked={activeCategory === 'all' && !lead} />
        {rows.map((r, i) => {
          const family = r.role === 'display' ? displayFont : bodyFont
          const modified = onNative
            ? platformAxis[r.role === 'display' ? 'headingFontFamily' : 'fontFamily'][previewPlatform] !== undefined
            : family !== 'Inter'
          return (
            <div key={r.key} className={rowClass(i, hit(used ? used.families.has(r.role) : false))}>
              <div className={nameCell}>
                <code className="font-mono text-body text-fg-muted truncate">{r.label}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={`${valueCell} relative`}>
                <button
                  ref={pickerRole === r.role ? pickerAnchor : undefined}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={pickerRole === r.role}
                  onClick={() => setPickerRole(pickerRole === r.role ? null : r.role)}
                  className="flex items-center gap-1.5 w-full text-left text-ui text-fg hover:text-fg transition-colors"
                >
                  <span className="truncate" style={{ fontFamily: fontStack(family) }}>{family}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-fg-faint flex-shrink-0">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {pickerRole === r.role && (
                  <FontPickerPopover
                    anchor={pickerAnchor}
                    value={family}
                    onClose={() => setPickerRole(null)}
                    onSelect={(f) => { setFamily(r.role, f); loadGoogleFont(f); setPickerRole(null) }}
                    onAddFont={() => setAddFontFor(r.role)}
                  />
                )}
                <AddFontDialog
                  open={addFontFor === r.role}
                  onClose={() => setAddFontFor(null)}
                  onAdded={(f) => setFamily(r.role, f)}
                />
              </div>
              <div className={previewCell}>
                <span className="text-fg whitespace-nowrap text-[18px]" style={{ fontFamily: fontStack(family) }}>Ag</span>
              </div>
              <ResetButton modified={modified} onReset={() => resetFamily(r.role)} title={`Reset to ${familyDefault(r.role)}`} />
            </div>
          )
        })}
      </div>
    )
  }

  const weightTable = (lead = false) => {
    const rows = FONT_WEIGHT_ROWS.filter((r) => match(r.name))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && !lead && <GroupLabel label="Font weight" count={FONT_WEIGHT_ROWS.length} />}
        <TableHeader valueLabel="Weight" stacked={activeCategory === 'all' && !lead} />
        {rows.map((r, i) => {
          const n = weights[r.base] ?? FONT_WEIGHT_STANDARD[r.base]
          const modified = !r.italic && n !== FONT_WEIGHT_STANDARD[r.base]
          return (
            <div key={r.name} className={rowClass(i, hit(used ? !r.italic && used.weights.has(r.base as TypeWeightKey) : false))}>
              <div className={nameCell}>
                <code className="font-mono text-body text-fg-muted truncate">{r.name}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                {r.italic ? (
                  // Read-only: an italic shares its upright weight. Laid out on
                  // the editable field's own geometry (handle slot + px-2) so
                  // its number lines up with the inputs above and below, and
                  // kept to ONE line. "400 · italic" used to wrap to two lines
                  // in the 8rem column, which made every italic row taller.
                  <div className="flex items-center gap-1 w-full min-w-0" title={`Follows ${r.base} (${n})`}>
                    <span className="w-3.5 flex-shrink-0" aria-hidden />
                    <span className="px-1.5 py-1 text-body font-mono text-fg-muted tabular-nums">{n}</span>
                    <span className="text-caption text-fg-faint truncate">italic</span>
                  </div>
                ) : (
                  <ValueInput value={String(n)} onChange={(v) => { const p = parseInt(v, 10); if (!Number.isNaN(p)) setWeight(r.base, p) }} />
                )}
              </div>
              <div className={previewCell}>
                <span
                  className="text-fg whitespace-nowrap"
                  style={{ fontFamily: fontStack(bodyFont), fontWeight: n, fontStyle: r.italic ? 'italic' : 'normal', fontSize: 18, lineHeight: 1 }}
                >
                  Ag
                </span>
              </div>
              <ResetButton modified={modified} onReset={() => setWeight(r.base, FONT_WEIGHT_STANDARD[r.base])} title="Reset to standard" />
            </div>
          )
        })}
      </div>
    )
  }

  const sizeTable = (lead = false) => {
    const rows = TYPE_SCALE_KEYS.filter((k) => match(k))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && !lead && <GroupLabel label="Font size" count={TYPE_SCALE_KEYS.length} />}
        <TableHeader valueLabel="Size" stacked={activeCategory === 'all' && !lead} />
        {rows.map((key, i) => {
          const val = sizes[key] ?? FONT_SIZE_STANDARD[key]
          const lh = lineHeights[key] ?? LINE_HEIGHT_STANDARD[key]
          const modified = val !== FONT_SIZE_STANDARD[key]
          const display = key.startsWith('display')
          return (
            <div key={key} className={rowClass(i, hit(used ? used.sizes.has(key) : false))}>
              <div className={nameCell}>
                <code className="font-mono text-body text-fg-muted truncate">{key}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                <ValueInput value={val} onChange={(v) => setSize(key, v)} />
              </div>
              <div className={previewCell}>
                <span
                  className="text-fg whitespace-nowrap"
                  title={`${val} / ${lh}`}
                  style={{
                    fontFamily: fontStack(display ? displayFont : bodyFont),
                    fontSize: val,
                    lineHeight: lh,
                    fontWeight: display ? 600 : 400,
                  }}
                >
                  Ag
                </span>
              </div>
              <ResetButton modified={modified} onReset={() => setSize(key, FONT_SIZE_STANDARD[key])} title="Reset to standard" />
            </div>
          )
        })}
      </div>
    )
  }

  const lineHeightTable = (lead = false) => {
    const rows = TYPE_SCALE_KEYS.filter((k) => match(k))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && !lead && <GroupLabel label="Line height" count={TYPE_SCALE_KEYS.length} />}
        <TableHeader valueLabel="Line height" stacked={activeCategory === 'all' && !lead} />
        {rows.map((key, i) => {
          const val = lineHeights[key] ?? LINE_HEIGHT_STANDARD[key]
          const size = sizes[key] ?? FONT_SIZE_STANDARD[key]
          const modified = val !== LINE_HEIGHT_STANDARD[key]
          const display = key.startsWith('display')
          return (
            <div key={key} className={rowClass(i, hit(used ? used.sizes.has(key) : false))}>
              <div className={nameCell}>
                <code className="font-mono text-body text-fg-muted truncate">{key}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                <ValueInput value={val} onChange={(v) => setLineHeight(key, v)} />
              </div>
              <div className={previewCell}>
                <span
                  className="text-fg block"
                  title={`${size} / ${val}`}
                  style={{
                    fontFamily: fontStack(display ? displayFont : bodyFont),
                    fontSize: size,
                    lineHeight: val,
                    fontWeight: display ? 600 : 400,
                  }}
                >
                  Ag<br />Ag
                </span>
              </div>
              <ResetButton modified={modified} onReset={() => setLineHeight(key, LINE_HEIGHT_STANDARD[key])} title="Reset to standard" />
            </div>
          )
        })}
      </div>
    )
  }

  // Read-only: tracking is DERIVED from the size (letterSpacingFor), so the
  // row follows a size edit or the Text size dial instead of holding its own
  // value. Laid out on the editable field's geometry, like an italic weight.
  const letterSpacingTable = (lead = false) => {
    const rows = TYPE_SCALE_KEYS.filter((k) => match(k))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && !lead && <GroupLabel label="Letter spacing" count={TYPE_SCALE_KEYS.length} />}
        <TableHeader valueLabel="Letter spacing" stacked={activeCategory === 'all' && !lead} />
        {rows.map((key, i) => {
          const size = sizes[key] ?? FONT_SIZE_STANDARD[key]
          const val = letterSpacingFor(key, size)
          const display = key.startsWith('display')
          return (
            <div key={key} className={rowClass(i, hit(used ? used.sizes.has(key) : false))}>
              <div className={nameCell}>
                <code className="font-mono text-body text-fg-muted truncate">{key}</code>
              </div>
              <div className={valueCell}>
                <div className="flex items-center gap-1 w-full min-w-0" title={`Follows ${key} (${size}). Larger type tightens; reading sizes keep the font's own spacing.`}>
                  <span className="w-3.5 flex-shrink-0" aria-hidden />
                  <span className="px-1.5 py-1 text-body font-mono text-fg-muted tabular-nums">{val}</span>
                </div>
              </div>
              <div className={previewCell}>
                <span
                  className="text-fg whitespace-nowrap"
                  title={`${size} · ${val}`}
                  style={{
                    fontFamily: fontStack(display ? displayFont : bodyFont),
                    fontSize: size,
                    lineHeight: 1.1,
                    letterSpacing: val,
                    fontWeight: display ? 600 : 400,
                  }}
                >
                  Design
                </span>
              </div>
              <span aria-hidden />
            </div>
          )
        })}
      </div>
    )
  }

  const showFamily = activeCategory === 'all' || activeCategory === 'family'
  const showWeight = activeCategory === 'all' || activeCategory === 'weight'
  const showSize = activeCategory === 'all' || activeCategory === 'size'
  const showLineHeight = activeCategory === 'all' || activeCategory === 'lineHeight'
  const showLetterSpacing = activeCategory === 'all' || activeCategory === 'letterSpacing'

  const anyVisible =
    (showFamily && FONT_FAMILY_ROWS.some((r) => match(r.key))) ||
    (showWeight && FONT_WEIGHT_ROWS.some((r) => match(r.name))) ||
    ((showSize || showLineHeight || showLetterSpacing) && TYPE_SCALE_KEYS.some((k) => match(k)))

  const leadKey: 'family' | 'weight' | 'size' | 'lineHeight' | 'letterSpacing' | null =
    showFamily && FONT_FAMILY_ROWS.some((r) => match(r.key)) ? 'family'
    : showWeight && FONT_WEIGHT_ROWS.some((r) => match(r.name)) ? 'weight'
    : showSize && TYPE_SCALE_KEYS.some((k) => match(k)) ? 'size'
    : showLineHeight && TYPE_SCALE_KEYS.some((k) => match(k)) ? 'lineHeight'
    : showLetterSpacing && TYPE_SCALE_KEYS.some((k) => match(k)) ? 'letterSpacing'
    : null

  return (
    // No floating card (border/rounded-xl) and no enter animation — matches
    // VariablesTable's flush treatment (the other 6 foundations) and the
    // Color hub's tables. FoundationWorkbench paints Groups | icon-rail
    // above this, so the body is nav | search+tables — same split Color uses
    // under its Groups band.
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <VariableCollectionRail ariaLabel="Font collections and groups">
          <div role="navigation" aria-label="Font groups" className="flex flex-col gap-0.5">
            {TYPO_CATEGORIES.map((c) => {
              const isActive = activeCategory === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCategory(c.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-fg/[0.09] text-fg' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg'
                  }`}
                >
                  <span className="text-ui flex-1 min-w-0 truncate">{c.label}</span>
                  <span className={`text-caption font-mono tabular-nums ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>{c.count}</span>
                </button>
              )
            })}
          </div>
        </VariableCollectionRail>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Dropped in the workspace — `ThemeWorkspaceTabs` already carries the
              "Primitives" tab and "Search tokens", and the rail's Collections
              section names the collection. Same rule as `VariablesTable` /
              `LayoutSemantics`: no inner bar whenever a `query` is passed in. */}
          {externalQuery === undefined && (
            <div className="foundation-layer-bar flex h-[52px] flex-shrink-0 items-center">
              <div className="foundation-layer-title flex flex-1 min-w-0 items-center px-5">{tabBar}</div>
            </div>
          )}
          <div className="@container/tablescroll flex-1 min-w-0 overflow-auto">
            <div className="w-fit min-w-[max(100%,30rem)]">
              {!anyVisible ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
              ) : (
                <>
                  {showFamily && familyTable(leadKey === 'family')}
                  {showWeight && weightTable(leadKey === 'weight')}
                  {showSize && sizeTable(leadKey === 'size')}
                  {showLineHeight && lineHeightTable(leadKey === 'lineHeight')}
                  {showLetterSpacing && letterSpacingTable(leadKey === 'letterSpacing')}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
