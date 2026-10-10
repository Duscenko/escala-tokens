import { describe, expect, it } from 'vitest'
import { accountPlanChanged, accountPlanRecord, accountPlanState } from '../accountPlan'
import { licenceCookieDomain, licenceCookieHeaders, readLicenceCookie } from '../licenceCookie'

const now = new Date('2026-10-10T08:00:00Z')

describe('account plan record', () => {
  it('a key with no expiry is lifetime, and the record never holds the key', () => {
    const record = accountPlanRecord(null, '80ba052feca013b8', now)
    expect(record).toEqual({ until: 'lifetime', keyHash: '80ba052feca013b8', provenAt: '2026-10-10T08:00:00.000Z' })
    expect(accountPlanState(record, now)).toBe('lifetime')
  })

  it('is live until its date, then nothing', () => {
    expect(accountPlanState(accountPlanRecord('2027-01-01T00:00:00Z', 'h', now), now)).toBe('2027-01-01T00:00:00Z')
    expect(accountPlanState(accountPlanRecord('2026-01-01T00:00:00Z', 'h', now), now)).toBeNull()
  })

  it('a refund reads as revoked, and a missing or malformed record as none', () => {
    expect(accountPlanState({ ...accountPlanRecord(null, 'h', now), revoked: true }, now)).toBe('revoked')
    expect(accountPlanState(null, now)).toBeNull()
    expect(accountPlanState({ until: 12 }, now)).toBeNull()
    expect(accountPlanState({ until: 'not a date', keyHash: 'h' }, now)).toBeNull()
  })

  it('skips the write when the same key is proved again, and writes over a refund', () => {
    const stored = accountPlanRecord(null, 'h', new Date('2026-10-01T00:00:00Z'))
    expect(accountPlanChanged(stored, accountPlanRecord(null, 'h', now))).toBe(false)
    expect(accountPlanChanged(stored, accountPlanRecord('2027-01-01T00:00:00Z', 'h', now))).toBe(true)
    expect(accountPlanChanged(stored, accountPlanRecord(null, 'other', now))).toBe(true)
    expect(accountPlanChanged({ ...stored, revoked: true }, accountPlanRecord(null, 'h', now))).toBe(true)
    expect(accountPlanChanged(null, accountPlanRecord(null, 'h', now))).toBe(true)
  })
})

// The key was pasted on escalatokens.com and the plugin opens
// www.escalatokens.com. A host-only cookie made those two different browsers.
describe('licence cookie scope', () => {
  it('is set for the whole site on both of its hosts', () => {
    expect(licenceCookieDomain('escalatokens.com')).toBe('escalatokens.com')
    expect(licenceCookieDomain('www.escalatokens.com')).toBe('escalatokens.com')
    expect(licenceCookieDomain('WWW.EscalaTokens.com:443')).toBe('escalatokens.com')
    for (const host of ['escalatokens.com', 'www.escalatokens.com']) {
      const [legacy, site] = licenceCookieHeaders('KEY-1', { secure: true, host })
      expect(legacy).toMatch(/^sd_licence=; /)
      expect(legacy).toContain('Max-Age=0')
      expect(legacy).not.toContain('Domain=')
      expect(site).toContain('sd_licence=KEY-1')
      expect(site).toContain('Domain=escalatokens.com')
      expect(site).toContain('HttpOnly')
      expect(site).toContain('Secure')
    }
  })

  it('stays host-only anywhere else, and never claims a look-alike domain', () => {
    for (const host of ['localhost:5173', 'scalable-designs.vercel.app', 'notescalatokens.com', 'escalatokens.com.evil.test', undefined]) {
      expect(licenceCookieDomain(host)).toBe('')
      const headers = licenceCookieHeaders('KEY-1', { host })
      expect(headers).toHaveLength(1)
      expect(headers[0]).not.toContain('Domain=')
    }
  })

  it('clearing expires both scopes', () => {
    const cleared = licenceCookieHeaders('', { secure: true, host: 'www.escalatokens.com' })
    expect(cleared).toHaveLength(2)
    expect(cleared.every((h) => h.startsWith('sd_licence=; ') && h.includes('Max-Age=0'))).toBe(true)
    expect(cleared[1]).toContain('Domain=escalatokens.com')
  })

  it('reads the key past an empty value left by the other scope', () => {
    expect(readLicenceCookie('a=1; sd_licence=; sd_licence=KEY%2D1; b=2')).toBe('KEY-1')
    expect(readLicenceCookie('sd_licence=KEY-2')).toBe('KEY-2')
    expect(readLicenceCookie('other=1')).toBe('')
    expect(readLicenceCookie(undefined)).toBe('')
  })
})
