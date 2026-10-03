import { describe, expect, it } from 'vitest'
import { LICENCE_STAMP, isServable, stampLicence, stripLicence } from '../licenceGate'

const PROMO = new Date('2026-10-20T12:00:00Z')
const AFTER = new Date('2026-11-05T12:00:00Z')
const payload = { colors: { primitive: { 'accent-9': '#9522e9' } } }

describe('who may read a published system', () => {
  it('serves everything during the free launch promo, licensed or not', () => {
    expect(isServable(payload, PROMO)).toBe(true)
    expect(isServable(stampLicence(payload, '2027-11-02T00:00:00Z'), PROMO)).toBe(true)
  })

  it('stops serving an unstamped blob once the promo is over', () => {
    expect(isServable(payload, AFTER)).toBe(false)
    expect(isServable(null, AFTER)).toBe(false)
  })

  it('serves a blob published under a licence until that licence ends', () => {
    expect(isServable(stampLicence(payload, '2027-11-02T00:00:00Z'), AFTER)).toBe(true)
    expect(isServable(stampLicence(payload, '2027-11-02T00:00:00Z'), new Date('2027-11-03T00:00:00Z'))).toBe(false)
  })

  it('serves a licence that never expires', () => {
    expect(isServable(stampLicence(payload, null), new Date('2035-01-01T00:00:00Z'))).toBe(true)
  })

  it('ignores a malformed stamp rather than trusting it', () => {
    expect(isServable({ ...payload, [LICENCE_STAMP]: 'yes' }, AFTER)).toBe(false)
    expect(isServable({ ...payload, [LICENCE_STAMP]: { until: 42 } }, AFTER)).toBe(true) // non-string until = no expiry recorded
  })
})

describe('the stamp', () => {
  it('does not mutate the payload and is removed before anything consumes it', () => {
    const stamped = stampLicence(payload, '2027-11-02T00:00:00Z')
    expect(payload).not.toHaveProperty(LICENCE_STAMP)
    expect(stamped).toHaveProperty(LICENCE_STAMP)
    expect(stripLicence(stamped)).toEqual(payload)
    expect(stripLicence(payload)).toBe(payload)
  })
})

describe('a client cannot forge the stamp', () => {
  it('stripLicence drops a stamp the caller sent, so only the server can add one', () => {
    const forged = { ...payload, [LICENCE_STAMP]: { until: null } }
    const stored = stripLicence(forged)
    expect(stored).not.toHaveProperty(LICENCE_STAMP)
    expect(isServable(stored, new Date('2026-11-05T12:00:00Z'))).toBe(false)
  })
})
