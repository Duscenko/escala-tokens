import { useDesignStore, SHADOW_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'

// Elevation glyph — the same mark the foundation rail uses for Shadow, so the
// preset trigger reads as "shadow" at a glance.
function ElevationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="13" height="13" rx="2" />
      <path d="M8 21h11a2 2 0 0 0 2-2V8" />
    </svg>
  )
}

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
  const activePreset = matchShadowPreset(shadows)

  return (
    // Same three rows as Radius — Shadow has a genuine global control (the
    // elevation preset), so row 1 pairs it with what it produces. The preset
    // moved out of VariablesTable's `toolbar`, where four pills competed with
    // search for the row on a narrow window.
    <div className="h-full flex flex-col">
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Preset</span>
          <RailSelect
            value={activePreset}
            options={SHADOW_PRESETS.map((p) => ({ value: p.label, label: p.label, description: p.description }))}
            onChange={(label) => {
              const preset = SHADOW_PRESETS.find((p) => p.label === label)
              if (preset) setShadows(preset.values)
            }}
            ariaLabel="Shadow preset"
            icon={<ElevationIcon />}
          />
        </div>
        {/* What the preset produces — the whole ramp on one line. This replaces
            the 3x2 grid of h-20 cards that used to sit below the table: same
            information, and it now sits NEXT TO the control that changes it,
            which is the job row 1's right cell does on every foundation. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 pl-6 lg:pl-8 pr-3 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Elevation</span>
          <div className="flex items-center gap-3">
            {SHADOW_STEPS.map((step) => (
              <div key={step} className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
                <div
                  className="w-full h-8 rounded-lg bg-surface border border-line/40"
                  style={{ boxShadow: shadows[step] ?? 'none' }}
                />
                <span className="text-[9px] font-mono text-fg-faint">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <VariablesTable
        title="Shadow tokens"
        searchLabel="Filter shadow tokens"
        wideValues
        railed
        groups={[
          {
            valueLabel: 'Shadow',
            rows: SHADOW_STEPS.map((step) => {
              const value = shadows[step] ?? 'none'
              const standard = SHADOW_DEFAULT[step]
              return {
                name: `shadow-${step}`,
                value,
                modified: standard !== undefined && value !== standard,
                onChange: (v: string) => setShadows({ ...shadows, [step]: v }),
                onReset: () => setShadows({ ...shadows, [step]: standard ?? value }),
                preview: (
                  <div
                    className="w-9 h-9 rounded-lg bg-surface border border-line/40 flex-shrink-0"
                    style={{ boxShadow: value }}
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
