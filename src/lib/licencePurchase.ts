import { isLiveEnvironment } from './figmaSync'
import { licenceReturnPath } from './polar'

// "Did the signed-in email buy Pro?" — a boolean from `/api/licence-purchase`.
// The key never travels this way. Localhost has no API route, so the lookup
// stays quiet there; `?licence=pending` still opens the dialog.

const FALSE_TTL_MS = 30_000
const TRUE_TTL_MS = 10 * 60_000

const cache = new Map<string, { at: number; purchased: boolean }>()

/** Drop `?licence=pending` from the address bar and report that this load is
 *  a return from checkout. */
export function consumeLicenceReturn(): boolean {
  if (typeof window === 'undefined') return false
  const { pending, next } = licenceReturnPath(window.location.href)
  if (!pending) return false
  window.history.replaceState(null, '', next)
  return true
}

/** True only when Polar has a granted key for this email. A missing token, a
 *  network error, or localhost answers false and is not remembered, so the
 *  next focus can ask again. */
export async function lookupPurchase(email: string): Promise<boolean> {
  const key = email.trim().toLowerCase()
  if (!key || !isLiveEnvironment()) return false
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.purchased ? TRUE_TTL_MS : FALSE_TTL_MS)) return hit.purchased
  try {
    const res = await fetch('/api/licence-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: key }),
    })
    if (!res.ok) return false
    const body = await res.json() as { purchased?: unknown }
    const purchased = body.purchased === true
    cache.set(key, { at: Date.now(), purchased })
    return purchased
  } catch {
    return false
  }
}
