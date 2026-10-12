import { useMemo } from 'react'
import { myThemeKeys } from './themeLibrary'
import { useThemeSetup } from './themeSetup'
import { activeLibraryId, libraryMatchesSaved, type DesignSnapshot, useDesignStore } from '../store/useDesignStore'

/** Own brands that a saved library already holds — everything else in
 *  `sd-brand-unsaved` is still a studio draft. Sync helper for first paint
 *  and persist hydration; `useSavedBrandKeys` is the live subscription. */
export function savedBrandKeysFrom(state: {
  themeOrder: string[]
  themes: Record<string, unknown>
  savedSystems: { id: string; snapshot: { themeOrder?: string[] } }[]
  githubRepo: string | null
  projectName: string
}, unsaved: Record<string, true> = useThemeSetup.getState().unsaved): string[] {
  const entry = state.savedSystems.find((item) => item.id === activeLibraryId(state))
  const savedKeys = new Set(entry?.snapshot.themeOrder ?? [])
  const drafts = new Set(Object.keys(unsaved).filter((key) => !savedKeys.has(key)))
  return myThemeKeys(state.themeOrder, state.themes).filter((key) => !drafts.has(key))
}

/**
 * Where the system on screen stands against its entry in My libraries:
 * `none` (never saved), `dirty` (saved, edited since) or `saved` (matches).
 * It is NOT `themeHasEdits` — that one means "differs from the style it was
 * made from" and drives Reset, a different question from "is this saved".
 */
export function useLibraryStatus(): 'none' | 'dirty' | 'saved' {
  const store = useDesignStore()
  const savedLibrary = store.savedSystems.find((entry) => entry.id === activeLibraryId(store))
  return useMemo(() => {
    if (!savedLibrary) return 'none'
    return libraryMatchesSaved(store as unknown as DesignSnapshot, savedLibrary.snapshot) ? 'saved' : 'dirty'
  }, [store, savedLibrary])
}

/**
 * Brand keys made in this browser that the saved copy of the system on screen
 * does not hold yet. They exist (the board paints them) but are not part of
 * the design system until the designer saves: the System tab, its counts and
 * Variables leave them out.
 */
export function useUnsavedBrands(): Set<string> {
  const unsaved = useThemeSetup((s) => s.unsaved)
  const savedSystems = useDesignStore((s) => s.savedSystems)
  const currentId = useDesignStore((s) => activeLibraryId(s))
  return useMemo(() => {
    const entry = savedSystems.find((item) => item.id === currentId)
    const savedKeys = new Set(entry?.snapshot.themeOrder ?? [])
    return new Set(Object.keys(unsaved).filter((key) => !savedKeys.has(key)))
  }, [unsaved, savedSystems, currentId])
}

/** `myThemeKeys` without the unsaved ones — what the system really holds. */
export function useSavedBrandKeys(): string[] {
  const themeOrder = useDesignStore((s) => s.themeOrder)
  const themes = useDesignStore((s) => s.themes)
  const savedSystems = useDesignStore((s) => s.savedSystems)
  const githubRepo = useDesignStore((s) => s.githubRepo)
  const projectName = useDesignStore((s) => s.projectName)
  const unsaved = useThemeSetup((s) => s.unsaved)
  return useMemo(
    () => savedBrandKeysFrom({ themeOrder, themes, savedSystems, githubRepo, projectName }, unsaved),
    [themeOrder, themes, savedSystems, githubRepo, projectName, unsaved],
  )
}
