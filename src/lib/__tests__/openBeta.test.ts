// The open beta (lib/openBeta.ts): everything open for everyone, web and
// plugin, with ONE cost limit — `BETA_MAX_BRANDS` brands per design system.
// The paid rules keep their own tests, run with the switch off.

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
import { BETA_MAX_BRANDS, OPEN_BETA, entitlementAt } from '../entitlement'
import { betaBrandLimitReached, freeAnotherThemeBlockedNow } from '../freeThemeLimit'
import { isServable } from '../licenceGate'

// Well after every promo and launch date the paid rules know about.
const LATER = '2027-03-01T12:00:00Z'

function call(method: 'GET' | 'POST', body?: unknown) {
  let code = 0
  let json: unknown
  const res = {
    setHeader: () => {},
    status(c: number) { code = c; return res },
    json(b: unknown) { json = b; return res },
    writeHead() { return res },
    end() { return res },
  }
  const req = {
    method,
    query: { project: 'esc_BETA' },
    headers: { host: 'www.escalatokens.com', origin: 'https://www.escalatokens.com' },
    body,
  }
  return handler(req as never, res as never).then(() => ({ code, json }))
}

beforeEach(() => { store.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(LATER)) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('open beta', () => {
  it('is on, and grants everything with the beta brand limit, whatever the date', () => {
    expect(OPEN_BETA).toBe(true)
    const e = entitlementAt(new Date(LATER))
    expect(e.promo).toBe(true)
    expect(e.pro).toBe(true)
    expect(e.maxThemes).toBe(BETA_MAX_BRANDS)
  })

  it('caps a design system at five brands, for everyone', () => {
    expect(BETA_MAX_BRANDS).toBe(5)
    expect(betaBrandLimitReached(4)).toBe(false)
    expect(betaBrandLimitReached(5)).toBe(true)
    // No session in tests: the beta limit applies with or without an account.
    expect(freeAnotherThemeBlockedNow(4)).toBe(false)
    expect(freeAnotherThemeBlockedNow(5)).toBe(true)
  })

  it('publishes and serves with no licence and no account', async () => {
    const tokens = { colors: { primitive: { 'accent-9': '#9522e9' } } }
    expect((await call('POST', tokens)).code).toBe(200)
    const read = await call('GET')
    expect(read.code).toBe(200)
    expect(read.json).toEqual(tokens)
  })

  it('serves an unstamped blob after every paid cutoff', () => {
    expect(isServable({ colors: {} }, new Date(LATER))).toBe(true)
  })
})
