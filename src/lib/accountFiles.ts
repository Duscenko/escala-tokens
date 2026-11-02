// Signing out ends the Supabase session only. Themes and folders live in the
// persisted design store, so they would stay on screen after the person left.
// Close them with the session. The copy is parked under the user id and opened
// again on the next sign-in of that same account — close, not delete. Home
// itself leaves with the session (the shell opens the guest board). A login
// that came back to finish a save or an export keeps the work on screen and
// files the parked files beside it.
//
// The automatic Core a visitor gets (`ensureGuestBrand`) is NOT work. Treating
// it as work kept Core on screen after sign-in and dropped the account's own
// system — reported 2026-11-02 as "I saved, closed, opened again: Core, and
// my brands are gone". `onlyAutomaticBrand` is the one test for it.

import { untouchedGuestSeed } from './adoptPreset'
import { FIGMA_VIEWPORTS, type FigmaSyncMode, type FigmaViewport } from './figmaSyncModes'
import { forgetLoginIntent, peekLoginIntent } from './loginReturn'
import { libraryIdOf, savedSystemBrandKeys } from './savedSystemList'
import { myThemeKeys } from './themeLibrary'
import { generatePublishId } from './publishId'
import {
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

/** The browser holds nothing of the person's own: its only brand is the
 *  untouched Core made for a visitor, and no other system is saved here. */
export function onlyAutomaticBrand(state = useDesignStore.getState()): boolean {
  if (!untouchedGuestSeed(state)) return false
  const liveId = libraryIdOf(state)
  return !state.savedSystems.some((sys) => sys.id !== liveId && savedSystemBrandKeys(sys).length > 0)
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
      autoSyncFigma: state.autoSyncFigma,
      figmaSyncSelection: state.figmaSyncSelection,
    }
    box.setItem(storageKey(userId), JSON.stringify(parked))
    return true
  } catch {
    return false
  }
}

/** Blank workspace: no My themes, no saved folders. Auto-sync stays
 *  off so the empty system does not publish over the account's blob. */
export function closeAccountFiles(): void {
  useDesignStore.setState({
    ...makeDesignDefaults(),
    projectCreated: true,
    savedSystems: [],
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
    && Array.isArray(parked.savedSystems),
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

/** A free id for a filed system. A local id is a slug of the name, so the
 *  name moves with it ("Escala" → "Escala 2", `local:escala-2`): an entry
 *  whose name no longer matches its id is folded onto the name's id by the
 *  next save, over whatever system already holds that id. */
function fileUnder(sys: SavedSystem, taken: Set<string>): SavedSystem {
  if (!taken.has(sys.id)) return sys
  let n = 2
  while (taken.has(`${sys.id}-${n}`)) n += 1
  const id = `${sys.id}-${n}`
  if (!sys.id.startsWith('local:')) return { ...sys, id }
  const name = `${sys.name} ${n}`
  return { ...sys, id, name, snapshot: { ...sys.snapshot, projectName: name } }
}

/**
 * The account's system on screen, as a saved system to file beside other
 * work. It replaces its own saved copy (the screen is never older than its
 * copy). It gets a publish id of its own if it has none, so a system on
 * screen made of the same brand keys (the visitor's Core and an account
 * system started from Core are both `core--minimalist`) is never mistaken
 * for it and folded away by the next save.
 */
export function liveAsSavedSystem(snapshot: DesignSnapshot, savedSystems: SavedSystem[]): SavedSystem[] {
  const brands = myThemeKeys(snapshot.themeOrder ?? [], (snapshot.themes ?? {}) as Record<string, unknown>)
  if (brands.length === 0) return savedSystems
  const githubRepo = snapshot.githubRepo ?? null
  const id = libraryIdOf({ githubRepo, projectName: snapshot.projectName })
  const isCopy = (sys: SavedSystem) =>
    sys.id === id || (Boolean(snapshot.publishId) && sys.snapshot?.publishId === snapshot.publishId)
  const copy = savedSystems.find(isCopy)
  const filed: SavedSystem = {
    id,
    name: snapshot.projectName,
    description: snapshot.projectDescription ?? copy?.description ?? '',
    repo: githubRepo ?? '',
    savedAt: new Date().toISOString(),
    snapshot: { ...snapshot, publishId: snapshot.publishId || generatePublishId() },
    source: githubRepo ? 'github' : (copy?.source === 'imported' ? 'imported' : 'local'),
  }
  return [...savedSystems.filter((sys) => !isCopy(sys)), filed]
}

/** File these saved systems beside the ones in the store, renaming an id
 *  that is already taken — including the id the system on screen saves
 *  under, or the next Save would write over a filed system. The system on
 *  screen is untouched. */
export function shelveSavedSystems(savedSystems: SavedSystem[]): void {
  const state = useDesignStore.getState()
  const taken = new Set([...state.savedSystems.map((s) => s.id), libraryIdOf(state)])
  const shelved: SavedSystem[] = []
  for (const sys of savedSystems) {
    if (savedSystemBrandKeys(sys).length === 0) continue
    const filed = fileUnder(sys, taken)
    taken.add(filed.id)
    shelved.push(filed)
  }
  useDesignStore.setState({
    savedSystems: shelved.length ? [...state.savedSystems, ...shelved] : state.savedSystems,
  })
}

/** The work on screen stays (someone is about to save or export it). The
 *  account's files are filed beside it: its saved systems AND the system it
 *  had on screen — dropping that one erased it from the account on the next
 *  save, since the account keeps what is on screen, not only what was Saved. */
export function shelveAccountFiles(snapshot: DesignSnapshot, savedSystems: SavedSystem[]): void {
  shelveSavedSystems(liveAsSavedSystem(snapshot, savedSystems))
}

/** Open this account's files again. No parked copy is a no-op, so a reload
 *  while already signed in does not replace the live system. */
export function reopenAccountFiles(userId: string): void {
  const parked = readPark(userId)
  if (!parked) return
  const live = useDesignStore.getState()
  // Only the automatic Core on screen: there is nothing to keep, whatever
  // the login was for. The account's files come back.
  const automatic = onlyAutomaticBrand(live)
  // An empty parked copy (every brand deleted before signing out) must not
  // replace a system made on screen since: that was the work being lost.
  const parkedEmpty = myThemeKeys(parked.snapshot.themeOrder, parked.snapshot.themes ?? {}).length === 0
  const liveHasWork = !automatic && myThemeKeys(live.themeOrder, live.themes).length > 0
  if ((peekLoginIntent() && !automatic) || (parkedEmpty && liveHasWork)) {
    shelveAccountFiles(parked.snapshot, parked.savedSystems)
  } else {
    if (automatic) forgetLoginIntent('save-library')
    useDesignStore.setState({
      ...parked.snapshot,
      projectCreated: true,
      savedSystems: parked.savedSystems,
      autoSyncFigma: Boolean(parked.autoSyncFigma),
      figmaSyncSelection: parked.figmaSyncSelection?.viewports
        ? parked.figmaSyncSelection
        : { modes: null, viewports: [...FIGMA_VIEWPORTS] },
    })
  }
  clearPark(userId)
}
