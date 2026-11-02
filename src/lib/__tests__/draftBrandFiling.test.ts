import { afterEach, describe, expect, it, vi } from 'vitest'

// Reported 2026-11-02: Home listed two "Core" brands the person never saved.
// The create studio mints its brand the moment it opens (a draft, marked
// unsaved in this browser). Every save captured the WHOLE screen, so a draft
// left on the board was filed with the next save of any other brand, and Home
// (which reads the saved copy) listed it as kept. A save now files the system
// without its drafts, and so does the account-cloud upload.

vi.mock('../supabase', () => ({ accountsEnabled: false, supabase: null }))

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

async function openBrowser() {
  vi.resetModules()
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
  })
  const store = await import('../../store/useDesignStore')
  const setup = await import('../themeSetup')
  const cloud = await import('../accountCloudSync')
  const status = await import('../libraryStatus')
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  const { myThemeKeys } = await import('../themeLibrary')
  const s = () => store.useDesignStore.getState()
  const preset = (id: string) => THEME_STYLE_PRESETS.find((p) => p.id === id) ?? THEME_STYLE_PRESETS[0]
  return {
    store,
    setup,
    cloud,
    status,
    s,
    /** A style minted the way the create studio mints its brand. */
    mint: (id: string) => {
      const res = adoptPreset(preset(id), 'light')
      if (!('key' in res)) throw new Error(res.error)
      return res.key
    },
    savedBrands: () => {
      const entry = s().savedSystems.find((e) => e.id === store.activeLibraryId(s()))
      return myThemeKeys(entry?.snapshot.themeOrder ?? [], entry?.snapshot.themes ?? {})
    },
    liveBrands: () => myThemeKeys(s().themeOrder, s().themes),
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('a save files only the brands that were kept', () => {
  it('a studio draft left on the board is not filed with the next save', async () => {
    const b = await openBrowser()
    const kept = b.mint('core-minimal')
    b.s().saveCurrentSystem()

    // The studio opened again and minted a draft nobody kept.
    const draft = b.mint('material-elevation')
    b.setup.markBrandUnsaved(draft)

    // Another brand is saved from its bar.
    b.s().setThemeLabel(kept, 'Acme')
    b.s().saveCurrentSystem()

    expect(b.liveBrands()).toContain(draft)
    expect(b.savedBrands()).toEqual([kept])
    expect(b.status.savedBrandKeysFrom(b.s(), b.setup.useThemeSetup.getState().unsaved)).toEqual([kept])
  })

  it('a draft that is kept is filed', async () => {
    const b = await openBrowser()
    const draft = b.mint('core-minimal')
    b.setup.markBrandUnsaved(draft)
    b.s().saveCurrentSystem()
    expect(b.savedBrands()).toEqual([])

    b.setup.forgetUnsavedBrand(draft)
    b.s().saveCurrentSystem()
    expect(b.savedBrands()).toEqual([draft])
  })

  it('a brand the saved copy already holds is never dropped by a stale marker', async () => {
    const b = await openBrowser()
    const kept = b.mint('core-minimal')
    b.s().saveCurrentSystem()
    b.setup.markBrandUnsaved(kept)
    b.s().saveCurrentSystem()
    expect(b.savedBrands()).toEqual([kept])
  })

  it('the account cloud carries no draft', async () => {
    const b = await openBrowser()
    const kept = b.mint('core-minimal')
    const draft = b.mint('nature-organic')
    b.setup.markBrandUnsaved(draft)
    const files = b.cloud.localCloudFiles()
    const order = (files.snapshot as unknown as { themeOrder: string[] }).themeOrder
    expect(order).toContain(kept)
    expect(order).not.toContain(draft)
  })

  it('filing without a draft equals deleting that draft (one removal rule)', async () => {
    const b = await openBrowser()
    b.mint('core-minimal')
    const draft = b.mint('nature-organic')
    const filed = b.store.snapshotForFiling(b.s() as never, [draft])
    b.s().removeTheme(draft)
    const after = b.store.captureSnapshot(b.s() as never)
    for (const key of ['themes', 'themeOrder', 'themeLabels', 'themeSources', 'themeFoundations', 'themeOrigin', 'customColors', 'architectureOverrides'] as const) {
      expect(filed[key]).toEqual(after[key])
    }
  })
})
