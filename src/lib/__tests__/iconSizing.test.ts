import { describe, expect, it } from 'vitest'
import { DIMENSION_STANDARD } from '../dimensions'
import {
  ICON_ROLES, ICON_SIZE_PX, ICON_VIEWPORTS, anatomyIconPx, effectiveIconWeight,
  iconRoleForControlStep, iconRoleForHeight, iconSizeCssVars, iconSizePx, iconSizeTokens,
} from '../iconSizing'

describe('icon sizing', () => {
  it('publishes only small, medium and large, each a Dimension primitive', () => {
    expect(ICON_ROLES).toEqual(['small', 'medium', 'large'])
    expect(ICON_SIZE_PX).toEqual({ small: 24, medium: 32, large: 40 })
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
    expect(css).toContain('--icon-small: var(--dimension-24);')
    expect(css).toContain('--icon-medium: var(--dimension-32);')
    expect(css).toContain('--icon-large: var(--dimension-40);')
    expect(css).not.toMatch(/:\s*\d+px;/)
    expect(css).not.toContain('control-')
  })
})

describe('W3C icon group', () => {
  it('ships the three sizes as dimension aliases, plus the test glyphs', async () => {
    const { buildWizardExport, W3C_TEST_GLYPHS } = await import('../exportWizard')
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
    expect(doc.icon.small.$value).toBe('{dimension.24}')
    expect(resolve(doc.icon.small.$value)?.$value).toBe('24px')
    expect(doc.icon.medium.$value).toBe('{dimension.32}')
    expect(doc.icon.large.$value).toBe('{dimension.40}')
    expect(doc.icon.role).toBeUndefined()
    expect(doc.icon.size).toBeUndefined()
    expect(Object.keys(doc.icon.glyph)).toEqual([...W3C_TEST_GLYPHS])
    expect(doc.icon.glyph.home.$value).toMatch(/^<svg[^>]+viewBox="0 0 256 256"/)
  })
})
