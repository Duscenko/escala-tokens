// Where `/login` sends someone back to, and what it should finish for them.
//
// `?next=` names a DESTINATION from a closed list, never a URL: a free-form
// return address would turn the login page into an open redirect. Anything
// not on the list falls back to `/`.
//
// The login page copies `next` (and the caller's pending `intent`) into
// sessionStorage the moment it opens, because an OAuth round trip leaves for
// Google/GitHub and comes back to `/login` with nothing but the session. That
// also keeps Supabase's Redirect URLs list unchanged: the return address is
// always the plain `/login`. sessionStorage is per tab, so an email
// confirmation opened in a NEW tab lands on the login page's own "You are
// logged in" screen instead — acceptable, nothing is lost.
//
// See design-plans/themes-library-accounts.md (phase 2).

import { LOGIN_PATH } from './legal'
import { decodeWorkspaceSection } from './workspaceLink'

/** `workspace` returns to the Generator section the person left from (see
 *  `section` below). Still a closed list: the section is re-validated against
 *  the workspace grammar on the way back, so it can only ever produce
 *  `/?section=<a real section id>`, never an arbitrary URL. */
export type LoginNext = 'library' | 'workspace'
/** Something the user started while signed out and should be finished on return. */
export type LoginIntent = 'save-library' | 'export'
export type LoginMode = 'signin' | 'signup'

const NEXT_PATH: Record<LoginNext, string> = {
  library: '/?section=library',
  workspace: '/',
}

const STORAGE_KEY = 'escala-login-return'
/** A return that old is a login someone abandoned, not one they are finishing. */
const MAX_AGE_MS = 30 * 60 * 1000

interface PendingReturn {
  next: LoginNext
  intent: LoginIntent | null
  /** Workspace section id for `next: 'workspace'`. */
  section?: string
  at: number
}

function isNext(value: unknown): value is LoginNext {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NEXT_PATH, value)
}

function isIntent(value: unknown): value is LoginIntent {
  return value === 'save-library' || value === 'export'
}

function isSection(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 200 && decodeWorkspaceSection(value) !== null
}

/** `/login` URL for a link. Pure — an `intent` never goes in the URL (a shared
 *  link must not be able to trigger an action); the link's onClick records it
 *  with `rememberReturn(next, intent)` instead. */
export function loginHref(opts: { next?: LoginNext; mode?: LoginMode } = {}): string {
  const params = new URLSearchParams()
  if (opts.mode === 'signup') params.set('mode', 'signup')
  if (opts.next) params.set('next', opts.next)
  const query = params.toString()
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH
}

/** Reads `?next=` and `?mode=` off the login page's own URL; unknown values are dropped. */
export function readLoginSearch(search: string): { next: LoginNext | null; mode: LoginMode } {
  const params = new URLSearchParams(search)
  const next = params.get('next')
  return {
    next: isNext(next) ? next : null,
    mode: params.get('mode') === 'signup' ? 'signup' : 'signin',
  }
}

export function pathForNext(next: LoginNext | null): string {
  if (next === 'workspace') {
    const section = readPending()?.section
    return isSection(section) ? `/?section=${encodeURIComponent(section)}` : '/'
  }
  return next ? NEXT_PATH[next] : '/'
}

function readPending(): PendingReturn | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingReturn>
    if (!isNext(parsed.next) || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > MAX_AGE_MS) return null
    return {
      next: parsed.next,
      intent: isIntent(parsed.intent) ? parsed.intent : null,
      section: isSection(parsed.section) ? parsed.section : undefined,
      at: parsed.at,
    }
  } catch {
    return null
  }
}

/** Keeps `next` for the OAuth round trip. Called by the login page on open;
 *  an existing intent for the same destination is preserved. */
export function rememberReturn(next: LoginNext, intent?: LoginIntent | null, section?: string | null): void {
  const prev = readPending()
  const kept = intent ?? (prev?.next === next ? prev.intent : null)
  const keptSection = isSection(section) ? section : (prev?.next === next ? prev.section : undefined)
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ next, intent: kept, section: keptSection, at: Date.now() }))
  } catch {
    // Storage blocked: the return simply falls back to `/`.
  }
}

/** Where the login page should go after a successful sign-in. Does not
 *  consume the intent — the destination does that. */
export function pendingNext(): LoginNext | null {
  return readPending()?.next ?? null
}

/** Called once by the destination after it sees a session: returns the intent
 *  to finish (if any) and forgets the whole return so it can't fire twice. */
export function takeLoginIntent(next: LoginNext): LoginIntent | null {
  const pending = readPending()
  if (!pending || pending.next !== next) return null
  forgetLoginReturn()
  return pending.intent
}

export function forgetLoginReturn(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
