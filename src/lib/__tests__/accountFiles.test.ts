import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  closeAccountFiles,
  onlyAutomaticBrand,
  parkAccountFiles,
  reopenAccountFiles,
  shelveAccountFiles,
  shelveSavedSystems,
} from '../accountFiles'
import { GUEST_START_STYLE, adoptPreset } from '../adoptPreset'
import { peekLoginIntent, rememberReturn } from '../loginReturn'
import { myThemeKeys } from '../themeLibrary'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { DEFAULT_THEME_SOURCES, captureSnapshot, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'

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

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage(), sessionStorage: memoryStorage() })
  useDesignStore.setState({
    ...makeDesignDefaults(),
    projectCreated: true,
    savedSystems: [],
    autoSyncFigma: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function saveAurora(): void {
  const store = useDesignStore.getState()
  store.setProjectName('My files')
  store.addTheme('aurora', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
  store.setThemeLabel('aurora', 'Aurora')
  store.saveCurrentSystem()
}

describe('account files on sign-out', () => {
  it('closes the themes and folders that were open', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()

    const closed = useDesignStore.getState()
    expect(myThemeKeys(closed.themeOrder, closed.themes)).toEqual([])
    expect(closed.savedSystems).toEqual([])
    expect(closed.projectName).toBe('Escala')
    expect(closed.autoSyncFigma).toBe(false)
  })

  it('opens the same account files again on the next sign-in', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()

    reopenAccountFiles('user-1')
    const opened = useDesignStore.getState()
    expect(myThemeKeys(opened.themeOrder, opened.themes)).toEqual(['aurora'])
    expect(opened.projectName).toBe('My files')
    expect(opened.savedSystems.map((s) => s.name)).toEqual(['My files'])

    opened.setProjectName('Edited after reopen')
    reopenAccountFiles('user-1')
    expect(useDesignStore.getState().projectName).toBe('Edited after reopen')
  })

  it('leaves a pending save on screen and shelves the closed files beside it', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()

    useDesignStore.getState().setProjectName('Draft')
    rememberReturn('library', 'save-library')
    reopenAccountFiles('user-1')

    const next = useDesignStore.getState()
    expect(next.projectName).toBe('Draft')
    expect(myThemeKeys(next.themeOrder, next.themes)).toEqual([])
    expect(next.savedSystems.map((s) => s.name)).toContain('My files')
    const shelved = next.savedSystems.find((s) => s.name === 'My files')
    expect(myThemeKeys(shelved?.snapshot.themeOrder ?? [], shelved?.snapshot.themes ?? {})).toEqual(['aurora'])
  })

  it('parks an empty workspace after the system on screen is deleted', () => {
    saveAurora()
    useDesignStore.getState().deleteCurrentSystem()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()
    expect(myThemeKeys(useDesignStore.getState().themeOrder, useDesignStore.getState().themes)).toEqual([])
    expect(useDesignStore.getState().savedSystems).toEqual([])
  })

  // Reversed 2026-11-02. It used to assert the parked system was DROPPED when
  // it had never been Saved ("a parked draft is not a folder"). Since the
  // account keeps the system on screen in the cloud, that system IS the
  // account's work: dropping it here and pushing over the record erased it
  // from every browser.
  it('files the parked system on screen beside the work, even if it was never Saved', () => {
    const store = useDesignStore.getState()
    store.setProjectName('Draft')
    store.addTheme('plio', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()
    useDesignStore.getState().setProjectName('Nature')
    rememberReturn('library', 'save-library')
    reopenAccountFiles('user-1')
    const next = useDesignStore.getState()
    expect(next.projectName).toBe('Nature')
    const filed = next.savedSystems.find((s) => s.name === 'Draft')
    expect(myThemeKeys(filed?.snapshot.themeOrder ?? [], filed?.snapshot.themes ?? {})).toEqual(['plio'])
  })
})

describe('signing in over the automatic Core a visitor gets', () => {
  function seedGuestBrand(): string {
    const core = THEME_STYLE_PRESETS.find((p) => p.id === GUEST_START_STYLE)!
    const res = adoptPreset(core, 'dark', { track: false })
    if (!('key' in res)) throw new Error(res.error)
    useDesignStore.getState().setThemeLabel(res.key, useDesignStore.getState().projectName)
    return res.key
  }

  it('is not work: the parked files come back, and the save intent is dropped', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()
    seedGuestBrand()
    expect(onlyAutomaticBrand()).toBe(true)

    rememberReturn('workspace', 'save-library')
    reopenAccountFiles('user-1')
    const next = useDesignStore.getState()
    expect(myThemeKeys(next.themeOrder, next.themes)).toEqual(['aurora'])
    expect(next.projectName).toBe('My files')
    expect(peekLoginIntent()).toBeNull()
  })

  it('a Core that was changed is work, and stays', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()
    const key = seedGuestBrand()
    const s = useDesignStore.getState()
    s.setThemeFoundations(key, { ...s.themeFoundations[key], radiusRoles: { ...s.themeFoundations[key]?.radiusRoles, action: '24px' } })
    expect(onlyAutomaticBrand()).toBe(false)

    rememberReturn('workspace', 'save-library')
    reopenAccountFiles('user-1')
    const next = useDesignStore.getState()
    expect(myThemeKeys(next.themeOrder, next.themes)).toEqual([key])
    expect(next.savedSystems.map((sys) => sys.name)).toContain('My files')
  })
})

describe('filing the account\'s systems beside other work', () => {
  it('a filed system never takes the id the system on screen saves under', () => {
    // Both are called "Escala" — the default name a visitor's system has too.
    const store = useDesignStore.getState()
    store.addTheme('aurora', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    store.saveCurrentSystem()
    const account = useDesignStore.getState().savedSystems[0]
    expect(account.id).toBe('local:escala')

    useDesignStore.setState({ ...makeDesignDefaults(), savedSystems: [] })
    useDesignStore.getState().addTheme('solo', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    shelveSavedSystems([account])
    const filed = useDesignStore.getState().savedSystems[0]
    expect(filed.id).toBe('local:escala-2')
    // The name moves with the id, so a later load-and-save files it under the same id.
    expect(filed.name).toBe('Escala 2')
    expect(filed.snapshot.projectName).toBe('Escala 2')

    // Saving the work on screen does not write over it.
    useDesignStore.getState().saveCurrentSystem()
    const all = useDesignStore.getState().savedSystems
    const brandsOf = (id: string) => {
      const sys = all.find((x) => x.id === id)
      return myThemeKeys(sys?.snapshot.themeOrder ?? [], sys?.snapshot.themes ?? {})
    }
    expect(brandsOf('local:escala')).toEqual(['solo'])
    expect(brandsOf('local:escala-2')).toEqual(['aurora'])
  })

  it('a filed system with the same brand keys as the screen is not folded into it', () => {
    // The visitor's Core and an account system started from Core share the key.
    const store = useDesignStore.getState()
    store.setProjectName('Acme')
    store.addTheme('core--minimalist', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    const accountSnapshot = captureSnapshot(useDesignStore.getState())

    useDesignStore.setState({ ...makeDesignDefaults(), savedSystems: [] })
    useDesignStore.getState().addTheme('core--minimalist', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    shelveAccountFiles(accountSnapshot, [])
    expect(useDesignStore.getState().savedSystems.map((s) => s.name)).toEqual(['Acme'])

    useDesignStore.getState().saveCurrentSystem()
    const names = useDesignStore.getState().savedSystems.map((s) => s.name).sort()
    expect(names).toEqual(['Acme', 'Escala'])
  })
})

describe('signing out with the workspace open', () => {
  it('the blank workspace gets its colour ramps back, so accent never renders transparent', async () => {
    const { watchColorScales } = await import('../colorActions')
    const stop = watchColorScales()
    expect(Object.keys(useDesignStore.getState().primaryScale).length).toBeGreaterThan(0)
    closeAccountFiles()
    const s = useDesignStore.getState()
    expect(Object.keys(s.primaryScale).length).toBeGreaterThan(0)
    expect(Object.keys(s.primaryDarkScale).length).toBeGreaterThan(0)
    expect(Object.keys(s.successScale).length).toBeGreaterThan(0)
    stop()
  })
})
