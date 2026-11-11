import { describe, expect, it } from 'vitest'
import {
  LEGACY_SPACING_ROLE_STEPS,
  SPACING_RESPONSIVE,
  SPACING_STANDARD,
  buildSpacingFromBase,
  defaultLayoutRoles,
  gridFrameMediaCss,
  GRID_FRAME_STANDARD,
  BREAKPOINT_STANDARD,
  layoutValueCss,
  migrateSpacingV79,
  resolveLayoutRole,
  rolesUsingSpacingToken,
  spacingRolesAtViewport,
  type GridViewport,
} from '../layoutTokens'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'

const VPS: GridViewport[] = ['desktop', 'tablet', 'mobile']
const px = (step: string) => parseFloat(SPACING_STANDARD[step])

// The Spacing reference: Component · Section · Layout, Desktop / Tablet / Mobile px.
const REFERENCE: Record<string, [number, number, number]> = {
  'component-xl': [24, 16, 12], 'component-lg': [16, 16, 12], 'component-md': [12, 12, 8],
  'component-sm': [8, 8, 8], 'component-xs': [4, 4, 4], 'component-none': [0, 0, 0],
  'section-xl': [48, 32, 20], 'section-lg': [32, 20, 16], 'section-md': [24, 16, 12],
  'section-sm': [16, 16, 12], 'section-xs': [12, 12, 8], 'section-none': [0, 0, 0],
  'layout-xl': [128, 64, 48], 'layout-lg': [96, 48, 32], 'layout-md': [64, 32, 16],
  'layout-sm': [48, 24, 12], 'layout-xs': [32, 16, 8], 'layout-none': [0, 0, 0],
}

describe('responsive spacing', () => {
  it('the 18 tokens match the reference at the default 4px base', () => {
    expect(Object.keys(SPACING_RESPONSIVE)).toEqual(Object.keys(REFERENCE))
    for (const [key, values] of Object.entries(REFERENCE)) {
      expect(VPS.map((vp) => px(SPACING_RESPONSIVE[key][vp])), key).toEqual(values)
    }
  })

  it('no Desktop pixel moved: every role resolves to its pre-responsive value', () => {
    const roles = defaultLayoutRoles('spacing')
    for (const [role, legacyStep] of Object.entries(LEGACY_SPACING_ROLE_STEPS)) {
      expect(resolveLayoutRole('spacing', roles, SPACING_STANDARD, role), role).toBe(SPACING_STANDARD[legacyStep])
    }
    expect(resolveLayoutRole('spacing', roles, SPACING_STANDARD, 'inset-surface')).toBe('20px')
  })

  it('roles on a token tighten on smaller viewports; fixed ones hold', () => {
    const roles = defaultLayoutRoles('spacing')
    const at = (role: string, vp: GridViewport) => px(spacingRolesAtViewport(roles, vp)[role])
    expect(VPS.map((vp) => at('gap-section', vp))).toEqual([24, 16, 12])
    // The Escala Figma file's insets: their own per-viewport values, not a curve.
    expect(VPS.map((vp) => at('inset-page', vp))).toEqual([32, 16, 16])
    expect(VPS.map((vp) => at('inset-section', vp))).toEqual([96, 64, 48])
    expect(VPS.map((vp) => at('inset-control', vp))).toEqual([12, 12, 12])
    expect(VPS.map((vp) => at('inset-surface', vp))).toEqual([20, 20, 20])
    expect(rolesUsingSpacingToken(roles, 'section-md')).toEqual(['gap-section'])
    // A role moved off its default drops its own per-viewport values.
    expect(VPS.map((vp) => px(spacingRolesAtViewport({ ...roles, 'inset-page': '6' }, vp)['inset-page']))).toEqual([24, 24, 24])
  })

  it('a responsive token follows the base unit (it references steps, not px)', () => {
    const base5 = buildSpacingFromBase(5)
    expect(resolveLayoutRole('spacing', defaultLayoutRoles('spacing'), base5, 'gap-section')).toBe('30px')
  })

  it('CSS: roles step down per viewport; the curve is not its own variables', () => {
    expect(layoutValueCss('spacing', 'section-md', SPACING_STANDARD)).toBe('var(--dimension-24)')
    const css = gridFrameMediaCss(defaultLayoutRoles('breakpoint'), { ...BREAKPOINT_STANDARD }, GRID_FRAME_STANDARD, SPACING_STANDARD, undefined, {
      roles: defaultLayoutRoles('spacing'), spacing: SPACING_STANDARD,
    })
    const [tablet, mobile] = css.split('@media').slice(1)
    expect(tablet).not.toContain('--spacing-section-md')
    expect(tablet).toContain('--spacing-gap-section: var(--dimension-16);')
    expect(tablet).toContain('--spacing-inset-section: var(--dimension-64);')
    expect(mobile).toContain('--spacing-inset-page: var(--dimension-16);')
    expect(mobile).toContain('--spacing-inset-section: var(--dimension-48);')
    expect(css).not.toContain('--spacing-inset-surface')
    expect(css).not.toContain('--spacing-inset-control')
  })

  it('tokens.json keeps spacingRoles as Desktop static steps and adds the responsive layer', () => {
    const doc = generateTokenJSON() as unknown as {
      spacingRoles: Record<string, string>; spacingRoleRefs: Record<string, string>; spacingResponsive: typeof SPACING_RESPONSIVE
    }
    expect(doc.spacingRoles['gap-section']).toBe('6')
    expect(doc.spacingRoleRefs['gap-section']).toBe('section-md')
    expect(doc.spacingResponsive['layout-xl']).toEqual({ desktop: '32', tablet: '16', mobile: '12' })
  })

  it('tokens.json ships the roles\' own Tablet / Mobile values, shaped like radiusRoleViewports', () => {
    const doc = generateTokenJSON() as unknown as {
      spacingRoles: Record<string, string>; spacingRoleViewports: Record<string, Record<string, string>>
      sizeRoles: Record<string, string>; sizeRoleViewports: Record<string, Record<string, string>>
    }
    expect(doc.spacingRoles['inset-section']).toBe('24')
    expect(doc.spacingRoleViewports).toEqual({
      tablet: { 'inset-page': '4', 'inset-section': '16' },
      mobile: { 'inset-page': '4', 'inset-section': '12' },
    })
    expect(doc.sizeRoles['target-min']).toBe('xs')
    expect(doc.sizeRoleViewports).toEqual({ tablet: { 'target-min': 'dimension-44' }, mobile: { 'target-min': 'dimension-44' } })
    // No per-side insets and no extra overlaps: the Figma file has neither.
    expect(Object.keys(doc.spacingRoles).filter((k) => /-(top|right|bottom|left)$|overlap-(xs|lg|xl|2xl)/.test(k))).toEqual([])
  })
})

describe('per-theme spacing roles reach the payload', () => {
  it('foundationsByTheme carries each theme\'s own roles, not the root store\'s', () => {
    const doc = generateTokenJSON() as unknown as {
      foundationsByTheme: Record<string, { spacingRoles?: Record<string, string>; spacingRoleRefs?: Record<string, string> }>
    }
    const themes = Object.values(doc.foundationsByTheme)
    expect(themes.length).toBeGreaterThan(0)
    for (const f of themes) {
      expect(f.spacingRoles?.['gap-section']).toBe('6')
      expect(f.spacingRoleRefs?.['gap-section']).toBe('section-md')
    }
  })

  it('a theme that pins its own role ships that pin while the root keeps the store\'s', () => {
    const base = useDesignStore.getState()
    const key = base.themeOrder[0]
    const store = { ...base, themeFoundations: { ...base.themeFoundations, [key]: { spacingRoles: { 'inset-surface': '8' } } } }
    const doc = generateTokenJSON(store) as unknown as {
      spacingRoles: Record<string, string>
      foundationsByTheme: Record<string, { spacingRoles?: Record<string, string> }>
    }
    expect(doc.foundationsByTheme[key].spacingRoles?.['inset-surface']).toBe('8')
    expect(doc.spacingRoles['inset-surface']).not.toBe('8')
  })
})

describe('store v79 spacing migration', () => {
  it('moves default-step roles to tokens, keeps hand-picked ones, backfills new steps from the base', () => {
    const slot = {
      spacing: { '0': '0px', '1': '5px', '2': '10px', '3': '15px', '4': '20px', '5': '25px', '6': '30px', '8': '40px', '10': '50px', '12': '60px', '16': '80px' } as Record<string, string>,
      spacingRoles: { 'gap-section': '6', 'gap-control': '3', 'inset-surface': '6' } as Record<string, string>,
    }
    migrateSpacingV79(slot)
    expect(slot.spacingRoles['gap-section']).toBe('section-md')
    expect(slot.spacingRoles['gap-control']).toBe('3') // hand-picked, not the old default '2'
    expect(slot.spacingRoles['inset-surface']).toBe('6')
    expect(slot.spacing['0_5']).toBe('2.5px')
    expect(slot.spacing['32']).toBe('160px')
    expect(slot.spacing['5']).toBe('25px')
  })
})
