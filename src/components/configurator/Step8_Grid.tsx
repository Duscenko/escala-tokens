import { useState } from 'react'
import { useDesignStore, GRID_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// The two collections the rail switches between. They used to stack in one
// scroll behind sticky sub-headers; with a rail they become real collections,
// the same way Spacing's scale/paddings and Typography's categories do.
const GRID_GROUPS = [
  { key: 'layout', label: 'Layout', valueLabel: 'Value', keys: ['columns', 'gutter', 'margin', 'container'] },
  {
    key: 'breakpoints',
    label: 'Breakpoints',
    valueLabel: 'Min width',
    keys: ['breakpoint-sm', 'breakpoint-md', 'breakpoint-lg', 'breakpoint-xl', 'breakpoint-2xl'],
  },
] as const
type GridCollection = (typeof GRID_GROUPS)[number]['key']

export default function Step8_Grid() {
  const { grid, setGrid, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor
  const [collection, setCollection] = useState<GridCollection>('layout')

  const columns = Math.max(1, Math.min(parseInt(grid.columns) || 12, 24))
  const gutter = parseFloat(grid.gutter) || 24

  const rowsFor = (keys: readonly string[]) =>
    keys
      .filter((key) => grid[key] !== undefined)
      .map((key) => {
        const value = grid[key]
        const standard = GRID_DEFAULT[key]
        const px = parseFloat(value) || 0
        const pct = Math.min((px / 1536) * 100, 100)
        return {
          name: `grid-${key}`,
          value,
          modified: standard !== undefined && value !== standard,
          onChange: (v: string) => setGrid({ ...grid, [key]: v }),
          onReset: () => setGrid({ ...grid, [key]: standard ?? value }),
          preview:
            key === 'columns' ? null : (
              <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: accent + '88' }}
                />
              </div>
            ),
        }
      })

  const active = GRID_GROUPS.find((g) => g.key === collection) ?? GRID_GROUPS[0]

  return (
    // Flush + railed. No global control to put in a row-1 cell (columns/gutter
    // are themselves tokens in the table), so it starts at the Collections row
    // the way Typography does.
    <div className="h-full flex flex-col">
      <VariablesTable
        title={active.label}
        searchLabel="Filter grid tokens"
        railed
        railTop={<span className="text-[13px] font-semibold text-fg">Collections</span>}
        railBody={
          <nav aria-label="Grid collections" className="py-1.5 px-2 flex flex-col gap-0.5">
            {GRID_GROUPS.map((g) => {
              const isActive = g.key === collection
              return (
                <button
                  key={g.key}
                  onClick={() => setCollection(g.key)}
                  aria-current={isActive}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                  }`}
                >
                  <span className="text-[13px] flex-1 min-w-0 truncate">{g.label}</span>
                  <span className={`text-[11px] font-mono tabular-nums ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>
                    {rowsFor(g.keys).length}
                  </span>
                </button>
              )
            })}
          </nav>
        }
        groups={[{ valueLabel: active.valueLabel, rows: rowsFor(active.keys) }]}
        // Column overlay — the specimen you set columns/gutter against. Only
        // meaningful for the Layout collection; a breakpoint ramp has nothing
        // to draw here, so it isn't rendered as dead chrome under that one.
        footer={
          collection === 'layout' ? (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Layout grid</span>
              <div className="rounded-xl border border-line bg-app p-4">
                <div className="flex h-28 rounded-lg overflow-hidden" style={{ gap: Math.min(gutter / 2, 16) }}>
                  {Array.from({ length: columns }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded"
                      style={{ backgroundColor: accent + '26', border: `1px solid ${accent}55` }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-mono text-fg-faint mt-3 text-center">
                  {columns} columns · gutter {grid.gutter} · margin {grid.margin} · container {grid.container}
                </p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  )
}
