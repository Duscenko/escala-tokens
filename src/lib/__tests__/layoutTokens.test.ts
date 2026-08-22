import { describe, expect, it } from 'vitest'
import {
  LAYOUT_ROLES,
  PADDING_STANDARD,
  RADIUS_STANDARD,
  RADIUS_STEPS,
  SIZE_STANDARD,
  SPACING_STANDARD,
  SPACING_STEPS,
  STROKE_STANDARD,
  BREAKPOINT_STANDARD,
  BREAKPOINT_STEPS,
  GRID_FRAME_STANDARD,
  GRID_STANDARD,
  allLayoutRoleCssVars,
  buildSpacingFromBase,
  defaultLayoutRoles,
  layoutPrimitiveVar,
  layoutRoleIsDefault,
  layoutRoleVar,
  mergeGridFrame,
  mergeLayoutRoles,
  nearestSpacingStep,
  breakpointMobileMax,
  resolveGridFrame,
  resolveLayoutRole,
  scaleRadiusFromLg,
} from '../layoutTokens'

describe('layout primitives', () => {
  it('Rounded radius is a 7-step ramp with xs and xl', () => {
    expect(RADIUS_STEPS).toEqual(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full'])
    expect(RADIUS_STANDARD).toEqual({
      none: '0px', xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '9999px',
    })
  })

  it('grades the radius ramp from lg using Rounded ratios', () => {
    expect(scaleRadiusFromLg(24)).toMatchObject({
      xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px',
    })
  })

  it('spacing is a 4px grid including 0 and 5 (20px)', () => {
    expect(SPACING_STEPS).toEqual(['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'])
    expect(SPACING_STANDARD['0']).toBe('0px')
    expect(SPACING_STANDARD['5']).toBe('20px')
    expect(SPACING_STANDARD['16']).toBe('64px')
    expect(PADDING_STANDARD.top).toBe('20px')
    expect(buildSpacingFromBase(8)['5']).toBe('40px')
  })

  it('size stays on an 8px control ramp; stroke is 0/1/2/4', () => {
    expect(SIZE_STANDARD).toEqual({
      xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '56px', '2xl': '64px',
    })
    expect(STROKE_STANDARD).toEqual({ none: '0px', sm: '1px', md: '2px', lg: '4px' })
  })
})

describe('layout semantics', () => {
  it('default aliases only point at primitive steps', () => {
    const radius = defaultLayoutRoles('radius')
    expect(radius.action).toBe('md')
    expect(radius.control).toBe('xs')
    expect(radius.overlay).toBe('xl')
    expect(radius.pill).toBe('full')
    expect(defaultLayoutRoles('spacing')['inset-surface']).toBe('5')
    expect(defaultLayoutRoles('size').control).toBe('md')
    expect(defaultLayoutRoles('stroke').focus).toBe('md')
    expect(defaultLayoutRoles('stroke').divider).toBe('sm')
  })

  it('every default alias exists on that family\'s primitive scale', () => {
    for (const [family, roles] of Object.entries(LAYOUT_ROLES)) {
      const steps = new Set(
        family === 'radius' ? RADIUS_STEPS
        : family === 'spacing' ? SPACING_STEPS
        : family === 'size' ? Object.keys(SIZE_STANDARD)
        : family === 'breakpoint' ? BREAKPOINT_STEPS
        : Object.keys(STROKE_STANDARD),
      )
      for (const role of roles) {
        expect(steps.has(role.primitive), `${family}-${role.key} → ${role.primitive}`).toBe(true)
      }
    }
  })

  it('merge keeps a valid edit, drops unknown keys, repairs a stale step', () => {
    const stored = mergeLayoutRoles('radius', {
      action: 'lg',
      madeUp: 'md',
      pill: 'nope',
    } as Record<string, string>)
    expect(stored.action).toBe('lg')
    expect(stored.madeUp).toBeUndefined()
    expect(stored.pill).toBe('full')
    expect(Object.keys(stored)).toHaveLength(LAYOUT_ROLES.radius.length)
    expect(layoutRoleIsDefault('radius', 'action', 'lg')).toBe(false)
    expect(layoutRoleIsDefault('radius', 'pill', 'full')).toBe(true)
  })

  it('resolves through the primitive map, never inventing px', () => {
    const roles = mergeLayoutRoles('spacing', { 'inset-surface': '6' })
    expect(resolveLayoutRole('spacing', roles, SPACING_STANDARD, 'inset-surface')).toBe('24px')
    expect(resolveLayoutRole('radius', defaultLayoutRoles('radius'), RADIUS_STANDARD, 'action')).toBe('16px')
    expect(resolveLayoutRole('stroke', defaultLayoutRoles('stroke'), STROKE_STANDARD, 'focus')).toBe('2px')
  })

  it('CSS aliases primitive vars, not raw px', () => {
    expect(layoutRoleVar('radius', 'action')).toBe('--radius-action')
    expect(layoutPrimitiveVar('radius', 'md')).toBe('var(--radius-md)')
    const css = allLayoutRoleCssVars({
      radius: defaultLayoutRoles('radius'),
      spacing: defaultLayoutRoles('spacing'),
      size: defaultLayoutRoles('size'),
      stroke: defaultLayoutRoles('stroke'),
      breakpoint: defaultLayoutRoles('breakpoint'),
    }).join('\n')
    expect(css).toContain('--radius-action: var(--radius-md);')
    expect(css).toContain('--spacing-inset-surface: var(--spacing-5);')
    expect(css).toContain('--size-control: var(--size-md);')
    expect(css).toContain('--stroke-focus: var(--stroke-md);')
    expect(css).toContain('--breakpoint-desktop: var(--breakpoint-md);')
    expect(css).toContain('--breakpoint-mobile: calc(var(--breakpoint-md) - 1px);')
    expect(css).not.toMatch(/--breakpoint-mobile:\s*767/)
    expect(css).not.toMatch(/--radius-action:\s*\d/)
  })

  it('nearest spacing step maps 20px onto 5', () => {
    expect(nearestSpacingStep(SPACING_STANDARD, 20)).toBe('5')
    expect(nearestSpacingStep(SPACING_STANDARD, 18)).toBe('5')
    expect(nearestSpacingStep(SPACING_STANDARD, 16)).toBe('4')
  })
})

describe('breakpoint + grid frame', () => {
  it('desktop aliases md; mobile max is 767 on the standard ramp', () => {
    expect(BREAKPOINT_STEPS).toEqual(['sm', 'md', 'lg', 'xl', '2xl'])
    expect(BREAKPOINT_STANDARD.md).toBe('768px')
    expect(defaultLayoutRoles('breakpoint').desktop).toBe('md')
    expect(defaultLayoutRoles('breakpoint').mobile).toBe('md')
    expect(breakpointMobileMax(defaultLayoutRoles('breakpoint'), BREAKPOINT_STANDARD)).toBe('767px')
  })

  it('desktop frame matches the previous global grid; mobile is 4-col', () => {
    expect(GRID_STANDARD.columns).toBe('12')
    expect(GRID_STANDARD.gutter).toBe('24px')
    expect(GRID_STANDARD.margin).toBe('32px')
    expect(GRID_STANDARD.container).toBe('1280px')
    const mobile = resolveGridFrame('mobile', GRID_FRAME_STANDARD, SPACING_STANDARD, BREAKPOINT_STANDARD)
    expect(mobile.columns).toBe(4)
    expect(mobile.gutter).toBe('16px')
    expect(mobile.margin).toBe('16px')
    expect(mobile.container).toBe('none')
  })

  it('merge repairs a stale container step', () => {
    const mixed = mergeGridFrame({
      desktop: { columns: '12', gutter: '6', margin: '8', container: 'nope' },
      mobile: { columns: '3', gutter: '4', margin: '4', container: 'none' },
    } as ReturnType<typeof mergeGridFrame>)
    expect(mixed.desktop.container).toBe('xl')
    expect(mixed.mobile.columns).toBe('4')
  })
})
