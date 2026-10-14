import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cloudSystemCount,
  contentHash,
  nextTrimmedIds,
  planCloudSync,
  trimToPlan,
  type CloudFiles,
  type CloudSavedSystem,
} from '../accountCloud'

// An account's design systems live in the cloud, not in one browser. These
// run the real handler (Blob and Supabase in memory) and the pure decision
// the browser makes after reading it.

function snap(name: string, brands: string[], extra: Record<string, unknown> = {}) {
  const themes: Record<string, unknown> = { light: {}, dark: {} }
  for (const b of brands) themes[b] = {}
  return { projectName: name, githubRepo: null, publishId: `pub-${name}`, themeOrder: ['light', 'dark', ...brands], themes, ...extra }
}

function saved(id: string, name: string, brands: string[], savedAt: string): CloudSavedSystem {
  return { id, name, savedAt, snapshot: snap(name, brands) }
}

function files(live: ReturnType<typeof snap>, savedSystems: CloudSavedSystem[] = []): CloudFiles {
  return { snapshot: live, savedSystems, pinned: savedSystems.map((s) => s.id), autoSyncFigma: false, figmaSyncSelection: { modes: null, viewports: ['desktop'] } }
}

describe('plan limit', () => {
  const live = snap('Acme', ['acme'])
  const others = [
    saved('local:acme', 'Acme', ['acme'], '2026-10-01T00:00:00Z'),
    saved('local:old', 'Old', ['old'], '2026-09-01T00:00:00Z'),
    saved('local:new', 'New', ['new'], '2026-10-10T00:00:00Z'),
    saved('local:empty', 'Empty', [], '2026-10-11T00:00:00Z'),
  ]

  it('counts the system on screen once, and never an entry with no brand', () => {
    expect(cloudSystemCount(files(live, others))).toBe(3)
  })

  it('Free keeps only the system on screen and its own saved copy', () => {
    const { files: kept, trimmedIds } = trimToPlan(files(live, others), 1)
    expect(kept.savedSystems.map((s) => s.id)).toEqual(['local:acme', 'local:empty'])
    expect(trimmedIds.sort()).toEqual(['local:new', 'local:old'])
    expect(kept.pinned).not.toContain('local:old')
  })

  it('Pro keeps all of them', () => {
    expect(trimToPlan(files(live, others), 10).trimmedIds).toEqual([])
  })

  it('a full plan keeps the most recently saved ones', () => {
    expect(trimToPlan(files(live, others), 2).trimmedIds).toEqual(['local:old'])
  })

  it('an id stored again leaves the trimmed list', () => {
    const kept = files(live, [others[1]])
    expect(nextTrimmedIds(['local:old', 'local:new'], [], kept)).toEqual(['local:new'])
  })
})

describe('sync decision', () => {
  const base = { etag: 'e1', hash: 'h1' }
  it('no record yet: upload work, leave an empty browser alone', () => {
    expect(planCloudSync({ localHash: 'x', localHasWork: true, base: null, server: null })).toBe('push')
    expect(planCloudSync({ localHash: 'x', localHasWork: false, base: null, server: null })).toBe('same')
  })
  it('record unchanged since this browser read it: send our edits, or nothing', () => {
    expect(planCloudSync({ localHash: 'h2', localHasWork: true, base, server: { etag: 'e1', hash: 'h0' } })).toBe('push')
    // A trimmed record differs from what we sent and must not loop saves.
    expect(planCloudSync({ localHash: 'h1', localHasWork: true, base, server: { etag: 'e1', hash: 'h0' } })).toBe('same')
  })
  it('another browser saved and this one did not edit: take the account copy', () => {
    expect(planCloudSync({ localHash: 'h1', localHasWork: true, base, server: { etag: 'e2', hash: 'h9' } })).toBe('adopt')
  })
  it('a browser that never synced and holds no work takes the account copy', () => {
    expect(planCloudSync({ localHash: 'blank', localHasWork: false, base: null, server: { etag: 'e2', hash: 'h9' } })).toBe('adopt')
  })
  it('both sides changed: ask, never overwrite', () => {
    expect(planCloudSync({ localHash: 'h3', localHasWork: true, base, server: { etag: 'e2', hash: 'h9' } })).toBe('conflict')
    expect(planCloudSync({ localHash: 'h3', localHasWork: true, base: null, server: { etag: 'e2', hash: 'h9' } })).toBe('conflict')
  })
  it('identical content is never a conflict', () => {
    expect(planCloudSync({ localHash: 'h9', localHasWork: true, base: null, server: { etag: 'e2', hash: 'h9' } })).toBe('same')
  })
  it('hash is stable and content-sensitive', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'))
    expect(contentHash('abc')).not.toBe(contentHash('abd'))
  })
})

// ── The real endpoint ───────────────────────────────────────────────────

const BLOB = 'https://blob.test/'
const blobs = new Map<string, { body: string; etag: string }>()
let etagSeq = 0

vi.mock('@vercel/blob', () => {
  class BlobNotFoundError extends Error {}
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobNotFoundError,
    BlobPreconditionFailedError,
    put: async (key: string, body: string, opts: { ifMatch?: string; allowOverwrite?: boolean } = {}) => {
      const current = blobs.get(key)
      if (opts.ifMatch !== undefined && current?.etag !== opts.ifMatch) throw new BlobPreconditionFailedError()
      if (opts.allowOverwrite === false && current) throw new Error('This blob already exists')
      const etag = `"etag-${++etagSeq}"`
      blobs.set(key, { body, etag })
      return { url: `${BLOB}${key}`, etag }
    },
    head: async (key: string) => {
      if (!blobs.has(key)) throw new BlobNotFoundError()
      return { url: `${BLOB}${key}` }
    },
    get: async (key: string) => {
      const found = blobs.get(key)
      if (!found) return null
      return { statusCode: 200, stream: new Response(found.body).body, blob: { etag: found.etag } }
    },
  }
})

const USERS: Record<string, { id: string; email: string }> = {
  'jwt-ana': { id: 'user-ana', email: 'ana@example.com' },
  'jwt-bo': { id: 'user-bo', email: 'bo@example.com' },
}

function json(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response
}

function fakeFetch(input: unknown, init?: { headers?: Record<string, string> }): Promise<Response> {
  const url = String(input)
  if (url.startsWith(BLOB)) {
    const found = blobs.get(url.slice(BLOB.length))
    return Promise.resolve(found ? json(200, JSON.parse(found.body)) : json(404, null))
  }
  if (url.endsWith('/auth/v1/user')) {
    const jwt = (init?.headers?.Authorization ?? '').replace(/^Bearer /, '')
    return Promise.resolve(USERS[jwt] ? json(200, USERS[jwt]) : json(401, null))
  }
  return Promise.reject(new Error(`unexpected request: ${url}`))
}

type Handler = (req: never, res: never) => unknown
let handler: Handler

async function call(opts: { method: 'GET' | 'PUT'; jwt?: string; body?: unknown; host?: string; origin?: string }) {
  const host = opts.host ?? 'www.escalatokens.com'
  const reply = { status: 200, body: {} as Record<string, unknown> }
  const res = {
    setHeader() { return res },
    status(code: number) { reply.status = code; return res },
    json(body: Record<string, unknown>) { reply.body = body; return res },
    end() { return res },
  }
  await handler({
    method: opts.method,
    query: {},
    headers: {
      host,
      origin: opts.origin ?? `https://${host}`,
      'x-real-ip': '10.0.0.1',
      ...(opts.jwt ? { authorization: `Bearer ${opts.jwt}` } : {}),
    },
    body: opts.body ?? {},
  } as never, res as never)
  return reply
}

beforeAll(async () => {
  process.env.BLOB_PUBLIC_BASE_URL = BLOB
  process.env.VITE_SUPABASE_URL = 'https://supabase.test'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  process.env.ACCOUNT_FILES_SECRET = 'test-secret'
  delete process.env.POLAR_ACCESS_TOKEN
  vi.useFakeTimers({ now: new Date('2026-10-14T08:00:00Z'), toFake: ['Date'] })
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  handler = (await import('../../../api/account-files')).default as unknown as Handler
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => { blobs.clear() })

describe('account files endpoint', () => {
  const work = files(snap('Acme', ['acme']), [saved('local:acme', 'Acme', ['acme'], '2026-10-13T00:00:00Z')])

  it('what one browser saves, another browser — on the other host too — reads', async () => {
    const first = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 88, files: work } })
    expect(first.status).toBe(200)
    const other = await call({ method: 'GET', jwt: 'jwt-ana', host: 'escalatokens.com' })
    expect(other.status).toBe(200)
    expect(other.body.etag).toBe(first.body.etag)
    expect((other.body.record as { files: CloudFiles }).files.snapshot.projectName).toBe('Acme')
  })

  it('a browser holding an older copy is refused and handed the current one', async () => {
    const first = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 88, files: work } })
    const second = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: first.body.etag, storeVersion: 88, files: files(snap('Acme 2', ['acme'])) } })
    expect(second.status).toBe(200)
    const stale = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: first.body.etag, storeVersion: 88, files: files(snap('Lost', ['x'])) } })
    expect(stale.status).toBe(409)
    expect(stale.body.etag).toBe(second.body.etag)
    expect((stale.body.record as { files: CloudFiles }).files.snapshot.projectName).toBe('Acme 2')
    // A first save from a browser that never read is refused too.
    const blind = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 88, files: work } })
    expect(blind.status).toBe(409)
  })

  it('a record written by a newer app version is not overwritten by an older one', async () => {
    const first = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 90, files: work } })
    const old = await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: first.body.etag, storeVersion: 88, files: work } })
    expect(old.status).toBe(409)
    expect(old.body.error).toBe('outdated')
  })

  it('accounts never read each other', async () => {
    await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 88, files: work } })
    const bo = await call({ method: 'GET', jwt: 'jwt-bo' })
    expect(bo.body.record).toBeNull()
    expect([...blobs.keys()].every((k) => !k.includes('user-ana'))).toBe(true)
  })

  it('Free keeps one design system; the rest are named so the browser keeps them locally', async () => {
    const many = files(snap('Acme', ['acme']), [
      saved('local:acme', 'Acme', ['acme'], '2026-10-13T00:00:00Z'),
      saved('local:two', 'Two', ['two'], '2026-10-12T00:00:00Z'),
    ])
    const res = await call({ method: 'PUT', jwt: 'jwt-bo', body: { ifEtag: null, storeVersion: 88, files: many } })
    const record = res.body.record as { files: CloudFiles; trimmedIds: string[] }
    expect(record.files.savedSystems.map((s) => s.id)).toEqual(['local:acme'])
    expect(record.trimmedIds).toEqual(['local:two'])
  })

  it('signed out, cross-site, or a malformed payload is refused', async () => {
    expect((await call({ method: 'GET' })).status).toBe(401)
    expect((await call({ method: 'PUT', jwt: 'jwt-ana', origin: 'https://evil.test', body: { ifEtag: null, storeVersion: 88, files: work } })).status).toBe(403)
    expect((await call({ method: 'PUT', jwt: 'jwt-ana', body: { ifEtag: null, storeVersion: 88, files: { nope: true } } })).status).toBe(400)
  })
})
