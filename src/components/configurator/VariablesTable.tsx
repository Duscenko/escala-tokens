import { useState, type ReactNode } from 'react'

// Flush, filterable variables table shared by every token foundation (Radius ·
// Spacing · Sizes · Opacity · Shadow · Grid) — a top bar (title · count ·
// search), pinned column headers and zebra rows of Token name · Value ·
// Preview, with a per-row reset when the value drifts from the standard.
//
// No card border/rounding of its own — matches the Color hub's tables
// (ColorPrimitives / Step3 / StepGradients), which dropped their floating
// `rounded-xl border` shell for the same reason: a table sitting inside a
// page that already has its own margin doesn't need a second frame around
// it too. The h-[52px] top bar height matches Color's row-2 convention
// ("Groups" / "Tokens" / "Collections") for the same reason every other
// h-[52px] header in the app does — so headers line up if they're ever
// shown side by side.

const GRID = 'grid grid-cols-[minmax(9rem,1fr)_7.5rem_minmax(8rem,1.5fr)_3rem]'
// `wideValues` — for long CSS values (shadow ramps): the value column takes the
// room and the preview shrinks to its swatch.
const GRID_WIDE = 'grid grid-cols-[minmax(8rem,0.8fr)_minmax(14rem,2.5fr)_5rem_3rem]'

export interface VariableRow {
  /** Full token name, rendered as code — e.g. `radius-md`. */
  name: string
  value: string
  /** Differs from the standard — shows the blue dot and enables reset. */
  modified: boolean
  onChange: (v: string) => void
  onReset: () => void
  preview?: ReactNode
}

export interface VariableGroup {
  /** Sticky group sub-header — shown when the table has more than one group. */
  label?: string
  valueLabel?: string
  rows: VariableRow[]
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

function TableHeader({ valueLabel, stacked, grid }: { valueLabel: string; stacked: boolean; grid: string }) {
  return (
    <div className={`${grid} items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky z-10 ${stacked ? 'top-[34px]' : 'top-0'}`}>
      <span className="pl-4 py-3 border-r border-line">Token name</span>
      <span className="px-3 py-3 border-r border-line">{valueLabel}</span>
      <span className="px-3 py-3 border-r border-line">Preview</span>
      <span className="py-3" aria-hidden />
    </div>
  )
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-app border-b border-line sticky top-0 z-20">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-muted">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-fg-faint">{count}</span>
    </div>
  )
}

function rowClass(index: number, grid: string) {
  const isEven = index % 2 === 1
  return `${grid} items-stretch border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
    isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
  }`
}

export default function VariablesTable({
  title,
  groups,
  toolbar,
  searchLabel = 'Filter tokens',
  wideValues = false,
  railed = false,
  railTop,
  railBody,
  footer,
}: {
  title: string
  groups: VariableGroup[]
  /** Rendered in the top bar between the title and the search box. */
  toolbar?: ReactNode
  searchLabel?: string
  /** Give the value column the room (long CSS values, e.g. shadow ramps). */
  wideValues?: boolean
  /**
   * Renders the 198px left gutter the Color hub and Typography use, so this
   * table's left edge lands on the SAME line as theirs. Opt-in per section:
   * a section with no rail CONTENT (Radius · Sizes · Opacity · Shadow) still
   * wants the gutter for alignment, while Spacing and Grid fill it with a real
   * collections nav. Off only for a table rendered outside a foundation page.
   */
  railed?: boolean
  /** Rail content beside the top bar — h-[52px] cell. */
  railTop?: ReactNode
  /** Rail content beside the rows — fills the remaining height. */
  railBody?: ReactNode
  /**
   * Visual specimen rendered UNDER the rows, inside the table's own scroll
   * column (Sizes' component heights, Opacity's checkerboard strip, Grid's
   * column overlay). It has to live in here rather than as a sibling: once a
   * section is railed the table owns its column, so a block outside would sit
   * beside the rail instead of under the table it illustrates.
   */
  footer?: ReactNode
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const grid = wideValues ? GRID_WIDE : GRID

  const total = groups.reduce((n, g) => n + g.rows.length, 0)
  const filtered = groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)) }))
    .filter((g) => g.rows.length > 0)
  const stacked = groups.length > 1

  const topBar = (
    <div className={`flex items-center justify-between gap-3 h-[52px] ${railed ? 'pl-4 pr-3' : 'px-4 border-b border-line'} bg-app flex-shrink-0`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={railed ? 'text-[11px] font-semibold uppercase tracking-widest text-fg-muted truncate' : 'text-sm text-fg truncate'}>{title}</span>
          <span className="text-[11px] font-mono tabular-nums text-fg-faint">{total}</span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {toolbar}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-44 focus-within:border-line-strong transition-colors">
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
              aria-label={searchLabel}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>
  )

  const rows = filtered.length === 0 ? (
    <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
  ) : (
    filtered.map((g) => (
      <div key={g.label ?? 'tokens'}>
        {stacked && g.label && <GroupLabel label={g.label} count={g.rows.length} />}
        <TableHeader valueLabel={g.valueLabel ?? 'Value'} stacked={stacked} grid={grid} />
        {g.rows.map((r, i) => (
          <div key={r.name} className={rowClass(i, grid)}>
            <div className="flex items-center py-3 pl-4 pr-3 min-w-0 border-r border-line">
              <code className="font-mono text-[12px] text-fg-muted truncate">{r.name}</code>
              {r.modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
            </div>
            <div className="flex items-center px-3 py-2 border-r border-line">
              <input
                type="text"
                value={r.value}
                onChange={(e) => r.onChange(e.target.value)}
                aria-label={`${r.name} value`}
                className="w-full bg-app text-[13px] font-mono text-fg rounded-md border border-transparent hover:border-line focus:border-fg px-2 py-1 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center px-3 py-2 border-r border-line overflow-hidden">{r.preview}</div>
            <button
              onClick={r.onReset}
              disabled={!r.modified}
              title="Reset to standard"
              aria-label={`Reset ${r.name} to standard`}
              className="flex items-center justify-center w-full h-full py-3 text-fg-faint hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint transition-colors"
            >
              <ResetIcon />
            </button>
          </div>
        ))}
      </div>
    ))
  )

  // Full-bleed (the 5 rail-less sections) — unchanged from before `railed`.
  if (!railed) {
    return (
      <div className="flex flex-col bg-app">
        {topBar}
        {rows}
        {footer}
      </div>
    )
  }

  // Railed — a 198px gutter runs the full height beside BOTH the top bar and
  // the rows, so the table's left edge lands on the same line as the Color
  // hub's and Typography's navs.
  return (
    <div className="flex flex-col bg-app flex-1 min-h-0">
      <div className="flex items-stretch flex-shrink-0 border-b border-line">
        <div className="w-[198px] flex-shrink-0 flex items-center px-4 h-[52px] border-r border-line">{railTop}</div>
        <div className="flex-1 min-w-0">{topBar}</div>
      </div>
      <div className="flex items-stretch flex-1 min-h-0">
        <div className="w-[198px] flex-shrink-0 border-r border-line bg-app overflow-y-auto">{railBody}</div>
        <div className="flex-1 min-w-0 overflow-auto">
          {rows}
          {footer && <div className="px-4 py-6">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
