import { motion } from 'framer-motion'
import { useDesignStore, GRID_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// Two families, in the order the table stacks them.
const GRID_GROUPS: { label: string; valueLabel: string; keys: string[] }[] = [
  { label: 'Layout', valueLabel: 'Value', keys: ['columns', 'gutter', 'margin', 'container'] },
  {
    label: 'Breakpoints',
    valueLabel: 'Min width',
    keys: ['breakpoint-sm', 'breakpoint-md', 'breakpoint-lg', 'breakpoint-xl', 'breakpoint-2xl'],
  },
]

export default function Step8_Grid() {
  const { grid, setGrid, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  const columns = Math.max(1, Math.min(parseInt(grid.columns) || 12, 24))
  const gutter = parseFloat(grid.gutter) || 24

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Variables table — layout (columns, gutter, margin, container) over
          the breakpoint ramp, so the two families read apart. ── */}
      <VariablesTable
        title="Grid tokens"
        searchLabel="Filter grid tokens"
        groups={GRID_GROUPS.map((g) => ({
          label: g.label,
          valueLabel: g.valueLabel,
          rows: g.keys
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
            }),
        }))}
      />

      {/* ── Column overlay preview — the visual specimen sits below the editable
          table, so you set columns/gutter first, then see the layout. ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Layout Grid</label>
        <div className="rounded-xl border border-line bg-app p-4">
          <div
            className="flex h-28 rounded-lg overflow-hidden"
            style={{ gap: Math.min(gutter / 2, 16) }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0.6 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.02 }}
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

    </motion.div>
  )
}
