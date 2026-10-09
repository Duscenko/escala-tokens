// Polar (the merchant of record that sells Escala Pro) — public identifiers and
// the one pure function that reads its licence-key validation answer.
//
// Nothing here is a secret. The organization id is what Polar's own docs ask
// every client to send to `POST /v1/customer-portal/license-keys/validate`,
// which takes no API key; the checkout link is the URL on the Get Pro button.
// Tokens (`POLAR_ACCESS_TOKEN`) never belong in this repo — there is none.
// Validation does not need one. Looking up "did this email buy?" does, and that
// call stays in `api/licence-purchase.ts`, which reads the env var and returns
// only a boolean. DOM-free, so the endpoint and the tests share it.

export const POLAR_ORGANIZATION_ID = 'f9fb2f62-6a2e-4c9b-a903-db52a4f2a4f5'

/** Hosted checkout for Escala Pro. Linked from /pricing only once the free
 *  launch promo has ended (Nov 1) — see PricingPage. */
export const POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_kDSLoa6o4kALLSyffPjW3dHjj1GRRJd1hklMG386GDL'

/** Query Polar's checkout reads to prefill the buyer's email, so the receipt
 *  matches the account they are signed in with. */
const CHECKOUT_EMAIL_PARAM = 'customer_email'

/** Success URL to set on that checkout link in Polar. The app opens the paste
 *  dialog when it sees this query; Polar does not tell us about the purchase
 *  on its own. */
export const LICENCE_RETURN_PARAM = 'licence'
export const LICENCE_RETURN_VALUE = 'pending'
export const LICENCE_RETURN_URL = `https://www.escalatokens.com/?${LICENCE_RETURN_PARAM}=${LICENCE_RETURN_VALUE}`

/** Same checkout, with the signed-in email filled in when we have one. */
export function checkoutUrl(email?: string | null): string {
  const trimmed = email?.trim()
  if (!trimmed) return POLAR_CHECKOUT_URL
  const url = new URL(POLAR_CHECKOUT_URL)
  url.searchParams.set(CHECKOUT_EMAIL_PARAM, trimmed)
  return url.toString()
}

/** Strip `?licence=pending` from a return URL. `pending` is true only for that
 *  exact value — anything else is left alone. */
export function licenceReturnPath(href: string): { pending: boolean; next: string } {
  const url = new URL(href)
  const pending = url.searchParams.get(LICENCE_RETURN_PARAM) === LICENCE_RETURN_VALUE
  if (!pending) return { pending: false, next: url.pathname + url.search + url.hash }
  url.searchParams.delete(LICENCE_RETURN_PARAM)
  return { pending: true, next: url.pathname + url.search + url.hash }
}

export const POLAR_VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate'

export type LicenceReason = 'unknown' | 'expired' | 'revoked' | 'unavailable'

export interface LicenceResult {
  valid: boolean
  /** ISO instant the key stops working, when Polar reports one. */
  expiresAt: string | null
  reason?: LicenceReason
}

/** Turn Polar's HTTP answer into a result. Fails CLOSED on anything it does
 *  not understand — a 5xx or an odd body is `unavailable`, never `valid`; the
 *  caller decides what an unreachable validator means for the user. */
export function interpretValidation(httpStatus: number, body: unknown, now: Date): LicenceResult {
  if (httpStatus === 404) return { valid: false, expiresAt: null, reason: 'unknown' }
  if (httpStatus < 200 || httpStatus >= 300 || !body || typeof body !== 'object') {
    return { valid: false, expiresAt: null, reason: 'unavailable' }
  }
  const b = body as { status?: unknown; expires_at?: unknown }
  const expiresAt = typeof b.expires_at === 'string' ? b.expires_at : null
  if (b.status !== 'granted') return { valid: false, expiresAt, reason: 'revoked' }
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
    return { valid: false, expiresAt, reason: 'expired' }
  }
  return { valid: true, expiresAt }
}

/** Id of the customer whose email matches, or null. A list that does not
 *  contain that email is "no", never "take the first row". */
export function customerIdForEmail(body: unknown, email: string): string | null {
  if (!body || typeof body !== 'object') return null
  const items = (body as { items?: unknown }).items
  if (!Array.isArray(items)) return null
  const want = email.trim().toLowerCase()
  if (!want) return null
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; email?: unknown }
    if (typeof row.id !== 'string' || typeof row.email !== 'string') continue
    if (row.email.trim().toLowerCase() === want) return row.id
  }
  return null
}

/** True when the licence-key list (already scoped to one customer) contains a
 *  granted key that has not expired. The key itself is never read. */
export function hasGrantedLicence(body: unknown, now: Date): boolean {
  if (!body || typeof body !== 'object') return false
  const items = (body as { items?: unknown }).items
  if (!Array.isArray(items)) return false
  return items.some((item) => {
    if (!item || typeof item !== 'object') return false
    const row = item as { status?: unknown; expires_at?: unknown }
    if (row.status !== 'granted') return false
    if (typeof row.expires_at === 'string' && Date.parse(row.expires_at) <= now.getTime()) return false
    return true
  })
}
