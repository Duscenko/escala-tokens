import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({
  accountsEnabled: true,
  supabase: null,
  authProviders: [],
}))

import { hasStoredSession } from '../auth'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

describe('hasStoredSession', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is false with no auth key', () => {
    expect(hasStoredSession()).toBe(false)
  })

  it('is true when a Supabase session blob is in localStorage', () => {
    window.localStorage.setItem('sb-example-auth-token', JSON.stringify({
      access_token: 'tok',
      user: { id: 'u1' },
    }))
    expect(hasStoredSession()).toBe(true)
  })
})
