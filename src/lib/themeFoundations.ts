import type { TypeRoleModes } from './typeRoles'
import { completeRadiusScale, type GridFrameModes } from './layoutTokens'

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
  panelBackground?: 'solid' | 'translucent' | 'page'
  /** How a style paints a DESTRUCTIVE or CONFIRMING action — see `StatusAction`. */
  statusAction?: 'soft' | 'solid'
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
  panelBackground: 'solid' | 'translucent' | 'page'
  statusAction: 'soft' | 'solid'
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
    panelBackground: override.panelBackground ?? source.panelBackground,
    statusAction: override.statusAction ?? source.statusAction,
  }
}

