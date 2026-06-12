import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import TokenTable from './TokenTable'

export default function Step9_Sizes() {
  const { sizes, setSizes, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  const maxPx = Math.max(...Object.values(sizes).map((v) => parseFloat(v) || 0), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Height-bar preview: component sizes side by side ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Component Sizes</label>
        <div className="flex items-end justify-center gap-4 rounded-xl border border-line bg-app p-6">
          {Object.entries(sizes).map(([key, value], i) => {
            const px = parseFloat(value) || 0
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scaleY: 0.5 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col items-center gap-2"
                style={{ transformOrigin: 'bottom' }}
              >
                <div
                  className="w-16 rounded-lg flex items-center justify-center text-[10px] font-mono"
                  style={{
                    height: px,
                    backgroundColor: accent + '22',
                    border: `1.5px solid ${accent}66`,
                    color: accent,
                  }}
                >
                  {value}
                </div>
                <span className="text-[11px] font-mono text-fg-faint">{key}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Editable table ── */}
      <TokenTable
        tokens={sizes}
        prefix="size"
        onChange={(key, value) => setSizes({ ...sizes, [key]: value })}
        searchPlaceholder="Filter size tokens…"
        renderPreview={(_, value) => {
          const px = parseFloat(value) || 0
          return (
            <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((px / maxPx) * 100, 2)}%`,
                  backgroundColor: accent + '88',
                }}
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
${Object.entries(sizes).map(([k, v]) => `  --size-${k}: ${v};`).join('\n')}
}`}
        </pre>
      </div>
    </motion.div>
  )
}
