import { describe, expect, it } from 'vitest'
import { DIMENSION_STANDARD } from '../dimensions'
import {
  ICON_ROLES, ICON_SIZE_PX, ICON_VIEWPORTS, anatomyIconPx, effectiveIconWeight,
  iconRoleForControlStep, iconRoleForHeight, iconSizeCssVars, iconSizePx, iconSizeTokens,
} from '../iconSizing'

describe('icon sizing', () => {
  it('publishes only small, medium and large, each a Dimension primitive', () => {
    expect(ICON_ROLES).toEqual(['small', 'medium', 'large'])
    expect(ICON_SIZE_PX).toEqual({ small: 16, medium: 20, large: 24 })
    for (const role of ICON_ROLES) expect(DIMENSION_STANDARD).toContain(ICON_SIZE_PX[role])
  })

  it('holds the same px on Desktop, Tablet and Mobile', () => {
    for (const role of ICON_ROLES) {
      const px = ICON_VIEWPORTS.map((vp) => iconSizePx(role, vp))
      expect(px).toEqual([ICON_SIZE_PX[role], ICON_SIZE_PX[role], ICON_SIZE_PX[role]])
    }
    const tokens = iconSizeTokens()
    expect(tokens.viewports.tablet).toEqual(tokens.viewports.desktop)
    expect(tokens.viewports.mobile).toEqual(tokens.viewports.desktop)
    expect(tokens.roles).toEqual({ small: 'small', medium: 'medium', large: 'large' })
  })

  it('picks a size that stays inside the control', () => {
    expect(iconRoleForHeight(32)).toBe('small')
    expect(iconRoleForHeight(40)).toBe('medium')
    expect(iconRoleForHeight(48)).toBe('large')
    expect(iconRoleForControlStep('sm')).toBe('small')
    expect(iconRoleForControlStep('md')).toBe('medium')
    expect(iconRoleForControlStep('lg')).toBe('large')
    expect(iconRoleForControlStep('xl')).toBe('large')
  })

  it('anatomy glyphs stay on the fine ladder, not the three published sizes', () => {
    expect(anatomyIconPx(13)).toBe(14)
    expect(anatomyIconPx(15)).toBe(16)
    expect(anatomyIconPx(9)).toBe(12)
  })

  it('small icons are never thin or light; 16px and up keep the theme weight', () => {
    expect(effectiveIconWeight('thin', 12)).toBe('regular')
    expect(effectiveIconWeight('light', 14)).toBe('regular')
    expect(effectiveIconWeight('light', 16)).toBe('light')
    expect(effectiveIconWeight('bold', 12)).toBe('bold')
  })

  it('CSS aliases each size to its dimension, with no raw px and no per-viewport override', () => {
    const css = iconSizeCssVars().join('\n')
    expect(css).toContain('--icon-small: var(--dimension-16);')
    expect(css).toContain('--icon-medium: var(--dimension-20);')
    expect(css).toContain('--icon-large: var(--dimension-24);')
    expect(css).not.toMatch(/:\s*\d+px;/)
    expect(css).not.toContain('control-')
  })
})

describe('W3C icon group', () => {
  it('ships the three sizes as Dimension Semantics aliases of their primitives', async () => {
    const { buildWizardExport } = await import('../exportWizard')
    const [file] = buildWizardExport({
      collections: ['icons'],
      modes: ['light'],
      format: 'w3c',
      structure: 'single',
      colorFormat: 'hex',
      includeAliases: true,
      includeComponents: false,
    })
    const doc = JSON.parse(file.content)
    const resolve = (ref: string) => ref.slice(1, -1).split('.').reduce((n: any, k) => n?.[k], doc)
    const icon = doc['Dimension Semantics'].Desktop.Icon.role
    expect(icon.small.$value).toBe('{Dimension Primitives.Default.16}')
    expect(resolve(icon.small.$value)?.$value).toBe('16px')
    expect(icon.medium.$value).toBe('{Dimension Primitives.Default.20}')
    expect(icon.large.$value).toBe('{Dimension Primitives.Default.24}')
    expect(Object.keys(doc['Dimension Semantics'].Desktop)).toEqual(['Icon'])
  })
})
