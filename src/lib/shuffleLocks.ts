// Shuffle locks — the phone playground's "keep this, shuffle the rest"
// (`AboutInspectDemo`, plan: `design-plans/mobile-shuffle-playground.md`).
//
// A system is four independent decisions, and a lock is how the playground
// shows it without a word of copy: lock the colour, shuffle, and only type,
// shape and density move. Nothing here invents a value — a locked axis keeps
// the PREVIOUS system's own fields, the rest come from the dice.
//
// Every foundation key belongs to exactly one axis. `FOUNDATION_AXIS` is a
// full Record over `ThemeFoundationOverride`, so a new foundation does not
// compile until someone decides which lock holds it.

import type { ThemeFoundationOverride } from './themeFoundations'
import type { ThemeStylePreset } from './themePresets'

export type ShuffleAxis = 'color' | 'type' | 'shape' | 'density'

export const SHUFFLE_AXES: readonly ShuffleAxis[] = ['color', 'type', 'shape', 'density']

export const FOUNDATION_AXIS: Record<keyof ThemeFoundationOverride, ShuffleAxis> = {
  typography: 'type',
  spacing: 'density',
  padding: 'density',
  spacingRoles: 'density',
  sizes: 'density',
  sizeRoles: 'density',
  selector: 'density',
  selectorRoles: 'density',
  grid: 'density',
  gridFrame: 'density',
  breakpointRoles: 'density',
  radius: 'shape',
  radiusRoles: 'shape',
  radiusRoleViewports: 'shape',
  shadows: 'shape',
  shadowsDark: 'shape',
  stroke: 'shape',
  strokeRoles: 'shape',
  opacity: 'shape',
  iconWeight: 'shape',
  // A panel's fill is a surface decision — it travels with the colours.
  panelBackground: 'color',
}

/** The preset fields outside `foundations` that ARE the colour axis. */
const COLOR_FIELDS = ['accent', 'neutral', 'neutralTint', 'states', 'semantics', 'preferredAppearance'] as const

/**
 * `next` with every locked axis taken back from `prev`. A key the previous
 * system did not set stays unset, so a locked axis never inherits a value the
 * dice dealt for it.
 */
export function applyShuffleLocks(
  prev: ThemeStylePreset,
  next: ThemeStylePreset,
  locks: ReadonlySet<ShuffleAxis>,
): ThemeStylePreset {
  if (!locks.size) return next
  const out: ThemeStylePreset = { ...next, foundations: { ...next.foundations } }
  if (locks.has('color')) {
    for (const field of COLOR_FIELDS) {
      if (field in prev) (out as unknown as Record<string, unknown>)[field] = prev[field]
      else delete out[field]
    }
  }
  const foundations = out.foundations as Record<string, unknown>
  for (const [key, axis] of Object.entries(FOUNDATION_AXIS)) {
    if (!locks.has(axis)) continue
    const kept = (prev.foundations as Record<string, unknown>)[key]
    if (kept === undefined) delete foundations[key]
    else foundations[key] = kept
  }
  return out
}
