import { describe, expect, it } from 'vitest'
import { PHONE_COUNTRIES, detectCountry, flagOf, phoneCountry, searchPhoneCountries, surfaceCountry, virtualWindow } from '../phoneCountries'

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
  it('the detected country comes from the first language that names a region, and is surfaced first', () => {
    expect(detectCountry(['fr-FR', 'en-US'])).toBe('FR')
    expect(detectCountry(['xx-ZZ', 'de-AT'])).toBe('AT')
    expect(detectCountry([])).toBeUndefined()
    const list = surfaceCountry(PHONE_COUNTRIES, 'FR')
    expect(list[0].iso).toBe('FR')
    expect(list).toHaveLength(PHONE_COUNTRIES.length)
    expect(new Set(list.map((c) => c.iso)).size).toBe(list.length)
    expect(surfaceCountry(PHONE_COUNTRIES, undefined)).toBe(PHONE_COUNTRIES)
  })
  it('a long list draws only the rows in view and keeps the scroll length true', () => {
    const w = virtualWindow(240, 32, 640, 224, 6)
    expect(w.start).toBe(14)
    expect(w.end).toBe(33)
    expect(w.before + (w.end - w.start) * 32 + w.after).toBe(240 * 32)
    expect(virtualWindow(240, 0, 0, 0).end).toBeLessThanOrEqual(12)
  })
})
