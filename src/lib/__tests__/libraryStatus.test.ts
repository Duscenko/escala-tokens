import { describe, expect, it } from 'vitest'
import { autosaveDue, savedBrandKeysFrom } from '../libraryStatus'
import { activeLibraryId, captureSnapshot, makeDesignDefaults, type SavedSystem } from '../../store/useDesignStore'

const empty = {
  themeOrder: ['light', 'dark'],
  themes: { light: {}, dark: {} },
  savedSystems: [] as { id: string; snapshot: { themeOrder?: string[] } }[],
  githubRepo: null,
  projectName: 'Escala',
}

describe('savedBrandKeysFrom', () => {
  it('ignores light/dark scaffolding', () => {
    expect(savedBrandKeysFrom(empty, {})).toEqual([])
  })

  it('treats a studio mint as unset until it is saved', () => {
    expect(savedBrandKeysFrom({
      ...empty,
      themeOrder: ['light', 'dark', 'brand'],
      themes: { light: {}, dark: {}, brand: {} },
    }, { brand: true })).toEqual([])
  })

  it('counts a brand once it has left the studio draft list', () => {
    expect(savedBrandKeysFrom({
      ...empty,
      themeOrder: ['light', 'dark', 'brand'],
      themes: { light: {}, dark: {}, brand: {} },
    }, {})).toEqual(['brand'])
  })

  it('counts a brand that already lives in the saved library', () => {
    expect(savedBrandKeysFrom({
      ...empty,
      projectName: 'Escala-DS',
      themeOrder: ['light', 'dark', 'brand'],
      themes: { light: {}, dark: {}, brand: {} },
      savedSystems: [{ id: 'local:escala-ds', snapshot: { themeOrder: ['light', 'dark', 'brand'] } }],
    }, {})).toEqual(['brand'])
  })
})

describe('autosaveDue', () => {
  const base = () => ({ ...makeDesignDefaults(), githubRepo: null, savedSystems: [] as SavedSystem[] })
  const filed = (state: ReturnType<typeof base>): SavedSystem => ({
    id: activeLibraryId(state), name: state.projectName, description: '', repo: '',
    savedAt: '2026-10-13T00:00:00.000Z', snapshot: captureSnapshot(state), source: 'local',
  })

  it('never files a system that was not saved by hand first', () => {
    expect(autosaveDue(base(), {})).toBe(false)
  })

  it('is quiet while the saved copy is current', () => {
    const state = base()
    expect(autosaveDue({ ...state, savedSystems: [filed(state)] }, {})).toBe(false)
  })

  it('files an edit made after the first save', () => {
    const state = base()
    const savedSystems = [filed(state)]
    expect(autosaveDue({ ...state, savedSystems, primaryColor: '#123456' }, {})).toBe(true)
  })

  it('waits while a brand on screen is still a draft', () => {
    const state = base()
    const savedSystems = [filed(state)]
    const edited = {
      ...state, savedSystems, primaryColor: '#123456',
      themeOrder: [...state.themeOrder, 'draft'], themes: { ...state.themes, draft: {} },
    }
    expect(autosaveDue(edited, { draft: true })).toBe(false)
    expect(autosaveDue(edited, {})).toBe(true)
  })
})
