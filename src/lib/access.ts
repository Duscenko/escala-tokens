// Who can see / do what — the ONE place the Generator decides it.
// See design-plans/login-funnel.md.
//
//   anon  no session      → uses the whole product: Variables, Code, Docs, copy
//                           context and export are open. What it cannot do is
//                           SAVE on Escala: the work lives in this browser until
//                           it is saved with an account or pushed to GitHub
//                           (`UnsavedNotice`). Decided 2026-10-17: the login wall
//                           in front of Variables / Code / Docs / Export drove
//                           visitors away, so it is gone.
//   free  signed in       → sees everything, exports 3 brands (Light + Dark) on
//                           Desktop and Mobile, saves three brands.
//   pro   promo or licence → everything else.
//
// OPEN BETA (2026-10-20, `OPEN_BETA` in entitlement.ts): every tier is `pro`
// for an account, and the only limit left is `BETA_MAX_BRANDS` brands per
// design system — for everyone, account or not.
//
// The hard limits stay on the server (hosted sync). No component reads
// `useAuth` / `useEntitlement` to make this call on its own.

import { hasStoredSession, useAuth } from './auth'
import { accountsEnabled } from './supabase'
import { OPEN_BETA } from './entitlement'
import { FREE_MY_THEME_LIMIT, betaBrandLimitReached, freeAnotherSystemBlocked, freeAnotherThemeBlocked, licenceStillOpen } from './freeThemeLimit'
import { cloudSystemCount, type CloudFiles } from './accountCloud'
import { useLicence } from './licence'
import { useEntitlement } from './useEntitlement'
import { loginHref, rememberReturn, type LoginIntent } from './loginReturn'
import { WORKSPACE_PROJECT_PARAM, WORKSPACE_SECTION_PARAM } from './workspaceLink'
import { useDesignStore } from '../store/useDesignStore'
import { useLibraryStatus, useSavedBrandKeys } from './libraryStatus'

export type AccessTier = 'anon' | 'free' | 'pro'

export interface Access {
  tier: AccessTier
  /** True while the session is still being read — callers show the full view
   *  meanwhile rather than flashing a wall at someone who is signed in. */
  loading: boolean
  /** No account (and the session is read): the work on screen is NOT saved on
   *  Escala. Gates saving and the account-only places (Home, publishing) —
   *  never reading, copying or exporting. */
  guest: boolean
}

export function useAccess(): Access {
  const { user, loading } = useAuth()
  const { pro } = useEntitlement()
  // Accounts off (no Supabase env, e.g. a fork run locally) → nothing to sign
  // into, so nothing is walled: an open-source checkout must stay usable.
  const signedIn = !accountsEnabled || Boolean(user)
  const tier: AccessTier = !signedIn ? 'anon' : pro ? 'pro' : 'free'
  return { tier, loading: accountsEnabled && loading, guest: tier === 'anon' && !(accountsEnabled && loading) }
}

/** Leave for `/login` (sign-up first), coming back to THIS Generator section
 *  and finishing `intent` there. The edits on screen live in the persisted
 *  store, so the round trip loses nothing. */
export function goToLogin(intent?: LoginIntent, mode: 'signup' | 'signin' = 'signup', section?: string, project?: string): void {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get(WORKSPACE_SECTION_PARAM)
  rememberReturn('workspace', intent ?? null, section ?? fromUrl, project ?? params.get(WORKSPACE_PROJECT_PARAM))
  window.location.assign(loginHref({ next: 'workspace', mode }))
}

/** Not Pro, accounts actually on — the Free plan, with or without an account.
 *  A visitor with no account exports exactly what a Free account exports, so
 *  opening Export to guests does not make them MORE than Free. Export and
 *  File & modes use this — `!entitlement.pro` alone would wall a fork
 *  that has no account to upgrade. While the session is loading this is
 *  false, so the full view shows instead of a flash of the limit. */
export function useFreeTier(): boolean {
  const { tier, loading } = useAccess()
  if (OPEN_BETA) return false
  return accountsEnabled && !loading && tier !== 'pro'
}

/** A brand ships ONE theme: every account that is not Pro, and a visitor with
 *  no account at all. `useFreeTier` covers only the signed-in half, which left
 *  an anonymous visitor free to pick Light + Dark. Accounts off, or the session
 *  still loading, is never limited. */
export function useOneThemePlan(): boolean {
  // Free ships Light AND Dark: no plan limits a brand to one theme any more.
  return false
}

/** Not Pro and accounts on. No viewport is gated any more: Free has Desktop,
 *  Tablet and Mobile. */
export function useNonProPlan(): boolean {
  const { tier, loading } = useAccess()
  if (OPEN_BETA) return false
  return accountsEnabled && !loading && tier !== 'pro'
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
  // Drafts the create studio or Random left behind are not brands yet: they
  // are hidden everywhere, so they must not spend the Free allowance either.
  const count = useSavedBrandKeys().length
  // Open beta: no plan to upgrade to, only the cost limit on brands.
  if (OPEN_BETA) return betaBrandLimitReached(count)
  const signedIn = Boolean(user) || (accountsEnabled && loading && hasStoredSession())
  return freeAnotherThemeBlocked({
    accountsOn: accountsEnabled,
    signedIn,
    pro: pro || licenceStillOpen(licence.status, licence.hasKey),
    count,
  })
}

/** Rule A: Free holds `FREE_SYSTEM_LIMIT` design system with up to three brands.
 *  Once it holds that many, starting another asks for Pro — the door stays
 *  visible and opens the upgrade notice. A system counts when it has a brand,
 *  the same count the cloud trims by (`cloudSystemCount`). Same session and
 *  licence reading as `useNeedsProForAnotherTheme`; systems already saved stay
 *  listed and open. */
export function useNeedsProForAnotherSystem(): boolean {
  const { user, loading } = useAuth()
  const { pro } = useEntitlement()
  const licence = useLicence()
  const themeOrder = useDesignStore((s) => s.themeOrder)
  const themes = useDesignStore((s) => s.themes)
  const projectName = useDesignStore((s) => s.projectName)
  const githubRepo = useDesignStore((s) => s.githubRepo)
  const publishId = useDesignStore((s) => s.publishId)
  const savedSystems = useDesignStore((s) => s.savedSystems)
  const systems = cloudSystemCount({
    snapshot: { projectName, githubRepo, publishId, themeOrder, themes },
    savedSystems,
  } as unknown as CloudFiles)
  const signedIn = Boolean(user) || (accountsEnabled && loading && hasStoredSession())
  return freeAnotherSystemBlocked({
    accountsOn: accountsEnabled,
    signedIn,
    pro: pro || licenceStillOpen(licence.status, licence.hasKey),
    systems,
  })
}

/** Who may ADD a font family (lib/customFonts): a signed-in account whose
 *  design system on screen has a saved copy. Using a font already added stays
 *  open to everyone — it is part of the system. */
export type FontAccess = 'loading' | 'guest' | 'unsaved' | 'ok'

export function useFontAccess(): FontAccess {
  const { guest, loading } = useAccess()
  const status = useLibraryStatus()
  if (loading) return 'loading'
  if (guest) return 'guest'
  return status === 'none' ? 'unsaved' : 'ok'
}
