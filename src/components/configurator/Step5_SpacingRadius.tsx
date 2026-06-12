import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'

// Base unit presets
const BASE_PRESETS = [
  { label: '4px  (default)', value: 4 },
  { label: '8px  (spacious)', value: 8 },
  { label: '5px  (5-grid)',   value: 5 },
]

// Radius presets
const RADIUS_PRESETS = [
  {
    label: 'Sharp',
    description: 'No rounding — sharp, precise',
    values: { none: '0px', sm: '2px', md: '4px', lg: '6px', full: '9999px' },
  },
  {
    label: 'Soft',
    description: 'Moderate rounding — balanced, modern',
    values: { none: '0px', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  },
  {
    label: 'Rounded',
    description: 'Generous rounding — friendly, approachable',
    values: { none: '0px', sm: '8px', md: '16px', lg: '24px', full: '9999px' },
  },
  {
    label: 'Pill',
    description: 'Very rounded — playful, consumer apps',
    values: { none: '0px', sm: '12px', md: '20px', lg: '32px', full: '9999px' },
  },
]

const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '10', '12', '16'] as const
const RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'full'] as const

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

export default function Step5_SpacingRadius() {
  const { spacing, radius, setSpacing, setRadius, primaryColor, themes } =
    useDesignStore()

  const [baseUnit, setBaseUnit] = useState(4)
  const [selectedRadiusPreset, setSelectedRadiusPreset] = useState<string | null>('Soft')
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

  function applyRadiusPreset(preset: (typeof RADIUS_PRESETS)[number]) {
    setSelectedRadiusPreset(preset.label)
    setRadius(preset.values)
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
                  className={`px-2.5 py-1 rounded text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                    baseUnit === p.value
                      ? 'bg-[#0088FF] text-white'
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
                    className="w-full bg-surface border border-line focus:border-[#0088FF] rounded px-2 py-1 text-xs font-mono text-fg outline-none transition-colors text-right"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Radius ── */}
      <div className="flex flex-col gap-5">
        <label className="text-sm text-fg-muted uppercase tracking-wide">Border Radius</label>

        {/* Preset cards */}
        <div className="grid grid-cols-2 gap-3">
          {RADIUS_PRESETS.map((preset) => {
            const isSelected = selectedRadiusPreset === preset.label
            return (
              <button
                key={preset.label}
                onClick={() => applyRadiusPreset(preset)}
                className={`p-4 rounded-xl text-left transition-all flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] ${
                  isSelected
                    ? 'bg-elevated ring-2 ring-[#0088FF]/50 border border-[#0088FF]/30'
                    : 'bg-surface border border-line hover:border-line-strong'
                }`}
              >
                {/* Shape previews */}
                <div className="flex items-end gap-2">
                  {(['sm', 'md', 'lg', 'full'] as const).map((step) => {
                    const r = preset.values[step]
                    const size = step === 'sm' ? 20 : step === 'md' ? 28 : step === 'lg' ? 36 : 28
                    return (
                      <div
                        key={step}
                        style={{
                          width: size,
                          height: size,
                          borderRadius: r,
                          backgroundColor: isSelected ? accentColor + '33' : 'var(--elevated)',
                          border: `1.5px solid ${isSelected ? accentColor + '88' : 'var(--line-strong)'}`,
                        }}
                      />
                    )
                  })}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isSelected ? 'text-fg' : 'text-fg-muted'}`}>
                    {preset.label}
                  </p>
                  <p className="text-xs text-fg-faint mt-0.5">{preset.description}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(preset.values).map(([k, v]) => (
                    <span key={k} className="text-[10px] font-mono text-fg-faint">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Custom fine-tune row */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-fg-faint uppercase tracking-wider">Fine-tune</span>
          <div className="grid grid-cols-5 gap-2">
            {RADIUS_STEPS.map((step) => (
              <div key={step} className="flex flex-col gap-1">
                <label className="text-[11px] text-fg-faint font-mono text-center">
                  {step}
                </label>
                <input
                  type="text"
                  value={radius[step] ?? '0px'}
                  onChange={(e) => setRadius({ ...radius, [step]: e.target.value })}
                  className="bg-surface border border-line focus:border-[#0088FF] rounded-lg px-2 py-1.5 text-xs font-mono text-fg outline-none transition-colors text-center"
                />
                {/* Mini shape preview */}
                <div
                  className="mx-auto mt-1"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius[step] ?? '0px',
                    backgroundColor: accentColor + '22',
                    border: `1.5px solid ${accentColor}55`,
                  }}
                />
              </div>
            ))}
          </div>
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
${RADIUS_STEPS.map((s) => `  --radius-${s}: ${radius[s] ?? '0px'};`).join('\n')}
}`}
        </pre>
      </motion.div>
    </motion.div>
  )
}
