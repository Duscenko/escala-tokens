// Signing out ends the Supabase session only. Themes and folders live in the
// persisted design store, so they would stay on screen after the person left.
// Close them with the session. The copy is parked under the user id and opened
// again on the next sign-in of that same account — close, not delete. Home
// itself leaves with the session (the shell opens the guest board). A login
// that came back to finish a save or an export keeps the work on screen and
// shelves the parked files beside it.

import { FIGMA_VIEWPORTS, type FigmaSyncMode, type FigmaViewport } from './figmaSyncModes'
import { peekLoginIntent } from './loginReturn'
import { myThemeKeys } from './themeLibrary'
import {
  activeLibraryId,
  captureSnapshot,
  makeDesignDefaults,
  useDesignStore,
  type DesignSnapshot,
  type SavedSystem,
} from '../store/useDesignStore'

const KEY_PREFIX = 'sd-account-files:'

interface ParkedAccountFiles {
  snapshot: DesignSnapshot
  savedSystems: SavedSystem[]
  pinned: string[]
  autoSyncFigma: boolean
  figmaSyncSelection: { modes: FigmaSyncMode[] | null; viewports: FigmaViewport[] }
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Write the open system, its folders and pins under this account. False when
 *  the write failed — the caller must not then wipe the only copy. */
export function parkAccountFiles(userId: string): boolean {
  const box = storage()
  if (!userId || !box) return false
  try {
    const state = useDesignStore.getState()
    const parked: ParkedAccountFiles = {
      snapshot: captureSnapshot(state),
      savedSystems: state.savedSystems,
      pinned: state.pinned,
      autoSyncFigma: state.autoSyncFigma,
      figmaSyncSelection: state.figmaSyncSelection,
    }
    box.setItem(storageKey(userId), JSON.stringify(parked))
    return true
  } catch {
    return false
  }
}

/** Blank workspace: no My themes, no saved folders, no pins. Auto-sync stays
 *  off so the empty system does not publish over the account's blob. */
export function closeAccountFiles(): void {
  useDesignStore.setState({
    ...makeDesignDefaults(),
    projectCreated: true,
    savedSystems: [],
    pinned: [],
    autoSyncFigma: false,
    figmaSyncSelection: { modes: null, viewports: [...FIGMA_VIEWPORTS] },
  })
}

function isParked(value: unknown): value is ParkedAccountFiles {
  if (!value || typeof value !== 'object') return false
  const parked = value as Partial<ParkedAccountFiles>
  return Boolean(
    parked.snapshot
    && typeof parked.snapshot.projectName === 'string'
    && Array.isArray(parked.snapshot.themeOrder)
    && Array.isArray(parked.savedSystems)
    && Array.isArray(parked.pinned),
  )
}

function readPark(userId: string): ParkedAccountFiles | null {
  const box = storage()
  if (!userId || !box) return null
  try {
    const raw = box.getItem(storageKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isParked(parsed) ? parsed : null
  } catch {
    return null
  }
}

function clearPark(userId: string): void {
  try { storage()?.removeItem(storageKey(userId)) } catch { /* ignore */ }
}

function uniqueId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) return id
  let n = 2
  while (taken.has(`${id}-${n}`)) n += 1
  return `${id}-${n}`
}

/** The open system stays (someone is about to save or export it). Parked
 *  themes become folders next to it so signing in does not throw them away. */
function shelveBesideLive(parked: ParkedAccountFiles): void {
  const state = useDesignStore.getState()
  const taken = new Set(state.savedSystems.map((s) => s.id))
  const shelved: SavedSystem[] = []
  if (myThemeKeys(parked.snapshot.themeOrder, parked.snapshot.themes).length > 0) {
    const id = uniqueId(activeLibraryId(parked.snapshot), taken)
    taken.add(id)
    shelved.push({
      id,
      name: parked.snapshot.projectName,
      description: parked.snapshot.projectDescription,
      repo: parked.snapshot.githubRepo ?? '',
      savedAt: new Date().toISOString(),
      snapshot: parked.snapshot,
      source: parked.snapshot.githubRepo ? 'github' : 'local',
    })
  }
  for (const sys of parked.savedSystems) {
    const id = uniqueId(sys.id, taken)
    taken.add(id)
    shelved.push(id === sys.id ? sys : { ...sys, id })
  }
  useDesignStore.setState({
    savedSystems: shelved.length ? [...state.savedSystems, ...shelved] : state.savedSystems,
    pinned: [...new Set([...state.pinned, ...parked.pinned])],
  })
}

/** Open this account's files again. No parked copy is a no-op, so a reload
 *  while already signed in does not replace the live system. */
export function reopenAccountFiles(userId: string): void {
  const parked = readPark(userId)
  if (!parked) return
  if (peekLoginIntent()) shelveBesideLive(parked)
  else {
    useDesignStore.setState({
      ...parked.snapshot,
      projectCreated: true,
      savedSystems: parked.savedSystems,
      pinned: parked.pinned,
      autoSyncFigma: Boolean(parked.autoSyncFigma),
      figmaSyncSelection: parked.figmaSyncSelection?.viewports
        ? parked.figmaSyncSelection
        : { modes: null, viewports: [...FIGMA_VIEWPORTS] },
    })
  }
  clearPark(userId)
}
