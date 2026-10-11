import { describe, expect, it } from 'vitest'
import { iconRoleForHeight, iconSizesFor, iconSizeTokens } from '../iconSizing'

describe('icon sizes follow the control height', () => {
  it('keeps 16 · 20 · 24 at the reference control (md 40)', () => {
    expect(iconSizesFor({ md: '40px' })).toEqual({ small: 16, medium: 20, large: 24 })
    expect(iconSizesFor(undefined)).toEqual({ small: 16, medium: 20, large: 24 })
  })
  it('grows with larger controls and shrinks with smaller ones', () => {
    const big = iconSizesFor({ md: '48px' })
    const small = iconSizesFor({ md: '32px' })
    expect(big.small).toBeGreaterThan(16)
    expect(big.large).toBe(28)
    expect(small.small).toBeLessThan(16)
    expect(small.large).toBe(20)
    for (const v of [...Object.values(big), ...Object.values(small)]) expect(v % 2).toBe(0)
  })
  it('stays ordered small < medium < large', () => {
    for (const md of [28, 32, 36, 40, 44, 48, 56, 64]) {
      const s = iconSizesFor(md)
      expect(s.small).toBeLessThan(s.medium)
      expect(s.medium).toBeLessThan(s.large)
    }
  })
  it('picks the role relative to the md control', () => {
    expect(iconRoleForHeight(39)).toBe('small')
    expect(iconRoleForHeight(40)).toBe('medium')
    expect(iconRoleForHeight(48)).toBe('large')
    expect(iconRoleForHeight(47, 48)).toBe('small')
    expect(iconRoleForHeight(48, 48)).toBe('medium')
    expect(iconRoleForHeight(58, 48)).toBe('large')
  })
  it('ships the scaled sizes in tokens.json', () => {
    expect(iconSizeTokens({ md: '48px' }).scale.large).toBe('28px')
  })
})
