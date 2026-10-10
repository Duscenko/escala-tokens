import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkLicenceKey } from '../../../api/_licence'

const DEVICE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

afterEach(() => { vi.unstubAllGlobals() })

describe('checkLicenceKey', () => {
  it('validates once and does not activate when the benefit has no limit', async () => {
    let posted = ''
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      posted = String(init?.body ?? '')
      return { status: 200, json: async () => ({ status: 'granted', expires_at: null }) }
    })
    vi.stubGlobal('fetch', fetch)
    const result = await checkLicenceKey('KEY-NOLIMIT-1')
    expect(result).toMatchObject({ valid: true, expiresAt: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(posted)
    expect(body).not.toHaveProperty('activation_id')
    expect(body).not.toHaveProperty('label')
  })

  it('activates, then revalidates, only when Polar reports a numeric limit', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).endsWith('/activate')) return { status: 200, json: async () => ({ id: DEVICE }) }
      if (urls.length === 1) {
        return { status: 200, json: async () => ({ status: 'granted', expires_at: null, limit_activations: 2 }) }
      }
      return { status: 200, json: async () => ({ status: 'granted', expires_at: '2027-06-01T00:00:00Z' }) }
    }))
    const result = await checkLicenceKey('KEY-LIMIT-1')
    expect(result).toMatchObject({ valid: true, activationId: DEVICE, expiresAt: '2027-06-01T00:00:00Z' })
    expect(urls.map((u) => u.split('/').pop())).toEqual(['validate', 'activate', 'validate'])
  })

  it('revalidates an id this browser already has, and does not activate again', async () => {
    const sent: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)))
      expect(String(url)).toMatch(/\/validate$/)
      if (sent.length === 1) {
        return { status: 200, json: async () => ({ status: 'granted', expires_at: null, limit_activations: 2 }) }
      }
      return { status: 200, json: async () => ({ status: 'granted', expires_at: null }) }
    }))
    const result = await checkLicenceKey('KEY-REVAL-1', DEVICE)
    expect(result.activationId).toBe(DEVICE)
    expect(sent[0]).not.toHaveProperty('activation_id')
    expect(sent[1]).toMatchObject({ activation_id: DEVICE })
    expect(sent).toHaveLength(2)
  })

  it('does not activate when the caller only needs the plan', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      return { status: 200, json: async () => ({ status: 'granted', expires_at: '2027-06-01T00:00:00Z', limit_activations: 2 }) }
    }))
    const result = await checkLicenceKey('KEY-NOACT-1', null, { activate: false })
    expect(result).toMatchObject({ valid: true, expiresAt: '2027-06-01T00:00:00Z', reason: 'activation_limit' })
    expect(urls).toHaveLength(1)
    expect(urls[0]).toMatch(/\/validate$/)
  })

  it('treats a full device cap as a real key when activation is skipped', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      return { status: 403, json: async () => ({ detail: 'limit', limit_activations: 1, expires_at: '2027-08-01T00:00:00Z' }) }
    }))
    const result = await checkLicenceKey('KEY-CAP-SKIP-1', null, { activate: false })
    expect(result).toMatchObject({ valid: true, expiresAt: '2027-08-01T00:00:00Z', reason: 'activation_limit' })
    expect(urls).toHaveLength(1)
  })

  it('reports the activation cap when Polar refuses to activate', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).endsWith('/activate')) return { status: 403, json: async () => ({ detail: 'limit' }) }
      return { status: 200, json: async () => ({ status: 'granted', expires_at: null, limit_activations: 1 }) }
    }))
    const result = await checkLicenceKey('KEY-CAP-1')
    expect(result).toMatchObject({ valid: false, reason: 'activation_limit' })
    expect(urls).toHaveLength(2)
  })
})
