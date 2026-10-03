import type { VercelRequest, VercelResponse } from '@vercel/node'
import { originAllowed, originsForHosts } from '../src/lib/publishTrust.js'
import { POLAR_ORGANIZATION_ID, POLAR_VALIDATE_URL, interpretValidation } from '../src/lib/polar.js'
import { clientIp, rateLimited } from './_blob.js'

// POST { key } → { valid, expiresAt, reason? }.
//
// Asks Polar whether a licence key is good. Polar's validate endpoint takes the
// key and the (public) organization id and no API key, so there is no secret on
// this server for it — the endpoint exists to keep the browser from calling a
// third party directly, to rate-limit guessing, and to put one interpretation
// of Polar's answer (`interpretValidation`) in front of every consumer.
//
// Nothing is stored and the key is never logged: logs carry the outcome only,
// the same contract the privacy page states for the contact form.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!originAllowed(req.headers.origin, requestOrigins(req))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  if (rateLimited(`license:${clientIp(req.headers)}`, PER_MINUTE)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const raw = (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).key : undefined)
  const key = typeof raw === 'string' ? raw.trim() : ''
  if (!key || key.length > MAX_KEY) return res.status(400).json({ error: 'invalid_key' })

  try {
    const r = await fetch(POLAR_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: POLAR_ORGANIZATION_ID }),
    })
    const body = await r.json().catch(() => null)
    const result = interpretValidation(r.status, body, new Date())
    console.info(JSON.stringify({ evt: 'license', valid: result.valid, reason: result.reason ?? null }))
    // `unavailable` is a 502 so the client can tell "your key is wrong" from
    // "the validator is down" and never tells someone a good key is bad.
    return res.status(result.reason === 'unavailable' ? 502 : 200).json(result)
  } catch {
    console.info(JSON.stringify({ evt: 'license', valid: false, reason: 'network' }))
    return res.status(502).json({ valid: false, expiresAt: null, reason: 'unavailable' })
  }
}
