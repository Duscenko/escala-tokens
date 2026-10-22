import { createHash } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LICENCE_STAMP } from '../licenceGate'
// These tests pin the PAID rules, so they run with the open beta switched off.
vi.mock('../openBeta', () => ({ OPEN_BETA: false, BETA_MAX_BRANDS: 5 }))


// The plugin's "My themes" list. Reported: systems deleted on the web kept
// appearing in the plugin and kept syncing. The real handlers, with Blob,
// Supabase and Polar replaced by an in-memory stand-in.

const BLOB = 'https://blob.test/'
const store = new Map<string, string>()

vi.mock('@vercel/blob', () => {
  class BlobNotFoundError extends Error {}
  return {
    BlobNotFoundError,
    put: async (key: string, body: string) => {
      store.set(key, body)
      return { url: `${BLOB}${key}` }
    },
    head: async (key: string) => {
      if (!store.has(key)) throw new BlobNotFoundError()
      return { url: `${BLOB}${key}` }
    },
  }
})

const USERS: Record<string, { id: string; email: string }> = {
  'jwt-ana': { id: 'user-ana', email: 'ana@example.com' },
  'jwt-bo': { id: 'user-bo', email: 'bo@example.com' },
}
const GOOD_KEY = 'ESCALA-GOOD-KEY'

function json(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response
}

function fakeFetch(input: unknown, init?: { headers?: Record<string, string>; body?: string }): Promise<Response> {
  const url = String(input)
  if (url.startsWith(BLOB)) {
    const raw = store.get(url.slice(BLOB.length))
    return Promise.resolve(raw === undefined ? json(404, null) : json(200, JSON.parse(raw)))
  }
  if (url.endsWith('/auth/v1/user')) {
    const jwt = (init?.headers?.Authorization ?? '').replace(/^Bearer /, '')
    const user = USERS[jwt]
    return Promise.resolve(user ? json(200, user) : json(401, null))
  }
  if (url.endsWith('/license-keys/validate')) {
    const key = (JSON.parse(init?.body ?? '{}') as { key?: string }).key
    // Polar names the customer a key was sold to. Ana bought this one.
    return Promise.resolve(key === GOOD_KEY
      ? json(200, { status: 'granted', expires_at: null, limit_activations: null, customer: { email: 'Ana@Example.com' } })
      : json(404, { detail: 'not found' }))
  }
  return Promise.reject(new Error(`unexpected request: ${url}`))
}

type Handler = (req: never, res: never) => unknown
let pluginSession: Handler
let licence: Handler
let tokens: Handler

interface Reply { status: number; body: Record<string, unknown>; cookies: string[] }

async function call(
  handler: Handler,
  opts: {
    method?: string; op?: string; host?: string; jwt?: string; bearer?: string; cookie?: string; body?: unknown
    query?: Record<string, string>; headers?: Record<string, string>
  },
): Promise<Reply> {
  const host = opts.host ?? 'www.escalatokens.com'
  const reply: Reply = { status: 200, body: {}, cookies: [] }
  const res = {
    setHeader(name: string, value: string | string[]) {
      if (name.toLowerCase() === 'set-cookie') reply.cookies = Array.isArray(value) ? value : [value]
    },
    writeHead() { return res },
    status(code: number) { reply.status = code; return res },
    json(body: Record<string, unknown>) { reply.body = body; return res },
    end() { return res },
  }
  const token = opts.jwt ?? opts.bearer
  const req = {
    method: opts.method ?? 'POST',
    query: { ...(opts.op ? { op: opts.op } : {}), ...(opts.query ?? {}) },
    headers: {
      host,
      origin: `https://${host}`,
      'x-real-ip': `10.0.0.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ?? {},
  }
  await handler(req as never, res as never)
  return reply
}

/** Press Sign in in the plugin, confirm in the browser, let the plugin poll. */
async function signInFromPlugin(browser: { host?: string; jwt: string; cookie?: string }) {
  const start = await call(pluginSession, { op: 'start' })
  const code = String(start.body.code)
  const approve = await call(pluginSession, { op: 'approve', ...browser, body: { code, libraries: [] } })
  const poll = await call(pluginSession, { op: 'poll', body: { code, pollSecret: start.body.pollSecret } })
  return { approve, tier: poll.body.tier, token: String(poll.body.token) }
}

beforeAll(async () => {
  process.env.BLOB_PUBLIC_BASE_URL = BLOB
  process.env.VITE_SUPABASE_URL = 'https://supabase.test'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  delete process.env.POLAR_ACCESS_TOKEN
  // After the launch promo: nobody is Pro by default.
  vi.useFakeTimers({ now: new Date('2026-10-10T08:00:00Z'), toFake: ['Date'] })
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  pluginSession = (await import('../../../api/plugin-session')).default as unknown as Handler
  licence = (await import('../../../api/license')).default as unknown as Handler
  tokens = (await import('../../../api/tokens')).default as unknown as Handler
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// The read cache is per module, and Date is frozen: move the clock past its TTL
// so one test's blobs are never served to the next.
beforeEach(() => { store.clear(); vi.setSystemTime(Date.now() + 60_000) })

beforeEach(() => { store.clear() })

const A = 'esc_7K2M-9QX4-N3PD'
const B = 'esc_4ABC-DEFG-HJKM'
const C = 'esc_5PQR-STVW-XYZ0'
const slugOf = (id: string) => id.toLowerCase().replace(/[^a-z0-9-]/g, '')
const tokenKey = (id: string) => `tokens/${slugOf(id)}.json`
const claimKey = (id: string) => `claims/${slugOf(id)}.json`
const sha = (v: string) => createHash('sha256').update(v).digest('hex')
const SYSTEM = {
  colors: { primitive: { 'accent-9': '#9522e9' } },
  // Published under a licence, so it is readable after the launch promo.
  escalaLicence: { until: null, sealed: '2026-10-10T07:00:00.000Z' },
}

async function signIn(browser: { jwt: string; cookie?: string }, libraries: Array<{ id: string; name: string }>) {
  const start = await call(pluginSession, { op: 'start' })
  const code = String(start.body.code)
  await call(pluginSession, { op: 'approve', ...browser, body: { code, libraries } })
  const poll = await call(pluginSession, { op: 'poll', body: { code, pollSecret: start.body.pollSecret } })
  return { token: String(poll.body.token), poll: poll.body }
}
const asPro = { jwt: 'jwt-ana', cookie: `sd_licence=${GOOD_KEY}` }
const list = (token: string) => call(pluginSession, { method: 'GET', op: 'libraries', bearer: token })
const storedList = () => {
  const key = [...store.keys()].find((k) => k.startsWith('plugin-libraries/'))
  return key ? (JSON.parse(store.get(key)!).libraries as Array<{ id: string }>).map((l) => l.id) : []
}

describe('My themes shows what exists, for Pro', () => {
  it('drops a system whose published tokens are gone, and the stored list forgets it', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    // B was never published: its id was minted by opening the Figma page.
    const { token, poll } = await signIn(asPro, [{ id: A, name: 'Apollo' }, { id: B, name: 'Phantom' }])
    expect((poll.libraries as Array<{ id: string }>).map((l) => l.id)).toEqual([A])
    const opened = await list(token)
    expect(opened.body).toMatchObject({ tier: 'pro' })
    expect((opened.body.libraries as Array<{ id: string }>).map((l) => l.id)).toEqual([A])
    expect(storedList()).toEqual([A])
  })

  it('drops a system that was deleted, but keeps one it cannot read', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    store.set(tokenKey(B), JSON.stringify(SYSTEM))
    const { token } = await signIn(asPro, [{ id: A, name: 'Apollo' }, { id: B, name: 'Borealis' }])
    store.set(tokenKey(B), JSON.stringify({ escalaDeleted: { at: '2026-10-14T00:00:00Z' } }))
    expect((await list(token)).body.libraries).toHaveLength(1)

    // Blob answers 500 for A: a blip is not a deletion.
    const base = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((input, init) =>
      String(input).endsWith(tokenKey(A)) ? Promise.resolve(json(500, null)) : base(input, init))
    const blip = await list(token)
    vi.mocked(fetch).mockImplementation(base)
    expect((blip.body.libraries as Array<{ id: string }>).map((l) => l.id)).toEqual([A])
    expect(storedList()).toEqual([A])
  })

  it('Free gets no folders at all, and is told why', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    const { token, poll } = await signIn({ jwt: 'jwt-bo' }, [{ id: A, name: 'Apollo' }])
    expect(poll).toMatchObject({ tier: 'free', libraries: [], locked: true })
    expect((await list(token)).body).toMatchObject({ tier: 'free', libraries: [], locked: true })
    // Nothing was thrown away: the list is there if the account goes Pro.
    expect(storedList()).toEqual([A])
  })
})

describe('deleting a system on the web', () => {
  const unregister = (token: string, body: Record<string, unknown>) =>
    call(pluginSession, { op: 'unregister', bearer: token, body })

  it('a claimed system needs its claim: the right one erases it and the API answers 410', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    store.set(claimKey(A), JSON.stringify({ hash: sha('the-claim') }))
    const { token } = await signIn(asPro, [{ id: A, name: 'Apollo' }])

    const wrong = await unregister(token, { ids: [A], deleteSystems: true, claims: { [A]: 'not-it' } })
    expect(wrong.body).toMatchObject({ erased: [], kept: [A] })
    expect(JSON.parse(store.get(tokenKey(A))!)).toEqual(SYSTEM)
    expect((await call(tokens, { method: 'GET', query: { project: slugOf(A) } })).status).toBe(200)

    const right = await unregister(token, { ids: [A], deleteSystems: true, claims: { [A]: 'the-claim' } })
    expect(right.body).toMatchObject({ ok: true, erased: [A], libraries: [] })
    const read = await call(tokens, { method: 'GET', query: { project: slugOf(A) } })
    expect(read.status).toBe(410)
    expect(read.body).toMatchObject({ deleted: true })
    expect(storedList()).toEqual([])
  })

  it('the plugin’s own Remove only unlists: the published system stays up', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    const { token } = await signIn(asPro, [{ id: A, name: 'Apollo' }])
    const removed = await unregister(token, { ids: [A] })
    expect(removed.body).toMatchObject({ ok: true, libraries: [], erased: [] })
    expect((await call(tokens, { method: 'GET', query: { project: slugOf(A) } })).status).toBe(200)
  })

  it('an unclaimed system is erased only by an account that lists it', async () => {
    store.set(tokenKey(A), JSON.stringify(SYSTEM))
    store.set(tokenKey(C), JSON.stringify(SYSTEM))
    const { token } = await signIn(asPro, [{ id: A, name: 'Apollo' }])
    const out = await unregister(token, { ids: [A, C], deleteSystems: true })
    expect(out.body).toMatchObject({ erased: [A], kept: [C] })
    expect(JSON.parse(store.get(tokenKey(C))!)).toEqual(SYSTEM)
  })

  it('a never-published id is simply unlisted', async () => {
    const { token } = await signIn(asPro, [{ id: B, name: 'Phantom' }])
    const out = await unregister(token, { ids: [B], deleteSystems: true })
    expect(out.body).toMatchObject({ ok: true, erased: [B], libraries: [] })
    expect(store.has(tokenKey(B))).toBe(false)
  })
})

// Save to GitHub from the plugin publishes the file's system first (op=bridge).
// The plugin has no login: it sends its licence key in X-Escala-Licence. The
// bridge used to read only a session Bearer, so every plugin call got a 401
// and the plugin then erased the key it had stored.
describe('bridge from the plugin (paid rules)', () => {
  const body = { name: 'Apollo', tokens: { project: 'Apollo', colors: { primitive: {} } } }

  it('a good licence key publishes, unclaimed and stamped', async () => {
    const out = await call(pluginSession, { op: 'bridge', body, headers: { 'x-escala-licence': GOOD_KEY } })
    expect(out.status).toBe(200)
    const id = String(out.body.id)
    expect(id).toMatch(/^esc_/)
    const stored = JSON.parse(store.get(tokenKey(id))!)
    expect(stored.project).toBe('Apollo')
    expect(stored[LICENCE_STAMP]).toBeDefined()
    expect([...store.keys()].some((k) => k.startsWith('plugin-libraries/'))).toBe(false)
  })

  it('no key and a bad key are told Pro is needed, never "Sign in again"', async () => {
    const none = await call(pluginSession, { op: 'bridge', body })
    const bad = await call(pluginSession, { op: 'bridge', body, headers: { 'x-escala-licence': 'nope' } })
    expect(none.status).toBe(402)
    expect(bad.status).toBe(402)
    expect(store.size).toBe(0)
  })
})
