import { describe, expect, it } from 'vitest'
import { POLAR_CHECKOUT_URL, POLAR_ORGANIZATION_ID, interpretValidation } from '../polar'

const NOW = new Date('2026-12-01T00:00:00Z')

describe('interpretValidation', () => {
  it('accepts a granted key and reports when it expires', () => {
    expect(interpretValidation(200, { status: 'granted', expires_at: '2027-11-02T10:00:00Z' }, NOW))
      .toEqual({ valid: true, expiresAt: '2027-11-02T10:00:00Z' })
  })

  it('accepts a granted key with no expiry', () => {
    expect(interpretValidation(200, { status: 'granted', expires_at: null }, NOW)).toEqual({ valid: true, expiresAt: null })
  })

  it('rejects a key whose expiry has passed, even if Polar still says granted', () => {
    expect(interpretValidation(200, { status: 'granted', expires_at: '2026-11-30T23:59:59Z' }, NOW))
      .toMatchObject({ valid: false, reason: 'expired' })
  })

  it('rejects a revoked or disabled key', () => {
    expect(interpretValidation(200, { status: 'revoked', expires_at: null }, NOW)).toMatchObject({ valid: false, reason: 'revoked' })
    expect(interpretValidation(200, { status: 'disabled', expires_at: null }, NOW)).toMatchObject({ valid: false, reason: 'revoked' })
  })

  it('treats 404 as an unknown key', () => {
    expect(interpretValidation(404, { error: 'ResourceNotFound' }, NOW)).toMatchObject({ valid: false, reason: 'unknown' })
  })

  it('fails closed: an outage or an odd body is never valid', () => {
    expect(interpretValidation(500, null, NOW)).toMatchObject({ valid: false, reason: 'unavailable' })
    expect(interpretValidation(422, { detail: [] }, NOW)).toMatchObject({ valid: false, reason: 'unavailable' })
    expect(interpretValidation(200, null, NOW)).toMatchObject({ valid: false, reason: 'unavailable' })
    expect(interpretValidation(200, {}, NOW)).toMatchObject({ valid: false })
  })
})

describe('Polar identifiers', () => {
  it('uses a v4 UUID organization id (what Polar validates) and an https checkout link', () => {
    expect(POLAR_ORGANIZATION_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(POLAR_CHECKOUT_URL).toMatch(/^https:\/\/buy\.polar\.sh\/polar_cl_[A-Za-z0-9]+$/)
  })
})
