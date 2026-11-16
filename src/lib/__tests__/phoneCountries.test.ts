import { describe, expect, it } from 'vitest'
import { PHONE_COUNTRIES, flagOf, phoneCountry, searchPhoneCountries } from '../phoneCountries'

describe('phone countries', () => {
  it('every country has a unique ISO code, a +calling code and a two-letter flag', () => {
    expect(new Set(PHONE_COUNTRIES.map((c) => c.iso)).size).toBe(PHONE_COUNTRIES.length)
    for (const c of PHONE_COUNTRIES) {
      expect(c.dial).toMatch(/^\+\d{1,3}$/)
      expect([...c.flag]).toHaveLength(2)
    }
  })
  it('the flag is the ISO code as regional indicators', () => {
    expect(flagOf('US')).toBe('🇺🇸')
    expect(phoneCountry('GB')?.dial).toBe('+44')
  })
  it('"+" searches the calling code only; a name searches names', () => {
    expect(searchPhoneCountries('+44').map((c) => c.iso)).toEqual(['GB'])
    expect(searchPhoneCountries('+1').every((c) => c.dial.startsWith('+1'))).toBe(true)
    expect(searchPhoneCountries('ukra').map((c) => c.iso)).toEqual(['UA'])
    expect(searchPhoneCountries('')).toHaveLength(PHONE_COUNTRIES.length)
  })
})
