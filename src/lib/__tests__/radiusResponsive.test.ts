import { describe, expect, it } from 'vitest'
import {
  BREAKPOINT_STANDARD,
  GRID_FRAME_STANDARD,
  LEGACY_RADIUS_WORKING_STEPS,
  RADIUS_RESPONSIVE,
  RADIUS_RESPONSIVE_STEPS,
  RADIUS_STANDARD,
  SPACING_STANDARD,
  defaultLayoutRoles,
  gridFrameMediaCss,
  radiusAtViewport,
  renameRadiusV77,
  radiusTokensByRoleGroup,
  radiusRoleAt,
  setRadiusRoleViewport,
  radiusRolesViewportCss,
  rolesUsingRadiusToken,
  resolveLayoutRole,
  scaleRadiusFromLg,
  type GridViewport,
} from '../layoutTokens'
import { generateTokenJSON } from '../tokenGenerator'

const px = (v: string) => parseFloat(v)

// The Corner Radius reference: eleven static steps.
const CORNER_RADIUS = {
  none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, '5xl': 48, full: 9999,
}

// The Responsive Radius reference: ten tokens × Desktop / Tablet / Mobile, px.
const RESPONSIVE: Record<string, [number, number, number]> = {
  none: [0, 0, 0],
  sm: [4, 2, 2],
  md: [6, 4, 4],
  lg: [8, 6, 6],
  xl: [12, 8, 8],
  '2xl': [16, 12, 12],
  '3xl': [24, 16, 12],
  '4xl': [32, 24, 16],
  '5xl': [48, 32, 24],
  full: [9999, 9999, 9999],
}

const VPS: GridViewport[] = ['desktop', 'tablet', 'mobile']

describe('Corner radius', () => {
  it('the standard ramp is the Corner Radius table', () => {
    expect(Object.fromEntries(Object.entries(RADIUS_STANDARD).map(([k, v]) => [k, px(v)]))).toEqual(CORNER_RADIUS)
  })

  it('ten responsive tokens step down per the reference', () => {
    expect([...RADIUS_RESPONSIVE_STEPS]).toEqual(Object.keys(RESPONSIVE))
    for (const step of RADIUS_RESPONSIVE_STEPS) {
      const got = VPS.map((vp) => px(RADIUS_STANDARD[RADIUS_RESPONSIVE[step][vp]]))
      expect(got, step).toEqual(RESPONSIVE[step])
    }
  })

  // The Escala Figma file (owner decision 2026-11-11): radius ROLES hold one
  // value on every viewport — a card is 16 / 16 / 16, a button 12 / 12 / 12,
  // a checkbox 8 / 8 / 8. The responsive TOKENS above still step down.
  it('roles do not follow it: a card is 16 everywhere, a button 12, a checkbox 8', () => {
    const roles = defaultLayoutRoles('radius')
    const at = (role: string, vp: GridViewport) =>
      px(resolveLayoutRole('radius', { ...roles, [role]: radiusRoleAt(roles, {}, role, vp) }, RADIUS_STANDARD, role))
    expect(VPS.map((vp) => at('container', vp))).toEqual([16, 16, 16])
    expect(VPS.map((vp) => at('action', vp))).toEqual([12, 12, 12])
    expect(VPS.map((vp) => at('control', vp))).toEqual([8, 8, 8])
    // A pinned primitive and the xs floor hold one value everywhere.
    expect(radiusAtViewport('dimension-10', 'mobile')).toBe('dimension-10')
    expect(radiusAtViewport('xs', 'mobile')).toBe('xs')
  })

  it('CSS keeps the roles out of the tablet and mobile blocks', () => {
    const css = gridFrameMediaCss(defaultLayoutRoles('breakpoint'), { ...BREAKPOINT_STANDARD }, GRID_FRAME_STANDARD, SPACING_STANDARD, {
      roles: defaultLayoutRoles('radius'), radius: RADIUS_STANDARD,
    })
    const [tablet, mobile] = css.split('@media').slice(1)
    for (const block of [tablet, mobile]) {
      expect(block).not.toContain('--radius-container:')
      expect(block).not.toContain('--radius-action:')
      expect(block).not.toContain('--radius-control:')
    }
    expect(css).not.toContain('--radius-pill')
  })

  it('tokens.json ships every role on Tablet and Mobile, resolved', () => {
    const doc = generateTokenJSON() as unknown as { radiusRoles: Record<string, string>; radiusRoleViewports: Record<string, Record<string, string>> }
    expect(doc.radiusRoleViewports.tablet).toEqual(doc.radiusRoles)
    expect(doc.radiusRoleViewports.mobile).toEqual(doc.radiusRoles)
  })

  it('tokens.json ships the responsive table', () => {
    const doc = generateTokenJSON() as unknown as { radiusResponsive: typeof RADIUS_RESPONSIVE }
    expect(doc.radiusResponsive['3xl']).toEqual({ desktop: '3xl', tablet: '2xl', mobile: 'xl' })
  })
})

describe('store v77 rename', () => {
  // Every pre-v77 preset ramp (graded from lg 8 / 12 / 16 / 24) with roles on
  // every old axis step: the rename must not move a single resolved pixel.
  const OLD_STEPS = ['none', 'xs', 'sm', 'lg', '2xl', 'full']
  it.each([8, 12, 16, 24])('keeps every role pixel at old lg %d', (lg) => {
    const oldRamp: Record<string, string> = {}
    for (const s of ['none', ...LEGACY_RADIUS_WORKING_STEPS, 'full']) oldRamp[s] = scaleRadiusFromLg(lg)[s]
    for (const step of [...OLD_STEPS, 'md', 'xl', '3xl', '4xl']) {
      const slot = { radius: { ...oldRamp }, radiusRoles: { container: step } }
      const before = resolveLayoutRole('radius', slot.radiusRoles, oldRamp, 'container')
      renameRadiusV77(slot)
      expect(resolveLayoutRole('radius', slot.radiusRoles, slot.radius, 'container'), `${lg}:${step}`).toBe(before)
    }
  })

  it('the old default ramp lands exactly on the Corner Radius table', () => {
    const slot = { radius: Object.fromEntries(['none', ...LEGACY_RADIUS_WORKING_STEPS, 'full'].map((s) => [s, scaleRadiusFromLg(16)[s]])) }
    renameRadiusV77(slot)
    expect(Object.fromEntries(Object.entries(slot.radius).map(([k, v]) => [k, px(v)]))).toEqual(CORNER_RADIUS)
  })

  it('a theme override with roles only reads the system ramp for a dropped step', () => {
    const systemRamp = scaleRadiusFromLg(16)
    const slot: { radiusRoles: Record<string, string> } = { radiusRoles: { container: '4xl', action: 'sm' } }
    renameRadiusV77(slot, systemRamp)
    expect(slot.radiusRoles).toEqual({ container: 'dimension-64', action: 'lg' })
  })
})

describe('role ↔ responsive token links (the two editor collections)', () => {
  it('names the roles behind each token', () => {
    const roles = defaultLayoutRoles('radius')
    expect(rolesUsingRadiusToken(roles, '2xl')).toEqual(['container', 'overlay'])
    expect(rolesUsingRadiusToken(roles, 'xl')).toEqual(['action'])
    expect(rolesUsingRadiusToken(roles, '5xl')).toEqual([])
    expect(rolesUsingRadiusToken({ ...roles, container: 'dimension-20' }, '2xl')).toEqual(['overlay'])
  })

  it('groups tokens by the role group that uses them; the rest are unassigned', () => {
    const byGroup = radiusTokensByRoleGroup(defaultLayoutRoles('radius'))
    expect(byGroup.boxes).toEqual(['2xl'])
    expect(byGroup.fields).toEqual(['xl'])
    expect(byGroup.selectors).toEqual(['lg', 'full'])
    expect(byGroup.unassigned).toEqual(['none', 'sm', 'md', '3xl', '4xl', '5xl'])
  })
})

describe('per-viewport radius overrides', () => {
  const roles = defaultLayoutRoles('radius')

  it('a role holds its Desktop value until a viewport sets its own', () => {
    expect(radiusRoleAt(roles, {}, 'container', 'tablet')).toBe('2xl')
    const next = setRadiusRoleViewport({}, roles, 'container', 'tablet', 'xl')
    expect(next).toEqual({ tablet: { container: 'xl' } })
    expect(radiusRoleAt(roles, next, 'container', 'tablet')).toBe('xl')
    expect(radiusRoleAt(roles, next, 'container', 'mobile')).toBe('2xl') // mobile still holds
    expect(radiusRoleAt(roles, next, 'container', 'desktop')).toBe('2xl')
  })

  it('picking the Desktop value, or reset, clears the override', () => {
    const set = setRadiusRoleViewport({}, roles, 'action', 'mobile', 'sm')
    expect(setRadiusRoleViewport(set, roles, 'action', 'mobile', 'xl')).toEqual({})
    expect(setRadiusRoleViewport(set, roles, 'action', 'mobile', null)).toEqual({})
  })

  it('CSS ships the override in its own viewport block only', () => {
    const viewports = { mobile: { container: 'dimension-20' } }
    expect(radiusRolesViewportCss('mobile', roles, RADIUS_STANDARD, viewports)).toContain('--radius-container: var(--dimension-20);')
    expect(radiusRolesViewportCss('tablet', roles, RADIUS_STANDARD, viewports)).toEqual([])
  })
})

describe('radius presets are role bundles on the standard ramp', () => {
  it('Rounded is exactly the default roles; Sharp is 0 everywhere', async () => {
    const { RADIUS_ROLE_PRESETS, matchRadiusRolePreset, radiusPresetPatch, radiusPresetPx } = await import('../layoutTokens')
    expect(matchRadiusRolePreset(defaultLayoutRoles('radius'))).toBe('Rounded')
    const sharp = radiusPresetPatch('Sharp', defaultLayoutRoles('radius'))!
    for (const role of ['control', 'action', 'container', 'overlay']) {
      expect(px(resolveLayoutRole('radius', sharp.radiusRoles, sharp.radius, role))).toBe(0)
    }
    expect(sharp.radiusRoles.pill).toBe('full') // a circle is not an axis
    expect(sharp.radius).toEqual(RADIUS_STANDARD) // the ramp is the table, never regraded
    expect(RADIUS_ROLE_PRESETS.map(radiusPresetPx)).toEqual([[0, 0, 0], [8, 4, 4], [16, 12, 8], [24, 32, 8]])
    for (const p of RADIUS_ROLE_PRESETS) expect(matchRadiusRolePreset(radiusPresetPatch(p.label)!.radiusRoles)).toBe(p.label)
  })

  it('moving one axis off the bundle reads Custom', async () => {
    const { matchRadiusRolePreset } = await import('../layoutTokens')
    expect(matchRadiusRolePreset({ ...defaultLayoutRoles('radius'), action: 'none' })).toBeNull()
  })
})

describe('responsive radius tokens ship in CSS', () => {
  it('declares --radius-component-* on :root and steps them down per viewport', async () => {
    const { buildCSS } = await import('../exporters')
    const { useDesignStore } = await import('../../store/useDesignStore')
    const css = buildCSS(useDesignStore.getState())
    expect(css).toContain('--radius-component-4xl: var(--radius-4xl);')
    // `full` reads its primitive: `--radius-full` is the role (radius.pill).
    expect(css).toContain('--radius-component-full: var(--dimension-9999);')
    // Tablet one rung down, Mobile two from 3xl up.
    expect(css).toContain('--radius-component-4xl: var(--radius-3xl);')
    expect(css).toContain('--radius-component-4xl: var(--radius-2xl);')
    // Fixed tokens never get a viewport override.
    expect(css.match(/--radius-component-none:/g)?.length).toBe(1)
  })
})
