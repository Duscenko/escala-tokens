import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Pro belongs to the ACCOUNT. The real handlers, with Blob, Supabase and Polar
// replaced by an in-memory stand-in. It exists for one report, made twice: a
// paying account was Pro in one browser and Free in every other — the second
// browser, the other host, the browser the Figma plugin opens, the plugin
// itself. The key was a cookie in one browser on `escalatokens.com`.

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
    expect(check.body).toMatchObject({ valid: true, via: 'key' })
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

/** The licence check a page makes on load. `cookie` is whether THIS browser holds the key. */
function pageLoad(browser: { host?: string; jwt?: string; cookie?: boolean }) {
  return call(licence, {
    method: 'GET',
    host: browser.host,
    jwt: browser.jwt,
    cookie: browser.cookie ? `sd_licence=${GOOD_KEY}` : undefined,
  })
}

describe('the web, in a browser that holds no key', () => {
  it('the same account is Pro in every browser it signs in to, on either host', async () => {
    // Browser 1: the key is here. This is the only place it was ever pasted.
    expect((await pageLoad({ host: 'escalatokens.com', jwt: 'jwt-ana', cookie: true })).body).toMatchObject({ valid: true, via: 'key' })
    // Browser 2, the other host, the browser Figma opens: no key in any of them.
    for (const host of ['escalatokens.com', 'www.escalatokens.com']) {
      const other = await pageLoad({ host, jwt: 'jwt-ana' })
      expect(other.status).toBe(200)
      expect(other.body).toMatchObject({ valid: true, via: 'account', hasKey: false })
    }
  })

  it('signed out, that browser is not Pro: the plan is the account’s', async () => {
    await pageLoad({ jwt: 'jwt-ana', cookie: true })
    expect((await pageLoad({})).body).toMatchObject({ valid: false, hasKey: false })
  })

  it('pasting something Polar does not know does not unseat an account that is Pro', async () => {
    await pageLoad({ jwt: 'jwt-ana', cookie: true })
    const typo = await call(licence, { method: 'POST', jwt: 'jwt-ana', body: { key: 'ESCALA-TYPO' } })
    expect(typo.body).toMatchObject({ valid: true, via: 'account' })
  })

  it('a second account signing in on the browser that holds the key is not handed Pro everywhere', async () => {
    await pageLoad({ jwt: 'jwt-ana', cookie: true })
    // Bo signs in on Ana's browser. The cookie still makes THAT browser Pro…
    expect((await pageLoad({ jwt: 'jwt-bo', cookie: true })).body).toMatchObject({ valid: true, via: 'key' })
    // …but Bo's account was not recorded: elsewhere, and in the plugin, Bo is Free.
    expect((await pageLoad({ jwt: 'jwt-bo' })).body).toMatchObject({ valid: false })
    expect((await signInFromPlugin({ jwt: 'jwt-bo', cookie: `sd_licence=${GOOD_KEY}` })).tier).toBe('pro')
    expect((await signInFromPlugin({ jwt: 'jwt-bo' })).tier).toBe('free')
  })

  it('an account that pastes the key itself is recorded, even after another account', async () => {
    await pageLoad({ jwt: 'jwt-ana', cookie: true })
    const pasted = await call(licence, { method: 'POST', jwt: 'jwt-bo', body: { key: GOOD_KEY } })
    expect(pasted.body).toMatchObject({ valid: true, via: 'key' })
    expect((await pageLoad({ jwt: 'jwt-bo' })).body).toMatchObject({ valid: true, via: 'account' })
  })
})

describe('publishing from a browser that holds no key', () => {
  const publish = (opts: { session?: string; cookie?: boolean }) => call(tokens, {
    method: 'POST',
    query: { project: 'esc_0123456789abcdefghjkmnpq' },
    cookie: opts.cookie ? `sd_licence=${GOOD_KEY}` : undefined,
    headers: opts.session ? { 'x-escala-session': opts.session } : {},
    body: { project: 'Escala', colors: { primitive: {} } },
  })

  it('is refused without a key and without an account that is Pro', async () => {
    expect((await publish({})).status).toBe(402)
    expect((await publish({ session: 'jwt-bo' })).status).toBe(402)
    expect((await publish({ session: 'not-a-session' })).status).toBe(402)
  })

  it('goes through for an account that is Pro, so the page never says Pro and then 402s', async () => {
    await pageLoad({ jwt: 'jwt-ana', cookie: true })
    const out = await publish({ session: 'jwt-ana' })
    expect(out.status).toBe(200)
    // Stamped like a publish with the key, and indexed under that key's hash
    // so a refund still finds it.
    const stored = [...store.entries()].find(([k]) => k.startsWith('tokens/'))
    expect(stored && JSON.parse(stored[1]).escalaLicence).toMatchObject({ until: null })
    expect([...store.keys()].some((k) => k.startsWith('licence-slugs/'))).toBe(true)
  })
})
