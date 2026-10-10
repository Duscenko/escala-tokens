/**
 * Escala Pro as the ACCOUNT knows it.
 *
 * A licence key lives in one browser's cookie. The Figma plugin signs in
 * through whichever browser the system opens, on whichever host, and that
 * browser often has no key — so a paying account came back as Free.
 *
 * When a signed-in browser proves a key (Polar says it is good), the server
 * writes this record against the account. Plugin sign-in reads it. The key is
 * never stored: `keyHash` is the same short hash the logs carry, and it is how
 * a refund webhook finds the accounts to revoke.
 *
 * Pure and DOM-free: the endpoints and the tests share it.
 */

export interface AccountPlanRecord {
  /** ISO instant the licence ends, or `'lifetime'`. */
  until: string
  keyHash: string
  /** When a browser last proved the key for this account. */
  provenAt: string
  /** Set by the refund webhook. The record stays so the reason is visible. */
  revoked?: boolean
}

/** What an account's record says right now.
 *  A string is a live plan (`'lifetime'` or the ISO end). `'revoked'` is a
 *  refund. `null` is no record, or one that has run out. */
export type AccountPlanState = string | null | 'revoked'

export function accountPlanRecord(expiresAt: string | null, keyHash: string, now: Date): AccountPlanRecord {
  return { until: expiresAt ?? 'lifetime', keyHash, provenAt: now.toISOString() }
}

export function accountPlanState(record: unknown, now: Date): AccountPlanState {
  if (!record || typeof record !== 'object') return null
  const r = record as Partial<AccountPlanRecord>
  if (r.revoked === true) return 'revoked'
  if (typeof r.until !== 'string' || !r.until) return null
  if (r.until === 'lifetime') return 'lifetime'
  const at = Date.parse(r.until)
  return Number.isFinite(at) && at > now.getTime() ? r.until : null
}

/** True when writing `next` would change what the stored record says. Lets a
 *  page load that proves the same key again skip the Blob write. */
export function accountPlanChanged(stored: unknown, next: AccountPlanRecord): boolean {
  if (!stored || typeof stored !== 'object') return true
  const r = stored as Partial<AccountPlanRecord>
  return r.revoked === true || r.until !== next.until || r.keyHash !== next.keyHash
}
