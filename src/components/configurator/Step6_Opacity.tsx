import { motion } from 'framer-motion'
import { useDesignStore, OPACITY_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// Parse "40%" | "0.4" | "40" into a 0–1 alpha for the preview swatch.
function toAlpha(value: string): number {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 1
  return value.includes('%') || n > 1 ? Math.min(n / 100, 1) : n
}

const CHECKER = {
  backgroundImage: 'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
} as const

export default function Step6_Opacity() {
  const { opacity, setOpacity, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Variables table — Figma-style token rows ── */}
      <VariablesTable
        title="Opacity tokens"
        searchLabel="Filter opacity tokens"
        groups={[
          {
            valueLabel: 'Opacity',
            rows: Object.entries(opacity).map(([key, value]) => {
              const standard = OPACITY_DEFAULT[key]
              return {
                name: `opacity-${key}`,
                value,
                modified: standard !== undefined && value !== standard,
                onChange: (v: string) => setOpacity({ ...opacity, [key]: v }),
                onReset: () => setOpacity({ ...opacity, [key]: standard ?? value }),
                preview: (
                  <div className="w-10 h-5 rounded border border-line flex-shrink-0" style={{ ...CHECKER, backgroundSize: '10px 10px' }}>
                    <div className="w-full h-full rounded" style={{ backgroundColor: accent, opacity: toAlpha(value) }} />
                  </div>
                ),
              }
            }),
          },
        ]}
      />

      {/* ── Strip preview: every step over a checkerboard ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Opacity Scale</label>
        <div
          className="flex rounded-xl overflow-hidden border border-line"
          style={{ ...CHECKER, backgroundSize: '14px 14px' }}
        >
          {Object.entries(opacity).map(([key, value]) => (
            <div key={key} className="flex-1 flex flex-col items-center">
              <div
                className="w-full h-14"
                style={{ backgroundColor: accent, opacity: toAlpha(value) }}
              />
              <span className="text-[10px] font-mono text-fg-faint py-1.5 bg-surface w-full text-center border-t border-line">
                {key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
