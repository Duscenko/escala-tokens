import { type ReactNode } from 'react'
import { SHADOW_DEFAULT } from '../../store/useDesignStore'
import { darkShadow } from '../../lib/colorUtils'
import { useTheme } from '../../lib/theme'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'
import { RailControl } from './VariableCollectionRail'
import { SHADOW_PRESETS, SHADOW_STEPS, matchShadowPreset } from '../../lib/shadowTokens'
import { useThemeFoundations } from '../../lib/useThemeFoundations'

export { SHADOW_PRESETS, SHADOW_STEPS, matchShadowPreset }

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
export default function Step7_Shadow({ tabBar, query, previewTheme }: { tabBar?: ReactNode; query?: string; previewTheme?: string } = {}) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const shadows = foundations.shadows
  const setShadows = (value: Record<string, string>) => patch({ shadows: value })
  const activePreset = matchShadowPreset(shadows)
  // These swatches sit on CHROME surfaces (`bg-surface`), so they follow the
  // chrome theme, not `previewTheme`. Without this they rendered the light
  // ramp on a dark chrome — where the shadow colour IS the background, so the
  // whole strip and every row preview showed nothing at all. You cannot edit a
  // token you cannot see; `darkShadow` is the same derivation the preview and
  // the export use, so what's shown here is what ships.
  const chromeDark = useTheme() === 'dark'
  const swatch = (value: string) => (chromeDark ? darkShadow(value) : value)

  return (
    // Preset in the rail, ramp in the footer, per-step swatch in the Preview
    // column — the same three slots every other foundation uses. It used to
    // hand-roll a full-width band above the table whose 198px label cell missed
    // the 240px rail by 42px, and whose taller right cell made even Radius'
    // identical band start 18px lower than this one.
    <div className="h-full flex flex-col">
      <VariablesTable
        title="Shadow tokens"
        searchLabel="Filter shadow tokens"
        wideValues
        railed
        tabBar={tabBar}
        query={query}
        railBody={
          <RailControl label="Preset">
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
          </RailControl>
        }
        // Elevation is only judgeable by COMPARING steps, and `wideValues`
        // leaves the Preview column 90px — too little for a 24px-blur 2xl. The
        // ramp therefore keeps a specimen of its own, in the slot Sizes already
        // puts one: inside the table's scroll column, under the rows it shows.
        footer={
          <div className="flex flex-col gap-3">
            <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Elevation</span>
            <div className="flex items-stretch gap-4 rounded-xl border border-line bg-app p-6">
              {SHADOW_STEPS.map((step) => (
                <div key={step} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                  <div
                    className="w-full h-12 rounded-lg bg-surface"
                    style={{ boxShadow: swatch(shadows[step] ?? 'none') }}
                  />
                  <span className="text-caption font-mono text-fg-faint">{step}</span>
                </div>
              ))}
            </div>
          </div>
        }
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
                    className="w-9 h-9 rounded-lg bg-surface border border-line flex-shrink-0"
                    style={{ boxShadow: swatch(value) }}
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
