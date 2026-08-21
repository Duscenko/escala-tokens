import { useEffect, useRef, useState } from 'react'
import ScrubInput from '../ui/ScrubInput'
import { useDesignStore } from '../../store/useDesignStore'
import { fontStack, loadGoogleFont, POPULAR_GOOGLE_FONTS } from '../../lib/fonts'
import {
  TYPE_SCALE_KEYS,
  FONT_SIZE_STANDARD,
  LINE_HEIGHT_STANDARD,
  FONT_WEIGHT_STANDARD,
  FONT_WEIGHT_ROWS,
  FONT_FAMILY_ROWS,
  TYPO_CATEGORIES,
  type TypoCategory,
} from '../../lib/typographyStandard'

const GRID = 'grid grid-cols-[minmax(10rem,1fr)_8rem_minmax(8rem,1.6fr)_3rem]'
const PREVIEW = 'Ag — Sphinx of black quartz'

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

function FontPickerPopover({
  value,
  onSelect,
  onClose,
}: {
  value: string
  onSelect: (family: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()
  const matches = q ? POPULAR_GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q)) : POPULAR_GOOGLE_FONTS
  const exact = POPULAR_GOOGLE_FONTS.some((f) => f.toLowerCase() === q)

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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
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
  }, [onClose])

  return (
    <div
      ref={rootRef}
      className="absolute right-2 top-full mt-1 z-30 w-72 rounded-xl border border-line bg-app shadow-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 h-10 border-b border-line">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Google Fonts…"
          className="flex-1 min-w-0 bg-transparent text-[13px] text-fg placeholder:text-fg-faint outline-none"
        />
      </div>
      <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
        {q && !exact && (
          <button
            onClick={() => onSelect(query.trim())}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-elevated/60 transition-colors"
          >
            <span className="text-fg-faint">Use</span>
            <span className="font-medium text-fg" style={{ fontFamily: fontStack(query.trim()) }}>“{query.trim()}”</span>
          </button>
        )}
        {matches.map((f) => {
          const active = f === value
          return (
            <button
              key={f}
              data-family={f}
              onClick={() => onSelect(f)}
              style={{ fontFamily: fontStack(f) }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[15px] transition-colors ${
                active ? 'bg-fg/10 text-fg' : 'text-fg hover:bg-elevated/60'
              }`}
            >
              <span className="truncate">{f}</span>
              {active && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
        {matches.length === 0 && !q && (
          <p className="px-3 py-6 text-center text-[13px] text-fg-faint">No fonts</p>
        )}
      </div>
    </div>
  )
}

// ── Column header ───────────────────────────────────────────────────────────

// `stacked` (the "All" view) drops the column header below the sticky group
// label so both can pin without overlapping; otherwise it pins at the top.
function TableHeader({ valueLabel, stacked = false }: { valueLabel: string; stacked?: boolean }) {
  return (
    <div className={`${GRID} items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky z-10 ${stacked ? 'top-[34px]' : 'top-0'}`}>
      <span className="pl-4 py-3 border-r border-line">Token name</span>
      <span className="px-3 py-3 border-r border-line">{valueLabel}</span>
      <span className="px-3 py-3 border-r border-line">Preview</span>
      <span className="py-3" aria-hidden />
    </div>
  )
}

// ── Group sub-header (used in the "All" view) ───────────────────────────────

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-app border-b border-line sticky top-0 z-20">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-muted">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-fg-faint">{count}</span>
    </div>
  )
}

// ── Row wrapper (zebra + hover, matches Semantic) ───────────────────────────

function rowClass(index: number) {
  const isEven = index % 2 === 1
  return `${GRID} items-stretch border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
    isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
  }`
}

const nameCell = 'flex items-center py-3 pl-4 pr-3 min-w-0 border-r border-line'
const valueCell = 'flex items-center px-3 py-2 border-r border-line'
const previewCell = 'flex items-center px-3 py-2 border-r border-line overflow-hidden'

// ── Main ────────────────────────────────────────────────────────────────────

export default function Step4_Typography() {
  const { typography, setTypography } = useDesignStore()

  const [activeCategory, setActiveCategory] = useState<TypoCategory>('all')
  const [query, setQuery] = useState('')
  const [pickerRole, setPickerRole] = useState<'display' | 'body' | null>(null)

  const bodyFont = typography.fontFamily
  const displayFont = typography.headingFontFamily ?? typography.fontFamily
  const sizes = typography.sizes ?? FONT_SIZE_STANDARD
  const lineHeights = typography.lineHeights ?? LINE_HEIGHT_STANDARD
  const weights = typography.weights ?? FONT_WEIGHT_STANDARD
  // Both active families are already loaded app-wide by useLoadActiveFonts()
  // (mounted in Configurator.tsx) — no local effect needed here.

  // ── setters ──
  const setFamily = (role: 'display' | 'body', family: string) =>
    setTypography(
      role === 'display'
        ? { ...typography, headingFontFamily: family }
        : { ...typography, fontFamily: family },
    )
  const setSize = (key: string, v: string) => setTypography({ ...typography, sizes: { ...sizes, [key]: v } })
  const setLineHeight = (key: string, v: string) => setTypography({ ...typography, lineHeights: { ...lineHeights, [key]: v } })
  const setWeight = (base: string, n: number) => setTypography({ ...typography, weights: { ...weights, [base]: n } })

  const q = query.trim().toLowerCase()
  const match = (name: string) => !q || name.toLowerCase().includes(q)


  // ── per-category tables ──
  const familyTable = () => {
    const rows = FONT_FAMILY_ROWS.filter((r) => match(r.key))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && <GroupLabel label="Font family" count={FONT_FAMILY_ROWS.length} />}
        <TableHeader valueLabel="Family" stacked={activeCategory === 'all'} />
        {rows.map((r, i) => {
          const family = r.role === 'display' ? displayFont : bodyFont
          const modified = family !== 'Inter'
          return (
            <div key={r.key} className={rowClass(i)}>
              <div className={nameCell}>
                <code className="font-mono text-[12px] text-fg-muted truncate">{r.label}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={`${valueCell} relative`}>
                <button
                  onClick={() => setPickerRole(pickerRole === r.role ? null : r.role)}
                  className="flex items-center gap-1.5 w-full text-left text-[13px] text-fg hover:text-fg transition-colors"
                >
                  <span className="truncate" style={{ fontFamily: fontStack(family) }}>{family}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-fg-faint flex-shrink-0">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {pickerRole === r.role && (
                  <FontPickerPopover
                    value={family}
                    onClose={() => setPickerRole(null)}
                    onSelect={(f) => { setFamily(r.role, f); loadGoogleFont(f); setPickerRole(null) }}
                  />
                )}
              </div>
              <div className={previewCell}>
                <span className="text-fg truncate text-[18px]" style={{ fontFamily: fontStack(family) }}>{PREVIEW}</span>
              </div>
              <ResetButton modified={modified} onReset={() => setFamily(r.role, 'Inter')} title="Reset to Inter" />
            </div>
          )
        })}
      </div>
    )
  }

  const weightTable = () => {
    const rows = FONT_WEIGHT_ROWS.filter((r) => match(r.name))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && <GroupLabel label="Font weight" count={FONT_WEIGHT_ROWS.length} />}
        <TableHeader valueLabel="Weight" stacked={activeCategory === 'all'} />
        {rows.map((r, i) => {
          const n = weights[r.base] ?? FONT_WEIGHT_STANDARD[r.base]
          const modified = !r.italic && n !== FONT_WEIGHT_STANDARD[r.base]
          return (
            <div key={r.name} className={rowClass(i)}>
              <div className={nameCell}>
                <code className="font-mono text-[12px] text-fg-muted truncate">{r.name}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                {r.italic ? (
                  <span className="text-[13px] font-mono text-fg-faint px-2">{n} · italic</span>
                ) : (
                  <ValueInput value={String(n)} onChange={(v) => { const p = parseInt(v, 10); if (!Number.isNaN(p)) setWeight(r.base, p) }} />
                )}
              </div>
              <div className={previewCell}>
                <span
                  className="text-fg truncate"
                  style={{ fontFamily: fontStack(bodyFont), fontWeight: n, fontStyle: r.italic ? 'italic' : 'normal', fontSize: 18 }}
                >
                  {PREVIEW}
                </span>
              </div>
              <ResetButton modified={modified} onReset={() => setWeight(r.base, FONT_WEIGHT_STANDARD[r.base])} title="Reset to standard" />
            </div>
          )
        })}
      </div>
    )
  }

  const sizeTable = () => {
    const rows = TYPE_SCALE_KEYS.filter((k) => match(k))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && <GroupLabel label="Font size" count={TYPE_SCALE_KEYS.length} />}
        <TableHeader valueLabel="Size" stacked={activeCategory === 'all'} />
        {rows.map((key, i) => {
          const val = sizes[key] ?? FONT_SIZE_STANDARD[key]
          const modified = val !== FONT_SIZE_STANDARD[key]
          const px = Math.min(parseInt(val, 10) || 16, 44)
          return (
            <div key={key} className={rowClass(i)}>
              <div className={nameCell}>
                <code className="font-mono text-[12px] text-fg-muted truncate">{key}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                <ValueInput value={val} onChange={(v) => setSize(key, v)} />
              </div>
              <div className={previewCell}>
                <span className="text-fg truncate leading-none" style={{ fontFamily: fontStack(displayFont), fontSize: px }}>{PREVIEW}</span>
              </div>
              <ResetButton modified={modified} onReset={() => setSize(key, FONT_SIZE_STANDARD[key])} title="Reset to standard" />
            </div>
          )
        })}
      </div>
    )
  }

  const lineHeightTable = () => {
    const rows = TYPE_SCALE_KEYS.filter((k) => match(k))
    if (!rows.length) return null
    return (
      <div>
        {activeCategory === 'all' && <GroupLabel label="Line height" count={TYPE_SCALE_KEYS.length} />}
        <TableHeader valueLabel="Line height" stacked={activeCategory === 'all'} />
        {rows.map((key, i) => {
          const val = lineHeights[key] ?? LINE_HEIGHT_STANDARD[key]
          const modified = val !== LINE_HEIGHT_STANDARD[key]
          return (
            <div key={key} className={rowClass(i)}>
              <div className={nameCell}>
                <code className="font-mono text-[12px] text-fg-muted truncate">{key}</code>
                {modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </div>
              <div className={valueCell}>
                <ValueInput value={val} onChange={(v) => setLineHeight(key, v)} />
              </div>
              <div className={previewCell}>
                <span className="text-fg-muted text-[13px] block w-full leading-tight" style={{ lineHeight: val, fontFamily: fontStack(bodyFont) }}>
                  Sphinx of black quartz,<br />judge my vow.
                </span>
              </div>
              <ResetButton modified={modified} onReset={() => setLineHeight(key, LINE_HEIGHT_STANDARD[key])} title="Reset to standard" />
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

  const anyVisible =
    (showFamily && FONT_FAMILY_ROWS.some((r) => match(r.key))) ||
    (showWeight && FONT_WEIGHT_ROWS.some((r) => match(r.name))) ||
    ((showSize || showLineHeight) && TYPE_SCALE_KEYS.some((k) => match(k)))

  return (
    // No floating card (border/rounded-xl) and no enter animation — matches
    // VariablesTable's flush treatment (the other 6 foundations) and the
    // Color hub's tables. FoundationWorkbench paints Groups | icon-rail
    // above this, so the body is nav | search+tables — same split Color uses
    // under its Groups band.
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        {/* Same rail metrics as ColorPrimitives' family nav — py-1.5 px-2, not
            a uniform p-2 — so the two sections' first row starts at the same y. */}
        <nav aria-label="Typography categories" className="w-[198px] flex-shrink-0 h-full border-r border-line py-1.5 px-2 flex flex-col gap-0.5 bg-app overflow-y-auto">
          {TYPO_CATEGORIES.map((c) => {
            const isActive = activeCategory === c.key
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                aria-current={isActive}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <span className="text-[13px] flex-1 min-w-0 truncate">{c.label}</span>
                <span className={`text-[11px] font-mono tabular-nums ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>{c.count}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="foundation-layer-bar flex items-center justify-end gap-3 h-[52px] pl-4 pr-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line-strong w-48 max-w-[45%] focus-within:border-fg transition-colors flex-shrink-0">
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
                aria-label="Filter typography tokens"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[30rem]">
              {!anyVisible ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
              ) : (
                <>
                  {showFamily && familyTable()}
                  {showWeight && weightTable()}
                  {showSize && sizeTable()}
                  {showLineHeight && lineHeightTable()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
