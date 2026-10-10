// Escala Pro, as this page knows it.
//
// Pro belongs to the ACCOUNT. Every check below carries the session, and the
// server answers `valid` when the account is Pro — whether or not this browser
// holds a key. So signing in on another browser, or on the other host, is
// enough. The key is how an account BECOMES Pro, once:
//
// Polar emails a key after payment and the person pastes it once. The server
// stores it in an HttpOnly cookie (`sd_licence`) that this page cannot read,
// and records the signed-in account as Pro (`api/_accountPlan.ts`).
// A key left in localStorage (`sd-licence-key`) from before that cookie is
// posted once and then deleted. It is NEVER in the zustand store — same rule
// as the GitHub token and the publish claims: a credential must not ride along
// in an exported snapshot, a saved system or a GitHub push.
//
// Whether a key is GOOD is the server's call (`/api/license` → Polar). This
// module asks once per page load, and again when the signed-in account
// changes, and tells React what it learned. Nothing here enforces anything:
// `api/tokens.ts` does that.

import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

const STORAGE_KEY = 'sd-licence-key'
const ACTIVATION_KEY = 'sd-licence-activation'
export type LicenceStatus =
  /** No key saved. */
  | 'none'
  /** A key is saved and the server has not answered yet. */
  | 'checking'
  | 'valid'
  | 'expired'
  /** Polar does not know it, or it was revoked. */
  | 'invalid'
  /** The key is good, but this browser is past Polar's activation cap. */
  | 'activation_limit'
  /** The validator could not be reached — says nothing about the key. */
  | 'unavailable'

export interface LicenceState {
  status: LicenceStatus
  /** ISO instant the key stops working, when known. */
  expiresAt: string | null
  /** Whether a key is saved (the key itself is never handed to the UI). */
  hasKey: boolean
  /** What made it `valid`: a key in this browser, or the signed-in account's
   *  own record. Absent while not valid. */
  source?: 'key' | 'account'
}

// `vite dev` replaces this when `.env.local` has VITE_DEV_LICENCE_KEY.
// Production builds leave it null, so a local test key never ships.
let DEV_LICENCE: string | null = null /* dev-licence-slot */

function readKey(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeKey(key: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the key lives for this page load only.
  }
}

function readActivation(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(ACTIVATION_KEY)
  } catch {
    return null
  }
}

function writeActivation(id: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (id) localStorage.setItem(ACTIVATION_KEY, id)
    else localStorage.removeItem(ACTIVATION_KEY)
  } catch {
    // The next check will register this browser again.
  }
}

function initialKey(): string | null {
  if (DEV_LICENCE) {
    if (readKey() !== DEV_LICENCE) writeKey(DEV_LICENCE)
    return DEV_LICENCE
  }
  return readKey()
}

let memoryKey: string | null = initialKey()
let state: LicenceState = { status: memoryKey ? 'checking' : 'none', expiresAt: null, hasKey: Boolean(memoryKey) }
const listeners = new Set<() => void>()
let checkedOnce = false

function setState(next: LicenceState): void {
  state = next
  listeners.forEach((l) => l())
}

/** The key, only while it has not yet moved into the cookie. Publishing sends
 *  this header when it is set; once the cookie holds the key this is null and
 *  the browser sends the cookie on its own. */
export function getLicenceKey(): string | null {
  return memoryKey
}

/** Polar's activation id for this browser. Not a secret: it only names the
 *  device, and Polar ignores it until the benefit limits activations. */
export function getLicenceActivation(): string | null {
  return readActivation()
}

/** Current licence snapshot, for a write that cannot wait on React. */
export function readLicenceState(): LicenceState {
  return state
}

/** Subscribe to licence changes outside React (auto-sync uses it to resume). */
export function onLicenceChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

interface ServerAnswer {
  valid?: unknown
  expiresAt?: unknown
  reason?: unknown
  stored?: unknown
  activationId?: unknown
  hasKey?: unknown
  via?: unknown
}

let lastStored = false

/** The account this page is signed in as, when there is one. `null` when
 *  signed out or when accounts are off. */
async function sessionOf(): Promise<{ userId: string; token: string } | null> {
  try {
    const session = (await supabase?.auth.getSession())?.data.session
    return session?.access_token && session.user?.id ? { userId: session.user.id, token: session.access_token } : null
  } catch {
    return null
  }
}

/** The licence check sends the session so the server can answer for the
 *  account. Also remembers WHO the answer is for (`checkedFor`). */
let checkedFor: string | null = null
async function sessionHeaders(): Promise<Record<string, string>> {
  const session = await sessionOf()
  checkedFor = session?.userId ?? null
  return session ? { Authorization: `Bearer ${session.token}` } : {}
}

function fromAnswer(res: { status: number }, body: ServerAnswer | null, fallbackHasKey: boolean): LicenceState {
  const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : null
  lastStored = body?.stored === true
  if (typeof body?.activationId === 'string' && body.activationId) writeActivation(body.activationId)
  if (lastStored) {
    memoryKey = null
    writeKey(null)
  }
  if (res.status === 429 || res.status >= 500 || !body) {
    const hasKey = body?.hasKey === true || body?.stored === true || fallbackHasKey
    return { status: 'unavailable', expiresAt: null, hasKey }
  }
  const hasKey = body.stored === true || body.hasKey === true || fallbackHasKey
  if (body.valid === true) {
    // Pro by the account: there may be no key here at all.
    if (body.via === 'account') return { status: 'valid', expiresAt, hasKey: body.stored === true, source: 'account' }
    return { status: 'valid', expiresAt, hasKey: true, source: 'key' }
  }
  if (body.reason === 'expired') return { status: 'expired', expiresAt, hasKey: body.stored === true }
  if (body.reason === 'activation_limit') return { status: 'activation_limit', expiresAt, hasKey: true }
  if (body.reason === 'unavailable') return { status: 'unavailable', expiresAt: null, hasKey }
  if (body.hasKey === false && body.stored !== true) return { status: 'none', expiresAt: null, hasKey: false }
  return { status: 'invalid', expiresAt, hasKey: body.stored === true }
}

async function postKey(key: string): Promise<LicenceState> {
  const activation = readActivation()
  const res = await fetch('/api/license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await sessionHeaders()) },
    body: JSON.stringify({ key, ...(activation ? { activationId: activation } : {}) }),
  })
  const body = (await res.json().catch(() => null)) as ServerAnswer | null
  return fromAnswer(res, body, true)
}

async function readCookieLicence(): Promise<LicenceState> {
  const res = await fetch('/api/license', { headers: await sessionHeaders() })
  const body = (await res.json().catch(() => null)) as ServerAnswer | null
  return fromAnswer(res, body, false)
}

/** Save a pasted key and find out whether it works. A key that does not work is
 *  NOT kept — pasting a typo must not leave something stored that every publish
 *  then sends. The outcome comes back so the modal can say why. */
export async function activateLicence(raw: string): Promise<LicenceState> {
  const key = raw.trim()
  if (!key) return state
  setState({ status: 'checking', expiresAt: null, hasKey: true })
  lastStored = false
  let result: LicenceState
  try {
    result = await postKey(key)
  } catch {
    result = { status: 'unavailable', expiresAt: null, hasKey: true }
  }
  // The cookie holds the key when the server says `stored`. Until then (the
  // validator is down, or this is an older server) the key stays here so a
  // publish can still send it.
  if (!lastStored && (result.status === 'valid' || result.status === 'unavailable' || result.status === 'activation_limit')) {
    memoryKey = key
    writeKey(key)
  }
  checkedOnce = true
  setState(result)
  return state
}

export function clearLicence(): void {
  memoryKey = null
  writeKey(null)
  writeActivation(null)
  checkedOnce = true
  setState({ status: 'none', expiresAt: null, hasKey: false })
  // The key leaves this browser. An account that is Pro stays Pro, so ask
  // again once the cookie is gone.
  void fetch('/api/license', { method: 'DELETE' })
    .then(() => readCookieLicence())
    .then(setState)
    .catch(() => {})
}

function runCheck(): void {
  const job = memoryKey
    ? postKey(memoryKey).catch(() => ({ status: 'unavailable' as const, expiresAt: null, hasKey: true }))
    : readCookieLicence().catch(() => state)
  void job.then(setState)
}

let watchingAccount = false
/** The answer is per account, so a sign-in or a sign-out on this page asks
 *  again. Supabase repeats SIGNED_IN on every tab focus: only a CHANGE of
 *  account counts, or this would hammer a rate-limited endpoint. */
function watchAccount(): void {
  if (watchingAccount || !supabase) return
  watchingAccount = true
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return
    const userId = session?.user?.id ?? null
    if (userId === checkedFor) return
    checkedFor = userId
    runCheck()
  })
}

/** One validation per page load, plus one per change of account. A key still
 *  in localStorage is posted once so it can move into the cookie. With no
 *  local key, GET asks whether the cookie is there — the page cannot see an
 *  HttpOnly cookie itself — and whether the account is Pro without one. */
export function ensureLicenceChecked(): void {
  if (checkedOnce) return
  checkedOnce = true
  watchAccount()
  runCheck()
}

function subscribe(listener: () => void): () => void {
  return onLicenceChange(listener)
}

export function useLicence(): LicenceState {
  const current = useSyncExternalStore(subscribe, () => state, () => state)
  ensureLicenceChecked()
  return current
}

/** Test seam: forget everything, as a fresh page load with this storage would. */
export function __resetLicenceForTests(key: string | null): void {
  memoryKey = key
  checkedOnce = false
  state = { status: key ? 'checking' : 'none', expiresAt: null, hasKey: Boolean(key) }
  listeners.clear()
}
