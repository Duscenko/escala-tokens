import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'

// Corner glyph — the same mark the foundation rail uses for this section, so
// the preset trigger reads as "border radius" at a glance.
function CornerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 19V11C5 7.68629 7.68629 5 11 5H19" />
    </svg>
  )
}

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

// The system standard the per-token reset returns to (the Rounded preset —
// the same ramp makeDesignDefaults seeds). Keep this index and the store's
// default `radius` in sync — they're deliberately the same ramp so "fresh
// system" and "reset to standard" never disagree.
const RADIUS_STANDARD: Record<string, string> = RADIUS_PRESETS[2].values

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

  const accentColor = themes.light?.primary || primaryColor || '#9522e9'

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
    // Three rows, the same shape ColorPrimitives / StepGradients / Typography
    // use — a 198px labelled control cell over a 198px gutter, against a flush
    // table. It used to be a `p-8` stack (slider block, then a full-bleed
    // table), so this section's left edge sat 32px in and matched nothing.
    // No enter animation either: the other foundation tables dropped theirs.
    <div className="h-full flex flex-col">
      {/* ── Row 1 — the preset that defines the ramp | what it produces ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Preset</span>
          {/* "Custom" when the ramp matches no preset — the old pill row just
              showed nothing selected, which read as "no preset applied yet". */}
          <RailSelect
            value={selectedPreset}
            options={RADIUS_PRESETS.map((p) => ({ value: p.label, label: p.label, description: p.description }))}
            onChange={(label) => {
              const preset = RADIUS_PRESETS.find((p) => p.label === label)
              if (preset) applyPreset(preset)
            }}
            ariaLabel="Radius preset"
            icon={<CornerIcon />}
          />
        </div>
        {/* pr-3 clearance on the right edge — same as every other row 1. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 pl-6 lg:pl-8 pr-3 py-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Scale roundness</span>
            <span className="text-[11px] font-mono text-fg-muted tabular-nums">lg · {radius.lg ?? '12px'}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={32}
              step={1}
              value={Math.min(lgPx, 32)}
              onChange={(e) => scaleRoundness(Number(e.target.value))}
              className="flex-1 min-w-0 accent-fg cursor-pointer"
              aria-label="Scale border radius"
            />
            {/* Live shape that grows with the slider */}
            <div
              className="flex-shrink-0 transition-all"
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.lg ?? '12px',
                backgroundColor: accentColor + '22',
                border: `1.5px solid ${accentColor}88`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Rows 2+3 — the table, with the 198px gutter that keeps its left
          edge on the same line as Color's and Typography's navs. ── */}
      <VariablesTable
        title="Radius tokens"
        searchLabel="Filter radius tokens"
        railed
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
    </div>
  )
}
