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
export const POLAR_ACTIVATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/activate'

export type LicenceReason = 'unknown' | 'expired' | 'revoked' | 'unavailable' | 'activation_limit'

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

/** Expiry of a granted key on this customer, or null. No `expires_at` is
 *  `'lifetime'`. Several grants keep the one that lasts longest. The key
 *  itself is never read. */
export function grantedLicenceUntil(body: unknown, now: Date): string | null {
  if (!body || typeof body !== 'object') return null
  const items = (body as { items?: unknown }).items
  if (!Array.isArray(items)) return null
  let best: string | null = null
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const row = item as { status?: unknown; expires_at?: unknown }
    if (row.status !== 'granted') continue
    if (typeof row.expires_at === 'string') {
      if (Date.parse(row.expires_at) <= now.getTime()) continue
      if (best === 'lifetime') continue
      if (!best || Date.parse(row.expires_at) > Date.parse(best)) best = row.expires_at
    } else {
      best = 'lifetime'
    }
  }
  return best
}

/** True when the licence-key list (already scoped to one customer) contains a
 *  granted key that has not expired. The key itself is never read. */
export function hasGrantedLicence(body: unknown, now: Date): boolean {
  return grantedLicenceUntil(body, now) !== null
}

const ACTIVATION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Polar's activation id is a UUID. Anything else is ignored, so a bad header
 *  cannot be sent on as `activation_id` and turn a good key into a 422. */
export function isActivationId(value: unknown): value is string {
  return typeof value === 'string' && ACTIVATION_UUID.test(value)
}

/** `null` means the benefit does not limit activations. A number means it does,
 *  and only then may this server call Polar's activate endpoint. */
export function limitActivations(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null
  const n = (body as { limit_activations?: unknown }).limit_activations
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export type LicenceFollowup =
  | { kind: 'done'; result: LicenceResult }
  | { kind: 'activate' }
  | { kind: 'revalidate'; activationId: string }

/** What to do after one validate call that did NOT send an activation id.
 *  Activating while the benefit has no limit makes Polar answer 403, so that
 *  path runs only once `limit_activations` is a number. */
export function licenceFollowup(
  httpStatus: number,
  body: unknown,
  activationId: string | null,
  now: Date,
): LicenceFollowup {
  const limit = limitActivations(body)
  if (httpStatus === 403 && limit !== null) {
    return isActivationId(activationId) ? { kind: 'revalidate', activationId } : { kind: 'activate' }
  }
  const result = interpretValidation(httpStatus, body, now)
  if (limit === null || !result.valid) return { kind: 'done', result }
  return isActivationId(activationId) ? { kind: 'revalidate', activationId } : { kind: 'activate' }
}
