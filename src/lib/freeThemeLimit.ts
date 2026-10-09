// Free may keep every theme it already has, and may not mint another once it
// has one. Display stays untouched; this is only the create/duplicate gate.
// Pure on purpose so the store and mintTheme can call it without importing
// access.ts (that module already imports the store).

import { hasStoredSession } from './auth'
import { entitlementAt } from './entitlement'
import { readLicenceState, type LicenceStatus } from './licence'
import { accountsEnabled } from './supabase'

export const FREE_MY_THEME_LIMIT = 1

/** Shown when a create is refused. Already translated in i18n. */
export const FREE_ANOTHER_THEME_ERROR =
  'Free includes one theme. Pro adds this style and as many as you need.'

export function freeAnotherThemeBlocked(input: {
  accountsOn: boolean
  signedIn: boolean
  pro: boolean
  count: number
}): boolean {
  return input.accountsOn && input.signedIn && !input.pro && input.count >= FREE_MY_THEME_LIMIT
}

/** A saved key Polar has not ruled on yet is not Free. */
export function licenceStillOpen(status: LicenceStatus, hasKey: boolean): boolean {
  return hasKey && (status === 'checking' || status === 'unavailable')
}

/** Sync read for mintTheme and duplicateTheme. False with accounts off, with
 *  no stored session (tests, the plugin studio, a signed-out tab), during the
 *  launch promo, and while a saved key is still unchecked. */
export function freeAnotherThemeBlockedNow(count: number): boolean {
  if (!accountsEnabled || !hasStoredSession()) return false
  if (entitlementAt(new Date()).promo) return false
  const licence = readLicenceState()
  if (licence.status === 'valid' || licenceStillOpen(licence.status, licence.hasKey)) return false
  return freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: false, count })
}
