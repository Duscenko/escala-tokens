import { describe, expect, it } from 'vitest'
import { brandSavedMessage } from '../brandSaved'

const t = (key: string, vars: Record<string, string | number> = {}) =>
  key.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))

describe('brandSavedMessage', () => {
  it('names the brand and the design system it joined', () => {
    expect(brandSavedMessage(t, 'Acme', 'Escala')).toBe('“Acme” saved to Escala')
  })
  it('drops the system when it has no name', () => {
    expect(brandSavedMessage(t, 'Acme', '  ')).toBe('“Acme” saved')
  })
  it('falls back to the generic line with no brand name', () => {
    expect(brandSavedMessage(t, '', 'Escala')).toBe('Brand saved')
  })
})
