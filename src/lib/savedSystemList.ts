// Which saved design systems Home is allowed to show.
//
// A folder exists only after Save, and only while it still holds a brand.
// Renaming the system on screen used to leave the previous `local:<slug>`
// entry behind, so it came back under "Other design systems". Deleting the
// last brand, or discarding a draft, did the same: the snapshot stayed in
// the registry and the next system listed it as something the person had
// created. Home shows created design systems and their brands — nothing else.

import { myThemeKeys } from './themeLibrary.js'
import { slugify } from './utils.js'

export interface SavedSystemRecord {
  id: string
  name: string
  source?: 'github' | 'local' | 'imported'
  snapshot: {
    projectName: string
    publishId?: string
    themeOrder?: string[]
    themes?: Record<string, unknown>
  }
}

export interface LiveSystemIdentity {
  projectName: string
  githubRepo: string | null
  publishId: string
  themeOrder: string[]
  themes: Record<string, unknown>
}

/** Same id `saveCurrentSystem` writes. Kept here so this module does not
 *  import the store. */
export function libraryIdOf(state: { githubRepo: string | null; projectName: string }): string {
  return state.githubRepo ?? `local:${slugify(state.projectName) || 'design-system'}`
}

export function savedSystemBrandKeys(sys: { snapshot: { themeOrder?: string[]; themes?: Record<string, unknown> } }): string[] {
  return myThemeKeys(sys.snapshot.themeOrder ?? [], sys.snapshot.themes ?? {})
}

function sameBrandSet(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false
  const set = new Set(a)
  return b.every((key) => set.has(key))
}

function isThisSystem<T extends SavedSystemRecord>(
  sys: T,
  live: LiveSystemIdentity,
  currentId: string,
  liveBrands: string[],
): boolean {
  if (sys.id === currentId) return true
  if (live.publishId && sys.snapshot.publishId === live.publishId) return true
  return sameBrandSet(savedSystemBrandKeys(sys), liveBrands)
}

/**
 * One record for the system on screen, plus every OTHER saved system that
 * still has a brand.
 *
 * `fold` keeps the on-screen system's saved copy and moves it onto the
 * current name, so a rename does not leave the old folder behind.
 * `drop` removes that copy — delete, or the last brand is gone.
 */
export function reconcileSavedSystems<T extends SavedSystemRecord>(
  saved: T[],
  live: LiveSystemIdentity,
  mode: 'fold' | 'drop' = 'fold',
): { savedSystems: T[]; droppedIds: string[] } {
  const currentId = libraryIdOf(live)
  const liveBrands = myThemeKeys(live.themeOrder, live.themes)
  const droppedIds: string[] = []
  const others: T[] = []
  const copies: T[] = []
  let changed = false
  for (const sys of saved) {
    if (isThisSystem(sys, live, currentId, liveBrands)) copies.push(sys)
    else others.push(sys)
  }
  if (copies.length === 0) {
    return changed ? { savedSystems: others, droppedIds } : { savedSystems: saved, droppedIds }
  }
  // Delete, or the last brand just left: the saved copy of this system goes
  // with it. An empty screen must not keep that folder for the next system.
  if (mode === 'drop') {
    for (const sys of copies) droppedIds.push(sys.id)
    return { savedSystems: others, droppedIds }
  }
  // Nothing on screen to attach the saved copy to. Leave it stored under its
  // own id; Home hides it while it is still this system (same id / publish id).
  if (liveBrands.length === 0) {
    return changed ? { savedSystems: [...others, ...copies], droppedIds } : { savedSystems: saved, droppedIds }
  }
  // A branded copy wins over an empty one of the same system, so folding
  // does not throw away the brands and keep the draft.
  const branded = copies.filter((sys) => savedSystemBrandKeys(sys).length > 0)
  const pool = branded.length > 0 ? branded : copies
  const preferred = pool.find((sys) => sys.id === currentId) ?? pool[0]
  const folded: T = preferred.source === 'github' || preferred.id === currentId
    ? preferred
    : {
        ...preferred,
        id: currentId,
        name: live.projectName,
        snapshot: { ...preferred.snapshot, projectName: live.projectName },
      }
  if (folded !== preferred) changed = true
  for (const extra of copies) {
    if (extra !== folded) {
      droppedIds.push(extra.id)
      changed = true
    }
  }
  if (!changed) return { savedSystems: saved, droppedIds }
  return { savedSystems: [...others.filter((sys) => sys.id !== folded.id), folded], droppedIds }
}

export function withoutLibraryPins(pinned: string[], droppedIds: string[]): string[] {
  if (droppedIds.length === 0) return pinned
  const drop = new Set(droppedIds)
  return pinned.filter((id) => !(id.startsWith('library:') && drop.has(id.slice('library:'.length))))
}

/** Saved systems Home lists beside the one on screen. */
export function otherDesignSystems<T extends SavedSystemRecord>(saved: T[], live: LiveSystemIdentity): T[] {
  const currentId = libraryIdOf(live)
  const liveBrands = myThemeKeys(live.themeOrder, live.themes)
  return saved.filter((sys) => {
    if (savedSystemBrandKeys(sys).length === 0) return false
    return !isThisSystem(sys, live, currentId, liveBrands)
  })
}
