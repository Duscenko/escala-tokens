import { useMemo } from 'react'
import { activeLibraryId, libraryMatchesSaved, type DesignSnapshot, useDesignStore } from '../store/useDesignStore'

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
