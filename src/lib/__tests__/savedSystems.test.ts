import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { otherDesignSystems } from '../savedSystemList'
import { resolvePreviewTokens } from '../previewTokens'

/**
 * The Systems popover (`HomeActions.tsx`) renders `savedSystems` UNFILTERED.
 *
 * It used to filter `source !== 'github'` ("local kits only — GitHub-backed
 * systems have their own push flow"), which is incompatible with how
 * `buildSavedSystemEntry` assigns provenance: `source` is `'github'` whenever
 * `githubRepo` is set, so once a repo was connected, saving from the popover
 * wrote an entry the popover itself then hid. The user saw the confirmation
 * tick and an unchanged list — indistinguishable from a save that failed.
 *
 * These assert the two halves of that contract so the filter cannot come back
 * without a failing test explaining why it shouldn't.
 */
describe('saveCurrentSystem provenance', () => {
  beforeEach(() => {
    useDesignStore.setState({ savedSystems: [], githubRepo: null, projectName: 'Escala' })
  })

  it('stamps source "local" and a local: id when no repo is connected', () => {
    useDesignStore.setState({ projectName: 'Acme' })
    useDesignStore.getState().saveCurrentSystem()
    const [entry] = useDesignStore.getState().savedSystems
    expect(entry.source).toBe('local')
    expect(entry.id).toBe('local:acme')
    expect(entry.repo).toBe('')
  })

  it('stamps source "github" and the repo id once a repo is connected', () => {
    useDesignStore.setState({ projectName: 'Acme', githubRepo: 'acme/design-system' })
    useDesignStore.getState().saveCurrentSystem()
    const [entry] = useDesignStore.getState().savedSystems
    expect(entry.source).toBe('github')
    expect(entry.id).toBe('acme/design-system')
  })

  it('a GitHub-connected save is still listed — the popover must not filter it out', () => {
    useDesignStore.setState({ projectName: 'Acme', githubRepo: 'acme/design-system' })
    useDesignStore.getState().saveCurrentSystem()
    const all = useDesignStore.getState().savedSystems
    expect(all).toHaveLength(1)
    // The regression: this is what the popover used to render.
    expect(all.filter((s) => s.source !== 'github')).toHaveLength(0)
    // …so filtering is exactly what made a real save look like a no-op.
    expect(all.some((s) => s.name === 'Acme')).toBe(true)
  })

  it('reusing a name updates that system rather than appending a second one', () => {
    useDesignStore.setState({ projectName: 'Acme' })
    useDesignStore.getState().saveCurrentSystem()
    useDesignStore.getState().saveCurrentSystem()
    expect(useDesignStore.getState().savedSystems).toHaveLength(1)
  })
})

/**
 * `Configurator` clamps the previewed theme to one the current system has:
 *
 *   previewTheme = themeOrder.includes(raw) ? raw : (themeOrder[0] ?? 'light')
 *
 * These pin the FACT that makes that clamp necessary, at the layer the clamp
 * protects. Without it, loading a theme-scoped system left `previewTheme`
 * pointing at a theme the system no longer carries, and `resolvePreviewTokens`
 * fell through `themes[key] ?? themes.light ?? {}` to an empty map with kind
 * 'light' — rendering a fully LIGHT preview of a Dark-only system.
 */
describe('previewTheme against a theme-scoped system', () => {
  beforeEach(() => {
    useDesignStore.setState({ savedSystems: [], githubRepo: null, projectName: 'DarkOnly' })
  })

  it('a dark-scoped save carries only that theme', () => {
    useDesignStore.getState().saveCurrentSystemAsTheme('dark')
    const [saved] = useDesignStore.getState().savedSystems
    expect(saved.snapshot.themeOrder).toEqual(['dark'])
    expect(Object.keys(saved.snapshot.themes)).toEqual(['dark'])
  })

  it('resolving it under a theme it does not have yields a LIGHT render — what the clamp prevents', () => {
    useDesignStore.getState().saveCurrentSystemAsTheme('dark')
    const [saved] = useDesignStore.getState().savedSystems
    useDesignStore.getState().loadSystem(saved.id)
    const state = useDesignStore.getState()

    expect(state.themeOrder).toEqual(['dark'])
    expect('light' in state.themes).toBe(false)

    // The dangling case: a theme the system does not carry.
    const stale = resolvePreviewTokens(state, 'light')
    // The clamped case: `themeOrder[0]`, which is what Configurator now uses.
    const clamped = resolvePreviewTokens(state, state.themeOrder[0])

    expect(stale.surface).not.toBe(clamped.surface)
    // Sanity on which is which — the dark theme's page is the dark one.
    expect(clamped.surface).toBe(state.darkBackground)
  })
})

describe('Home lists only design systems that still have a brand', () => {
  beforeEach(() => {
    useDesignStore.setState({
      ...makeDesignDefaults(),
      projectCreated: true,
      savedSystems: [],
      githubRepo: null,
    })
  })

  function saveNamed(name: string, brand: string) {
    const store = useDesignStore.getState()
    store.setProjectName(name)
    store.addTheme(brand, 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    store.saveCurrentSystem()
  }

  it('folds a renamed system so the old folder is not another design system', () => {
    saveNamed('Default Escala', 'plio')
    useDesignStore.getState().setProjectName('Nature')
    useDesignStore.getState().reconcileSavedSystems()
    const state = useDesignStore.getState()
    expect(state.savedSystems.map((s) => s.id)).toEqual(['local:nature'])
    expect(state.savedSystems[0]?.name).toBe('Nature')
    expect(otherDesignSystems(state.savedSystems, state)).toEqual([])
  })

  it('keeps a saved system whose brands are different', () => {
    saveNamed('Nature', 'plio')
    const nature = useDesignStore.getState().savedSystems[0]
    useDesignStore.setState({
      ...makeDesignDefaults(),
      projectCreated: true,
      projectName: 'Cedar',
      savedSystems: [nature],
      githubRepo: null,
    })
    useDesignStore.getState().addTheme('cedar', 'light', { ...DEFAULT_THEME_SOURCES, brand: 'accent' })
    const state = useDesignStore.getState()
    expect(otherDesignSystems(state.savedSystems, state).map((s) => s.name)).toEqual(['Nature'])
  })

  it('drops the saved folder when the last brand is deleted', () => {
    saveNamed('Nature', 'plio')
    useDesignStore.getState().removeTheme('plio')
    expect(useDesignStore.getState().savedSystems).toEqual([])
  })

  it('drops the old folder when the system on screen is deleted', () => {
    saveNamed('Default Escala', 'plio')
    useDesignStore.getState().setProjectName('Nature')
    useDesignStore.getState().deleteCurrentSystem()
    expect(useDesignStore.getState().savedSystems).toEqual([])
  })
})
