import { motion } from 'framer-motion'
import { useDesignStore, SIZES_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

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
      {/* ── Variables table — Figma-style token rows ── */}
      <VariablesTable
        title="Size tokens"
        searchLabel="Filter size tokens"
        groups={[
          {
            valueLabel: 'Height',
            rows: Object.entries(sizes).map(([key, value]) => {
              const px = parseFloat(value) || 0
              const standard = SIZES_DEFAULT[key]
              return {
                name: `size-${key}`,
                value,
                modified: standard !== undefined && value !== standard,
                onChange: (v: string) => setSizes({ ...sizes, [key]: v }),
                onReset: () => setSizes({ ...sizes, [key]: standard ?? value }),
                preview: (
                  <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((px / maxPx) * 100, 2)}%`,
                        backgroundColor: accent + '88',
                      }}
                    />
                  </div>
                ),
              }
            }),
          },
        ]}
      />

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
    </motion.div>
  )
}
