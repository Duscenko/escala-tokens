// Free may change its one design system ten times. The eleventh change, and
// the agent context that would carry it, ask for Pro. The count lives on the
// store (`freeEditCount`) so a reload does not hand the allowance back.
// Pure helpers stay out of the store so a test can judge the gate without it.

import { create } from 'zustand'
import { hasStoredSession } from './auth'
import { entitlementAt } from './entitlement'
import { licenceStillOpen } from './freeThemeLimit'
import { readLicenceState } from './licence'
import { accountsEnabled } from './supabase'
import { useDesignStore } from '../store/useDesignStore'

export const FREE_EDIT_LIMIT = 10

/** Shown when a further change, or the agent context of one, is refused. */
export const FREE_EDIT_LIMIT_DETAIL =
  'Free includes 10 changes on this design system. Further changes, and the agent context they update, need Pro.'

/** Sync read for the activity hook. False with accounts off, signed out,
 *  during the launch promo, and while a saved key is still unchecked. */
export function freeEditLimitAppliesNow(): boolean {
  if (!accountsEnabled || !hasStoredSession()) return false
  if (entitlementAt(new Date()).promo) return false
  const licence = readLicenceState()
  if (licence.status === 'valid' || licenceStillOpen(licence.status, licence.hasKey)) return false
  return true
}

/** True when this Free account has spent its changes and must not take the
 *  agent context of another one. */
export function freeAgentContextBlocked(count: number, limitApplies: boolean): boolean {
  return limitApplies && count >= FREE_EDIT_LIMIT
}

type ProAsk = {
  open: boolean
  detail: string | null
  ask: (detail: string) => void
  close: () => void
}

/** One upgrade dialog in the shell. Callers that already have their own
 *  `upgradeOpen` leave `detail` null and keep the brand sentence. */
export const useProAsk = create<ProAsk>((set) => ({
  open: false,
  detail: null,
  ask: (detail) => set({ open: true, detail }),
  close: () => set({ open: false, detail: null }),
}))

export function askProForMoreEdits(): void {
  useProAsk.getState().ask(FREE_EDIT_LIMIT_DETAIL)
}

/** Record one settled edit, or refuse it once the allowance is spent.
 *  Callers only invoke this when `freeEditLimitAppliesNow()` is true. */
export function noteFreeEdit(): 'recorded' | 'blocked' {
  const n = useDesignStore.getState().freeEditCount ?? 0
  if (n >= FREE_EDIT_LIMIT) return 'blocked'
  useDesignStore.setState({ freeEditCount: n + 1 })
  return 'recorded'
}
