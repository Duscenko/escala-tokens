import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeAccountFiles, parkAccountFiles, reopenAccountFiles } from '../accountFiles'
import { rememberReturn } from '../loginReturn'
import { myThemeKeys } from '../themeLibrary'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'

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
    pinned: [],
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
  store.togglePinned('theme:aurora')
}

describe('account files on sign-out', () => {
  it('closes the themes and folders that were open', () => {
    saveAurora()
    expect(parkAccountFiles('user-1')).toBe(true)
    closeAccountFiles()

    const closed = useDesignStore.getState()
    expect(myThemeKeys(closed.themeOrder, closed.themes)).toEqual([])
    expect(closed.savedSystems).toEqual([])
    expect(closed.pinned).toEqual([])
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
    expect(opened.pinned).toEqual(['theme:aurora'])

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
})
