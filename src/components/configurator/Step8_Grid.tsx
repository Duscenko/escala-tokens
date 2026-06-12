import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import TokenTable from './TokenTable'

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
      className="flex flex-col gap-8"
    >
      {/* ── Column overlay preview ── */}
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

      {/* ── Editable table (columns, gutter, margin, container + breakpoints) ── */}
      <TokenTable
        tokens={grid}
        prefix="grid"
        onChange={(key, value) => setGrid({ ...grid, [key]: value })}
        searchPlaceholder="Filter grid tokens…"
        renderPreview={(key, value) => {
          if (key === 'columns') return null
          const px = parseFloat(value) || 0
          const pct = Math.min((px / 1536) * 100, 100)
          return (
            <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: accent + '88' }}
              />
            </div>
          )
        }}
      />

      {/* ── Token preview ── */}
      <div className="rounded-lg bg-surface border border-line p-4">
        <p className="text-xs text-fg-faint uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-fg-muted overflow-x-auto">
{`:root {
${Object.entries(grid).map(([k, v]) => `  --grid-${k}: ${v};`).join('\n')}
}`}
        </pre>
      </div>
    </motion.div>
  )
}
