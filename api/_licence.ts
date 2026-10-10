import { createHash } from 'node:crypto'
import {
  POLAR_ACTIVATE_URL, POLAR_ORGANIZATION_ID, POLAR_VALIDATE_URL,
  interpretValidation, isActivationId, licenceCustomerEmail, licenceFollowup, limitActivations, type LicenceResult,
} from '../src/lib/polar.js'

// One question — "is this key good?" — asked of Polar from the server, with a
// short memory so a burst of publishes (auto-sync fires after every edit) is
// one call to Polar, not dozens.
//
// The cache key is a hash: the licence key itself is never held in a Map that
// a heap dump or a stray log could print.

const GOOD_TTL_MS = 10 * 60_000
/** A rejection is remembered for less: a customer who just pasted the right key
 *  after a typo should not wait ten minutes. */
const BAD_TTL_MS = 60_000

/** `customerEmail` is who Polar sold the key to. Server-side only: it decides
 *  which account a key belongs to, and is never sent to the page or logged. */
export type CheckedLicence = LicenceResult & { activationId?: string; customerEmail?: string }

const cache = new Map<string, { at: number; result: CheckedLicence }>()

/** Short hash for logs. Correlates one key across checks and slugs without
 *  writing the key itself. 16 hex chars is enough to tell keys apart. */
export function licenceKeyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16)
}

function cacheId(key: string, activationId: string): string {
  return createHash('sha256').update(`${key}\n${activationId}`).digest('hex')
}

async function polarPost(url: string, body: Record<string, string>): Promise<{ status: number; body: unknown }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}

function remember(key: string, asked: string, result: CheckedLicence): CheckedLicence {
  if (result.reason === 'unavailable') return result
  if (cache.size > 2_000) cache.clear()
  const at = Date.now()
  cache.set(cacheId(key, asked), { at, result })
  if (result.activationId && result.activationId !== asked) {
    cache.set(cacheId(key, result.activationId), { at, result })
  }
  return result
}

const unavailable: CheckedLicence = { valid: false, expiresAt: null, reason: 'unavailable' }

/** `activationId` is this browser's Polar activation, when it has one.
 *  The first call always validates WITHOUT it. Activate runs only when Polar's
 *  own answer says the benefit limits activations (`limit_activations` is a
 *  number). Calling it while the limit is off returns 403 and would lock
 *  every good key out.
 *  `{ activate: false }` answers "is this key Pro?" without spending a slot.
 *  That result is not cached: the browser's real check still has to activate. */
export async function checkLicenceKey(
  key: string,
  activationId?: string | null,
  opts?: { activate?: boolean },
): Promise<CheckedLicence> {
  const result = await checkLicence(key, activationId, opts)
  const owner = ownerByKey.get(cacheId(key, ''))
  return owner && !result.customerEmail ? { ...result, customerEmail: owner } : result
}

/** Who bought each key seen by this instance, by the same hash the cache uses. */
const ownerByKey = new Map<string, string>()

async function checkLicence(
  key: string,
  activationId?: string | null,
  opts?: { activate?: boolean },
): Promise<CheckedLicence> {
  const asked = isActivationId(activationId) ? activationId : ''
  const hit = cache.get(cacheId(key, asked))
  const now = Date.now()
  if (hit && now - hit.at < (hit.result.valid ? GOOD_TTL_MS : BAD_TTL_MS)) return hit.result

  const org = { key, organization_id: POLAR_ORGANIZATION_ID }
  let first: { status: number; body: unknown }
  try {
    first = await polarPost(POLAR_VALIDATE_URL, org)
  } catch {
    return unavailable
  }

  const owner = licenceCustomerEmail(first.body)
  if (owner) {
    if (ownerByKey.size > 2_000) ownerByKey.clear()
    ownerByKey.set(cacheId(key, ''), owner)
  }

  const plan = licenceFollowup(first.status, first.body, asked || null, new Date())
  if (plan.kind === 'activate' && opts?.activate === false) {
    const judged = interpretValidation(first.status, first.body, new Date())
    if (judged.valid) return { ...judged, reason: 'activation_limit' }
    if (first.status === 403 && limitActivations(first.body) !== null) {
      const raw = first.body && typeof first.body === 'object'
        ? (first.body as { expires_at?: unknown }).expires_at
        : null
      return { valid: true, expiresAt: typeof raw === 'string' ? raw : null, reason: 'activation_limit' }
    }
    return judged.reason === 'unavailable' ? unavailable : remember(key, asked, judged)
  }
  if (plan.kind === 'done') return remember(key, asked, plan.result)

  if (plan.kind === 'revalidate') {
    let second: { status: number; body: unknown }
    try {
      second = await polarPost(POLAR_VALIDATE_URL, { ...org, activation_id: plan.activationId })
    } catch {
      return unavailable
    }
    if (second.status === 403) {
      return remember(key, asked, { valid: false, expiresAt: null, reason: 'activation_limit', activationId: plan.activationId })
    }
    const result = interpretValidation(second.status, second.body, new Date())
    return remember(key, asked, { ...result, activationId: plan.activationId })
  }

  let activated: { status: number; body: unknown }
  try {
    activated = await polarPost(POLAR_ACTIVATE_URL, { ...org, label: 'Escala' })
  } catch {
    return unavailable
  }
  if (activated.status === 403) {
    return remember(key, asked, { valid: false, expiresAt: null, reason: 'activation_limit' })
  }
  const newId = activated.body && typeof activated.body === 'object'
    ? (activated.body as { id?: unknown }).id
    : undefined
  if (activated.status !== 200 || !isActivationId(newId)) return unavailable

  let second: { status: number; body: unknown }
  try {
    second = await polarPost(POLAR_VALIDATE_URL, { ...org, activation_id: newId })
  } catch {
    return unavailable
  }
  if (second.status === 403) {
    return remember(key, asked, { valid: false, expiresAt: null, reason: 'activation_limit', activationId: newId })
  }
  const result = interpretValidation(second.status, second.body, new Date())
  return remember(key, asked, { ...result, activationId: newId })
}
