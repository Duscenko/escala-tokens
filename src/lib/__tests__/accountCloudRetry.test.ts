import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The account sync when the server is NOT fine: an HTML error page from the
// platform, a 503, a 502 on the save. The engine must sort every one of those
// into "try again later" — never into a dead end that only a reload leaves —
// and Save brand must land at once, not after the metering gap.

vi.mock('../supabase', () => ({
  accountsEnabled: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'jwt', user: { id: 'user-1' } } } }),
    },
  },
}))

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

let cloud: { etag: string; record: Record<string, unknown> } | null = null
let seq = 0
/** What the server answers instead of working. `null` = healthy. */
let outage: (() => Response) | null = null
let puts = 0

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const html502 = () => new Response('<html>502 Bad Gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } })
const unconfigured = () => reply(503, { error: 'unconfigured' })

async function server(_url: unknown, init?: { method?: string; body?: string; keepalive?: boolean }): Promise<Response> {
  if (init?.method === 'PUT') puts += 1
  if (outage) return outage()
  if (!init?.method || init.method === 'GET') return reply(200, { etag: cloud?.etag ?? null, record: cloud?.record ?? null })
  const body = JSON.parse(init.body ?? '{}') as { ifEtag: string | null; storeVersion: number; files: unknown }
  if ((cloud?.etag ?? null) !== body.ifEtag) return reply(409, { error: 'stale', etag: cloud?.etag ?? null, record: cloud?.record ?? null })
  const record = {
    v: 1,
    revision: ((cloud?.record.revision as number) ?? 0) + 1,
    savedAt: new Date().toISOString(),
    storeVersion: body.storeVersion,
    files: body.files,
    trimmedIds: [],
  }
  cloud = { etag: `e${++seq}`, record }
  return reply(200, { etag: cloud.etag, record })
}

async function openBrowser() {
  vi.resetModules()
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
  })
  const store = await import('../../store/useDesignStore')
  const engine = await import('../accountCloudSync')
  return {
    ...engine,
    store: store.useDesignStore,
    status: () => engine.useAccountCloud.getState().status,
    addBrand: (key: string, label: string) => {
      const s = store.useDesignStore.getState()
      s.addTheme(key, 'light', { ...store.DEFAULT_THEME_SOURCES, brand: 'accent' })
      s.setThemeLabel(key, label)
      s.saveCurrentSystem()
    },
  }
}

function storedBrands(): string[] {
  const files = cloud?.record.files as { snapshot: { themeOrder: string[] } } | undefined
  return files?.snapshot.themeOrder ?? []
}

beforeEach(() => {
  cloud = null
  outage = null
  puts = 0
  vi.stubGlobal('fetch', vi.fn(server))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('account sync when the server fails', () => {
  it('an HTML error page on the first read is offline, not a dead end, and Try again recovers', async () => {
    outage = html502
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    expect(a.status()).toBe('offline')
    expect(a.accountCloudSettled()).toBe(false)

    outage = null
    await a.retryAccountCloud()
    expect(a.status()).toBe('saved')
    expect(storedBrands()).toContain('aurora')
    a.stopAccountCloud()
  })

  it('a 502 on the save keeps pushing: Try again lands it', async () => {
    const a = await openBrowser()
    await a.startAccountCloud('user-1')
    expect(a.status()).toBe('saved')

    outage = html502
    a.addBrand('aurora', 'Aurora')
    await a.flushAccountCloud({ force: true })
    expect(a.status()).toBe('offline')
    expect(storedBrands()).toEqual([])

    outage = null
    await a.retryAccountCloud()
    expect(a.status()).toBe('saved')
    expect(storedBrands()).toContain('aurora')
    a.stopAccountCloud()
  })

  it("the server's own 503 unconfigured is unavailable, and still comes back", async () => {
    const a = await openBrowser()
    await a.startAccountCloud('user-1')
    outage = unconfigured
    a.addBrand('aurora', 'Aurora')
    await a.flushAccountCloud({ force: true })
    expect(a.status()).toBe('unavailable')

    outage = null
    await a.retryAccountCloud()
    expect(a.status()).toBe('saved')
    expect(storedBrands()).toContain('aurora')
    a.stopAccountCloud()
  })

  it('retries on its own, further apart each time, until the server is back', async () => {
    // Only the clock is faked: setImmediate stays real so the promise chain
    // behind a retry (session → fetch → answer) can be drained after each step.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const settle = () => new Promise<void>((resolve) => setImmediate(resolve))
    // The retry schedules the push with a 0 ms timer at the window's edge:
    // one more millisecond runs it, then the chain behind it is drained.
    const advance = async (ms: number) => {
      await vi.advanceTimersByTimeAsync(ms)
      await settle()
      await vi.advanceTimersByTimeAsync(1)
      await settle()
      await settle()
    }
    const a = await openBrowser()
    await a.startAccountCloud('user-1')
    outage = html502
    a.addBrand('aurora', 'Aurora')
    await a.flushAccountCloud({ force: true })
    expect(a.status()).toBe('offline')
    const failedPuts = puts

    // 30 s → second try; 2 min → third; then every 5 min.
    await advance(30_000)
    expect(puts).toBe(failedPuts + 1)
    await advance(120_000)
    expect(puts).toBe(failedPuts + 2)
    await advance(300_000)
    expect(puts).toBe(failedPuts + 3)

    outage = null
    await advance(300_000)
    expect(a.status()).toBe('saved')
    expect(storedBrands()).toContain('aurora')
    a.stopAccountCloud()
  })

  it('a forced flush skips the write gap: two saves in a row both land', async () => {
    const a = await openBrowser()
    await a.startAccountCloud('user-1')
    a.addBrand('aurora', 'Aurora')
    await a.flushAccountCloud({ force: true })
    expect(storedBrands()).toContain('aurora')
    expect(storedBrands()).not.toContain('borealis')
    a.addBrand('borealis', 'Borealis')
    await a.flushAccountCloud({ force: true })
    expect(storedBrands()).toContain('borealis')
    expect(a.status()).toBe('saved')
    a.stopAccountCloud()
  })

  it('a page going away sends a small save with keepalive', async () => {
    const a = await openBrowser()
    await a.startAccountCloud('user-1')
    a.addBrand('aurora', 'Aurora')
    await a.flushAccountCloud({ force: true, keepalive: true })
    const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => (c[1] as { method?: string })?.method === 'PUT')
    expect((put?.[1] as { keepalive?: boolean }).keepalive).toBe(true)
    a.stopAccountCloud()
  })

  it('a conflict still blocks: no retry writes over the account while the person decides', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()
    const savedEtag = cloud?.etag

    const b = await openBrowser()
    b.addBrand('solo', 'Solo')
    await b.startAccountCloud('user-1')
    expect(b.status()).toBe('conflict')
    await b.retryAccountCloud()
    await b.flushAccountCloud({ force: true })
    expect(b.status()).toBe('conflict')
    expect(cloud?.etag).toBe(savedEtag)
    b.stopAccountCloud()
  })
})
