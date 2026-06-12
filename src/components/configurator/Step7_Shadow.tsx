import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import TokenTable from './TokenTable'

export default function Step7_Shadow() {
  const { shadows, setShadows } = useDesignStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Elevation cards: one per level ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Elevation</label>
        <div className="grid grid-cols-3 gap-4 rounded-xl border border-line bg-app p-6">
          {Object.entries(shadows).map(([key, value], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="w-full h-20 rounded-xl bg-surface border border-line/40"
                style={{ boxShadow: value }}
              />
              <span className="text-[11px] font-mono text-fg-faint">shadow-{key}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Editable table ── */}
      <TokenTable
        tokens={shadows}
        prefix="shadow"
        onChange={(key, value) => setShadows({ ...shadows, [key]: value })}
        searchPlaceholder="Filter shadow tokens…"
        wideValues
        renderPreview={(_, value) => (
          <div
            className="w-9 h-9 rounded-lg bg-surface border border-line/40 flex-shrink-0"
            style={{ boxShadow: value }}
          />
        )}
      />

      {/* ── Token preview ── */}
      <div className="rounded-lg bg-surface border border-line p-4">
        <p className="text-xs text-fg-faint uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-fg-muted overflow-x-auto">
{`:root {
${Object.entries(shadows).map(([k, v]) => `  --shadow-${k}: ${v};`).join('\n')}
}`}
        </pre>
      </div>
    </motion.div>
  )
}
