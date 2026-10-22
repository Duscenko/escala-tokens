import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { LICENCE_STAMP } from '../licenceGate'

// During the open beta the plugin's Save to GitHub publishes with no key and
// no session: there is nothing to buy, so asking for a licence was a dead end.
vi.mock('../openBeta', () => ({ OPEN_BETA: true, BETA_MAX_BRANDS: 5 }))

const store = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  BlobNotFoundError: class extends Error {},
  put: async (key: string, value: string) => { store.set(key, value); return { url: `https://blob.test/${key}` } },
  head: async () => { throw new Error('not used') },
}))

type Handler = (req: never, res: never) => unknown
let pluginSession: Handler

async function bridge(body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const reply = { status: 200, body: {} as Record<string, unknown> }
  const res = {
    setHeader() {}, writeHead() { return res }, end() { return res },
    status(code: number) { reply.status = code; return res },
    json(b: Record<string, unknown>) { reply.body = b; return res },
  }
  const req = {
    method: 'POST',
    query: { op: 'bridge' },
    headers: { host: 'www.escalatokens.com', origin: 'null', 'x-real-ip': '10.1.1.1' },
    body,
  }
  await pluginSession(req as never, res as never)
  return reply
}

beforeAll(async () => {
  process.env.BLOB_PUBLIC_BASE_URL = 'https://blob.test/'
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in this test'))))
  pluginSession = (await import('../../../api/plugin-session')).default as unknown as Handler
})
afterAll(() => { vi.unstubAllGlobals() })

describe('bridge during the open beta', () => {
  it('publishes with no key and no session, without a licence stamp', async () => {
    const out = await bridge({ name: 'Nova', tokens: { project: 'Nova', colors: { primitive: {} } } })
    expect(out.status).toBe(200)
    const key = [...store.keys()].find((k) => k.startsWith('tokens/'))!
    const stored = JSON.parse(store.get(key)!)
    expect(stored.project).toBe('Nova')
    expect(stored[LICENCE_STAMP]).toBeUndefined()
  })

  it('still refuses a body with no colours', async () => {
    const out = await bridge({ tokens: { project: 'x' } })
    expect(out.status).toBe(400)
  })
})
