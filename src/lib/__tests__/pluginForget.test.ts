import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { clearPublishErased, onRepublishRequested, wasPublishErased } from '../publishSignals'

// What leaves the plugin's list, and when. A system that is replaced or reset
// used to leave its published tokens behind: listed in the plugin, still read
// by every file that had synced it.

const forgotten: string[][] = []
vi.mock('../pluginAccount', () => ({
  unregisterPublishedLibraries: async (ids: string[]) => { forgotten.push(ids) },
}))

const A = 'esc_7K2M-9QX4-N3PD'
const B = 'esc_4ABC-DEFG-HJKM'
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  forgotten.length = 0
  clearPublishErased(A)
  clearPublishErased(B)
  vi.stubGlobal('window', {})
  useDesignStore.setState({ ...makeDesignDefaults(), projectCreated: true, savedSystems: [], pinned: [], publishId: A })
})
afterEach(() => vi.unstubAllGlobals())

describe('replacing the system on screen', () => {
  it('a reset keeps the id: Figma files keep following the reset system', async () => {
    useDesignStore.getState().resetToDefaults()
    await tick()
    expect(useDesignStore.getState().publishId).toBe(A)
    expect(forgotten).toEqual([])
  })

  it('a new system takes the unsaved one off the list', async () => {
    useDesignStore.getState().startNewSystem()
    await tick()
    expect(forgotten).toEqual([[A]])
    expect(useDesignStore.getState().publishId).toBe('')
  })

  it('a new system leaves a saved copy of the old one alone', async () => {
    useDesignStore.setState({
      savedSystems: [{
        id: 'local:escala', name: 'Escala', description: '', repo: '', savedAt: '2026-10-14T00:00:00Z',
        snapshot: { ...makeDesignDefaults(), publishId: A },
      }],
    })
    useDesignStore.getState().startNewSystem()
    await tick()
    expect(forgotten).toEqual([])
  })

  it('loading another saved system takes the unsaved one off, but never the loaded one', async () => {
    useDesignStore.setState({
      savedSystems: [{
        id: 'local:other', name: 'Other', description: '', repo: '', savedAt: '2026-10-14T00:00:00Z',
        snapshot: { ...makeDesignDefaults(), publishId: B },
      }],
    })
    useDesignStore.getState().loadSystem('local:other')
    await tick()
    expect(forgotten).toEqual([[A]])
    expect(useDesignStore.getState().publishId).toBe(B)
  })

  it('a new id takes the old one off the list', async () => {
    const minted = useDesignStore.getState().regeneratePublishId()
    await tick()
    expect(minted).not.toBe(A)
    expect(forgotten).toEqual([[A]])
  })

  it('removing the last brand erases what the system published, and keeps its id', async () => {
    const store = useDesignStore.getState()
    store.addTheme('aurora', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    forgotten.length = 0
    useDesignStore.getState().removeTheme('aurora')
    await tick()
    expect(forgotten).toEqual([[A]])
    expect(useDesignStore.getState().publishId).toBe(A)
  })
})

describe('what the platform follows after a deliberate delete', () => {
  const withTwoBrands = (published: boolean) => {
    const store = useDesignStore.getState()
    store.addTheme('aurora', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    useDesignStore.getState().addTheme('boreal', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    useDesignStore.setState({ figmaLastPublishAt: published ? '2026-10-14T10:00:00Z' : null })
    forgotten.length = 0
  }

  it('deleting a brand that is not the last asks for a republish, once', async () => {
    withTwoBrands(true)
    const asked = vi.fn()
    const off = onRepublishRequested(asked)
    useDesignStore.getState().removeTheme('aurora')
    await tick()
    off()
    expect(asked).toHaveBeenCalledTimes(1)
    // The system is still there: nothing was taken down.
    expect(forgotten).toEqual([])
    expect(wasPublishErased(A)).toBe(false)
  })

  it('a system that was never published does not publish itself by losing a brand', async () => {
    withTwoBrands(false)
    const asked = vi.fn()
    const off = onRepublishRequested(asked)
    useDesignStore.getState().removeTheme('aurora')
    await tick()
    off()
    expect(asked).not.toHaveBeenCalled()
  })

  it('the last brand takes the publication down, says so, and remembers it for Undo', async () => {
    const store = useDesignStore.getState()
    store.addTheme('aurora', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    useDesignStore.setState({ figmaLastPublishAt: '2026-10-14T10:00:00Z' })
    forgotten.length = 0
    useDesignStore.getState().removeTheme('aurora')
    await tick()
    expect(forgotten).toEqual([[A]])
    expect(wasPublishErased(A)).toBe(true)
    expect(useDesignStore.getState().figmaLastPublishAt).toBeNull()
    expect(useDesignStore.getState().publishId).toBe(A)
  })
})
