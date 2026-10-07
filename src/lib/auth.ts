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
  | 'weak_password'
  | 'rate_limited'
  | 'unavailable'

function problemOf(error: { code?: string; status?: number } | null): AuthProblem {
  const code = error?.code
  if (code === 'invalid_credentials') return 'invalid_credentials'
  if (code === 'email_not_confirmed') return 'email_not_confirmed'
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

export async function setNewPassword(password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.updateUser({ password })
  return error ? fail(error) : ok(undefined)
}

export async function signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
  if (!supabase) return { ok: false, problem: 'unavailable' }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } })
  return error ? fail(error) : ok(undefined)
}

export async function signOut(): Promise<void> {
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
