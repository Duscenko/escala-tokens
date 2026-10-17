/**
 * Account cloud files — the shape, the plan limit and the sync decision.
 *
 * Pure and store-free: `api/account-files.ts` and the browser engine
 * (`accountCloudSync.ts`) both import it, so the server and the client can
 * never disagree on what a valid payload is or which systems a plan keeps.
 */
import { libraryIdOf, savedSystemBrandKeys } from './savedSystemList.js'
import { myThemeKeys } from './themeLibrary.js'

export const ACCOUNT_FILES_PATH = '/api/account-files'

/** Design systems an account keeps in the cloud (Free holds 1).
 *  Must equal `FREE_SYSTEM_LIMIT` in `freeThemeLimit.ts`. */
export const FREE_CLOUD_SYSTEMS = 1
export const PRO_CLOUD_SYSTEMS = 10

/** Under Vercel's 4.5 MB request body limit, with room for the envelope. */
export const MAX_CLOUD_BYTES = 4_000_000
const MAX_TRIMMED_IDS = 200

export interface CloudSnapshot {
  projectName: string
  githubRepo?: string | null
  publishId?: string
  themeOrder: string[]
  themes: Record<string, unknown>
  [key: string]: unknown
}

export interface CloudSavedSystem {
  id: string
  name: string
  savedAt?: string
  snapshot: CloudSnapshot
  [key: string]: unknown
}

/** Everything that makes up "my files" — the same set `parkAccountFiles` keeps. */
export interface CloudFiles {
  snapshot: CloudSnapshot
  savedSystems: CloudSavedSystem[]
  pinned: string[]
  autoSyncFigma: boolean
  figmaSyncSelection: unknown
}

/** What the server stores, and answers on GET (plus the etag). */
export interface CloudRecord {
  v: 1
  revision: number
  savedAt: string
  storeVersion: number
  files: CloudFiles
  /** Saved systems the plan did not keep. A browser holding them keeps them
   *  locally when it adopts this record, so a Free account loses nothing. */
  trimmedIds: string[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSnapshot(value: unknown): value is CloudSnapshot {
  return (
    isObject(value) &&
    typeof value.projectName === 'string' &&
    Array.isArray(value.themeOrder) &&
    value.themeOrder.every((k) => typeof k === 'string') &&
    isObject(value.themes)
  )
}

export function isCloudFiles(value: unknown): value is CloudFiles {
  if (!isObject(value)) return false
  if (!isSnapshot(value.snapshot)) return false
  if (!Array.isArray(value.savedSystems)) return false
  for (const sys of value.savedSystems) {
    if (!isObject(sys) || typeof sys.id !== 'string' || typeof sys.name !== 'string') return false
    if (!isSnapshot(sys.snapshot)) return false
  }
  if (!Array.isArray(value.pinned) || !value.pinned.every((p) => typeof p === 'string')) return false
  if (typeof value.autoSyncFigma !== 'boolean') return false
  return true
}

export function isCloudRecord(value: unknown): value is CloudRecord {
  return (
    isObject(value) &&
    value.v === 1 &&
    typeof value.revision === 'number' &&
    typeof value.storeVersion === 'number' &&
    typeof value.savedAt === 'string' &&
    Array.isArray(value.trimmedIds) &&
    isCloudFiles(value.files)
  )
}

export function cloudSystemLimit(pro: boolean): number {
  return pro ? PRO_CLOUD_SYSTEMS : FREE_CLOUD_SYSTEMS
}

/** A saved entry that is the copy of the system on screen. */
function isLiveCopy(sys: CloudSavedSystem, live: CloudSnapshot): boolean {
  const liveId = libraryIdOf({ githubRepo: live.githubRepo ?? null, projectName: live.projectName })
  if (sys.id === liveId) return true
  return Boolean(live.publishId) && sys.snapshot.publishId === live.publishId
}

/** Design systems these files hold: the one on screen (if it has a brand)
 *  plus every other saved system with a brand. */
export function cloudSystemCount(files: CloudFiles): number {
  const liveCounts = myThemeKeys(files.snapshot.themeOrder, files.snapshot.themes).length > 0 ? 1 : 0
  const others = files.savedSystems.filter(
    (sys) => !isLiveCopy(sys, files.snapshot) && savedSystemBrandKeys(sys).length > 0,
  )
  return liveCounts + others.length
}

/**
 * Keep what the plan allows. The system on screen always stays (it is what
 * the person is working on); the most recently saved others fill the rest.
 * Entries with no brand are not systems and are kept as they are.
 */
export function trimToPlan(files: CloudFiles, limit: number): { files: CloudFiles; trimmedIds: string[] } {
  const live = files.snapshot
  const liveCounts = myThemeKeys(live.themeOrder, live.themes).length > 0 ? 1 : 0
  const room = Math.max(0, limit - liveCounts)
  const others = files.savedSystems
    .filter((sys) => !isLiveCopy(sys, live) && savedSystemBrandKeys(sys).length > 0)
    .sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
  if (others.length <= room) return { files, trimmedIds: [] }
  const dropped = new Set(others.slice(room).map((sys) => sys.id))
  return {
    files: {
      ...files,
      savedSystems: files.savedSystems.filter((sys) => !dropped.has(sys.id)),
      pinned: files.pinned.filter((id) => !dropped.has(id)),
    },
    trimmedIds: [...dropped],
  }
}

/** Earlier trimmed ids + new ones, minus any the account now stores again. */
export function nextTrimmedIds(previous: string[], trimmed: string[], kept: CloudFiles): string[] {
  const stored = new Set(kept.savedSystems.map((sys) => sys.id))
  const out: string[] = []
  for (const id of [...trimmed, ...previous]) {
    if (stored.has(id) || out.includes(id)) continue
    out.push(id)
    if (out.length >= MAX_TRIMMED_IDS) break
  }
  return out
}

/** What this browser last agreed with the cloud on. */
export interface CloudBase {
  etag: string
  hash: string
}

export type CloudSyncPlan = 'same' | 'push' | 'adopt' | 'conflict'

/**
 * What to do after reading the account's record.
 *
 * - The record has not moved since our base: push if we changed, else nothing.
 * - Same content on both sides: nothing (record the new base).
 * - We have not changed since our base: take the record.
 * - This browser never synced and holds no work: take the record.
 * - Anything else changed on both sides: ask the person.
 */
export function planCloudSync(input: {
  localHash: string
  localHasWork: boolean
  base: CloudBase | null
  server: { etag: string; hash: string } | null
}): CloudSyncPlan {
  const { localHash, localHasWork, base, server } = input
  if (!server) return localHasWork || base ? 'push' : 'same'
  if (base && server.etag === base.etag) return localHash === base.hash ? 'same' : 'push'
  if (localHash === server.hash) return 'same'
  if (base && localHash === base.hash) return 'adopt'
  if (!base && !localHasWork) return 'adopt'
  return 'conflict'
}

/** Whether these files hold anything worth keeping. */
export function filesHaveWork(files: CloudFiles): boolean {
  return cloudSystemCount(files) > 0
}

/** cyrb53 — a fast, stable 53-bit string hash. Only compares payloads. */
export function contentHash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
