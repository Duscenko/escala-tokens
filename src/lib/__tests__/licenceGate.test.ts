import { describe, expect, it } from 'vitest'
import { LICENCE_SEAL_MS, LICENCE_STAMP, isServable, stampLicence, stripLicence } from '../licenceGate'

const PROMO = new Date('2026-10-05T12:00:00Z')
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

  it('serves a licence that never expires while its seal is still fresh', () => {
    const now = new Date('2026-11-05T12:00:00Z')
    expect(isServable(stampLicence(payload, null, now), now)).toBe(true)
  })

  it('stops serving 30 days after the last publish, even when the licence runs longer', () => {
    const sealed = new Date('2026-11-05T12:00:00.000Z')
    const stamped = stampLicence(payload, '2027-11-02T00:00:00Z', sealed)
    expect(isServable(stamped, new Date(sealed.getTime() + LICENCE_SEAL_MS - 1))).toBe(true)
    expect(isServable(stamped, new Date(sealed.getTime() + LICENCE_SEAL_MS))).toBe(false)
    expect(isServable(stampLicence(payload, null, sealed), new Date(sealed.getTime() + LICENCE_SEAL_MS))).toBe(false)
  })

  it('still honours a stamp written before seals existed, until the licence date', () => {
    const legacy = { ...payload, [LICENCE_STAMP]: { until: '2027-11-02T00:00:00Z' } }
    expect(isServable(legacy, new Date('2027-11-01T00:00:00Z'))).toBe(true)
    expect(isServable(legacy, new Date('2027-11-03T00:00:00Z'))).toBe(false)
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
