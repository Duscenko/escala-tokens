import { describe, expect, it } from 'vitest'
import {
  INSET_SIDE_KEYS,
  SPACING_STANDARD,
  clearInsetSides,
  defaultLayoutRoles,
  insetSideCssVars,
  layoutRoleCssVars,
  mergeLayoutRoles,
  spacingRolesAtViewport,
  spacingRolesViewportCss,
  withInsetSide,
  withInsetSides,
} from '../layoutTokens'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'

describe('inset sides', () => {
  const roles = defaultLayoutRoles('spacing')

  it('an untouched system stores no side and every side follows its inset', () => {
    const merged = mergeLayoutRoles('spacing', roles)
    for (const { key } of INSET_SIDE_KEYS) expect(merged[key]).toBeUndefined()
    const filled = withInsetSides(roles)
    for (const { key, role } of INSET_SIDE_KEYS) expect(filled[key]).toBe(filled[role])
  })

  it('a side set by hand survives a merge; one equal to its inset is dropped', () => {
    const one = withInsetSide(roles, 'inset-surface', 'bottom', '3')
    expect(mergeLayoutRoles('spacing', one)['inset-surface-bottom']).toBe('3')
    const same = withInsetSide(roles, 'inset-surface', 'bottom', roles['inset-surface'])
    expect(same['inset-surface-bottom']).toBeUndefined()
    expect(clearInsetSides(one, 'inset-surface')['inset-surface-bottom']).toBeUndefined()
  })

  it('a following side keeps following when the inset moves', () => {
    const one = withInsetSide(roles, 'inset-surface', 'bottom', '3')
    const moved = { ...one, 'inset-surface': '6' }
    const filled = withInsetSides(moved)
    expect(filled['inset-surface-top']).toBe('6')
    expect(filled['inset-surface-bottom']).toBe('3')
  })

  // The Escala Figma file has no per-side variables: only a side set by hand
  // gets one; a following side reads its inset (`--spacing-inset-surface`).
  it('CSS: only a side set by hand has a variable, aliasing its primitive', () => {
    const one = withInsetSide(roles, 'inset-surface', 'bottom', '3')
    const css = insetSideCssVars(one, SPACING_STANDARD)
    expect(css).toEqual(['--spacing-inset-surface-bottom: var(--dimension-12);'])
    expect(insetSideCssVars(roles, SPACING_STANDARD)).toEqual([])
    expect(layoutRoleCssVars('spacing', one, SPACING_STANDARD)).toEqual(expect.arrayContaining(css))
  })

  it('a side on a responsive token steps down on its own; a following one needs nothing', () => {
    const one = withInsetSide(roles, 'inset-surface', 'top', 'section-md')
    expect(spacingRolesViewportCss('mobile', one, SPACING_STANDARD))
      .toContain('--spacing-inset-surface-top: var(--dimension-12);')
    expect(spacingRolesViewportCss('mobile', roles, SPACING_STANDARD).some((d) => d.includes('inset-surface-top'))).toBe(false)
    expect(spacingRolesAtViewport(one, 'mobile')['inset-surface-top']).toBe('3')
  })

  it('tokens.json ships no sides (the Figma file has none); a hand-set card side still reaches padding', () => {
    useDesignStore.setState({ spacingRoles: withInsetSide(defaultLayoutRoles('spacing'), 'inset-surface', 'bottom', '3') })
    const json = generateTokenJSON() as unknown as { spacingRoles: Record<string, string>; spacingRoleRefs: Record<string, string> }
    for (const { key } of INSET_SIDE_KEYS) {
      expect(json.spacingRoles[key]).toBeUndefined()
      expect(json.spacingRoleRefs[key]).toBeUndefined()
    }
    const css = buildCSS(useDesignStore.getState())
    expect(css).toContain('--padding-bottom: var(--dimension-20);')
    expect(css).toContain('--padding-top: var(--spacing-inset-surface);')
    useDesignStore.setState({ spacingRoles: defaultLayoutRoles('spacing') })
  })
})
