import { describe, expect, it } from 'vitest'
import {
  LICENCE_RETURN_URL, POLAR_CHECKOUT_URL, POLAR_ORGANIZATION_ID,
  checkoutUrl, customerIdForEmail, grantedLicenceUntil, hasGrantedLicence,   interpretValidation, isActivationId, licenceFollowup, licenceReturnPath, limitActivations,
} from '../polar'

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

const DEVICE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('licenceFollowup', () => {
  const granted = { status: 'granted', expires_at: '2027-11-02T10:00:00Z' }

  it('does not activate when the benefit has no activation limit', () => {
    expect(limitActivations(granted)).toBeNull()
    expect(licenceFollowup(200, granted, null, NOW)).toEqual({
      kind: 'done',
      result: { valid: true, expiresAt: '2027-11-02T10:00:00Z' },
    })
    expect(licenceFollowup(200, { ...granted, limit_activations: null }, DEVICE, NOW).kind).toBe('done')
  })

  it('activates only once Polar reports a numeric limit and this browser has no id', () => {
    expect(licenceFollowup(200, { ...granted, limit_activations: 3 }, null, NOW)).toEqual({ kind: 'activate' })
    expect(licenceFollowup(403, { limit_activations: 3 }, null, NOW)).toEqual({ kind: 'activate' })
  })

  it('revalidates with the id this browser already has', () => {
    expect(isActivationId(DEVICE)).toBe(true)
    expect(isActivationId('not-a-uuid')).toBe(false)
    expect(licenceFollowup(200, { ...granted, limit_activations: 3 }, DEVICE, NOW)).toEqual({
      kind: 'revalidate',
      activationId: DEVICE,
    })
  })

  it('stops on a revoked key even when a limit is set', () => {
    expect(licenceFollowup(200, { status: 'revoked', expires_at: null, limit_activations: 3 }, null, NOW)).toMatchObject({
      kind: 'done',
      result: { valid: false, reason: 'revoked' },
    })
  })
})

describe('Polar identifiers', () => {
  it('uses a v4 UUID organization id (what Polar validates) and an https checkout link', () => {
    expect(POLAR_ORGANIZATION_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(POLAR_CHECKOUT_URL).toMatch(/^https:\/\/buy\.polar\.sh\/polar_cl_[A-Za-z0-9]+$/)
    expect(LICENCE_RETURN_URL).toBe('https://www.escalatokens.com/?licence=pending')
  })
})

describe('checkoutUrl', () => {
  it('leaves the link alone when there is no email', () => {
    expect(checkoutUrl(null)).toBe(POLAR_CHECKOUT_URL)
    expect(checkoutUrl('  ')).toBe(POLAR_CHECKOUT_URL)
  })

  it('prefills the signed-in email', () => {
    const url = new URL(checkoutUrl('  Buyer@Example.com '))
    expect(url.origin + url.pathname).toBe(POLAR_CHECKOUT_URL)
    expect(url.searchParams.get('customer_email')).toBe('Buyer@Example.com')
  })
})

describe('licenceReturnPath', () => {
  it('strips only the pending flag and keeps the rest of the address', () => {
    expect(licenceReturnPath('https://www.escalatokens.com/?project=x&licence=pending#a'))
      .toEqual({ pending: true, next: '/?project=x#a' })
    expect(licenceReturnPath('https://www.escalatokens.com/?licence=pending'))
      .toEqual({ pending: true, next: '/' })
  })

  it('ignores any other value', () => {
    expect(licenceReturnPath('https://www.escalatokens.com/?licence=yes')).toEqual({
      pending: false,
      next: '/?licence=yes',
    })
  })
})

describe('purchase lookup', () => {
  const NOW = new Date('2026-12-01T00:00:00Z')

  it('matches the customer by email and ignores a granted key that has expired', () => {
    const customers = { items: [{ id: 'cus_1', email: 'Buyer@Example.com' }, { id: 'cus_2', email: 'other@example.com' }] }
    expect(customerIdForEmail(customers, 'buyer@example.com')).toBe('cus_1')
    expect(customerIdForEmail(customers, 'missing@example.com')).toBeNull()
    expect(customerIdForEmail({}, 'buyer@example.com')).toBeNull()
    expect(hasGrantedLicence({ items: [{ status: 'granted', expires_at: '2027-10-09T00:00:00Z', key: 'secret' }] }, NOW)).toBe(true)
    expect(hasGrantedLicence({ items: [{ status: 'granted', expires_at: '2026-01-01T00:00:00Z' }] }, NOW)).toBe(false)
    expect(hasGrantedLicence({ items: [{ status: 'revoked' }] }, NOW)).toBe(false)
    expect(hasGrantedLicence(null, NOW)).toBe(false)
  })

  it('reports how long the grant lasts, and prefers a lifetime key', () => {
    expect(grantedLicenceUntil({ items: [{ status: 'granted', expires_at: '2027-10-09T00:00:00Z' }] }, NOW)).toBe('2027-10-09T00:00:00Z')
    expect(grantedLicenceUntil({
      items: [
        { status: 'granted', expires_at: '2027-01-01T00:00:00Z' },
        { status: 'granted', expires_at: null },
      ],
    }, NOW)).toBe('lifetime')
    expect(grantedLicenceUntil({ items: [{ status: 'revoked' }] }, NOW)).toBeNull()
  })
})
