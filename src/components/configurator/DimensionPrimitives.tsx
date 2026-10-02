import { useState, type ReactNode } from 'react'
import SemanticGroupRail from './SemanticGroupRail'
import { TABLE_CELL_DIVIDER, TABLE_HEAD_CELL, tableHeaderClass, tableRowClass } from './tableChrome'
import { useDimensions } from '../../lib/useDimensions'
import { sortedDimensions } from '../../lib/dimensions'

// `Dimension primitives` — the ONE global collection of lengths. Radius,
// Spacing, Sizes, Stroke and Grid don't own numbers any more: each of their
// steps is an alias of a row here (`radius-lg` → `dimension-16`), picked by
// name in that foundation's Scale. Same tier Color primitives are for colour,
// and the same collection the Figma plugin ships as `Dimension Primitives`.
//
// Read-only on purpose: a primitive IS its value (`dimension-16` is 16px), so
// "editing" one would rename it. Changing a length means pointing a semantic at
// a different primitive, in its own foundation.

type Group = 'all' | 'used' | 'unused'

const GRID = 'grid grid-cols-[minmax(9rem,0.8fr)_6.5rem_minmax(7rem,1fr)_minmax(12rem,1.8fr)]'

/** Bar length on a log-ish scale, so 4 and 1536 are both readable in one column. */
function barPct(px: number): number {
  if (px >= 9999) return 100
  const a = Math.abs(px)
  return Math.max(2, Math.min(100, (Math.log2(a + 1) / Math.log2(1921)) * 100))
}

export default function DimensionPrimitives({
  previewTheme,
  query = '',
  railCollapsed = false,
}: {
  tabBar?: ReactNode
  previewTheme?: string
  query?: string
  railCollapsed?: boolean
}) {
  const { scale, usage } = useDimensions(previewTheme)
  const [group, setGroup] = useState<Group>('all')
  const all = sortedDimensions(scale)
  const used = all.filter(([k]) => usage.has(k))
  const q = query.trim().toLowerCase()
  const rows = all
    .filter(([k]) => group === 'all' || (group === 'used') === usage.has(k))
    .filter(([k, n]) => !q
      || `dimension-${k}`.includes(q)
      || `${n}px`.includes(q)
      || (usage.get(k) ?? []).some((t) => t.includes(q)))

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <SemanticGroupRail<Group>
          ariaLabel="Dimension primitives"
          active={group}
          collapsed={railCollapsed}
          onChange={setGroup}
          items={[
            { key: 'all', label: 'All', count: all.length, shortLabel: 'ALL' },
            { key: 'used', label: 'In use', count: used.length, hint: 'Aliased by at least one token of the previewed theme.' },
            { key: 'unused', label: 'Available', count: all.length - used.length, hint: 'Part of the standard scale — pick one from any foundation’s Scale.' },
          ]}
        />
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="min-w-[38rem]">
            <div className={tableHeaderClass(GRID)}>
              <span className={`${TABLE_HEAD_CELL} pl-4`}>Primitive</span>
              <span className={`${TABLE_HEAD_CELL} px-3`}>Value</span>
              <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
              <span className={`${TABLE_HEAD_CELL} px-3`}>Used by</span>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-fg-faint">
                {q ? `No primitives match “${query}”.` : 'No primitives in this group.'}
              </div>
            ) : rows.map(([k, n], i) => {
              const tokens = usage.get(k) ?? []
              return (
                <div key={k} className={tableRowClass(i, GRID)}>
                  <div className={`flex items-center py-2.5 pl-4 pr-3 min-w-0 ${TABLE_CELL_DIVIDER}`}>
                    <code className="font-mono text-body text-fg-muted truncate">dimension-{k}</code>
                  </div>
                  <div className={`flex items-center px-3 ${TABLE_CELL_DIVIDER}`}>
                    <span className="font-mono text-caption tabular-nums text-fg">{n}px</span>
                  </div>
                  <div className={`flex items-center px-3 ${TABLE_CELL_DIVIDER} ${n < 0 ? 'justify-end' : ''}`}>
                    <div className="w-full h-2 rounded-full bg-elevated overflow-hidden flex" style={{ justifyContent: n < 0 ? 'flex-end' : 'flex-start' }}>
                      <div
                        className={`h-full rounded-full ${tokens.length ? 'bg-accent-ui/60' : 'bg-fg-faint/40'}`}
                        style={{ width: `${n === 0 ? 0 : barPct(n)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 min-w-0 flex-wrap">
                    {tokens.length === 0 ? (
                      <span className="text-caption text-fg-faint">—</span>
                    ) : (
                      <>
                        {tokens.slice(0, 4).map((t) => (
                          <code key={t} className="px-1.5 py-0.5 rounded bg-elevated text-mini font-mono text-fg-muted">{t}</code>
                        ))}
                        {tokens.length > 4 && (
                          <span className="text-mini font-mono text-fg-faint" title={tokens.slice(4).join(', ')}>+{tokens.length - 4}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
