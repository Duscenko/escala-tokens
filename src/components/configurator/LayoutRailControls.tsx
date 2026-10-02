import { useState, type ReactNode } from 'react'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import RailSelect from '../ui/RailSelect'
import { RailControl } from './VariableCollectionRail'
import {
  RADIUS_PRESETS,
  SPACING_BASE_PRESETS,
  SPACING_DEFAULT_BASE,
  buildSpacingFromBase,
  concentricRadiusRoles,
  matchRadiusPreset,
  scaleRadiusFromLg,
  type LayoutFamily,
} from '../../lib/layoutTokens'

// The GLOBAL controls of a lengths foundation — the dials that regrade a whole
// ramp at once (Radius' preset and roundness, Spacing's base unit). They used to
// sit in the rail of the Scale table; with Scale gone, the semantics page is the
// foundation's only collection and these live in ITS rail, above the groups.
//
// They move the RAMP (the steps), so a role still on a step follows; a role the
// editor pinned to a Dimension primitive stays where it was put.

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

function CornerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 19V11C5 7.68629 7.68629 5 11 5H19" />
    </svg>
  )
}

function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 21V3M3 21V3M9 8v8M15 8v8" />
    </svg>
  )
}

function RadiusRailControls({ previewTheme }: { previewTheme?: string }) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const radius = foundations.radius
  // Regrading the ramp moves `radius.action`, and `radius.control` is the
  // radius of whatever sits FLUSH inside it — so it has to move with it or the
  // corners stop being concentric. `concentricRadiusRoles` only re-derives a
  // role that was still tracking, so a hand-picked one survives.
  const setRadius = (value: Record<string, string>) => patch({
    radius: value,
    radiusRoles: concentricRadiusRoles(radius, value, foundations.radiusRoles, foundations.spacing, foundations.spacingRoles),
  })
  const [selectedPreset, setSelectedPreset] = useState<string | null>(() => matchRadiusPreset(radius))
  const lgPx = pxToNum(radius.lg ?? '8px')

  return (
    <>
      <RailControl label="Preset">
        <RailSelect
          value={selectedPreset}
          options={RADIUS_PRESETS.map((p) => ({ value: p.label, label: p.label, description: p.description }))}
          onChange={(label) => {
            const preset = RADIUS_PRESETS.find((p) => p.label === label)
            if (!preset) return
            setSelectedPreset(preset.label)
            setRadius(preset.values)
          }}
          ariaLabel="Radius preset"
          icon={<CornerIcon />}
        />
      </RailControl>
      <RailControl label="Roundness" trailing={`lg · ${radius.lg ?? '8px'}`}>
        <input
          type="range"
          min={0}
          max={40}
          step={1}
          value={Math.min(lgPx, 40)}
          onChange={(e) => {
            const next = scaleRadiusFromLg(Number(e.target.value), radius)
            setRadius(next)
            setSelectedPreset(matchRadiusPreset(next))
          }}
          className="w-full accent-fg cursor-pointer"
          aria-label="Scale border radius"
        />
      </RailControl>
    </>
  )
}

function SpacingRailControls({ previewTheme }: { previewTheme?: string }) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const { spacing } = foundations
  const [baseUnit, setBaseUnit] = useState(() => pxToNum(spacing['1'] ?? '4px') || SPACING_DEFAULT_BASE)

  function applyBase(base: number) {
    setBaseUnit(base)
    const next = buildSpacingFromBase(base)
    // Surface inset aliases spacing-5 — keep the four sides on that step.
    const inset = next['5']
    patch({ spacing: next, padding: { top: inset, right: inset, bottom: inset, left: inset } })
  }

  return (
    <RailControl label="Base unit">
      <RailSelect
        value={baseUnit}
        options={SPACING_BASE_PRESETS.map((p) => ({ value: p.value, label: p.label.replace(/\s+/g, ' ') }))}
        onChange={applyBase}
        ariaLabel="Spacing base unit"
        icon={<RulerIcon />}
      />
    </RailControl>
  )
}

/** The global controls for a foundation's rail, or `null` when it has none
 *  (Sizes, Stroke and Grid are tuned role by role). */
export function railControlsFor(family: LayoutFamily, previewTheme?: string): ReactNode | null {
  if (family === 'radius') return <RadiusRailControls previewTheme={previewTheme} />
  if (family === 'spacing') return <SpacingRailControls previewTheme={previewTheme} />
  return null
}
