import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The whole plugin sign-in, against the real handlers, with Blob, Supabase and
// Polar replaced by an in-memory stand-in. It exists for one report: a paying
// account signed in from the Figma plugin and came back as Free. The key was a
// cookie on `escalatokens.com`; the plugin opens `www.escalatokens.com`.

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
    return Promise.resolve(key === GOOD_KEY
      ? json(200, { status: 'granted', expires_at: null, limit_activations: null })
      : json(404, { detail: 'not found' }))
  }
  return Promise.reject(new Error(`unexpected request: ${url}`))
}

type Handler = (req: never, res: never) => unknown
let pluginSession: Handler
let licence: Handler

interface Reply { status: number; body: Record<string, unknown>; cookies: string[] }

async function call(
  handler: Handler,
  opts: { method?: string; op?: string; host?: string; jwt?: string; bearer?: string; cookie?: string; body?: unknown },
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
    query: opts.op ? { op: opts.op } : {},
    headers: {
      host,
      origin: `https://${host}`,
      'x-real-ip': `10.0.0.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
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
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => { store.clear() })

describe('plugin sign-in plan', () => {
  it('an account with no key anywhere signs in as Free, not as an unknown that cannot build', async () => {
    const { approve, tier } = await signInFromPlugin({ jwt: 'jwt-bo' })
    expect(approve.body).toEqual({ ok: true, plan: 'free' })
    expect(tier).toBe('free')
  })

  it('a browser that holds the key signs the plugin in as Pro and records the account', async () => {
    const { approve, tier } = await signInFromPlugin({ jwt: 'jwt-ana', cookie: `sd_licence=${GOOD_KEY}` })
    expect(approve.body).toEqual({ ok: true, plan: 'pro' })
    expect(tier).toBe('pro')
    // The next sign-in comes from a browser with no key at all.
    expect((await signInFromPlugin({ jwt: 'jwt-ana' })).tier).toBe('pro')
  })

  it('the reported bug: key on the apex, plugin opens www with no cookie', async () => {
    // Signed in on escalatokens.com with the key in that host's cookie. The
    // page's licence check carries the session, so the account is recorded.
    const check = await call(licence, { method: 'GET', host: 'escalatokens.com', jwt: 'jwt-ana', cookie: `sd_licence=${GOOD_KEY}` })
    expect(check.body).toMatchObject({ valid: true, account: true })
    // The same response moves the cookie to the whole site, so www has it too.
    expect(check.cookies.at(-1)).toContain('Domain=escalatokens.com')

    // The plugin opens www. No cookie rides along (another browser, or a build
    // from before the cookie was site-wide). Polar has no token to ask.
    const { approve, tier } = await signInFromPlugin({ host: 'www.escalatokens.com', jwt: 'jwt-ana' })
    expect(approve.body).toEqual({ ok: true, plan: 'pro' })
    expect(tier).toBe('pro')
  })

  it('a session that connected as Free turns Pro on its next open, without signing in again', async () => {
    const first = await signInFromPlugin({ jwt: 'jwt-ana' })
    expect(first.tier).toBe('free')
    await call(licence, { method: 'GET', host: 'escalatokens.com', jwt: 'jwt-ana', cookie: `sd_licence=${GOOD_KEY}` })
    const opened = await call(pluginSession, { method: 'GET', op: 'libraries', bearer: first.token })
    expect(opened.body).toMatchObject({ email: 'ana@example.com', tier: 'pro' })
  })

  it('one account proving a key does not make another account Pro', async () => {
    await call(licence, { method: 'GET', jwt: 'jwt-ana', cookie: `sd_licence=${GOOD_KEY}` })
    expect((await signInFromPlugin({ jwt: 'jwt-bo' })).tier).toBe('free')
  })

  it('a key Polar does not know records nothing', async () => {
    const check = await call(licence, { method: 'POST', jwt: 'jwt-ana', body: { key: 'ESCALA-TYPO' } })
    expect(check.body).toMatchObject({ valid: false, reason: 'unknown' })
    expect((await signInFromPlugin({ jwt: 'jwt-ana' })).tier).toBe('free')
  })
})
