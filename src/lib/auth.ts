import { useEffect, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { accountsEnabled, supabase, type AuthProvider } from './supabase'
import { LOGIN_PATH } from './legal'

// Thin wrappers over Supabase Auth plus ONE place that turns its errors into
// something a person can act on. The UI only ever sees an `AuthProblem`, never
// Supabase's own wording, so copy stays translatable and an unexpected message
// can't leak provider internals into the interface.

export type AuthProblem =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_in_use'
  | 'weak_password'
  | 'rate_limited'
  | 'unavailable'

function problemOf(error: { code?: string; status?: number } | null): AuthProblem {
  const code = error?.code
  if (code === 'invalid_credentials') return 'invalid_credentials'
  if (code === 'email_not_confirmed') return 'email_not_confirmed'
  if (code === 'email_exists' || code === 'user_already_exists') return 'email_in_use'
  if (code === 'weak_password') return 'weak_password'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error?.status === 429) return 'rate_limited'
  return 'unavailable'
}

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; problem: AuthProblem }

const ok = <T,>(value: T): AuthResult<T> => ({ ok: true, value })
const fail = (error: { code?: string; status?: number } | null): AuthResult<never> => ({ ok: false, problem: problemOf(error) })

export const MIN_PASSWORD = 8

/** Where Supabase's emailed links and OAuth return land: the login page on THIS origin
 *  (never a hardcoded host), which finishes confirmation / password recovery itself. */
const redirectTo = () => `${window.location.origin}${LOGIN_PATH}`

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? fail(error) : ok(undefined)
}

/** `needsConfirmation` is true when Supabase wants the email confirmed before a session exists. */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult<{ needsConfirmation: boolean }>> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } })
  return error ? fail(error) : ok({ needsConfirmation: !data.session })
}

/** Always resolves the same way for a known or unknown address: never reveal which accounts exist. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })
  return error && problemOf(error) === 'rate_limited' ? fail(error) : ok(undefined)
}

/** Branded mail from /api/password-reset (header, footer, link on this site).
 *  A 503 or a missing route means that sender is not configured, so Supabase's
 *  own mail is the fallback — the person still gets a link. */
export async function sendPasswordReset(email: string, locale: 'en' | 'es' | 'fr'): Promise<AuthResult> {
  try {
    const res = await fetch('/api/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale }),
    })
    if (res.status === 429) return { ok: false, problem: 'rate_limited' }
    if (res.ok) return ok(undefined)
    if (res.status === 503 || res.status === 404) return requestPasswordReset(email)
    return { ok: false, problem: 'unavailable' }
  } catch {
    return requestPasswordReset(email)
  }
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.updateUser({ password })
  return error ? fail(error) : ok(undefined)
}

/** Check the current password, then replace it. A wrong current password is
 *  the same `invalid_credentials` a sign-in would return. */
export async function replacePassword(email: string, current: string, next: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.signInWithPassword({ email, password: current })
  if (error) return fail(error)
  return setNewPassword(next)
}

const NAME_KEYS = ['display_name', 'full_name', 'name'] as const

/** The name the account pages show. `display_name` is what this app writes;
 *  the other two are what GitHub (and similar) already stored. */
export function displayNameOf(user: { user_metadata?: Record<string, unknown> | null }): string {
  const meta = user.user_metadata ?? {}
  for (const key of NAME_KEYS) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/** True when this account can sign in with an email and a password. A
 *  GitHub-only account has no password to replace. */
export function hasEmailPassword(user: { identities?: { provider?: string }[] | null }): boolean {
  return Boolean(user.identities?.some((identity) => identity.provider === 'email'))
}

export async function saveDisplayName(name: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const display_name = name.trim().slice(0, 80)
  const { error } = await supabase.auth.updateUser({ data: { display_name } })
  return error ? fail(error) : ok(undefined)
}

export async function resendSignupEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: redirectTo() },
  })
  if (error && problemOf(error) === 'rate_limited') return fail(error)
  return error ? fail(error) : ok(undefined)
}

export async function signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } })
  return error ? fail(error) : ok(undefined)
}

export async function signOut(): Promise<void> {
  // Park first, while the session still names the account. Closing only
  // happens after that write succeeds — a failed park must not be the moment
  // the only copy disappears. No session means there is nothing of this
  // account's to close. The import is deferred: account files reach the
  // store, and the store reaches this module through the free-theme check.
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id
    if (userId) {
      const { parkAccountFiles, closeAccountFiles } = await import('./accountFiles')
      if (parkAccountFiles(userId)) closeAccountFiles()
    }
  }
  await supabase?.auth.signOut()
}

/** True when this browser already has a persisted Supabase session.
 *  Sync — first paint of the Generator uses it so a signed-in visit to `/`
 *  opens Home instead of flashing Theme preview while `getSession()` resolves. */
export function hasStoredSession(): boolean {
  if (!accountsEnabled || typeof window === 'undefined') return false
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as {
        access_token?: string
        user?: unknown
        currentSession?: { access_token?: string; user?: unknown }
      }
      if (parsed.access_token || parsed.user || parsed.currentSession?.access_token || parsed.currentSession?.user) {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

/** Current session, kept in step with Supabase. `event` carries PASSWORD_RECOVERY when a reset link was opened. */
export function useAuth(): { user: User | null; session: Session | null; loading: boolean; event: AuthChangeEvent | null } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [event, setEvent] = useState<AuthChangeEvent | null>(null)

  useEffect(() => {
    if (!supabase) return
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((e, next) => {
      setSession(next)
      setEvent(e)
    })
    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [])

  return { user: session?.user ?? null, session, loading, event }
}
