import type { TypeRoleModes } from './typeRoles'
import { completeRadiusScale, type GridFrameModes, type RadiusRoleViewports } from './layoutTokens'
import type { PhosphorWeight } from './phosphorIcons'
import type { MotionSettings } from './motion'

export interface ThemeTypographyTokens {
  fontFamily: string
  headingFontFamily: string
  sizes: Record<string, string>
  lineHeights: Record<string, string>
  weights: Record<string, number>
  roles: Record<string, TypeRoleModes>
}

/**
 * A style theme may override any existing foundation collection. Values keep
 * the exact same shape and token names as the global collections; this is a
 * theme-scoped layer over the current pipeline, not a second vocabulary.
 */
export interface ThemeFoundationOverride {
  typography?: ThemeTypographyTokens
  spacing?: Record<string, string>
  padding?: Record<string, string>
  radius?: Record<string, string>
  opacity?: Record<string, string>
  shadows?: Record<string, string>
  /** This theme's DARK elevation ramp, when it was picked apart from the light
   *  one. Absent = derived from `shadows` (see `darkShadowsOf`). */
  shadowsDark?: Record<string, string>
  grid?: Record<string, string>
  sizes?: Record<string, string>
  selector?: Record<string, string>
  stroke?: Record<string, string>
  radiusRoles?: Record<string, string>
  spacingRoles?: Record<string, string>
  sizeRoles?: Record<string, string>
  selectorRoles?: Record<string, string>
  strokeRoles?: Record<string, string>
  breakpointRoles?: Record<string, string>
  gridFrame?: GridFrameModes
  /** Hand-set radius role values on Tablet / Mobile (see RadiusRoleViewports). */
  radiusRoleViewports?: RadiusRoleViewports
  panelBackground?: 'solid' | 'translucent' | 'page'
  /** Phosphor icon weight this style renders glyphs at — thin…duotone. */
  iconWeight?: PhosphorWeight
  /** How this brand moves (lib/motion.ts): duration factor, role picks,
   *  transforms, stagger. Picked as a whole (a preset, or one role edited). */
  motion?: MotionSettings
}

export interface FoundationSource extends ThemeFoundationOverride {
  typography: ThemeTypographyTokens
  spacing: Record<string, string>
  padding: Record<string, string>
  radius: Record<string, string>
  opacity: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  sizes: Record<string, string>
  selector: Record<string, string>
  stroke: Record<string, string>
  radiusRoles: Record<string, string>
  spacingRoles: Record<string, string>
  sizeRoles: Record<string, string>
  selectorRoles: Record<string, string>
  strokeRoles: Record<string, string>
  breakpointRoles: Record<string, string>
  gridFrame: GridFrameModes
  radiusRoleViewports?: RadiusRoleViewports
  panelBackground: 'solid' | 'translucent' | 'page'
  iconWeight: PhosphorWeight
  motion: MotionSettings
  themeFoundations?: Record<string, ThemeFoundationOverride>
}

function mergeMap(base: Record<string, string>, override?: Record<string, string>) {
  return override ? { ...base, ...override } : base
}

/** Resolve one theme onto the global foundations, preserving global fallback. */
export function resolveThemeFoundations(source: FoundationSource, themeKey: string): FoundationSource {
  const override = source.themeFoundations?.[themeKey]
  if (!override) return source
  const typography = override.typography
    ? {
        ...source.typography,
        ...override.typography,
        sizes: mergeMap(source.typography.sizes, override.typography.sizes),
        lineHeights: mergeMap(source.typography.lineHeights, override.typography.lineHeights),
        weights: { ...source.typography.weights, ...override.typography.weights },
        roles: { ...source.typography.roles, ...override.typography.roles },
      }
    : source.typography

  return {
    ...source,
    typography,
    spacing: mergeMap(source.spacing, override.spacing),
    padding: mergeMap(source.padding, override.padding),
    radius: completeRadiusScale(mergeMap(source.radius, override.radius)),
    opacity: mergeMap(source.opacity, override.opacity),
    shadows: mergeMap(source.shadows, override.shadows),
    // Only this theme's own pick: a global light ramp never carries a dark one.
    shadowsDark: override.shadowsDark,
    grid: mergeMap(source.grid, override.grid),
    sizes: mergeMap(source.sizes, override.sizes),
    selector: mergeMap(source.selector, override.selector),
    stroke: mergeMap(source.stroke, override.stroke),
    radiusRoles: mergeMap(source.radiusRoles, override.radiusRoles),
    spacingRoles: mergeMap(source.spacingRoles, override.spacingRoles),
    sizeRoles: mergeMap(source.sizeRoles, override.sizeRoles),
    selectorRoles: mergeMap(source.selectorRoles, override.selectorRoles),
    strokeRoles: mergeMap(source.strokeRoles, override.strokeRoles),
    breakpointRoles: mergeMap(source.breakpointRoles, override.breakpointRoles),
    gridFrame: override.gridFrame ?? source.gridFrame,
    radiusRoleViewports: override.radiusRoleViewports ?? source.radiusRoleViewports,
    panelBackground: override.panelBackground ?? source.panelBackground,
    iconWeight: override.iconWeight ?? source.iconWeight,
    motion: override.motion ?? source.motion,
  }
}

