/**
 * Keeps a signed-in account's files in the cloud (`/api/account-files`).
 *
 * The store stays the working copy — editing is local and instant. This
 * engine reads the account's record on sign-in, takes it or sends ours, and
 * then saves a few seconds after edits stop. Every save carries the etag this
 * browser last read, so a browser holding an older copy is refused (409) and
 * the person chooses which version to keep. Nothing is ever overwritten
 * silently.
 *
 * The engine only runs while signed in. It stops BEFORE the workspace is
 * closed on sign-out, so a blank workspace can never reach the account.
 */
import { create } from 'zustand'
import {
  ACCOUNT_FILES_PATH,
  contentHash,
  filesHaveWork,
  MAX_CLOUD_BYTES,
  planCloudSync,
  type CloudBase,
  type CloudFiles,
  type CloudRecord,
} from './accountCloud'
import { shelveSavedSystems } from './accountFiles'
import { FIGMA_VIEWPORTS } from './figmaSyncModes'
import { peekLoginIntent } from './loginReturn'
import { supabase } from './supabase'
import { captureSnapshot, useDesignStore, type SavedSystem } from '../store/useDesignStore'

export type AccountCloudStatus =
  | 'off'
  | 'loading'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'conflict'
  | 'offline'
  | 'outdated'
  | 'too-large'
  | 'unavailable'

interface CloudUiState {
  status: AccountCloudStatus
  savedAt: string | null
  /** Saved systems the plan keeps only in this browser. */
  localOnly: number
  conflict: { etag: string | null; record: CloudRecord | null } | null
}

export const useAccountCloud = create<CloudUiState>(() => ({
  status: 'off',
  savedAt: null,
  localOnly: 0,
  conflict: null,
}))

const BASE_PREFIX = 'sd-account-cloud:'
const BACKUP_PREFIX = 'sd-account-cloud-backup:'
/** Quiet time after the last edit before a save. */
const IDLE_MS = 3_000
/** Blob writes are a metered operation: at most one save per this window. */
const MIN_GAP_MS = 20_000
/** After a failed request: 30 s, then 2 min, then every 5 min. A server that
 *  answered HTML once (a cold start, a timeout) is usually back soon; one that
 *  stays down must not be hammered — and must never be given up on, because
 *  "not saved to your account" with no way back was the bug this fixes. */
const RETRY_STEPS_MS = [30_000, 120_000, 300_000]
const REFRESH_MS = 30_000
/** `fetch` keepalive carries at most 64 KiB; a page that is closing can only
 *  send a save that fits. */
const KEEPALIVE_MAX_BYTES = 60_000

let running: string | null = null
let ready = false
let base: CloudBase | null = null
/** The newest server etag this browser has seen; a save names it. */
let known: string | null = null
let unsubscribe: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let inflight: Promise<void> | null = null
let again = false
let lastWrite = 0
let lastRefresh = 0
/** Failed requests in a row — picks the next step of `RETRY_STEPS_MS`. */
let failures = 0

function setUi(patch: Partial<CloudUiState>): void {
  useAccountCloud.setState(patch)
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function readBase(userId: string): CloudBase | null {
  try {
    const raw = storage()?.getItem(BASE_PREFIX + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CloudBase>
    return typeof parsed.etag === 'string' && typeof parsed.hash === 'string' ? { etag: parsed.etag, hash: parsed.hash } : null
  } catch {
    return null
  }
}

function writeBase(next: CloudBase): void {
  base = next
  known = next.etag
  if (!running) return
  try { storage()?.setItem(BASE_PREFIX + running, JSON.stringify(next)) } catch { /* ignore */ }
}

function backup(files: CloudFiles): void {
  if (!running) return
  try { storage()?.setItem(BACKUP_PREFIX + running, JSON.stringify({ at: new Date().toISOString(), files })) } catch { /* quota */ }
}

function storeVersion(): number {
  return useDesignStore.persist?.getOptions().version ?? 0
}

/** This browser's files, in the order `parkAccountFiles` keeps them. */
export function localCloudFiles(): CloudFiles {
  const state = useDesignStore.getState()
  return {
    snapshot: captureSnapshot(state) as unknown as CloudFiles['snapshot'],
    savedSystems: state.savedSystems as unknown as CloudFiles['savedSystems'],
    // Pinned was removed (design-plans/home-into-system.md). The record keeps
    // the field, always empty, so a browser on an older build still reads it.
    pinned: [],
    autoSyncFigma: state.autoSyncFigma,
    figmaSyncSelection: state.figmaSyncSelection,
  }
}

function hashOf(files: CloudFiles): string {
  return contentHash(JSON.stringify(files))
}

function localOnlyCount(record: CloudRecord | null): number {
  if (!record?.trimmedIds.length) return 0
  const trimmed = new Set(record.trimmedIds)
  return useDesignStore.getState().savedSystems.filter((s) => trimmed.has(s.id)).length
}

async function token(): Promise<string | null> {
  try {
    const session = (await supabase?.auth.getSession())?.data.session
    return session?.access_token && session.user?.id === running ? session.access_token : null
  } catch {
    return null
  }
}

type Answer =
  | { kind: 'ok'; etag: string | null; record: CloudRecord | null }
  | { kind: 'stale' | 'outdated'; etag: string | null; record: CloudRecord | null }
  | { kind: 'too-large' | 'unavailable' | 'offline' | 'signed-out' | 'unchanged' }

/**
 * One request, sorted into what the engine does next. Only two answers mean
 * "the feature is not here": a 404/405 (no such route on this host) and the
 * server's own `503 unconfigured`. Everything else that is not a clean
 * answer — a 5xx, an HTML error page from the platform, a body that is not
 * JSON — is `offline`: the server hiccuped, and the next try may well land.
 */
async function request(method: 'GET' | 'PUT', body?: unknown, keepalive = false, ifNoneMatch: string | null = null): Promise<Answer> {
  const jwt = await token()
  if (!jwt) return { kind: 'signed-out' }
  let res: Response
  try {
    res = await fetch(ACCOUNT_FILES_PATH, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(keepalive ? { keepalive: true } : {}),
    })
  } catch {
    return { kind: 'offline' }
  }
  // The etag we named is still the account's: nothing to download.
  if (res.status === 304) return { kind: 'unchanged' }
  if (res.status === 413) return { kind: 'too-large' }
  if (res.status === 401) return { kind: 'signed-out' }
  if (res.status === 404 || res.status === 405) return { kind: 'unavailable' }
  if (!res.headers.get('content-type')?.includes('application/json')) return { kind: 'offline' }
  let json: { etag?: unknown; record?: unknown; error?: unknown }
  try {
    json = await res.json()
  } catch {
    return { kind: 'offline' }
  }
  if (res.status === 503) return { kind: json.error === 'unconfigured' ? 'unavailable' : 'offline' }
  const etag = typeof json.etag === 'string' ? json.etag : null
  const record = (json.record ?? null) as CloudRecord | null
  if (res.status === 200) return { kind: 'ok', etag, record }
  if (res.status === 409) return { kind: json.error === 'outdated' ? 'outdated' : 'stale', etag, record }
  return { kind: 'offline' }
}

/** The next try after a failure, further away each time. `failures` only
 *  moves here and in `recovered`, so one bad answer never resets the ladder. */
function retryLater(fn: () => void): void {
  if (retryTimer) clearTimeout(retryTimer)
  const wait = RETRY_STEPS_MS[Math.min(failures, RETRY_STEPS_MS.length - 1)]
  failures += 1
  retryTimer = setTimeout(() => { retryTimer = null; fn() }, wait)
}

function recovered(): void {
  failures = 0
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
}

/** Whether a save is still owed: the files differ from what the account holds. */
function owed(): boolean {
  if (!running) return false
  const hash = hashOf(localCloudFiles())
  return !(base && base.hash === hash && base.etag === known)
}

/** A record written by an older app version goes through the same migration
 *  a reload would run, so an old shape never lands in the store. */
async function migrated(record: CloudRecord): Promise<CloudFiles> {
  const current = storeVersion()
  if (record.storeVersion >= current) return record.files
  const migrate = useDesignStore.persist?.getOptions().migrate
  if (!migrate) return record.files
  const persisted = {
    ...record.files.snapshot,
    savedSystems: record.files.savedSystems,
    pinned: record.files.pinned,
    autoSyncFigma: record.files.autoSyncFigma,
    figmaSyncSelection: record.files.figmaSyncSelection,
  }
  const out = (await migrate(persisted, record.storeVersion)) as Record<string, unknown>
  const { savedSystems, pinned, autoSyncFigma, figmaSyncSelection, ...snapshot } = out
  return {
    snapshot: snapshot as CloudFiles['snapshot'],
    savedSystems: (savedSystems ?? record.files.savedSystems) as CloudFiles['savedSystems'],
    pinned: (pinned ?? record.files.pinned) as string[],
    autoSyncFigma: Boolean(autoSyncFigma),
    figmaSyncSelection: figmaSyncSelection ?? record.files.figmaSyncSelection,
  }
}

/** Put the account's record on screen. Saved systems the plan keeps only in
 *  this browser stay beside it. */
async function adopt(record: CloudRecord, etag: string): Promise<void> {
  const files = await migrated(record)
  const state = useDesignStore.getState()
  const stored = new Set(files.savedSystems.map((s) => s.id))
  const trimmed = new Set(record.trimmedIds)
  const keptHere = state.savedSystems.filter((s) => trimmed.has(s.id) && !stored.has(s.id))
  const selection = files.figmaSyncSelection as { viewports?: unknown } | null
  ready = false
  useDesignStore.setState({
    ...(files.snapshot as object),
    projectCreated: true,
    savedSystems: [...(files.savedSystems as unknown as SavedSystem[]), ...keptHere],
    autoSyncFigma: Boolean(files.autoSyncFigma),
    figmaSyncSelection: selection && Array.isArray(selection.viewports)
      ? (files.figmaSyncSelection as never)
      : { modes: null, viewports: [...FIGMA_VIEWPORTS] },
  })
  writeBase({ etag, hash: hashOf(localCloudFiles()) })
  ready = true
  setUi({ status: 'saved', savedAt: record.savedAt, localOnly: localOnlyCount(record), conflict: null })
}

async function decide(etag: string | null, record: CloudRecord | null, loginIntent = false): Promise<void> {
  if (record && record.storeVersion > storeVersion()) {
    ready = false
    setUi({ status: 'outdated' })
    return
  }
  known = etag
  const local = localCloudFiles()
  const localHash = hashOf(local)
  const plan = planCloudSync({
    localHash,
    localHasWork: filesHaveWork(local),
    base,
    server: record && etag ? { etag, hash: hashOf(record.files) } : null,
  })
  if (plan === 'same') {
    if (etag) writeBase({ etag, hash: localHash })
    ready = true
    recovered()
    setUi({ status: 'saved', savedAt: record?.savedAt ?? null, localOnly: localOnlyCount(record), conflict: null })
    return
  }
  if (plan === 'adopt' && record && etag) return adopt(record, etag)
  if (plan === 'conflict' && record && loginIntent && !base) {
    // Came back to finish a save or an export: the work on screen stays and
    // the account's saved systems are filed beside it — the same rule
    // `reopenAccountFiles` follows for a parked copy.
    const files = await migrated(record)
    shelveSavedSystems(files.savedSystems as unknown as SavedSystem[])
    ready = true
    return push()
  }
  if (plan === 'conflict') {
    ready = false
    setUi({ status: 'conflict', conflict: { etag, record } })
    return
  }
  ready = true
  return push()
}

async function pull(loginIntent = false): Promise<void> {
  if (!running) return
  const who = running
  const answer = await request('GET')
  if (running !== who) return
  if (answer.kind === 'ok') return decide(answer.etag, answer.record, loginIntent)
  if (answer.kind === 'signed-out') return
  // `unavailable` and `offline` both come back on their own: the status line
  // offers Try again meanwhile (`retryAccountCloud`).
  setUi({ status: answer.kind === 'unavailable' ? 'unavailable' : 'offline' })
  retryLater(() => { void pull(loginIntent) })
}

/** Nothing may be sent while the person has a decision to make, or while a
 *  newer app version owns the record. A server that is down is NOT blocked:
 *  the retry ladder and Try again keep pushing. */
function blocked(): boolean {
  const { status } = useAccountCloud.getState()
  return status === 'conflict' || status === 'outdated'
}

async function pushNow(keepalive = false): Promise<void> {
  if (!running || !ready || blocked()) return
  const who = running
  const files = localCloudFiles()
  const text = JSON.stringify(files)
  const hash = contentHash(text)
  if (base && base.hash === hash && base.etag === known) {
    setUi({ status: 'saved' })
    return
  }
  if (text.length > MAX_CLOUD_BYTES) {
    setUi({ status: 'too-large' })
    return
  }
  setUi({ status: 'saving' })
  const answer = await request('PUT', { ifEtag: known, storeVersion: storeVersion(), files }, keepalive && text.length <= KEEPALIVE_MAX_BYTES)
  if (running !== who) return
  lastWrite = Date.now()
  if (answer.kind === 'ok' && answer.etag && answer.record) {
    writeBase({ etag: answer.etag, hash })
    recovered()
    setUi({ status: 'saved', savedAt: answer.record.savedAt, localOnly: localOnlyCount(answer.record) })
    return
  }
  if (answer.kind === 'stale' || answer.kind === 'outdated') return decide(answer.etag, answer.record)
  if (answer.kind === 'too-large') return setUi({ status: 'too-large' })
  if (answer.kind === 'signed-out') return
  setUi({ status: answer.kind === 'unavailable' ? 'unavailable' : 'offline' })
  retryLater(() => schedulePush(0))
}

async function push(keepalive = false): Promise<void> {
  if (inflight) {
    again = true
    return inflight
  }
  inflight = (async () => {
    try {
      do {
        again = false
        await pushNow(keepalive)
      } while (again && running)
    } finally {
      inflight = null
    }
  })()
  return inflight
}

function schedulePush(idle = IDLE_MS): void {
  if (!running || !ready || blocked()) return
  if (pushTimer) clearTimeout(pushTimer)
  const wait = Math.max(idle, MIN_GAP_MS - (Date.now() - lastWrite))
  pushTimer = setTimeout(() => { pushTimer = null; void push() }, wait)
  const { status } = useAccountCloud.getState()
  if (status === 'saved' || status === 'offline') setUi({ status: 'pending' })
}

function onStoreChange(): void {
  if (ready) schedulePush()
}

function onVisibility(): void {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'hidden') void flushAccountCloud({ force: true, keepalive: true })
  else void refreshAccountCloud()
}

/** The page is going away (closed, navigated, put in the bfcache): one last
 *  save that may outlive it. `visibilitychange` already fires for most of
 *  these; `pagehide` is the one Safari and a closed tab reliably send. */
function onPageHide(): void {
  void flushAccountCloud({ force: true, keepalive: true })
}

/** With a save still owed, closing the tab asks first. Browsers draw their
 *  own sentence; the string is only what makes them show it. */
function onBeforeUnload(e: BeforeUnloadEvent): void {
  if (!running || !ready || blocked()) return
  if (!owed()) return
  e.preventDefault()
  e.returnValue = ''
}

function listen(on: boolean): void {
  const doc = typeof document === 'undefined' ? null : document
  const win = typeof window === 'undefined' ? null : window
  const method = on ? 'addEventListener' : 'removeEventListener'
  doc?.[method]('visibilitychange', onVisibility)
  win?.[method]('focus', onVisibility)
  win?.[method]('pagehide', onPageHide)
  win?.[method]('beforeunload', onBeforeUnload)
}

/** Try now — the status line's action after an error. Drops any waiting
 *  retry: a person pressing the button is not to be told "in two minutes". */
export async function retryAccountCloud(): Promise<void> {
  if (!running) return
  recovered()
  return flushAccountCloud({ force: true })
}

/** Read the account again — another browser may have saved meanwhile. */
export async function refreshAccountCloud(): Promise<void> {
  if (!running || !ready || inflight || blocked()) return
  if (Date.now() - lastRefresh < REFRESH_MS) return
  lastRefresh = Date.now()
  const who = running
  const answer = await request('GET', undefined, false, known)
  if (running !== who || inflight) return
  if (answer.kind === 'ok' && answer.etag !== known) await decide(answer.etag, answer.record)
}

/**
 * Save now if anything is waiting. `force` sends even when no save was
 * scheduled yet and skips the write gap: Save brand is a decision, and the
 * person who just made it must see "Saved to your account" without waiting
 * 20 s for a metering window. When the first read never landed (the engine
 * is not `ready`) it reads again instead — the files cannot be sent without
 * the etag they must name.
 */
export async function flushAccountCloud(opts: { force?: boolean; keepalive?: boolean } = {}): Promise<void> {
  if (!running) return
  if (!ready) {
    const { status } = useAccountCloud.getState()
    if (opts.force && (status === 'offline' || status === 'unavailable')) await pull()
    return
  }
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
    lastWrite = 0
    await push(opts.keepalive)
  } else if (inflight) {
    await inflight
  } else if (opts.force) {
    lastWrite = 0
    await push(opts.keepalive)
  }
}

const SIGN_OUT_FLUSH_MS = 4_000

/** One best-effort upload, then stop the engine. Sign-out must never wait on
 *  conflict UI, retry timers, or a hung request — the session ends either way. */
async function pushOnceForSignOut(): Promise<void> {
  if (!running) return
  const files = localCloudFiles()
  const text = JSON.stringify(files)
  if (text.length > MAX_CLOUD_BYTES) return
  const hash = contentHash(text)
  if (base && base.hash === hash && base.etag === known) return
  setUi({ status: 'saving', conflict: null })
  const answer = await request('PUT', { ifEtag: known, storeVersion: storeVersion(), files })
  if (answer.kind === 'ok' && answer.etag) {
    writeBase({ etag: answer.etag, hash })
    setUi({ status: 'saved', savedAt: (answer.record as CloudRecord | null)?.savedAt ?? null, localOnly: 0, conflict: null })
  }
}

/** Called from `signOut` instead of `flushAccountCloud` + `stopAccountCloud`. */
export async function flushAccountCloudForSignOut(): Promise<void> {
  if (!running) return
  const who = running
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  try {
    if (inflight) {
      await Promise.race([
        inflight,
        new Promise<void>((resolve) => { setTimeout(resolve, SIGN_OUT_FLUSH_MS) }),
      ])
    } else {
      await Promise.race([
        pushOnceForSignOut(),
        new Promise<void>((resolve) => { setTimeout(resolve, SIGN_OUT_FLUSH_MS) }),
      ])
    }
  } catch {
    /* sign-out continues */
  }
  if (running === who) stopAccountCloud()
}

/** Start for this account. Safe to call again for the same account. */
export async function startAccountCloud(userId: string): Promise<void> {
  if (!supabase || !userId) return
  if (running === userId) return refreshAccountCloud()
  stopAccountCloud()
  running = userId
  ready = false
  base = readBase(userId)
  known = base?.etag ?? null
  lastWrite = 0
  lastRefresh = Date.now()
  failures = 0
  const loginIntent = Boolean(peekLoginIntent())
  setUi({ status: 'loading', savedAt: null, localOnly: 0, conflict: null })
  unsubscribe = useDesignStore.subscribe(onStoreChange)
  listen(true)
  await pull(loginIntent)
}

export function stopAccountCloud(): void {
  unsubscribe?.()
  unsubscribe = null
  listen(false)
  if (pushTimer) clearTimeout(pushTimer)
  if (retryTimer) clearTimeout(retryTimer)
  pushTimer = null
  retryTimer = null
  failures = 0
  running = null
  ready = false
  base = null
  known = null
  setUi({ status: 'off', savedAt: null, localOnly: 0, conflict: null })
}

/** The person chose which version wins. The other is kept as a backup in
 *  this browser (`sd-account-cloud-backup:<user>`), never thrown away. */
export async function resolveAccountCloudConflict(keep: 'cloud' | 'local'): Promise<void> {
  const conflict = useAccountCloud.getState().conflict
  if (!running || !conflict) return
  setUi({ conflict: null, status: 'saving' })
  if (keep === 'cloud' && conflict.record && conflict.etag) {
    backup(localCloudFiles())
    await adopt(conflict.record, conflict.etag)
    return
  }
  if (conflict.record) backup(conflict.record.files)
  known = conflict.etag
  ready = true
  await push()
}

/** Whether this browser knows what the account holds. Anything that judges
 *  "which systems exist" (the orphan sweep) waits for this. `unavailable`
 *  counts only once the first read landed (`ready`): before that, the
 *  account's files may still be on their way. */
export function accountCloudSettled(): boolean {
  const { status } = useAccountCloud.getState()
  if (status === 'unavailable' || status === 'offline') return ready
  return status === 'saved' || status === 'pending' || status === 'saving' || status === 'too-large'
}
