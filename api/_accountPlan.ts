import { customerIdForEmail, grantedLicenceUntil, POLAR_ORGANIZATION_ID } from '../src/lib/polar.js'

// "Does this account email have Escala Pro?" The plugin cannot see the
// browser's pasted licence key after sign-in, and a purchase is tied to the
// Polar customer, not to whichever tab happened to store the key.
//
// `'unknown'` means Polar could not be asked. Callers must not turn that into
// Free. A definite null means this email has no live grant.

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

export async function proUntilForEmail(email: string, now = new Date()): Promise<string | null | 'unknown'> {
  const key = email.trim().toLowerCase()
  if (!key) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.until ? YES_TTL_MS : NO_TTL_MS)) return hit.until
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) return 'unknown'
  try {
    const customers = await polarGet(`/customers/?email=${encodeURIComponent(key)}`, token)
    if (!customers) return 'unknown'
    const customerId = customerIdForEmail(customers, key)
    if (!customerId) {
      cache.set(key, { at: Date.now(), until: null })
      return null
    }
    const keys = await polarGet(
      `/license-keys/?organization_id=${POLAR_ORGANIZATION_ID}&customer_id=${encodeURIComponent(customerId)}`,
      token,
    )
    if (!keys) return 'unknown'
    const until = grantedLicenceUntil(keys, now)
    cache.set(key, { at: Date.now(), until })
    return until
  } catch {
    return 'unknown'
  }
}
