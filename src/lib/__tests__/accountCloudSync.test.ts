import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Two browsers, one account. Each "browser" is a fresh module graph (its own
// store, its own localStorage); the cloud is an in-memory server with the
// same etag rule as `api/account-files.ts`.

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

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function server(_url: unknown, init?: { method?: string; body?: string }): Promise<Response> {
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
  const { myThemeKeys } = await import('../themeLibrary')
  return {
    ...engine,
    store: store.useDesignStore,
    brands: () => {
      const s = store.useDesignStore.getState()
      return myThemeKeys(s.themeOrder, s.themes)
    },
    addBrand: (key: string, label: string) => {
      const s = store.useDesignStore.getState()
      s.addTheme(key, 'light', { ...store.DEFAULT_THEME_SOURCES, brand: 'accent' })
      s.setThemeLabel(key, label)
      s.saveCurrentSystem()
    },
  }
}

beforeEach(() => {
  cloud = null
  vi.stubGlobal('fetch', vi.fn(server))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('account files across browsers', () => {
  it('a brand saved in one browser opens in another, and edits travel back', async () => {
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    expect(a.useAccountCloud.getState().status).toBe('saved')
    a.stopAccountCloud()

    const b = await openBrowser()
    expect(b.brands()).toEqual([])
    await b.startAccountCloud('user-1')
    expect(b.useAccountCloud.getState().status).toBe('saved')
    expect(b.brands()).toEqual(['aurora'])
    expect(b.store.getState().projectName).toBe('Acme')
    expect(b.store.getState().savedSystems.length).toBeGreaterThan(0)

    b.addBrand('borealis', 'Borealis')
    await b.flushAccountCloud()
    expect(b.useAccountCloud.getState().status).toBe('saved')
    b.stopAccountCloud()

    // Browser A comes back: it has not edited since it synced, so it takes
    // the account's copy without asking.
    const again = await openBrowser()
    expect(again.brands()).toEqual([])
    await again.startAccountCloud('user-1')
    expect(again.brands().sort()).toEqual(['aurora', 'borealis'])
    again.stopAccountCloud()
  })

  it('two browsers that both changed are asked, and nothing is overwritten', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()
    const savedEtag = cloud?.etag

    const b = await openBrowser()
    b.addBrand('solo', 'Solo')
    await b.startAccountCloud('user-1')
    expect(b.useAccountCloud.getState().status).toBe('conflict')
    // Nothing was written while the person decides.
    expect(cloud?.etag).toBe(savedEtag)

    await b.resolveAccountCloudConflict('cloud')
    expect(b.brands()).toEqual(['aurora'])
    // The version left behind is kept in this browser.
    expect(window.localStorage.getItem('sd-account-cloud-backup:user-1')).toContain('solo')
    b.stopAccountCloud()
  })

  it('keeping this browser saves it over the account copy it was shown', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()

    const b = await openBrowser()
    b.addBrand('solo', 'Solo')
    await b.startAccountCloud('user-1')
    await b.resolveAccountCloudConflict('local')
    expect(b.useAccountCloud.getState().status).toBe('saved')
    const stored = cloud?.record.files as { snapshot: { themeOrder: string[] } }
    expect(stored.snapshot.themeOrder).toContain('solo')
    b.stopAccountCloud()
  })

  it('sign-out uploads an empty workspace after the last design system is deleted', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.store.getState().deleteCurrentSystem()
    expect(a.brands()).toEqual([])
    await a.flushAccountCloudForSignOut()
    const { myThemeKeys } = await import('../themeLibrary')
    const stored = cloud?.record.files as { snapshot: { themeOrder: string[]; themes: Record<string, unknown> } }
    expect(myThemeKeys(stored.snapshot.themeOrder, stored.snapshot.themes)).toEqual([])
  })

  it('sign-out finishes while the sync UI is in conflict', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()

    const b = await openBrowser()
    b.addBrand('solo', 'Solo')
    await b.startAccountCloud('user-1')
    expect(b.useAccountCloud.getState().status).toBe('conflict')

    await b.flushAccountCloudForSignOut()
    expect(b.useAccountCloud.getState().status).toBe('off')
  })

  it('stopping before sign-out closes the files means the blank workspace is never uploaded', async () => {
    const a = await openBrowser()
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    const before = cloud?.etag
    a.stopAccountCloud()
    const { closeAccountFiles } = await import('../accountFiles')
    closeAccountFiles()
    await a.flushAccountCloud()
    expect(cloud?.etag).toBe(before)
  })
})
