import { useEffect, useMemo } from 'react'
import { myThemeKeys } from './themeLibrary'
import { useThemeSetup } from './themeSetup'
import { activeLibraryId, libraryMatchesSaved, type DesignSnapshot, type SavedSystem, useDesignStore } from '../store/useDesignStore'

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

/** Pure gate for the autosave: the system on screen already has a saved copy,
 *  that copy is behind, and no brand on screen is still a draft. A draft must
 *  never be filed by a background write — saving it is the designer's call
 *  (it joins the system and counts against the plan). */
export function autosaveDue(
  state: DesignSnapshot & { savedSystems: SavedSystem[]; githubRepo: string | null; projectName: string },
  unsaved: Record<string, true>,
): boolean {
  const entry = state.savedSystems.find((item) => item.id === activeLibraryId(state))
  if (!entry) return false
  const savedKeys = new Set(entry.snapshot.themeOrder ?? [])
  if (state.themeOrder.some((key) => unsaved[key] && !savedKeys.has(key))) return false
  return !libraryMatchesSaved(state, entry.snapshot)
}

/** Longer than the activity hook's settle, so a change the Free allowance
 *  puts back is never the one that gets filed. */
const AUTOSAVE_MS = 1200

/** Files the system on screen NOW when the autosave would. Call it before
 *  replacing the system (load another, start a new one): an edit made inside
 *  the debounce would otherwise be lost with the screen. */
export function flushLibraryAutosave(): void {
  const state = useDesignStore.getState()
  if (autosaveDue(state as never, useThemeSetup.getState().unsaved)) state.saveCurrentSystem()
}

/**
 * Mounted once, in the shell. After the FIRST save (the explicit "Save
 * brand"), every later edit is kept without asking: the editor, Get code,
 * Export and the Figma sync all read the live store, so a manual "Update"
 * only ever refreshed this copy. Keeping it current is what makes switching
 * to another design system safe.
 */
export function useAutosaveLibrary(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const run = () => {
      timer = null
      const state = useDesignStore.getState()
      if (autosaveDue(state as never, useThemeSetup.getState().unsaved)) state.saveCurrentSystem()
    }
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(run, AUTOSAVE_MS)
    }
    const offStore = useDesignStore.subscribe(schedule)
    const offSetup = useThemeSetup.subscribe(schedule)
    return () => {
      offStore()
      offSetup()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
