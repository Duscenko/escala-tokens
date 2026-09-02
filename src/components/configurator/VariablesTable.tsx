import { useState, type ReactNode } from 'react'
import ScrubInput, { isScrubbable } from '../ui/ScrubInput'
import VariableCollectionRail, { RailNoGroups } from './VariableCollectionRail'
import {
  TABLE_CELL_DIVIDER, TABLE_GROUP_LABEL, TABLE_HEAD_CELL,
  tableHeaderClass, tableRowClass,
} from './tableChrome'

// Flush, filterable variables table shared by every token foundation (Radius ·
// Spacing · Sizes · Shadow · Grid) — a top bar (title · count ·
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

// `h-[52px]`, the app's one row-2 height — the same band the rail's own header
// occupies beside it, so the two bottom borders are one continuous line across
// the two columns. It was `py-3` (39.5px measured) against the rail's 52px, and
// every other table in the app had drifted to its own third value.
// Cells set only their horizontal padding; the row's height and `items-stretch`
// place them.
//
// Re-exported so the many call sites that already import it from here keep
// working; `tableChrome` is where it (and the rest of the table's chrome) is
// now defined, once, for every table in the workspace.
export { TABLE_HEADER_H } from './tableChrome'

function TableHeader({ valueLabel, stacked, grid }: { valueLabel: string; stacked: boolean; grid: string }) {
  return (
    <div className={tableHeaderClass(grid, { stacked })}>
      <span className={`${TABLE_HEAD_CELL} pl-4`}>Token name</span>
      <span className={`${TABLE_HEAD_CELL} px-3`}>{valueLabel}</span>
      <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
      <span aria-hidden />
    </div>
  )
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className={TABLE_GROUP_LABEL}>
      <span className="text-caption font-semibold uppercase tracking-widest text-fg-muted">{label}</span>
      <span className="text-caption font-mono tabular-nums text-fg-faint">{count}</span>
    </div>
  )
}

export default function VariablesTable({
  title,
  groups,
  toolbar,
  tabBar,
  searchLabel = 'Filter tokens',
  wideValues = false,
  railed = false,
  railBody,
  footer,
  query,
}: {
  title: string
  groups: VariableGroup[]
  /** Rendered in the top bar between the title and the search box. */
  toolbar?: ReactNode
  /** Color/Type hub tab strip — replaces the title when present. */
  tabBar?: ReactNode
  searchLabel?: string
  /**
   * Controlled filter string, owned by the workspace's own "Search tokens"
   * field (`colorQuery` in Configurator). When it's a string — even `''` — this
   * table drops its OWN top bar entirely: the workspace chrome already carries
   * the search and the "Primitives / Semantics" collection is named in the rail,
   * so an inner heading + a second search box was the same thing twice. Leave it
   * `undefined` to get the self-contained bar back (the non-workspace path).
   */
  query?: string
  /** Give the value column the room (long CSS values, e.g. shadow ramps). */
  wideValues?: boolean
  /**
   * Renders the 198px left gutter the Color hub and Typography use, so this
   * table's left edge lands on the SAME line as theirs. Opt-in per section.
   * FoundationWorkbench already owns the Groups | icon-rail band above, so
   * this gutter is only the nav column beside the table — no second "Collections"
   * header row stacked under Groups.
   */
  railed?: boolean
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
  const controlled = query !== undefined
  const [innerQuery, setInnerQuery] = useState('')
  const activeQuery = controlled ? query : innerQuery
  const q = activeQuery.trim().toLowerCase()
  const grid = wideValues ? GRID_WIDE : GRID

  const total = groups.reduce((n, g) => n + g.rows.length, 0)
  const filtered = groups
    .map((g) => ({
      ...g,
      // Computed from the UNFILTERED rows on purpose: derived from the visible
      // ones, a search that happens to leave only non-numeric rows would drop
      // the handle slot and shift every input sideways mid-keystroke.
      scrubbable: g.rows.some((r) => isScrubbable(r.value)),
      rows: g.rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)),
    }))
    .filter((g) => g.rows.length > 0)
  const stacked = groups.length > 1

  // Suppressed whole in the workspace: `ThemeWorkspaceTabs` already carries the
  // "Primitives" tab and the "Search tokens" field, and the rail names the
  // active collection — this bar was all three a second time.
  const topBar = controlled ? null : (
    <div className={`foundation-layer-bar flex ${tabBar ? 'items-stretch' : 'items-center justify-between'} gap-3 h-[52px] ${tabBar ? 'pr-3' : 'pl-4 pr-3'} flex-shrink-0`}>
        {tabBar ? (
          <div className="foundation-layer-title flex flex-1 min-w-0 items-center px-5">{tabBar}</div>
        ) : (
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={railed ? 'text-caption font-semibold uppercase tracking-widest text-fg-muted truncate' : 'text-sm text-fg truncate'}>{title}</span>
          <span className="text-caption font-mono tabular-nums text-fg-faint">{total}</span>
        </div>
        )}
        <div className="flex items-center gap-3 min-w-0 self-center">
          {toolbar}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line-strong w-44 focus-within:border-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={innerQuery}
              onChange={(e) => setInnerQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-ui text-fg-muted placeholder:text-fg-faint outline-none"
              aria-label={searchLabel}
            />
            {innerQuery && (
              <button onClick={() => setInnerQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>
  )

  const rows = filtered.length === 0 ? (
    <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{activeQuery}”.</div>
  ) : (
    filtered.map((g) => (
      <div key={g.label ?? 'tokens'}>
        {stacked && g.label && <GroupLabel label={g.label} count={g.rows.length} />}
        <TableHeader valueLabel={g.valueLabel ?? 'Value'} stacked={stacked} grid={grid} />
        {g.rows.map((r, i) => (
          <div key={r.name} className={tableRowClass(i, grid)}>
            <div className={`flex items-center py-3 pl-4 pr-3 min-w-0 ${TABLE_CELL_DIVIDER}`}>
              <code className="font-mono text-body text-fg-muted truncate">{r.name}</code>
              {r.modified && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
            </div>
            <div className={`flex items-center px-3 py-2 ${TABLE_CELL_DIVIDER}`}>
              {/* Reserved per GROUP, not per row: a group whose rows are all
                  numeric (spacing, radius, sizes, grid) gets the slot on every
                  row so the inputs stay on one x, and a group with none
                  (Shadow's CSS strings) reserves nothing and keeps its full
                  width for the value. */}
              <ScrubInput
                value={r.value}
                onChange={r.onChange}
                ariaLabel={`${r.name} value`}
                reserveHandle={g.scrubbable}
              />
            </div>
            <div className={`flex items-center px-3 py-2 overflow-hidden ${TABLE_CELL_DIVIDER}`}>{r.preview}</div>
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

  // Railed — nav fills the 198px column under Groups (FoundationWorkbench
  // already painted that header). Title + search sit on the table side only,
  // matching Color's body (families | tabs+search, not a second header row).
  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <VariableCollectionRail>
          {/* A heading over nothing reads as a section that failed to load —
              Stroke and Grid genuinely have no groups, so they say so. */}
          {railBody ? <div className="flex flex-col gap-0.5">{railBody}</div> : <RailNoGroups />}
        </VariableCollectionRail>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {topBar}
          <div className="flex-1 min-w-0 overflow-auto">
            {rows}
            {footer && <div className="px-4 py-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
