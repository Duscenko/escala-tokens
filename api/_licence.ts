import { createHash } from 'node:crypto'
import { POLAR_ORGANIZATION_ID, POLAR_VALIDATE_URL, interpretValidation, type LicenceResult } from '../src/lib/polar.js'

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

const cache = new Map<string, { at: number; result: LicenceResult }>()

/** Short hash for logs. Correlates one key across checks and slugs without
 *  writing the key itself. 16 hex chars is enough to tell keys apart. */
export function licenceKeyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16)
}

export async function checkLicenceKey(key: string): Promise<LicenceResult> {
  const id = createHash('sha256').update(key).digest('hex')
  const hit = cache.get(id)
  const now = Date.now()
  if (hit && now - hit.at < (hit.result.valid ? GOOD_TTL_MS : BAD_TTL_MS)) return hit.result

  let result: LicenceResult
  try {
    const r = await fetch(POLAR_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: POLAR_ORGANIZATION_ID }),
    })
    const body = await r.json().catch(() => null)
    result = interpretValidation(r.status, body, new Date())
  } catch {
    // Polar unreachable. NOT cached: the next call should try again.
    return { valid: false, expiresAt: null, reason: 'unavailable' }
  }
  if (result.reason === 'unavailable') return result
  if (cache.size > 2_000) cache.clear()
  cache.set(id, { at: now, result })
  return result
}
