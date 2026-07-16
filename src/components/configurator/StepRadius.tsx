import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// Radius presets — each defines the full none→full ramp, named by personality.
export const RADIUS_PRESETS = [
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

export const RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'full'] as const

// The system standard the per-token reset returns to (the Soft preset — the
// same ramp makeDesignDefaults seeds).
const RADIUS_STANDARD: Record<string, string> = RADIUS_PRESETS[1].values

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

// Which preset (if any) the current radius map exactly matches.
export function matchRadiusPreset(radius: Record<string, string>): string | null {
  const hit = RADIUS_PRESETS.find((p) =>
    RADIUS_STEPS.every((s) => (radius[s] ?? '') === p.values[s]),
  )
  return hit?.label ?? null
}

export default function StepRadius() {
  const { radius, setRadius, primaryColor, themes } = useDesignStore()
  // No fallback: custom values show no preset selected, matching Quick edit.
  const [selectedPreset, setSelectedPreset] = useState<string | null>(() => matchRadiusPreset(radius))

  const accentColor = themes.light?.primary || primaryColor || '#7f56d9'

  function applyPreset(preset: (typeof RADIUS_PRESETS)[number]) {
    setSelectedPreset(preset.label)
    setRadius(preset.values)
  }

  function setStep(step: string, raw: string) {
    const next = { ...radius, [step]: raw }
    setRadius(next)
    setSelectedPreset(matchRadiusPreset(next))
  }

  // Grade the whole ramp from one handle: sm ≈ ⅓, md ≈ ⅔, lg = handle. `full`
  // stays pill. Keeps the scale proportional so a single drag reads as roundness.
  function scaleRoundness(lg: number) {
    const next = {
      ...radius,
      sm: `${Math.round(lg / 3)}px`,
      md: `${Math.round((lg * 2) / 3)}px`,
      lg: `${lg}px`,
    }
    setRadius(next)
    setSelectedPreset(matchRadiusPreset(next))
  }

  // The lg radius drives the slider — the one buttons & cards actually use.
  const lgPx = pxToNum(radius.lg ?? '12px')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Scale slider — grade the overall roundness in one move ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-faint uppercase tracking-wider">Scale roundness</span>
          <span className="text-xs font-mono text-fg-muted tabular-nums">lg · {radius.lg ?? '12px'}</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={Math.min(lgPx, 32)}
            onChange={(e) => scaleRoundness(Number(e.target.value))}
            className="flex-1 accent-fg cursor-pointer"
            aria-label="Scale border radius"
          />
          {/* Live shape that grows with the slider */}
          <div
            className="flex-shrink-0 transition-all"
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.lg ?? '12px',
              backgroundColor: accentColor + '22',
              border: `1.5px solid ${accentColor}88`,
            }}
          />
        </div>
      </div>

      {/* ── Variables table — Figma-style token rows ── */}
      <VariablesTable
        title="Radius tokens"
        searchLabel="Filter radius tokens"
        toolbar={
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-fg-faint">Preset</span>
            <div className="flex gap-1">
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                  className={`px-2.5 py-1 rounded text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                    selectedPreset === preset.label
                      ? 'bg-fg text-app'
                      : 'bg-surface text-fg-muted border border-line hover:border-line-strong hover:text-fg'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        }
        groups={[
          {
            valueLabel: 'Radius',
            rows: RADIUS_STEPS.map((step) => {
              const value = radius[step] ?? '0px'
              return {
                name: `radius-${step}`,
                value,
                modified: value !== RADIUS_STANDARD[step],
                onChange: (v: string) => setStep(step, v),
                onReset: () => setStep(step, RADIUS_STANDARD[step]),
                preview: (
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: value,
                      backgroundColor: accentColor + '22',
                      border: `1.5px solid ${accentColor}55`,
                    }}
                  />
                ),
              }
            }),
          },
        ]}
      />
    </motion.div>
  )
}
