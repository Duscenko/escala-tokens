import { describe, expect, it } from 'vitest'
import { TYPE_SCALE_KEYS } from '../typographyStandard'
import {
  TYPE_ROLES,
  TYPE_ROLE_GROUPS,
  aliasesEqual,
  mergeTypeRoles,
  primitiveVar,
  resolveTypeStyle,
  roleIsDefault,
  typeRoleVar,
  typeStyleCss,
} from '../typeRoles'

const primitives = {
  fontFamily: 'Inter',
  headingFontFamily: 'Inter',
  sizes: Object.fromEntries(TYPE_SCALE_KEYS.map((k) => [k, '16px'])),
  lineHeights: Object.fromEntries(TYPE_SCALE_KEYS.map((k) => [k, '24px'])),
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
}

describe('type roles', () => {
  it('catalogues fourteen roles across four groups, each with desktop and mobile aliases', () => {
    expect(TYPE_ROLE_GROUPS).toHaveLength(4)
    expect(TYPE_ROLES).toHaveLength(14)
    const sizes = new Set<string>(TYPE_SCALE_KEYS)
    for (const role of TYPE_ROLES) {
      expect(sizes.has(role.desktop.size)).toBe(true)
      expect(sizes.has(role.mobile.size)).toBe(true)
      expect(['display', 'body']).toContain(role.desktop.family)
      expect(['regular', 'medium', 'semibold', 'bold']).toContain(role.desktop.weight)
    }
    expect(TYPE_ROLES.some((r) => r.key === 'label')).toBe(true)
    expect(TYPE_ROLES.some((r) => r.key === 'placeholder')).toBe(true)
  })

  it('seeds missing roles and keeps a user edit', () => {
    const stored = mergeTypeRoles({
      label: {
        desktop: { family: 'body', size: 'text-lg', weight: 'bold' },
        mobile: { family: 'body', size: 'text-sm', weight: 'bold' },
      },
    })
    expect(stored.label.desktop.size).toBe('text-lg')
    expect(stored.label.desktop.weight).toBe('bold')
    expect(stored.placeholder.desktop.size).toBe('text-md')
    expect(Object.keys(stored)).toHaveLength(TYPE_ROLES.length)
  })

  it('drops unknown keys and repairs a broken alias', () => {
    const stored = mergeTypeRoles({
      madeUp: { desktop: { family: 'body', size: 'text-sm', weight: 'regular' }, mobile: { family: 'body', size: 'text-xs', weight: 'regular' } },
      label: { desktop: { family: 'body', size: 'nope', weight: 'regular' } as never, mobile: { family: 'body', size: 'text-xs', weight: 'medium' } },
    } as never)
    expect(stored.madeUp).toBeUndefined()
    expect(stored.label.desktop.size).toBe('text-sm')
    expect(roleIsDefault('label', stored.label)).toBe(true)
  })

  it('resolves an alias through the primitive ramp', () => {
    const style = resolveTypeStyle(
      { family: 'display', size: 'display-sm', weight: 'semibold' },
      { ...primitives, sizes: { ...primitives.sizes, 'display-sm': '30px' }, lineHeights: { ...primitives.lineHeights, 'display-sm': '38px' } },
    )
    expect(style.size).toBe('30px')
    expect(style.lineHeight).toBe('38px')
    expect(style.weight).toBe(600)
    expect(style.family).toBe('Inter')
  })

  it('aliases CSS vars onto primitive tokens, not raw px', () => {
    expect(typeRoleVar('label', 'size')).toBe('--text-label-font-size')
    expect(typeRoleVar('label', 'size', 'mobile')).toBe('--text-label-font-size-mobile')
    expect(primitiveVar({ family: 'body', size: 'text-sm', weight: 'medium' }, 'size')).toBe('var(--font-size-text-sm)')
    expect(primitiveVar({ family: 'display', size: 'display-xl', weight: 'bold' }, 'family')).toBe('var(--font-family-heading)')
    expect(aliasesEqual(
      { family: 'body', size: 'text-sm', weight: 'medium' },
      { family: 'body', size: 'text-sm', weight: 'medium' },
    )).toBe(true)
  })
})

describe('typeStyleCss (preview / docs / components)', () => {
  it('resolves a text role through the live primitive maps', () => {
    const stored = {
      label: {
        desktop: { family: 'body' as const, size: 'text-sm' as const, weight: 'medium' as const },
        mobile: { family: 'body' as const, size: 'text-xs' as const, weight: 'medium' as const },
      },
    }
    const ty = { ...primitives, sizes: { ...primitives.sizes, 'text-sm': '14px', 'text-xs': '12px' }, lineHeights: { ...primitives.lineHeights, 'text-sm': '20px', 'text-xs': '16px' } }
    const desktop = typeStyleCss(ty, stored, 'label', { leading: false })
    expect(desktop.size).toBe('14px')
    expect(desktop.weight).toBe(500)
    expect(desktop.lineHeight).toBeUndefined()
    const mobile = typeStyleCss(ty, stored, 'label', { viewport: 'mobile', leading: true })
    expect(mobile.size).toBe('12px')
    expect(mobile.lineHeight).toBe('16px')
  })
})
