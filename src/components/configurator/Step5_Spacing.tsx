import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// Base unit presets — also used by NewTokenWizard's Spacing step.
export const BASE_PRESETS = [
  { label: '4px  (default)', value: 4 },
  { label: '8px  (spacious)', value: 8 },
  { label: '5px  (5-grid)',   value: 5 },
]

export const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '10', '12', '16'] as const
const DEFAULT_BASE = 4

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

export function buildSpacingFromBase(base: number): Record<string, string> {
  const result: Record<string, string> = {}
  SPACING_STEPS.forEach((step) => {
    result[step] = `${Number(step) * base}px`
  })
  return result
}

const PADDING_SIDES = [
  { key: 'top', label: 'Top' },
  { key: 'right', label: 'Right' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
] as const

const PADDING_STANDARD = '20px'

// Mini card showing which side the padding token insets.
function PaddingPreview({ side, value }: { side: 'top' | 'right' | 'bottom' | 'left'; value: string }) {
  const px = Math.max(2, Math.min(pxToNum(value) / 2, 12))
  const pos =
    side === 'top' ? { top: 0, left: 0, right: 0, height: px }
    : side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: px }
    : side === 'left' ? { left: 0, top: 0, bottom: 0, width: px }
    : { right: 0, top: 0, bottom: 0, width: px }
  return (
    <div className="relative w-12 h-7 rounded border border-line-strong bg-elevated overflow-hidden flex-shrink-0">
      <div className="absolute bg-fg/25" style={pos} />
    </div>
  )
}

export default function Step5_Spacing() {
  const { spacing, setSpacing, padding, setPadding, primaryColor, themes } = useDesignStore()

  // Infer the active base from step 1 so the chips reflect a saved 8px scale.
  const [baseUnit, setBaseUnit] = useState(() => pxToNum(spacing['1'] ?? '4px') || DEFAULT_BASE)

  const accentColor = themes.light?.primary || primaryColor || '#7f56d9'

  const valueOf = (step: string) => spacing[step] ?? `${Number(step) * baseUnit}px`
  const maxSpacingPx = Math.max(...SPACING_STEPS.map((s) => pxToNum(valueOf(s))), 1)

  function applyBase(base: number) {
    setBaseUnit(base)
    setSpacing(buildSpacingFromBase(base))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      <VariablesTable
        title="Spacing tokens"
        searchLabel="Filter spacing tokens"
        toolbar={
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-fg-faint">Base unit</span>
            <div className="flex gap-1">
              {BASE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyBase(p.value)}
                  className={`px-2.5 py-1 rounded text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                    baseUnit === p.value
                      ? 'bg-fg text-app'
                      : 'bg-surface text-fg-muted border border-line hover:border-line-strong hover:text-fg'
                  }`}
                >
                  {p.value}px
                </button>
              ))}
            </div>
          </div>
        }
        groups={[
          {
            label: 'Spacing scale',
            valueLabel: 'Value',
            rows: SPACING_STEPS.map((step) => {
              const value = valueOf(step)
              const standard = `${Number(step) * DEFAULT_BASE}px`
              const barW = (pxToNum(value) / maxSpacingPx) * 100
              return {
                name: `spacing-${step}`,
                value,
                modified: value !== standard,
                onChange: (v: string) => setSpacing({ ...spacing, [step]: v }),
                onReset: () => setSpacing({ ...spacing, [step]: standard }),
                preview: (
                  <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(barW, 2)}%`,
                        backgroundColor: accentColor + '88',
                      }}
                    />
                  </div>
                ),
              }
            }),
          },
          {
            // Per-side inset padded surfaces use (cards, tiles, panels) — the
            // same `padding` token Quick edit's Padding row writes.
            label: 'Surface padding',
            valueLabel: 'Value',
            rows: PADDING_SIDES.map((side) => {
              const value = padding?.[side.key] ?? PADDING_STANDARD
              return {
                name: `padding-${side.key}`,
                value,
                modified: value !== PADDING_STANDARD,
                onChange: (v: string) => setPadding({ ...padding, [side.key]: v }),
                onReset: () => setPadding({ ...padding, [side.key]: PADDING_STANDARD }),
                preview: <PaddingPreview side={side.key} value={value} />,
              }
            }),
          },
        ]}
      />
    </motion.div>
  )
}
