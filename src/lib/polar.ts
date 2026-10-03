// Polar (the merchant of record that sells Escala Pro) — public identifiers and
// the one pure function that reads its licence-key validation answer.
//
// Nothing here is a secret. The organization id is what Polar's own docs ask
// every client to send to `POST /v1/customer-portal/license-keys/validate`,
// which takes no API key; the checkout link is the URL on the Get Pro button.
// Tokens (`POLAR_ACCESS_TOKEN`) never belong in this repo — there is none, and
// validation does not need one. DOM-free, so the endpoint and the tests share it.

export const POLAR_ORGANIZATION_ID = 'f9fb2f62-6a2e-4c9b-a903-db52a4f2a4f5'

/** Hosted checkout for Escala Pro. Linked from /pricing only once the free
 *  launch promo has ended (Nov 1) — see PricingPage. */
export const POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_kDSLoa6o4kALLSyffPjW3dHjj1GRRJd1hklMG386GDL'

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
