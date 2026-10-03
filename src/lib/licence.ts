// The Escala Pro licence key, as this browser knows it.
//
// There are no accounts: Polar emails a key after payment and the person pastes
// it once. The key lives in localStorage on its own key (`sd-licence-key`) and
// NEVER in the zustand store — same rule as the GitHub token and the publish
// claims: a credential must not ride along in an exported snapshot, a saved
// system or a GitHub push.
//
// Whether a key is GOOD is the server's call (`/api/license` → Polar). This
// module only remembers the key, asks once per page load, and tells React what
// it learned. Nothing here enforces anything: `api/tokens.ts` does that.

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sd-licence-key'

export type LicenceStatus =
  /** No key saved. */
  | 'none'
  /** A key is saved and the server has not answered yet. */
  | 'checking'
  | 'valid'
  | 'expired'
  /** Polar does not know it, or it was revoked. */
  | 'invalid'
  /** The validator could not be reached — says nothing about the key. */
  | 'unavailable'

export interface LicenceState {
  status: LicenceStatus
  /** ISO instant the key stops working, when known. */
  expiresAt: string | null
  /** Whether a key is saved (the key itself is never handed to the UI). */
  hasKey: boolean
}

// Same test as `figmaSync.isLiveEnvironment`, restated here because that module
// imports THIS one (to send the key) and a cycle would leave both half-loaded.
function isLive(): boolean {
  if (typeof window === 'undefined') return false
  const o = window.location.origin
  return !o.includes('localhost') && !o.includes('127.0.0.1')
}

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

let memoryKey: string | null = readKey()
let state: LicenceState = { status: memoryKey ? 'checking' : 'none', expiresAt: null, hasKey: Boolean(memoryKey) }
const listeners = new Set<() => void>()
let checkedOnce = false

function setState(next: LicenceState): void {
  state = next
  listeners.forEach((l) => l())
}

/** The saved key, for the one place that must send it: publishing. */
export function getLicenceKey(): string | null {
  return memoryKey
}

/** Subscribe to licence changes outside React (auto-sync uses it to resume). */
export function onLicenceChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

interface ServerAnswer { valid?: unknown; expiresAt?: unknown; reason?: unknown }

async function validate(key: string): Promise<LicenceState> {
  try {
    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const body = (await res.json().catch(() => null)) as ServerAnswer | null
    const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : null
    if (res.status === 429 || res.status >= 500 || !body) return { status: 'unavailable', expiresAt: null, hasKey: true }
    if (body.valid === true) return { status: 'valid', expiresAt, hasKey: true }
    if (body.reason === 'expired') return { status: 'expired', expiresAt, hasKey: true }
    if (body.reason === 'unavailable') return { status: 'unavailable', expiresAt: null, hasKey: true }
    return { status: 'invalid', expiresAt, hasKey: true }
  } catch {
    return { status: 'unavailable', expiresAt: null, hasKey: true }
  }
}

/** Save a pasted key and find out whether it works. A key that does not work is
 *  NOT kept — pasting a typo must not leave something stored that every publish
 *  then sends. The outcome comes back so the modal can say why. */
export async function activateLicence(raw: string): Promise<LicenceState> {
  const key = raw.trim()
  if (!key) return state
  setState({ status: 'checking', expiresAt: null, hasKey: true })
  const result = await validate(key)
  if (result.status === 'valid' || result.status === 'unavailable') {
    // `unavailable` keeps the key: the validator being down is not the key's fault.
    memoryKey = key
    writeKey(key)
  } else {
    memoryKey = readKey()
  }
  checkedOnce = true
  setState(result.status === 'valid' || result.status === 'unavailable' || memoryKey
    ? result
    : { ...result, hasKey: false })
  return state
}

export function clearLicence(): void {
  memoryKey = null
  writeKey(null)
  checkedOnce = true
  setState({ status: 'none', expiresAt: null, hasKey: false })
}

/** One validation per page load for a key that was saved earlier. Not polled:
 *  an expiry is a date, and the server re-checks on every publish anyway. */
export function ensureLicenceChecked(): void {
  if (checkedOnce || !memoryKey || !isLive()) return
  checkedOnce = true
  void validate(memoryKey).then(setState)
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
