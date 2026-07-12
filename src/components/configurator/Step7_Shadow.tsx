import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import TokenTable from './TokenTable'

// Shadow presets — each defines the full xs→2xl elevation ramp, named by
// intensity. Mirrors the Radius foundation's preset pattern (StepRadius.tsx)
// so Quick edit can offer the same one-click "personality" picker.
export const SHADOW_PRESETS = [
  {
    label: 'None',
    description: 'Flat — no elevation anywhere',
    values: { xs: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none' },
  },
  {
    label: 'Subtle',
    description: 'Barely-there depth — quiet, minimal',
    values: {
      xs: '0 1px 1px rgba(10,13,18,0.03)',
      sm: '0 1px 2px rgba(10,13,18,0.05)',
      md: '0 2px 4px -1px rgba(10,13,18,0.05)',
      lg: '0 6px 8px -2px rgba(10,13,18,0.04)',
      xl: '0 10px 12px -2px rgba(10,13,18,0.04)',
      '2xl': '0 12px 24px -6px rgba(10,13,18,0.08)',
    },
  },
  {
    label: 'Soft',
    description: 'Balanced depth — the default ramp',
    values: {
      xs: '0 1px 2px rgba(10,13,18,0.05)',
      sm: '0 1px 3px rgba(10,13,18,0.10), 0 1px 2px -1px rgba(10,13,18,0.10)',
      md: '0 4px 6px -1px rgba(10,13,18,0.10), 0 2px 4px -2px rgba(10,13,18,0.06)',
      lg: '0 12px 16px -4px rgba(10,13,18,0.08), 0 4px 6px -2px rgba(10,13,18,0.03)',
      xl: '0 20px 24px -4px rgba(10,13,18,0.08), 0 8px 8px -4px rgba(10,13,18,0.03)',
      '2xl': '0 24px 48px -12px rgba(10,13,18,0.18)',
    },
  },
  {
    label: 'Strong',
    description: 'Pronounced depth — bold, high-contrast surfaces',
    values: {
      xs: '0 2px 4px rgba(10,13,18,0.10)',
      sm: '0 2px 6px rgba(10,13,18,0.18), 0 2px 4px -1px rgba(10,13,18,0.16)',
      md: '0 8px 12px -2px rgba(10,13,18,0.18), 0 4px 6px -3px rgba(10,13,18,0.12)',
      lg: '0 20px 26px -6px rgba(10,13,18,0.16), 0 8px 10px -4px rgba(10,13,18,0.08)',
      xl: '0 32px 40px -6px rgba(10,13,18,0.18), 0 14px 14px -6px rgba(10,13,18,0.08)',
      '2xl': '0 40px 72px -16px rgba(10,13,18,0.32)',
    },
  },
]

export const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

// Which preset (if any) the current shadow map exactly matches.
export function matchShadowPreset(shadows: Record<string, string>): string | null {
  const hit = SHADOW_PRESETS.find((p) =>
    SHADOW_STEPS.every((s) => (shadows[s] ?? '') === p.values[s]),
  )
  return hit?.label ?? null
}

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
