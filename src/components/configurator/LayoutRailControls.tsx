import { useState, type ReactNode } from 'react'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import RailSelect from '../ui/RailSelect'
import { radiusPresetOptions } from './radiusPresetOptions'
import { RailControl } from './VariableCollectionRail'
import {
  SPACING_BASE_PRESETS,
  SPACING_DEFAULT_BASE,
  buildSpacingFromBase,
  matchRadiusRolePreset,
  radiusPresetPatch,
  type LayoutFamily,
} from '../../lib/layoutTokens'

// The GLOBAL controls of a lengths foundation — Radius' preset (a bundle of
// the three axis picks on the standard ramp) and Spacing's base unit (regrades
// the spacing ramp). Radius had a free
// Roundness slider too; it was removed because it lands between the four
// presets on a "Custom" ramp nobody chose, which read as breaking them. A
// specific corner is set per role in the table instead. They used to
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
  // A preset is a bundle of the three axis picks ON the standard ramp
  // (RADIUS_ROLE_PRESETS) — read straight off the roles, so the select and the
  // Boxes / Fields / Selectors rows can never disagree.
  const selectedPreset = matchRadiusRolePreset(foundations.radiusRoles)

  return (
    <>
      <RailControl label="Preset">
        <RailSelect
          value={selectedPreset}
          options={radiusPresetOptions()}
          onChange={(label) => {
            const next = radiusPresetPatch(label, foundations.radiusRoles)
            if (next) patch(next)
          }}
          ariaLabel="Radius preset"
          icon={<CornerIcon />}
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
