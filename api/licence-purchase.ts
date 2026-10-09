import type { VercelRequest, VercelResponse } from '@vercel/node'
import { originAllowed, originsForHosts } from '../src/lib/publishTrust.js'
import { customerIdForEmail, hasGrantedLicence, POLAR_ORGANIZATION_ID } from '../src/lib/polar.js'
import { clientIp, rateLimited } from './_blob.js'

// POST { email } → { purchased }.
//
// The confirmation email does not call us, and Polar's "Access purchase" button
// opens Polar, not this app. When someone signed in with the same address comes
// back, this is how the paste dialog knows to open: the org token lists that
// customer's licence keys and we answer yes or no.
//
// The key itself is never returned and never logged. No token in the
// environment means `purchased: false` — the dialog stays closed rather than
// guessing. Pro still requires a key that validates.

const MAX_EMAIL = 200
const PER_MINUTE = 10
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

async function polarGet(path: string, token: string): Promise<unknown | null> {
  const r = await fetch(`https://api.polar.sh/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!r.ok) return null
  return r.json().catch(() => null)
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
  if (rateLimited(`licence-purchase:${clientIp(req.headers)}`, PER_MINUTE)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const raw = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).email : undefined
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!email || email.length > MAX_EMAIL || !EMAIL.test(email)) {
    return res.status(400).json({ error: 'invalid_email' })
  }

  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) {
    console.info(JSON.stringify({ evt: 'licence_purchase', purchased: false, reason: 'unconfigured' }))
    return res.status(200).json({ purchased: false })
  }

  try {
    const customers = await polarGet(`/customers/?email=${encodeURIComponent(email)}`, token)
    const customerId = customerIdForEmail(customers, email)
    if (!customerId) {
      console.info(JSON.stringify({ evt: 'licence_purchase', purchased: false }))
      return res.status(200).json({ purchased: false })
    }
    const keys = await polarGet(
      `/license-keys/?organization_id=${POLAR_ORGANIZATION_ID}&customer_id=${encodeURIComponent(customerId)}`,
      token,
    )
    const purchased = hasGrantedLicence(keys, new Date())
    console.info(JSON.stringify({ evt: 'licence_purchase', purchased }))
    return res.status(200).json({ purchased })
  } catch {
    console.info(JSON.stringify({ evt: 'licence_purchase', purchased: false, reason: 'network' }))
    return res.status(200).json({ purchased: false })
  }
}
