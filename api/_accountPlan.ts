import { createHash } from 'node:crypto'
import { put } from '@vercel/blob'
import { customerIdForEmail, grantedLicenceUntil, POLAR_ORGANIZATION_ID } from '../src/lib/polar.js'
import {
  accountPlanChanged, accountPlanRecord, accountPlanState,
  type AccountPlanRecord, type AccountPlanState,
} from '../src/lib/accountPlan.js'
import { forgetBlob, learnBlobBase, readJsonBlob } from './_blob.js'

// "Does this account have Escala Pro?" Two answers live here. The web's
// licence check, a publish and plugin sign-in all ask both, so an account is
// Pro in every browser it signs in to, not only in the one that holds the key.
//
// 1. The account's own record. A signed-in browser proved a key, so the server
//    wrote "this account is Pro until <date>" (`lib/accountPlan.ts`). It needs
//    no Polar token and it does not care which email paid.
// 2. A Polar grant on the account email. Needs POLAR_ACCESS_TOKEN.
//
// `'unknown'` means the source could not be asked. Callers must not turn that
// into Free. A definite null means there is no live grant.

const YES_TTL_MS = 10 * 60_000
const NO_TTL_MS = 60_000

const cache = new Map<string, { at: number; until: string | null }>()

async function polarGet(path: string, token: string): Promise<unknown | null> {
  const r = await fetch(`https://api.polar.sh/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!r.ok) return null
  return r.json().catch(() => null)
}

async function keysUntil(customerId: string, token: string, now: Date): Promise<string | null | 'unknown'> {
  const keys = await polarGet(
    `/license-keys/?organization_id=${POLAR_ORGANIZATION_ID}&customer_id=${encodeURIComponent(customerId)}&limit=100`,
    token,
  )
  if (!keys) return 'unknown'
  return grantedLicenceUntil(keys, now)
}

/** Exact email first (Polar's filter is exact), then a search that still
 *  has to match the address. A failed request is `'unknown'`, never "no". */
async function grantForEmail(raw: string, token: string, now: Date): Promise<string | null | 'unknown'> {
  const org = POLAR_ORGANIZATION_ID
  const lower = raw.trim().toLowerCase()
  const spellings = raw.trim() === lower ? [lower] : [raw.trim(), lower]
  for (const email of spellings) {
    const customers = await polarGet(
      `/customers/?organization_id=${org}&email=${encodeURIComponent(email)}`,
      token,
    )
    if (!customers) continue
    const customerId = customerIdForEmail(customers, lower)
    if (customerId) return keysUntil(customerId, token, now)
  }
  const found = await polarGet(
    `/customers/?organization_id=${org}&query=${encodeURIComponent(lower)}`,
    token,
  )
  if (!found) return 'unknown'
  const customerId = customerIdForEmail(found, lower)
  if (!customerId) return null
  return keysUntil(customerId, token, now)
}

/** False when this deployment has no Polar token, so the email lookup does not
 *  exist. That is a setup gap, not an outage, and it is logged where it costs
 *  someone their plan. */
export function polarLookupConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN)
}

export async function proUntilForEmail(email: string, now = new Date()): Promise<string | null | 'unknown'> {
  const key = email.trim().toLowerCase()
  if (!key) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.until ? YES_TTL_MS : NO_TTL_MS)) return hit.until
  const token = process.env.POLAR_ACCESS_TOKEN
  // No token is "this source has nothing to say", not "Polar is down". Answering
  // `unknown` here left every signed-in account without a key unclassified for
  // good, and the plugin refuses to build for a plan it cannot confirm.
  if (!token) return null
  try {
    const until = await grantForEmail(email, token, now)
    if (until === 'unknown') return 'unknown'
    cache.set(key, { at: Date.now(), until })
    return until
  } catch {
    return 'unknown'
  }
}

// ── The account's own record ────────────────────────────────────────────────

const MAX_ACCOUNTS_PER_KEY = 25

function accountId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex')
}
function accountPlanKey(userId: string): string {
  return `account-plan/${accountId(userId)}.json`
}
function licenceAccountsKey(keyHash: string): string {
  return `licence-accounts/${keyHash}.json`
}

async function writePublic(key: string, value: unknown): Promise<void> {
  const stored = await put(key, JSON.stringify(value), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  learnBlobBase(stored.url, key)
  forgetBlob(key)
}

/** What the account's record says now. `'unknown'` when the Blob read failed:
 *  a blip must not read as "this account never had Pro". */
export async function accountPlanFor(userId: string, now = new Date()): Promise<AccountPlanState | 'unknown'> {
  if (!userId) return null
  try {
    return accountPlanState(await readJsonBlob<AccountPlanRecord>(accountPlanKey(userId), { fresh: true }), now)
  } catch {
    return 'unknown'
  }
}

/** Record that this account holds a key Polar just accepted. Best-effort: a
 *  failure here must not fail the licence check or the sign-in around it.
 *  Skips the write when the record already says the same thing.
 *
 *  `claim` is for a key that only RODE ALONG in the browser's cookie, as
 *  opposed to one the person just pasted. It records the account only when the
 *  key has no account yet (or already names this one). Without that, signing
 *  a second account in on a browser that holds someone's key — which the
 *  plugin's "Switch account" makes one click — would hand that account Pro
 *  everywhere, for good. */
export async function bindAccountPlan(
  userId: string,
  keyHash: string,
  expiresAt: string | null,
  now = new Date(),
  opts: { claim?: boolean } = {},
): Promise<boolean> {
  if (!userId || !keyHash) return false
  try {
    const id = accountId(userId)
    const index = await readJsonBlob<{ accounts?: unknown }>(licenceAccountsKey(keyHash), { fresh: true })
    const accounts = Array.isArray(index?.accounts)
      ? index.accounts.filter((a): a is string => typeof a === 'string' && a.length > 0)
      : []
    if (opts.claim && accounts.length > 0 && !accounts.includes(id)) return false
    const next = accountPlanRecord(expiresAt, keyHash, now)
    const stored = await readJsonBlob<AccountPlanRecord>(accountPlanKey(userId), { fresh: true })
    if (accountPlanChanged(stored, next)) await writePublic(accountPlanKey(userId), next)
    if (!accounts.includes(id)) {
      accounts.push(id)
      await writePublic(licenceAccountsKey(keyHash), { accounts: accounts.slice(-MAX_ACCOUNTS_PER_KEY) })
    }
    return true
  } catch {
    return false
  }
}

export interface AccountPro {
  /** ISO instant, or `'lifetime'`. */
  until: string
  via: 'account' | 'email'
  /** The key that proved it, when the proof is the account's record. A publish
   *  indexes the system under it so a refund can find it. */
  keyHash?: string
}

/** Is this signed-in account Pro, whatever browser is asking? The account's
 *  record first, then a Polar grant on its email. `null` is a definite no.
 *  `'unknown'` means a proof could not be read, and must not become Free. */
export async function accountPro(
  user: { id: string; email: string },
  now = new Date(),
): Promise<AccountPro | null | 'unknown'> {
  let record: AccountPlanRecord | null = null
  let recordUnknown = false
  try {
    record = await readJsonBlob<AccountPlanRecord>(accountPlanKey(user.id), { fresh: true })
  } catch {
    recordUnknown = true
  }
  const state = accountPlanState(record, now)
  if (typeof state === 'string' && state !== 'revoked') {
    return { until: state, via: 'account', ...(record?.keyHash ? { keyHash: record.keyHash } : {}) }
  }
  const emailUntil = await proUntilForEmail(user.email, now)
  if (typeof emailUntil === 'string' && emailUntil !== 'unknown') return { until: emailUntil, via: 'email' }
  if (recordUnknown || emailUntil === 'unknown') return 'unknown'
  return null
}

/** A refund: mark every account that proved this key. Returns how many. */
export async function revokeAccountPlans(keyHash: string): Promise<number> {
  const index = await readJsonBlob<{ accounts?: unknown }>(licenceAccountsKey(keyHash), { fresh: true })
  const accounts = Array.isArray(index?.accounts)
    ? index.accounts.filter((a): a is string => typeof a === 'string' && /^[0-9a-f]{64}$/.test(a))
    : []
  let cleared = 0
  for (const id of accounts) {
    const key = `account-plan/${id}.json`
    const stored = await readJsonBlob<AccountPlanRecord>(key, { fresh: true })
    if (!stored || stored.keyHash !== keyHash || stored.revoked) continue
    await writePublic(key, { ...stored, revoked: true })
    cleared += 1
  }
  return cleared
}
