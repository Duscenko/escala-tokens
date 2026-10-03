import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON } from '../tokenGenerator'
import {
  DIMENSION_STANDARD, buildDimensionScale, dimensionFromKey, dimensionKey,
  dimensionDeclsFor, dimensionVar, parseDimension,
} from '../dimensions'

type Refs = Record<string, Record<string, string>>
type Json = ReturnType<typeof generateTokenJSON> & {
  dimensions: Record<string, string>
  dimensionRefs: Refs
  foundationsByTheme: Record<string, Record<string, unknown> & { dimensionRefs: Refs }>
}

const CATEGORY_FIELD: Record<string, string> = {
  spacing: 'spacing', padding: 'padding', radius: 'radius', sizes: 'sizes',
  selector: 'selector', stroke: 'stroke', grid: 'grid',
}

/** Every ref resolves through `dimensions` to EXACTLY the px its map carries. */
function assertRefsResolve(refs: Refs, maps: Record<string, unknown>, dimensions: Record<string, string>, where: string) {
  const broken: string[] = []
  for (const [category, entries] of Object.entries(refs)) {
    const map = maps[CATEGORY_FIELD[category]] as Record<string, string>
    for (const [step, ref] of Object.entries(entries)) {
      const key = /^\{dimension\.(.+)\}$/.exec(ref)?.[1]
      const value = key ? dimensions[key] : undefined
      if (value === undefined || parseDimension(value) !== parseDimension(map[step])) {
        broken.push(`${where} ${category}.${step}: ${ref} → ${value} ≠ ${map[step]}`)
      }
    }
  }
  expect(broken).toEqual([])
}

describe('dimension primitives — naming', () => {
  it('names a primitive by its value and round-trips', () => {
    for (const n of [-16, -4, -0.5, 0, 0.5, 3.5, 10.5, 16, 101.5, 9999]) {
      expect(dimensionFromKey(dimensionKey(n))).toBe(n)
    }
    expect(dimensionKey(16)).toBe('16')
    expect(dimensionKey(-4)).toBe('-4')
    expect(dimensionKey(3.5)).toBe('3_5')
  })

  it('never collides two values onto one name', () => {
    const keys = [3.5, 35, 0.35, 3.05].map(dimensionKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('reads only px lengths', () => {
    expect(parseDimension('16px')).toBe(16)
    expect(parseDimension('0')).toBe(0)
    expect(parseDimension('-4px')).toBe(-4)
    expect(parseDimension('none')).toBeNull()
    expect(parseDimension('1.5rem')).toBeNull()
    expect(parseDimension('0 1px 2px rgba(0,0,0,0.05)')).toBeNull()
  })

  it('a CSS line references the primitive, and a snippet carries only what it uses', () => {
    expect(dimensionVar('16px')).toBe('var(--dimension-16)')
    expect(dimensionVar('none')).toBe('none')
    const decls = dimensionDeclsFor(['--radius-lg: var(--dimension-16);', '--radius-xs: var(--dimension-3_5);'])
    expect(decls).toEqual(['--dimension-3_5: 3.5px;', '--dimension-16: 16px;'])
  })

  it('the scale carries the standard set plus any value used, one entry per value', () => {
    const scale = buildDimensionScale([101.5, 16])
    const values = Object.keys(scale).map(dimensionFromKey)
    expect(new Set(values).size).toBe(values.length)
    for (const n of DIMENSION_STANDARD) expect(scale[dimensionKey(n)]).toBe(`${n}px`)
    expect(scale['101_5']).toBe('101.5px')
  })
})

describe('dimension primitives — export', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('default system: every length aliases a primitive that resolves to the same px', () => {
    const json = generateTokenJSON() as Json
    assertRefsResolve(json.dimensionRefs, json as unknown as Record<string, unknown>, json.dimensions, 'root')
    // A count is not a length.
    expect(json.dimensionRefs.grid?.columns).toBeUndefined()
    expect(json.dimensionRefs.radius?.full).toBe('{dimension.9999}')
  })

  for (const preset of THEME_STYLE_PRESETS) {
    it(`${preset.id}: every theme's lengths alias a primitive, with no theme modes on the primitives`, async () => {
      const { adoptPreset } = await import('../adoptPreset')
      adoptPreset(preset, 'light')
      adoptPreset(preset, 'dark')
      const json = generateTokenJSON() as Json
      // One flat map of strings: a primitive has no per-theme value.
      expect(Object.values(json.dimensions).every((v) => typeof v === 'string')).toBe(true)
      assertRefsResolve(json.dimensionRefs, json as unknown as Record<string, unknown>, json.dimensions, 'root')
      for (const [theme, foundations] of Object.entries(json.foundationsByTheme)) {
        assertRefsResolve(foundations.dimensionRefs, foundations, json.dimensions, theme)
      }
    })
  }

  it('a value off the standard ladder still gets a primitive', () => {
    useDesignStore.setState({ radius: { ...useDesignStore.getState().radius, lg: '17.5px' } })
    const json = generateTokenJSON() as Json
    expect(json.dimensions['17_5']).toBe('17.5px')
    expect(json.dimensionRefs.radius?.lg).toBe('{dimension.17_5}')
  })
})

describe('dimension primitives — W3C export', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('ships a dimension root and aliases every length into it', async () => {
    const { buildWizardExport } = await import('../exportWizard')
    const [file] = buildWizardExport({
      collections: ['radius', 'spacing', 'grid'], modes: [], format: 'w3c', structure: 'single',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    const tree = JSON.parse(file.content)
    expect(tree.dimension['16']).toEqual({ $value: '16px', $type: 'dimension' })
    expect(tree.radius.full).toEqual({ $value: '{dimension.9999}', $type: 'dimension' })
    expect(tree.grid.breakpoint.md).toEqual({ $value: '{dimension.768}', $type: 'dimension' })
    // Every {dimension.N} in the document resolves inside it.
    const refs = [...file.content.matchAll(/\{dimension\.(-?[\d_]+)\}/g)].map((m) => m[1])
    expect(refs.length).toBeGreaterThan(10)
    expect(refs.filter((k) => !tree.dimension[k])).toEqual([])
  })

  it('per-collection structure ships dimension.tokens.json alongside', async () => {
    const { buildWizardExport } = await import('../exportWizard')
    const files = buildWizardExport({
      collections: ['radius'], modes: [], format: 'w3c', structure: 'per-collection',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    expect(files.map((f) => f.name)).toEqual(['dimension.tokens.json', 'radius.tokens.json'])
  })

  it('a colour-only export does not drag the dimension root in', async () => {
    const { buildWizardExport } = await import('../exportWizard')
    const [file] = buildWizardExport({
      collections: ['primitives'], modes: [], format: 'w3c', structure: 'single',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    expect(JSON.parse(file.content).dimension).toBeUndefined()
  })
})

describe('dimension primitives — resolve_token', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('resolves a primitive by any of its spellings', async () => {
    const { resolveToken } = await import('../agentAccess/resolveToken')
    const json = generateTokenJSON() as unknown as Parameters<typeof resolveToken>[0]
    for (const q of ['dimension.16', 'dimension/16', '--dimension-16', 'var(--dimension-16)']) {
      const r = resolveToken(json, q)
      expect(r.found).toBe(true)
      expect(r.kind).toBe('primitive')
      expect(r.css).toBe('var(--dimension-16)')
      expect(r.values.default).toBe('16px')
    }
    expect(resolveToken(json, 'dimension.3.5').found).toBe(false)
  })

  it('a foundation step reports which primitive it aliases', async () => {
    const { resolveToken } = await import('../agentAccess/resolveToken')
    const json = generateTokenJSON() as unknown as Parameters<typeof resolveToken>[0]
    const r = resolveToken(json, 'radius.full')
    expect(r.kind).toBe('foundation')
    expect(Object.values(r.aliases ?? {})).toContain('dimension.9999')
  })
})

describe('dimension primitives — pinned roles', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('keeps a pinned primitive on the ladder even when no ramp step uses it', () => {
    useDesignStore.setState({ radiusRoles: { ...useDesignStore.getState().radiusRoles, container: 'dimension-21' } })
    const json = generateTokenJSON() as unknown as { dimensions: Record<string, string>; radiusRoles: Record<string, string> }
    expect(json.radiusRoles.container).toBe('dimension-21')
    expect(json.dimensions['21']).toBe('21px')
  })

  it('a pinned role aliases its primitive directly in CSS and resolves to its px', async () => {
    const { buildCSS } = await import('../exporters')
    const { resolveLayoutRole } = await import('../layoutTokens')
    useDesignStore.setState({ radiusRoles: { ...useDesignStore.getState().radiusRoles, container: 'dimension-21' } })
    const st = useDesignStore.getState()
    expect(buildCSS(st)).toContain('--radius-container: var(--dimension-21);')
    expect(resolveLayoutRole('radius', st.radiusRoles, st.radius, 'container')).toBe('21px')
  })

  it('an untouched role still follows its step, and exports straight to the primitive', async () => {
    const { buildCSS } = await import('../exporters')
    expect(buildCSS(useDesignStore.getState())).toContain('--radius-container: var(--dimension-16);')
  })
})

describe('roles pinned to a Dimension primitive (layoutTokens)', () => {
  it('parses only well-formed, non-negative pinned values', async () => {
    const { roleDimensionPx, dimensionRoleValue } = await import('../layoutTokens')
    expect(roleDimensionPx('dimension-16')).toBe(16)
    expect(roleDimensionPx('dimension-3_5')).toBe(3.5)
    expect(roleDimensionPx('dimension--4')).toBeNull()
    expect(roleDimensionPx('dimension-3.5')).toBeNull() // `.` is not a key spelling
    expect(roleDimensionPx('dimension-abc')).toBeNull()
    expect(roleDimensionPx('lg')).toBeNull()
    expect(dimensionRoleValue(3.5)).toBe('dimension-3_5')
    expect(roleDimensionPx(dimensionRoleValue(21))).toBe(21)
  })

  it('a stored map keeps a pinned role, repairs a malformed one', async () => {
    const { mergeLayoutRoles } = await import('../layoutTokens')
    const merged = mergeLayoutRoles('radius', { container: 'dimension-21', action: 'dimension-nope', control: 'xs' })
    expect(merged.container).toBe('dimension-21')
    expect(merged.action).toBe('lg') // default, the malformed value is repaired
    expect(merged.control).toBe('xs')
  })

  it('resolves a pinned role to its px and a step through the scale', async () => {
    const { resolveLayoutRole, roleValuePx } = await import('../layoutTokens')
    const radius = { sm: '8px', lg: '16px' }
    expect(resolveLayoutRole('radius', { container: 'dimension-21', action: 'sm' }, radius, 'container')).toBe('21px')
    expect(resolveLayoutRole('radius', { container: 'dimension-21', action: 'sm' }, radius, 'action')).toBe('8px')
    expect(roleValuePx('lg', radius)).toBe(16)
    expect(roleValuePx('dimension-4', radius)).toBe(4)
    expect(roleValuePx('missing', radius)).toBeNull()
  })

  it('a pinned role is default only when it resolves to the default step', async () => {
    const { layoutRoleIsDefault } = await import('../layoutTokens')
    const radius = { lg: '8px', '2xl': '16px' }
    expect(layoutRoleIsDefault('radius', 'action', 'lg', radius)).toBe(true)
    expect(layoutRoleIsDefault('radius', 'action', 'dimension-8', radius)).toBe(true)
    expect(layoutRoleIsDefault('radius', 'action', 'dimension-9', radius)).toBe(false)
    expect(layoutRoleIsDefault('radius', 'action', 'dimension-8')).toBe(false) // no scale to compare against
  })

  it('every role aliases its primitive directly; without a scale a step keeps its own variable', async () => {
    const { layoutRoleCssVars, layoutValueCss } = await import('../layoutTokens')
    const radius = { none: '0px', xs: '4px', sm: '8px', lg: '16px', full: '9999px' }
    const withScale = layoutRoleCssVars('radius', { container: 'dimension-21', action: 'sm' }, radius)
    expect(withScale).toContain('--radius-container: var(--dimension-21);')
    expect(withScale).toContain('--radius-action: var(--dimension-8);')
    expect(layoutRoleCssVars('radius', { action: 'sm' })).toContain('--radius-action: var(--radius-sm);')
    expect(layoutValueCss('radius', 'lg', radius)).toBe('var(--dimension-16)')
  })

  it('Grid: a pinned cut and pinned frame fields resolve, and drive the media queries', async () => {
    const {
      breakpointRolePx, breakpointTabletMax, breakpointMobileMax, extractBreakpoints, gridFrameMediaCss,
      gridFrameRootCss, mergeGridFrame, resolveGridFrame,
    } = await import('../layoutTokens')
    const bps = extractBreakpoints(undefined)
    const roles = { desktop: 'dimension-1000', mobile: 'dimension-500' }
    expect(breakpointRolePx(roles, bps, 'desktop')).toBe(1000)
    expect(breakpointRolePx(undefined, bps, 'desktop')).toBe(768)
    expect(breakpointTabletMax(roles, bps)).toBe('999px')
    expect(breakpointMobileMax(roles, bps)).toBe('499px')

    const frame = mergeGridFrame({
      desktop: { columns: '12', gutter: 'dimension-20', margin: '8', container: 'dimension-1100' },
      tablet: { columns: '8', gutter: '6', margin: '6', container: 'none' },
      mobile: { columns: '4', gutter: '4', margin: '4', container: 'none' },
    })
    const spacing = { '4': '16px', '6': '24px', '8': '32px' }
    expect(resolveGridFrame('desktop', frame, spacing, bps)).toMatchObject({ gutter: '20px', margin: '32px', container: '1100px' })
    expect(gridFrameRootCss(frame, { spacing, breakpoints: bps })).toEqual([
      '--grid-columns: 12;', '--grid-gutter: var(--dimension-20);', '--grid-margin: var(--dimension-32);', '--grid-container: var(--dimension-1100);',
    ])
    expect(gridFrameMediaCss(roles, undefined, frame, spacing)).toContain('@media (max-width: 999px)')
  })

  it('a malformed Grid frame field falls back to the standard', async () => {
    const { mergeGridFrame, GRID_FRAME_STANDARD } = await import('../layoutTokens')
    const merged = mergeGridFrame({
      desktop: { columns: '12', gutter: 'dimension-', margin: 'dimension--2', container: 'xxl' },
      tablet: GRID_FRAME_STANDARD.tablet,
      mobile: GRID_FRAME_STANDARD.mobile,
    })
    expect(merged.desktop).toEqual(GRID_FRAME_STANDARD.desktop)
  })
})

describe('quick edit stays on the primitive chain', () => {
  it('the inset slider follows a role pinned in Variables', async () => {
    const { insetSurfaceStepIndex, SPACING_STEPS, buildSpacingFromBase } = await import('../layoutTokens')
    const spacing = buildSpacingFromBase(4)
    expect(SPACING_STEPS[insetSurfaceStepIndex({ 'inset-surface': 'dimension-24' }, spacing)]).toBe('6')
    expect(SPACING_STEPS[insetSurfaceStepIndex({ 'inset-surface': 'dimension-23' }, spacing)]).toBe('6')
    expect(SPACING_STEPS[insetSurfaceStepIndex({ 'inset-surface': '3' }, spacing)]).toBe('3')
  })

  it('a quick-edit base unit that makes odd sizes still lands every value on the ladder', () => {
    const st = useDesignStore.getState()
    useDesignStore.setState({ sizes: { ...st.sizes, md: '35px' }, selector: { ...st.selector, md: '10.5px' } })
    const json = generateTokenJSON() as unknown as { dimensions: Record<string, string>; dimensionRefs: Record<string, Record<string, string>> }
    expect(json.dimensions['35']).toBe('35px')
    expect(json.dimensions['10_5']).toBe('10.5px')
    expect(json.dimensionRefs.sizes.md).toBe('{dimension.35}')
  })
})

describe('viewport modes selection', () => {
  beforeEach(() => { useDesignStore.setState(makeDesignDefaults()) })

  it('normalizes to canonical order, never empty', async () => {
    const { normalizeFigmaViewports, toggleFigmaViewport } = await import('../figmaSyncModes')
    expect(normalizeFigmaViewports(undefined)).toEqual(['desktop', 'tablet', 'mobile'])
    expect(normalizeFigmaViewports(['mobile', 'desktop', 'bogus'])).toEqual(['desktop', 'mobile'])
    expect(normalizeFigmaViewports([])).toEqual(['desktop', 'tablet', 'mobile'])
    expect(toggleFigmaViewport(['desktop', 'tablet', 'mobile'], 'tablet')).toEqual(['desktop', 'mobile'])
    expect(toggleFigmaViewport(['desktop'], 'desktop')).toEqual(['desktop']) // the last one stays
    expect(toggleFigmaViewport(['mobile'], 'desktop')).toEqual(['desktop', 'mobile'])
  })

  it('tokens.json ships the chosen viewports, all three by default', () => {
    expect((generateTokenJSON() as unknown as { viewports: string[] }).viewports).toEqual(['desktop', 'tablet', 'mobile'])
    const two = generateTokenJSON(undefined, { viewports: ['mobile', 'desktop'] }) as unknown as { viewports: string[] }
    expect(two.viewports).toEqual(['desktop', 'mobile'])
  })
})
