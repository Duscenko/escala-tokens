import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'
import {
  RADIUS_PRESETS,
  RADIUS_STANDARD,
  RADIUS_STEPS,
  matchRadiusPreset,
  scaleRadiusFromLg,
} from '../../lib/layoutTokens'

export { RADIUS_PRESETS, RADIUS_STEPS, matchRadiusPreset }

function CornerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 19V11C5 7.68629 7.68629 5 11 5H19" />
    </svg>
  )
}

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

export default function StepRadius({ tabBar }: { tabBar?: ReactNode } = {}) {
  const { radius, setRadius, primaryColor, themes } = useDesignStore()
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

  function scaleRoundness(lg: number) {
    const next = scaleRadiusFromLg(lg, radius)
    setRadius(next)
    setSelectedPreset(matchRadiusPreset(next))
  }

  const lgPx = pxToNum(radius.lg ?? '24px')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Preset</span>
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
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 pl-6 lg:pl-8 pr-3 py-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Scale roundness</span>
            <span className="text-[11px] font-mono text-fg-muted tabular-nums">lg · {radius.lg ?? '24px'}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={Math.min(lgPx, 40)}
              onChange={(e) => scaleRoundness(Number(e.target.value))}
              className="flex-1 min-w-0 accent-fg cursor-pointer"
              aria-label="Scale border radius"
            />
            <div
              className="flex-shrink-0 transition-all"
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.lg ?? '24px',
                backgroundColor: accentColor + '22',
                border: `1.5px solid ${accentColor}88`,
              }}
            />
          </div>
        </div>
      </div>

      <VariablesTable
        title="Radius tokens"
        searchLabel="Filter radius tokens"
        railed
        tabBar={tabBar}
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
