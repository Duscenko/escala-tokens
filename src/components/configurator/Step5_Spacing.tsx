import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'

// Base unit presets
const BASE_PRESETS = [
  { label: '4px  (default)', value: 4 },
  { label: '8px  (spacious)', value: 8 },
  { label: '5px  (5-grid)',   value: 5 },
]

const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '10', '12', '16'] as const

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

function buildSpacingFromBase(base: number): Record<string, string> {
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

export default function Step5_Spacing() {
  const { spacing, setSpacing, padding, setPadding, primaryColor, themes } = useDesignStore()

  const [baseUnit, setBaseUnit] = useState(4)
  const [editingSpacing, setEditingSpacing] = useState<Record<string, string>>(spacing)

  // Max bar width relative to largest value
  const maxSpacingPx = Math.max(...Object.values(editingSpacing).map(pxToNum))

  function applyBase(base: number) {
    setBaseUnit(base)
    const next = buildSpacingFromBase(base)
    setEditingSpacing(next)
    setSpacing(next)
  }

  function handleSpacingInput(step: string, raw: string) {
    const next = { ...editingSpacing, [step]: raw }
    setEditingSpacing(next)
    setSpacing(next)
  }

  const accentColor = themes.light?.primary || primaryColor || '#7f56d9'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-12"
    >
      {/* ── Spacing ── */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <label className="text-sm text-fg-muted uppercase tracking-wide">Spacing Scale</label>
          {/* Base unit picker */}
          <div className="flex items-center gap-2">
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
        </div>

        {/* Scale rows */}
        <div className="flex flex-col gap-2">
          {SPACING_STEPS.map((step, i) => {
            const val = editingSpacing[step] ?? `${Number(step) * baseUnit}px`
            const px = pxToNum(val)
            const barW = maxSpacingPx > 0 ? (px / maxSpacingPx) * 100 : 0

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3"
              >
                {/* Step label */}
                <span className="text-xs font-mono text-fg-faint w-5 text-right flex-shrink-0">
                  {step}
                </span>

                {/* Bar */}
                <div className="flex-1 h-6 bg-surface rounded-md overflow-hidden relative">
                  <motion.div
                    layout
                    className="h-full rounded-md"
                    style={{
                      width: `${Math.max(barW, 2)}%`,
                      backgroundColor: accentColor + '55',
                      borderRight: `2px solid ${accentColor}`,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>

                {/* Editable value */}
                <div className="w-20 flex-shrink-0">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleSpacingInput(step, e.target.value)}
                    className="w-full bg-surface border border-line focus:border-fg rounded px-2 py-1 text-xs font-mono text-fg outline-none transition-colors text-right"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Surface padding ── the per-side inset padded surfaces use (cards,
          tiles, panels). Same `padding` token Quick edit's Padding row writes. */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-fg-muted uppercase tracking-wide">Surface padding</label>
          <p className="text-xs text-fg-faint">Per-side inset for padded surfaces — cards, tiles, panels. Exported as <code className="font-mono">--padding-*</code>.</p>
        </div>
        <div className="grid grid-cols-4 gap-3 max-w-md">
          {PADDING_SIDES.map((side) => {
            const raw = padding?.[side.key] ?? '20px'
            const value = parseInt(raw, 10)
            return (
              <label key={side.key} className="flex flex-col gap-1.5">
                <span className="text-xs text-fg-faint">{side.label}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={Number.isFinite(value) ? value : 20}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(99, Number(e.target.value) || 0))
                    setPadding({ ...padding, [side.key]: `${n}px` })
                  }}
                  aria-label={`Surface padding ${side.label.toLowerCase()}`}
                  className="w-full bg-surface border border-line focus:border-fg rounded px-2 py-1.5 text-xs font-mono text-fg outline-none transition-colors text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* ── Token preview ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg bg-surface border border-line p-4"
      >
        <p className="text-xs text-fg-faint uppercase tracking-wider mb-3">Token preview</p>
        <pre className="text-xs font-mono leading-relaxed text-fg-muted overflow-x-auto">
{`:root {
${SPACING_STEPS.map(
  (s) => `  --spacing-${s}: ${editingSpacing[s] ?? `${Number(s) * baseUnit}px`};`
).join('\n')}
}`}
        </pre>
      </motion.div>
    </motion.div>
  )
}
