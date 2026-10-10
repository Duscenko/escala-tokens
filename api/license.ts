import type { VercelRequest, VercelResponse } from '@vercel/node'
import { licenceCookieHeaders, readLicenceCookie } from '../src/lib/licenceCookie.js'
import { isActivationId } from '../src/lib/polar.js'
import { originAllowed, originsForHosts, parseBearer } from '../src/lib/publishTrust.js'
import { clientIp, rateLimited } from './_blob.js'
import { accountPro, claimKeyForAccount, type AccountPro } from './_accountPlan.js'
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
// Pro belongs to the ACCOUNT. The page sends its session with this check
// (`Authorization: Bearer`). A good key then records the account as Pro
// (`_accountPlan.ts`), and a browser with NO key still gets `valid` when the
// account already is — so signing in anywhere is enough, and nobody pastes a
// key twice. The Figma plugin and a publish read the same record.
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

function answer(res: VercelResponse, result: CheckedLicence, stored: boolean) {
  return res.status(result.reason === 'unavailable' ? 502 : 200).json({
    valid: result.valid,
    expiresAt: result.expiresAt,
    ...(result.reason ? { reason: result.reason } : {}),
    ...(result.activationId ? { activationId: result.activationId } : {}),
    stored,
    hasKey: stored,
    ...(result.valid ? { via: 'key' } : {}),
  })
}

/** Pro by the account, with no good key in this browser. `stored` says whether
 *  a cookie is still in place, so the page knows if there is a key to remove. */
function answerAccount(res: VercelResponse, plan: AccountPro, stored: boolean) {
  return res.status(200).json({
    valid: true,
    expiresAt: plan.until === 'lifetime' ? null : plan.until,
    stored,
    hasKey: stored,
    via: 'account',
  })
}

/** The signed-in account behind this request, or null. Asked only when the
 *  answer could depend on it. */
async function sessionUser(req: VercelRequest): Promise<{ id: string; email: string } | null> {
  const jwt = parseBearer(req.headers.authorization)
  if (!jwt) return null
  const user = await userFromJwt(jwt)
  return user && user !== 'unconfigured' ? user : null
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
    // No key in this browser. The account may still be Pro.
    const user = await sessionUser(req)
    const plan = user ? await accountPro(user) : null
    if (plan && plan !== 'unknown') {
      console.info(JSON.stringify({ evt: 'account_plan', op: 'read', via: plan.via, host: requestHost(req) }))
      return answerAccount(res, plan, false)
    }
    if (plan === 'unknown') {
      return res.status(502).json({ valid: false, expiresAt: null, reason: 'unavailable', hasKey: false, stored: false })
    }
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
    const user = result.reason === 'unavailable' ? null : await sessionUser(req)
    // Signed in, the question is about the ACCOUNT. A good key in this browser
    // counts only when it is this account's (`claimKeyForAccount`). A key that
    // belongs to another account leaves this one to its own record: without
    // that, a Free account signed in on a browser that held a key showed Pro.
    const claim = user && result.valid
      ? await claimKeyForAccount(
        user,
        { hash: licenceKeyHash(key), expiresAt: result.expiresAt, customerEmail: result.customerEmail },
        req.method === 'POST' ? 'pasted' : 'cookie',
      )
      : null
    if (claim) console.info(JSON.stringify({ evt: 'account_plan', op: 'bind', keyHash: licenceKeyHash(key), result: claim }))
    if (user && (!result.valid || claim === 'refused')) {
      // No key of this account's here (a typo, an expired one, a full device
      // cap, someone else's). The account may still be Pro by its own record.
      const plan = await accountPro(user)
      if (plan && plan !== 'unknown') {
        console.info(JSON.stringify({ evt: 'account_plan', op: 'read', via: plan.via, host: requestHost(req) }))
        return answerAccount(res, plan, keep)
      }
      if (claim === 'refused') {
        // The cookie stays: it is the other account's, on this same browser.
        return res.status(plan === 'unknown' ? 502 : 200).json({
          valid: false,
          expiresAt: null,
          ...(plan === 'unknown' ? { reason: 'unavailable' } : {}),
          hasKey: false,
          stored: false,
        })
      }
    }
    return answer(res, result, keep)
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
