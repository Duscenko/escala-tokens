import { describe, expect, it } from 'vitest'
import { primitiveGroupOf, PRIMITIVE_GROUPS } from '../exportWizard'

describe('W3C primitives are grouped Accents · Neutrals · States', () => {
  it('files every family under the platform group', () => {
    expect(primitiveGroupOf('accent')).toBe('Accents')
    expect(primitiveGroupOf('accent-dark')).toBe('Accents')
    expect(primitiveGroupOf('holi')).toBe('Accents')
    expect(primitiveGroupOf('neutral')).toBe('Neutrals')
    expect(primitiveGroupOf('holi-gray')).toBe('Neutrals')
    expect(primitiveGroupOf('holi-gray-dark')).toBe('Neutrals')
    expect(primitiveGroupOf('black-a')).toBe('Neutrals')
    expect(primitiveGroupOf('error')).toBe('States')
    expect(primitiveGroupOf('holi-warning-dark')).toBe('States')
    expect(primitiveGroupOf('info')).toBe('States')
  })
  it('lists the groups in the platform order', () => {
    expect([...PRIMITIVE_GROUPS]).toEqual(['Accents', 'Neutrals', 'States'])
  })
})
