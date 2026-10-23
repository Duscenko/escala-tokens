import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFiles, StoreUnavailable, writeFiles } from '../../../api/_accountFilesStore'
import type { CloudRecord } from '../accountCloud'

const record: CloudRecord = {
  v: 1,
  revision: 1,
  savedAt: '2026-10-23T00:00:00.000Z',
  storeVersion: 1,
  files: {
    snapshot: { projectName: 'Escala', themeOrder: [], themes: {} } as CloudRecord['files']['snapshot'],
    savedSystems: [],
    pinned: [],
    autoSyncFigma: false,
    figmaSyncSelection: null,
  },
  trimmedIds: [],
}

function answer(status: number, body: unknown = null): Response {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('account files store', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test')
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads no row as null and a row as its etag and record', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, []))
    expect(await readFiles('u1')).toBeNull()
    fetchMock.mockResolvedValueOnce(answer(200, [{ etag: 'e1', record }]))
    expect(await readFiles('u1')).toEqual({ etag: 'e1', record })
  })

  it('sends a new secret key only as apikey', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, []))
    await readFiles('u1')
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers.apikey).toBe('sb_secret_test')
    expect(headers.Authorization).toBeUndefined()
  })

  it('inserts the first save and calls a duplicate stale', async () => {
    fetchMock.mockResolvedValueOnce(answer(201))
    const etag = await writeFiles('u1', null, record)
    expect(typeof etag).toBe('string')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    fetchMock.mockResolvedValueOnce(answer(409, { code: '23505' }))
    expect(await writeFiles('u1', null, record)).toBe('stale')
  })

  it('updates only the row holding the etag it was given', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, [{ etag: 'new' }]))
    expect(await writeFiles('u1', 'e1', record)).not.toBe('stale')
    expect(String(fetchMock.mock.calls[0][0])).toContain('etag=eq.e1')
    fetchMock.mockResolvedValueOnce(answer(200, []))
    expect(await writeFiles('u1', 'old', record)).toBe('stale')
  })

  it('turns an error answer into StoreUnavailable', async () => {
    fetchMock.mockResolvedValueOnce(answer(500, { message: 'boom' }))
    await expect(readFiles('u1')).rejects.toBeInstanceOf(StoreUnavailable)
  })
})
