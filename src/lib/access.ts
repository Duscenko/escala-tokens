// Who can see / do what — the ONE place the Generator decides it.
// See design-plans/login-funnel.md.
//
//   anon  no session      → tries the product: edits the theme on screen, sees a
//                           PART of Variables / Code / Docs, cannot export or save.
//   free  signed in       → sees everything, exports one mode (Light OR Dark) on
//                           Desktop, saves one theme.
//   pro   promo or licence → everything else.
//
// The login wall is a SOFT limit and is meant to be one: the values are computed
// in the browser. The hard limits stay on the server (hosted sync, MCP). No
// component reads `useAuth` / `useEntitlement` to make this call on its own.

import { hasStoredSession, useAuth } from './auth'
import { accountsEnabled } from './supabase'
import { FREE_MY_THEME_LIMIT, freeAnotherThemeBlocked, licenceStillOpen } from './freeThemeLimit'
import { useLicence } from './licence'
import { useEntitlement } from './useEntitlement'
import { loginHref, rememberReturn, type LoginIntent } from './loginReturn'
import { WORKSPACE_SECTION_PARAM } from './workspaceLink'
import { useDesignStore } from '../store/useDesignStore'
import { myThemeKeys } from './themeLibrary'

export type AccessTier = 'anon' | 'free' | 'pro'

export interface Access {
  tier: AccessTier
  /** True while the session is still being read — callers show the full view
   *  meanwhile rather than flashing a wall at someone who is signed in. */
  loading: boolean
  /** Shorthand: the anonymous wall applies. */
  gated: boolean
}

export function useAccess(): Access {
  const { user, loading } = useAuth()
  const { pro } = useEntitlement()
  // Accounts off (no Supabase env, e.g. a fork run locally) → nothing to sign
  // into, so nothing is walled: an open-source checkout must stay usable.
  const signedIn = !accountsEnabled || Boolean(user)
  const tier: AccessTier = !signedIn ? 'anon' : pro ? 'pro' : 'free'
  return { tier, loading: accountsEnabled && loading, gated: tier === 'anon' && !(accountsEnabled && loading) }
}

/** Leave for `/login` (sign-up first), coming back to THIS Generator section
 *  and finishing `intent` there. The edits on screen live in the persisted
 *  store, so the round trip loses nothing. */
export function goToLogin(intent?: LoginIntent, mode: 'signup' | 'signin' = 'signup', section?: string): void {
  const fromUrl = new URLSearchParams(window.location.search).get(WORKSPACE_SECTION_PARAM)
  rememberReturn('workspace', intent ?? null, section ?? fromUrl)
  window.location.assign(loginHref({ next: 'workspace', mode }))
}

/** Signed in, not Pro, accounts actually on. Export, MCP and File & modes use
 *  this — `!entitlement.pro` alone would wall a fork that has no account to
 *  upgrade. While the session is loading this is false, so the full view
 *  shows instead of a flash of the wall. */
export function useFreeTier(): boolean {
  const { tier, loading } = useAccess()
  return accountsEnabled && !loading && tier === 'free'
}

export { FREE_MY_THEME_LIMIT }

/** True when this signed-in Free account already has a theme and must not
 *  mint or duplicate another. Existing themes stay listed. A stored session
 *  counts while auth is still loading, so an already-open account cannot open
 *  the create form in that gap. A key Polar has not answered yet is not Free.
 *  Accounts off never asks for Pro. */
export function useNeedsProForAnotherTheme(): boolean {
  const { user, loading } = useAuth()
  const { pro } = useEntitlement()
  const licence = useLicence()
  const count = useDesignStore((s) => myThemeKeys(s.themeOrder, s.themes).length)
  const signedIn = Boolean(user) || (accountsEnabled && loading && hasStoredSession())
  return freeAnotherThemeBlocked({
    accountsOn: accountsEnabled,
    signedIn,
    pro: pro || licenceStillOpen(licence.status, licence.hasKey),
    count,
  })
}
