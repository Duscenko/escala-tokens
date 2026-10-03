import type { VercelRequest, VercelResponse } from '@vercel/node'
import { entitlementAt } from '../src/lib/entitlement.js'

// GET → { promo, promoEndsAt, pro, maxThemes, now }.
//
// The single source of "is the launch promo still on". The cutoff constant
// lives in src/lib/entitlement.ts so the client can render the rule, but only
// this endpoint's clock decides it — a browser whose clock is moved back does
// not extend the promo.
//
// No licence key yet (phase 2). No body, no Blob, no per-user state, so the
// answer is the same for everyone and the CDN can hold it: five minutes is
// far below the countdown's resolution of one day, and keeps this endpoint
// off the function bill.

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  return res.status(200).json(entitlementAt(new Date()))
}
