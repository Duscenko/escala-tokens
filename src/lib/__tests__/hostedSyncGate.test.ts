// The hosted-sync gate, end to end through the real handlers: what
// `api/tokens.ts` and the MCP loader answer before and after the free promo.
// Blob storage and Polar are stubbed; the handlers, the gate and the date rule
// are the real ones.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (key: string, body: string) => { store.set(key, body); return { url: `https://blob.test/${key}` } }),
}))

vi.mock('../../../api/_blob.js', async () => {
  const actual = await vi.importActual<typeof import('../../../api/_blob.js')>('../../../api/_blob.js')
  return {
    ...actual,
    rateLimited: () => false,
    forgetBlob: () => {},
    learnBlobBase: () => {},
    readJsonBlob: async (key: string) => {
      const raw = store.get(key)
      return raw ? JSON.parse(raw) : null
    },
  }
})

import handler from '../../../api/tokens'

const PROMO = '2026-10-05T12:00:00Z'
const AFTER = '2026-11-05T12:00:00Z'
const KEY = 'ESCALA-GOOD-KEY'

function polar(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, json: async () => body })))
}

function call(method: 'GET' | 'POST', opts: { body?: unknown; licence?: string } = {}) {
  let code = 0
  let json: unknown
  const headers: Record<string, string> = {}
  const res = {
    setHeader: (k: string, v: string) => { headers[k] = v },
    status(c: number) { code = c; return res },
    json(b: unknown) { json = b; return res },
    writeHead() { return res },
    end() { return res },
  }
  const req = {
    method,
    query: { project: 'esc_TEST' },
    headers: {
      host: 'www.escalatokens.com',
      origin: 'https://www.escalatokens.com',
      ...(opts.licence ? { 'x-escala-license': opts.licence } : {}),
    },
    body: opts.body,
  }
  return handler(req as never, res as never).then(() => ({ code, json: json as Record<string, unknown>, headers }))
}

const tokens = { colors: { primitive: { 'accent-9': '#9522e9' } } }

beforeEach(() => { store.clear(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('during the free launch promo', () => {
  beforeEach(() => { vi.setSystemTime(new Date(PROMO)) })

  it('publishes and reads without any licence', async () => {
    expect((await call('POST', { body: tokens })).code).toBe(200)
    const read = await call('GET')
    expect(read.code).toBe(200)
    expect(read.json).toEqual(tokens)
  })

  it('drops a stamp the client sends, so it cannot buy itself a licence', async () => {
    await call('POST', { body: { ...tokens, escalaLicence: { until: null } } })
    const stored = JSON.parse([...store.values()].find((v) => v.includes('accent-9'))!)
    expect(stored).not.toHaveProperty('escalaLicence')
  })
})

describe('after the promo', () => {
  beforeEach(() => { vi.setSystemTime(new Date(PROMO)) })

  it('refuses to publish without a key (402) and writes nothing', async () => {
    vi.setSystemTime(new Date(AFTER))
    const r = await call('POST', { body: tokens })
    expect(r.code).toBe(402)
    expect(String(r.json.error)).toMatch(/Escala Pro/)
    expect(store.size).toBe(0)
  })

  it('refuses a key Polar does not know (402)', async () => {
    vi.setSystemTime(new Date(AFTER))
    polar(404, { error: 'ResourceNotFound' })
    expect((await call('POST', { body: tokens, licence: 'ESCALA-NOPE-1' })).code).toBe(402)
    expect(store.size).toBe(0)
  })

  it('says "retry" (503), not "pay", when Polar is down', async () => {
    vi.setSystemTime(new Date(AFTER))
    polar(500, null)
    const r = await call('POST', { body: tokens, licence: 'ESCALA-DOWN-1' })
    expect(r.code).toBe(503)
    expect(store.size).toBe(0)
  })

  it('publishes with a valid key, and the plugin can read it without one', async () => {
    vi.setSystemTime(new Date(AFTER))
    polar(200, { status: 'granted', expires_at: '2027-11-02T00:00:00Z' })
    expect((await call('POST', { body: tokens, licence: KEY })).code).toBe(200)
    const read = await call('GET')
    expect(read.code).toBe(200)
    expect(read.json).toEqual(tokens) // the stamp never reaches the consumer
  })

  it('stops serving a blob left over from the promo (402), no-store', async () => {
    await call('POST', { body: tokens }) // published during the promo, unstamped
    vi.setSystemTime(new Date(AFTER))
    const read = await call('GET')
    expect(read.code).toBe(402)
    expect(read.headers['Cache-Control']).toBe('no-store')
  })

  it('stops serving a licensed blob once the licence has expired', async () => {
    vi.setSystemTime(new Date(AFTER))
    polar(200, { status: 'granted', expires_at: '2027-11-02T00:00:00Z' })
    await call('POST', { body: tokens, licence: KEY })
    vi.setSystemTime(new Date('2027-11-03T00:00:00Z'))
    expect((await call('GET')).code).toBe(402)
  })
})
