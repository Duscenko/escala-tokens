import type { VercelRequest, VercelResponse } from '@vercel/node'
import { licenceCookieHeaders, readLicenceCookie } from '../src/lib/licenceCookie.js'
import { isActivationId } from '../src/lib/polar.js'
import { originAllowed, originsForHosts, parseBearer } from '../src/lib/publishTrust.js'
import { clientIp, rateLimited } from './_blob.js'
import { bindAccountPlan } from './_accountPlan.js'
import { userFromJwt } from './_authUser.js'
import { checkLicenceKey, licenceKeyHash, type CheckedLicence } from './_licence.js'

// POST { key } → { valid, expiresAt, reason? }.
//
// Asks Polar whether a licence key is good. Polar's validate endpoint takes the
// key and the (public) organization id and no API key, so there is no secret on
// this server for it — the endpoint exists to keep the browser from calling a
// third party directly, to rate-limit guessing, and to put one interpretation
// of Polar's answer (`interpretValidation`) in front of every consumer.
//
// A good key is stored as an HttpOnly cookie (`sd_licence`), not returned to
// the page. The log carries the outcome plus a short hash of the key, so one
// key used from many places can be seen without the key itself appearing. The
// privacy page states both.
//
// When the request also carries the account's session (`Authorization: Bearer`)
// and the key is good, the account is recorded as Pro (`_accountPlan.ts`). That
// record is what the Figma plugin reads at sign-in: the browser it opens is
// often not the one holding this cookie.
//
// Phase 2 of design-plans/pricing-and-packaging.md. Nothing calls this for
// enforcement yet — `api/tokens.ts` starts requiring it in phase 3.

const MAX_KEY = 200
/** Per-instance soft cap against key guessing; the Firewall rule is the real one. */
const PER_MINUTE = 10

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

function headerOne(req: VercelRequest, name: string): string {
  const raw = req.headers[name]
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
}

function activationOf(req: VercelRequest): string | null {
  const fromBody = req.body && typeof req.body === 'object'
    ? (req.body as Record<string, unknown>).activationId
    : undefined
  const raw = typeof fromBody === 'string' ? fromBody : headerOne(req, 'x-escala-activation')
  return isActivationId(raw) ? raw : null
}

/** The host this request was made to, for the cookie's scope. */
function requestHost(req: VercelRequest): string {
  return headerOne(req, 'x-forwarded-host') || headerOne(req, 'host')
}

/** `account` is true when this request also recorded the signed-in account as
 *  Pro, so the page can stop sending its session with the check. */
function answer(res: VercelResponse, result: CheckedLicence, stored: boolean, account = false) {
  return res.status(result.reason === 'unavailable' ? 502 : 200).json({
    valid: result.valid,
    expiresAt: result.expiresAt,
    ...(result.reason ? { reason: result.reason } : {}),
    ...(result.activationId ? { activationId: result.activationId } : {}),
    stored,
    hasKey: stored,
    ...(account ? { account: true } : {}),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // POST always carries Origin. A same-origin GET often does not, and that GET
  // is how the page learns the HttpOnly cookie is there. A present Origin that
  // is not this site is still refused.
  const originOk = !req.headers.origin || originAllowed(req.headers.origin, requestOrigins(req))
  if (req.method === 'POST' ? !originAllowed(req.headers.origin, requestOrigins(req)) : !originOk) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const cookieOpts = { secure: process.env.VERCEL_ENV === 'production', host: requestHost(req) }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', licenceCookieHeaders('', cookieOpts))
    return res.status(204).end()
  }
  if (rateLimited(`license:${clientIp(req.headers)}`, PER_MINUTE)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const posted = req.body && typeof req.body === 'object'
    ? (req.body as Record<string, unknown>).key
    : undefined
  const key = req.method === 'POST'
    ? (typeof posted === 'string' ? posted.trim() : '')
    : readLicenceCookie(req.headers.cookie)
  if (req.method === 'GET' && !key) {
    return res.status(200).json({ valid: false, expiresAt: null, hasKey: false, stored: false })
  }
  if (!key || key.length > MAX_KEY) return res.status(400).json({ error: 'invalid_key' })

  try {
    const result = await checkLicenceKey(key, activationOf(req))
    console.info(JSON.stringify({
      evt: 'license',
      op: 'check',
      keyHash: licenceKeyHash(key),
      valid: result.valid,
      reason: result.reason ?? null,
    }))
    // Keep the key when it is good, when Polar is down, or when this browser
    // is over the activation cap (the key itself is fine). A GET that finds
    // the key rejected clears the cookie. A POST of a typo does not.
    const keep = result.valid || result.reason === 'unavailable' || result.reason === 'activation_limit'
    if (keep) res.setHeader('Set-Cookie', licenceCookieHeaders(key, cookieOpts))
    else if (req.method === 'GET') res.setHeader('Set-Cookie', licenceCookieHeaders('', cookieOpts))
    // A signed-in browser with a good key: the account is Pro from here on,
    // wherever it signs in next.
    const jwt = result.valid ? parseBearer(req.headers.authorization) : null
    let recorded = false
    if (jwt) {
      const user = await userFromJwt(jwt)
      if (user && user !== 'unconfigured') {
        recorded = await bindAccountPlan(user.id, licenceKeyHash(key), result.expiresAt)
        console.info(JSON.stringify({ evt: 'account_plan', op: 'bind', keyHash: licenceKeyHash(key), ok: recorded }))
      }
    }
    return answer(res, result, keep, recorded)
  } catch {
    console.info(JSON.stringify({
      evt: 'license',
      op: 'check',
      keyHash: licenceKeyHash(key),
      valid: false,
      reason: 'network',
    }))
    return res.status(502).json({ valid: false, expiresAt: null, reason: 'unavailable', stored: false, hasKey: false })
  }
}
