import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetLicenceForTests, activateLicence, clearLicence, getLicenceKey } from '../licence'

function stubStorage() {
  const mem = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v) },
    removeItem: (k: string) => { mem.delete(k) },
  })
  return mem
}

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, json: async () => body })))
}

describe('licence key handling', () => {
  let mem: Map<string, string>
  beforeEach(() => { mem = stubStorage(); __resetLicenceForTests(null) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('keeps a key the server accepts, and says when it ends', async () => {
    answer(200, { valid: true, expiresAt: '2027-11-02T10:00:00Z' })
    const r = await activateLicence('  ESCALA-ABC  ')
    expect(r).toMatchObject({ status: 'valid', expiresAt: '2027-11-02T10:00:00Z', hasKey: true })
    expect(getLicenceKey()).toBe('ESCALA-ABC')
    expect(mem.get('sd-licence-key')).toBe('ESCALA-ABC')
  })

  it('does NOT keep a key the server rejects — a typo must not be sent on every publish', async () => {
    answer(200, { valid: false, expiresAt: null, reason: 'unknown' })
    const r = await activateLicence('ESCALA-TYPO')
    expect(r).toMatchObject({ status: 'invalid', hasKey: false })
    expect(getLicenceKey()).toBeNull()
    expect(mem.has('sd-licence-key')).toBe(false)
  })

  it('reports an expired key without keeping it', async () => {
    answer(200, { valid: false, expiresAt: '2026-11-30T00:00:00Z', reason: 'expired' })
    expect(await activateLicence('ESCALA-OLD')).toMatchObject({ status: 'expired', hasKey: false })
    expect(getLicenceKey()).toBeNull()
  })

  it('keeps the key when the validator is down — that says nothing about the key', async () => {
    answer(502, { valid: false, reason: 'unavailable' })
    expect(await activateLicence('ESCALA-GOOD')).toMatchObject({ status: 'unavailable', hasKey: true })
    expect(getLicenceKey()).toBe('ESCALA-GOOD')
  })

  it('treats a network failure as unavailable, never as valid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await activateLicence('ESCALA-X')).status).toBe('unavailable')
  })

  it('removes the key on request', async () => {
    answer(200, { valid: true, expiresAt: null })
    await activateLicence('ESCALA-ABC')
    clearLicence()
    expect(getLicenceKey()).toBeNull()
    expect(mem.has('sd-licence-key')).toBe(false)
  })
})
