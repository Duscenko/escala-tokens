import { describe, expect, it } from 'vitest'
import { buildSizesFromBase, SIZE_STANDARD } from '../layoutTokens'
import { DIMENSION_STANDARD } from '../dimensions'
import {
  ICON_SIZE_SCALE, ICON_SIZE_STEPS, effectiveIconWeight, iconRolePx, iconSizeCssVars,
  resolveIconRoles, snapIconStep,
} from '../iconSizing'

describe('icon sizing', () => {
  it('every scale value is a Dimension primitive, so it aliases one', () => {
    for (const step of ICON_SIZE_STEPS) expect(DIMENSION_STANDARD).toContain(ICON_SIZE_SCALE[step])
  })

  it('snaps to the nearest step, a tie going up', () => {
    expect(snapIconStep(13)).toBe('sm') // 14
    expect(snapIconStep(15)).toBe('md') // tie 14/16 → 16
    expect(snapIconStep(18)).toBe('lg') // tie 16/20 → 20
    expect(snapIconStep(100)).toBe('2xl')
  })

  it('the standard controls reproduce the pairs the Button shipped by hand', () => {
    const roles = resolveIconRoles(SIZE_STANDARD, '16px')
    expect([
      iconRolePx(roles, 'control-sm'), iconRolePx(roles, 'control-md'),
      iconRolePx(roles, 'control-lg'), iconRolePx(roles, 'control-xl'),
    ]).toEqual([14, 16, 20, 24])
    expect(iconRolePx(roles, 'inline')).toBe(16)
  })

  it('icons follow the controls: compact is smaller, airy bigger, never shrinking as controls grow', () => {
    const at = (base: number) => resolveIconRoles(buildSizesFromBase(base), '16px')
    expect(iconRolePx(at(3.5), 'control-md')).toBeLessThan(iconRolePx(at(4), 'control-md'))
    expect(iconRolePx(at(5), 'control-md')).toBeGreaterThan(iconRolePx(at(4), 'control-md'))
    for (const base of [3, 3.5, 4, 4.5, 5]) {
      const r = at(base)
      const px = (['control-sm', 'control-md', 'control-lg', 'control-xl'] as const).map((k) => iconRolePx(r, k))
      expect([...px].sort((a, b) => a - b)).toEqual(px)
    }
  })

  it('small icons are never thin or light; 16px and up keep the theme weight', () => {
    expect(effectiveIconWeight('thin', 12)).toBe('regular')
    expect(effectiveIconWeight('light', 14)).toBe('regular')
    expect(effectiveIconWeight('light', 16)).toBe('light')
    expect(effectiveIconWeight('bold', 12)).toBe('bold')
    expect(effectiveIconWeight('fill', 12)).toBe('fill')
  })

  it('CSS aliases scale → dimension and role → scale, never raw px', () => {
    const css = iconSizeCssVars(SIZE_STANDARD, '16px').join('\n')
    expect(css).toContain('--icon-size-md: var(--dimension-16);')
    expect(css).toContain('--icon-control-md: var(--icon-size-md);')
    expect(css).not.toMatch(/:\s*\d+px;/)
  })
})

describe('W3C icon group', () => {
  it('ships size + role aliases that resolve inside the document, plus the test glyphs', async () => {
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
    expect(doc.icon.size.md.$value).toBe('{dimension.16}')
    expect(resolve(doc.icon.size.md.$value)?.$value).toBe('16px')
    for (const node of Object.values(doc.icon.role) as { $value: string }[]) {
      expect(resolve(node.$value)?.$type).toBe('dimension')
    }
    expect(Object.keys(doc.icon.glyph)).toEqual([...W3C_TEST_GLYPHS])
    expect(doc.icon.glyph.home.$value).toMatch(/^<svg[^>]+viewBox="0 0 256 256"/)
  })
})
