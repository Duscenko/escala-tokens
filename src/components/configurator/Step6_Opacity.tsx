import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import TokenTable from './TokenTable'

// Parse "40%" | "0.4" | "40" into a 0–1 alpha for the preview swatch.
function toAlpha(value: string): number {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 1
  return value.includes('%') || n > 1 ? Math.min(n / 100, 1) : n
}

export default function Step6_Opacity() {
  const { opacity, setOpacity, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Strip preview: every step over a checkerboard ── */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Opacity Scale</label>
        <div
          className="flex rounded-xl overflow-hidden border border-line"
          style={{
            backgroundImage:
              'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
            backgroundSize: '14px 14px',
          }}
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

      {/* ── Editable table ── */}
      <TokenTable
        tokens={opacity}
        prefix="opacity"
        onChange={(key, value) => setOpacity({ ...opacity, [key]: value })}
        searchPlaceholder="Filter opacity tokens…"
        renderPreview={(_, value) => (
          <div
            className="w-10 h-5 rounded border border-line"
            style={{
              backgroundImage:
                'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
              backgroundSize: '10px 10px',
            }}
          >
            <div
              className="w-full h-full rounded"
              style={{ backgroundColor: accent, opacity: toAlpha(value) }}
            />
          </div>
        )}
      />

      {/* ── Token preview ── */}
      <div className="rounded-lg bg-surface border border-line p-4">
        <p className="text-xs text-fg-faint uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-fg-muted overflow-x-auto">
{`:root {
${Object.entries(opacity).map(([k, v]) => `  --opacity-${k}: ${v};`).join('\n')}
}`}
        </pre>
      </div>
    </motion.div>
  )
}
