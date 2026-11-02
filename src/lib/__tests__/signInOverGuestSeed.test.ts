import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Reported 2026-11-02: "I save my design system, close it, open it again, and
// it shows the default Core (blue) — not the brands I saved."
//
// Every visitor who is not signed in gets Core made for them
// (`ensureGuestBrand`). That automatic brand counted as work, so the header's
// plain "Sign in" recorded a `save-library` intent, and on the way back:
//   - `reopenAccountFiles` kept Core on screen and dropped the parked system;
//   - the cloud engine pushed Core over the account's record, filing only the
//     account's OTHER saved systems beside it.
// The account's own system on screen was gone, in every browser.
//
// Each "browser" is a fresh module graph (its own store and storage); the
// cloud is an in-memory server with the etag rule of `api/account-files.ts`.

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

async function openBrowser(storage: { local: Storage; session: Storage } = { local: memoryStorage(), session: memoryStorage() }) {
  vi.resetModules()
  vi.stubGlobal('window', {
    localStorage: storage.local,
    sessionStorage: storage.session,
    addEventListener() {},
    removeEventListener() {},
  })
  const store = await import('../../store/useDesignStore')
  const engine = await import('../accountCloudSync')
  const files = await import('../accountFiles')
  const login = await import('../loginReturn')
  const { adoptPreset, GUEST_START_STYLE } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  const { myThemeKeys } = await import('../themeLibrary')
  const brands = () => {
    const s = store.useDesignStore.getState()
    return myThemeKeys(s.themeOrder, s.themes)
  }
  return {
    ...engine,
    ...files,
    ...login,
    storage,
    store: store.useDesignStore,
    brands,
    /** A brand made and kept (Save brand files the system as a saved copy). */
    addBrand: (key: string, label: string, save = true) => {
      const s = store.useDesignStore.getState()
      s.addTheme(key, 'light', { ...store.DEFAULT_THEME_SOURCES, brand: 'accent' })
      s.setThemeLabel(key, label)
      if (save) s.saveCurrentSystem()
    },
    /** Core, made the way `ensureGuestBrand` makes it for a visitor. */
    seedGuestBrand: () => {
      const core = THEME_STYLE_PRESETS.find((p) => p.id === GUEST_START_STYLE)!
      const res = adoptPreset(core, 'dark', { track: false })
      if (!('key' in res)) throw new Error(res.error)
      const name = store.useDesignStore.getState().projectName.trim()
      if (name) store.useDesignStore.getState().setThemeLabel(res.key, name)
      return res.key
    },
    /** Every brand across the account's saved systems. */
    savedBrands: () => store.useDesignStore.getState().savedSystems
      .flatMap((sys) => myThemeKeys(sys.snapshot.themeOrder ?? [], sys.snapshot.themes ?? {})),
  }
}

function cloudBrands(): string[] {
  const files = cloud?.record.files as {
    snapshot: { themeOrder: string[]; themes: Record<string, unknown> }
  } | undefined
  if (!files) return []
  return files.snapshot.themeOrder.filter((k) => k !== 'light' && k !== 'dark')
}

function cloudSavedBrands(): string[] {
  const files = cloud?.record.files as {
    savedSystems: Array<{ snapshot: { themeOrder?: string[] } }>
  } | undefined
  return (files?.savedSystems ?? []).flatMap((s) => (s.snapshot.themeOrder ?? []).filter((k) => k !== 'light' && k !== 'dark'))
}

beforeEach(() => {
  cloud = null
  seq = 0
  vi.stubGlobal('fetch', vi.fn(server))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signing in over the automatic Core brand', () => {
  it('a browser that only holds the automatic Core opens the account\'s brands', async () => {
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora')
    a.addBrand('borealis', 'Borealis')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()
    const saved = cloud?.etag

    // Another browser (or the other host, or a cleared one): a visitor first,
    // so Core is made for them, then the header's Sign in.
    const b = await openBrowser()
    b.seedGuestBrand()
    b.rememberReturn('workspace', 'save-library')
    b.reopenAccountFiles('user-1')
    await b.startAccountCloud('user-1')

    expect(b.brands().sort()).toEqual(['aurora', 'borealis'])
    expect(b.store.getState().projectName).toBe('Acme')
    // The account was not overwritten with Core.
    expect(cloud?.etag).toBe(saved)
    expect(cloudBrands().sort()).toEqual(['aurora', 'borealis'])
    b.stopAccountCloud()
  })

  it('signing out and back in on the same browser brings the brands back, not Core', async () => {
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    // Sign out: save, park, close — then the guest board makes Core.
    await a.flushAccountCloudForSignOut()
    expect(a.parkAccountFiles('user-1')).toBe(true)
    a.closeAccountFiles()
    a.seedGuestBrand()
    expect(a.brands()).toHaveLength(1)

    // Sign in from the header.
    a.rememberReturn('workspace', 'save-library')
    a.reopenAccountFiles('user-1')
    await a.startAccountCloud('user-1')

    expect(a.brands()).toEqual(['aurora'])
    expect(a.store.getState().projectName).toBe('Acme')
    expect(cloudBrands()).toEqual(['aurora'])
    a.stopAccountCloud()
  })

  it('a reload after that sign-in still shows the brands', async () => {
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora')
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()

    const b = await openBrowser()
    b.seedGuestBrand()
    b.rememberReturn('workspace', 'save-library')
    b.reopenAccountFiles('user-1')
    await b.startAccountCloud('user-1')
    b.stopAccountCloud()

    // The same browser, opened again: its storage survives, the module graph does not.
    const again = await openBrowser({ local: b.storage.local, session: memoryStorage() })
    again.store.setState(b.store.getState())
    await again.startAccountCloud('user-1')
    expect(again.brands()).toEqual(['aurora'])
    expect(cloudBrands()).toEqual(['aurora'])
    again.stopAccountCloud()
  })
})

describe('a guest with real work signing in to an account that has a system', () => {
  it('keeps the guest work on screen and files the account\'s system beside it — nothing is lost', async () => {
    // The account's system was never filed as a saved copy (only Save brand
    // does that); it lives in the record's snapshot alone.
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora', false)
    await a.startAccountCloud('user-1')
    a.stopAccountCloud()
    expect(cloudSavedBrands()).toEqual([])

    const b = await openBrowser()
    b.store.getState().setProjectName('Side project')
    b.addBrand('solo', 'Solo', false)
    b.rememberReturn('workspace', 'save-library')
    b.reopenAccountFiles('user-1')
    await b.startAccountCloud('user-1')

    // The work they came back to save stays on screen…
    expect(b.brands()).toEqual(['solo'])
    // …and the account's own system is filed beside it, here and in the cloud.
    expect(b.savedBrands()).toContain('aurora')
    expect(cloudBrands()).toEqual(['solo'])
    expect(cloudSavedBrands()).toContain('aurora')
    b.stopAccountCloud()
  })

  it('the same browser: the parked system is filed beside the work, not dropped', async () => {
    const a = await openBrowser()
    a.store.getState().setProjectName('Acme')
    a.addBrand('aurora', 'Aurora', false)
    await a.startAccountCloud('user-1')
    await a.flushAccountCloudForSignOut()
    expect(a.parkAccountFiles('user-1')).toBe(true)
    a.closeAccountFiles()

    // Real guest work: a brand of their own, not the automatic one.
    a.store.getState().setProjectName('Side project')
    a.addBrand('solo', 'Solo', false)
    a.rememberReturn('workspace', 'save-library')
    a.reopenAccountFiles('user-1')
    await a.startAccountCloud('user-1')

    expect(a.brands()).toEqual(['solo'])
    expect(a.savedBrands()).toContain('aurora')
    expect(cloudSavedBrands()).toContain('aurora')
    a.stopAccountCloud()
  })
})
