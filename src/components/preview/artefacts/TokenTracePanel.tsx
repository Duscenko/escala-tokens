// The inspector badge's body for a catalogue component: EVERY token it reads,
// property by property, grouped by anatomy slot.
//
//   ROOT
//     Background     --color-action-primary-default   ■ #7f56d9
//     Radius         --radius-action                  ◜ 8px
//     Padding X      --spacing-4                      ↔ 16px
//     Typography     --text-button-*                  Aa 14px / 20px · 500
//
// The data is `traceElement` (lib/tokenTrace) — a read of the component's
// recipe, the same table the stylesheet and the Figma plugin paint from — so
// a row can never name a token the component does not use. Rows whose kind has
// a Token Details drawer (colour · radius · type · size roles) open it; the
// variable chip copies the CSS custom property for every row.

import { useMemo, useState, type ReactNode } from 'react'
import type { ElementTrace, TraceKind, TraceRow } from '../../../lib/tokenTrace'
import { displayHex } from '../../../lib/tokenInspector'

const CHECKER: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#0000001a 25%,transparent 25%),linear-gradient(-45deg,#0000001a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#0000001a 75%),linear-gradient(-45deg,transparent 75%,#0000001a 75%)',
  backgroundSize: '6px 6px',
  backgroundPosition: '0 0,0 3px,3px -3px,-3px 0',
}

type Filter = 'all' | 'color' | 'layout' | 'type'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'color', label: 'Color' },
  { key: 'layout', label: 'Layout' },
  { key: 'type', label: 'Type' },
]

function filterOf(kind: TraceKind): Exclude<Filter, 'all'> {
  if (kind === 'color') return 'color'
  if (kind === 'type') return 'type'
  return 'layout'
}

/** Anatomy slot names as the reader says them: `tagRemove` → `Tag remove`. */
function slotLabel(slot: string): string {
  const words = slot.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** `data-state="checked"` → `checked` · `focus-visible` stays. */
function stateLabel(state: string): string {
  const m = state.match(/="?([^"\]]+)"?$/)
  if (m) return m[1]
  return state.replace(/^data-/, '')
}

function isAlpha(css: string): boolean {
  return /^#[0-9a-f]{8}$/i.test(css.trim()) || /^rgba\(/i.test(css.trim()) || /^#[0-9a-f]{4}$/i.test(css.trim())
}

/** The glyph left of a value: a real swatch for colour, a drawn mark for a length. */
function ValueMark({ row }: { row: TraceRow }) {
  const box = 'flex h-5 w-5 flex-shrink-0 items-center justify-center'
  if (row.kind === 'color') {
    return (
      <span className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/15" style={isAlpha(row.value) ? CHECKER : undefined} aria-hidden>
        <span className="block h-full w-full" style={{ background: row.value }} />
      </span>
    )
  }
  if (row.kind === 'type') {
    return <span className={`${box} text-mini font-semibold text-fg-muted`} aria-hidden>Aa</span>
  }
  if (row.kind === 'radius') {
    return (
      <span className={box} aria-hidden>
        <span className="h-3 w-3 rounded-tl-md border-l-[1.5px] border-t-[1.5px] border-fg-muted" />
      </span>
    )
  }
  if (row.kind === 'spacing') {
    return (
      <span className={box} aria-hidden>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-fg-muted">
          <path d="M2 4v8M14 4v8M4 8h8M6 6l-2 2 2 2M10 6l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (row.kind === 'stroke') {
    return (
      <span className={box} aria-hidden>
        <span className="h-3 w-3 rounded-[3px] border-[1.5px] border-fg-muted" />
      </span>
    )
  }
  if (row.kind === 'shadow') {
    return (
      <span className={box} aria-hidden>
        <span className="h-3 w-3 rounded-[3px] bg-elevated" style={{ boxShadow: row.value }} />
      </span>
    )
  }
  return (
    <span className={box} aria-hidden>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-fg-muted">
        <path d="M8 2v12M6 4l2-2 2 2M6 12l2 2 2-2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** The CSS custom property as a chip that copies itself. */
function VarChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const text = name.includes('*') ? name : `var(${name})`
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1100)
    }).catch(() => {})
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copy(e as unknown as React.MouseEvent) }}
      title={copied ? 'Copied' : `Copy ${name}`}
      className="max-w-[60%] flex-shrink truncate rounded-md bg-accent-ui/10 px-1.5 py-0.5 font-mono text-nano text-accent-ui transition-colors hover:bg-accent-ui/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      {copied ? 'Copied' : name}
    </span>
  )
}

function Row({
  row, lit, dim, onPick,
}: {
  row: TraceRow
  lit: boolean
  dim: boolean
  onPick?: (row: TraceRow) => void
}) {
  const editable = !!row.pickId && !!onPick
  const value = row.kind === 'color' ? displayHex(row.value) : row.value
  const body: ReactNode = (
    <>
      <span className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-caption ${lit ? 'text-fg' : 'text-fg-muted'}`}>
          {row.label}
          {row.state && (
            <span className="ml-1.5 rounded bg-surface px-1 py-px text-nano text-fg-faint">{stateLabel(row.state)}</span>
          )}
        </span>
        <VarChip name={row.cssVar} />
      </span>
      <span className="flex items-center gap-2">
        <ValueMark row={row} />
        <span className="min-w-0 flex-1 truncate font-mono text-mini tabular-nums text-fg" title={row.value}>{value}</span>
        <span className="max-w-[45%] flex-shrink-0 truncate font-mono text-nano text-fg-faint" title={row.ref}>{row.ref}</span>
      </span>
      {row.facets && (
        <span className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-surface/60 px-2 py-1.5">
          {row.facets.map((facet) => (
            <span key={facet.label} className="contents">
              <span className="text-nano text-fg-faint">{facet.label}</span>
              <span className="truncate text-right font-mono text-nano tabular-nums text-fg-muted" title={facet.cssVar}>{facet.value}</span>
            </span>
          ))}
        </span>
      )}
    </>
  )
  const cls = `flex w-full flex-col gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
    lit ? 'border-accent-ui/45 bg-accent-ui/[0.07]' : 'border-line/70 bg-app/40'
  } ${dim ? 'opacity-45' : ''}`
  if (!editable) {
    return <div className={cls} title={`${row.ref} — edit it in Variables`}>{body}</div>
  }
  return (
    <button
      type="button"
      onClick={() => onPick?.(row)}
      title={`Edit ${row.pickId}`}
      className={`${cls} hover:border-line-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      {body}
    </button>
  )
}

export function TokenTraceList({
  trace, hitSlot, litIds, onPick,
}: {
  trace: ElementTrace
  /** The anatomy slot under the pointer — its section lights up. */
  hitSlot?: string | null
  /** Pinned-group focus: only these role ids light. */
  litIds?: Set<string> | null
  onPick?: (row: TraceRow) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showStates, setShowStates] = useState(false)

  const all = useMemo(() => trace.slots.flatMap((s) => s.rows), [trace])
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, color: 0, layout: 0, type: 0 }
    for (const r of all) {
      if (r.state && !showStates) continue
      c.all++
      c[filterOf(r.kind)]++
    }
    return c
  }, [all, showStates])
  const stateCount = all.filter((r) => r.state).length

  const sections = trace.slots
    .map((s) => ({
      slot: s.slot,
      rows: s.rows.filter((r) => (showStates || !r.state) && (filter === 'all' || filterOf(r.kind) === filter)),
    }))
    .filter((s) => s.rows.length)

  return (
    <>
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-line/60 px-2 py-1.5">
        <div role="tablist" aria-label="Token kind" className="flex items-center gap-1">
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => {
            const selected = f.key === filter
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f.key)}
                className={`flex h-6 items-center gap-1.5 rounded-md px-2 text-micro font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  selected ? 'bg-elevated text-fg' : 'text-fg-faint hover:bg-surface hover:text-fg'
                }`}
              >
                {f.label}
                <span className={`tabular-nums ${selected ? 'text-fg-muted' : ''}`}>{counts[f.key]}</span>
              </button>
            )
          })}
        </div>
        {stateCount > 0 && (
          <button
            type="button"
            aria-pressed={showStates}
            onClick={() => setShowStates((v) => !v)}
            title={showStates ? 'Hide hover, focus and selected overrides' : 'Show hover, focus and selected overrides'}
            className={`ml-auto flex h-6 items-center gap-1 rounded-md px-2 text-micro font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              showStates ? 'bg-elevated text-fg' : 'text-fg-faint hover:bg-surface hover:text-fg'
            }`}
          >
            States <span className="tabular-nums">{stateCount}</span>
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        {sections.length === 0 && (
          <p className="m-0 px-1 py-2 text-mini text-fg-faint">No {filter} tokens on this element.</p>
        )}
        {sections.map((section) => {
          const sectionLit = hitSlot === section.slot && sections.length > 1
          return (
            <section key={section.slot} aria-label={slotLabel(section.slot)} className="flex flex-col gap-1.5">
              <h4 className={`m-0 flex items-center gap-1.5 px-1 text-nano font-semibold uppercase tracking-widest ${sectionLit ? 'text-accent-ui' : 'text-fg-faint'}`}>
                {sectionLit && <span className="h-1.5 w-1.5 rounded-full bg-accent-ui" aria-hidden />}
                {slotLabel(section.slot)}
              </h4>
              {section.rows.map((row) => {
                const lit = litIds ? !!row.pickId && litIds.has(row.pickId) : sectionLit
                return (
                  <Row
                    key={row.key}
                    row={row}
                    lit={lit}
                    dim={!!litIds && !lit}
                    onPick={onPick}
                  />
                )
              })}
            </section>
          )
        })}
      </div>
    </>
  )
}
