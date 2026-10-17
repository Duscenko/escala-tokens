import type { VercelRequest, VercelResponse } from '@vercel/node'
import authEmail from './_authEmail.js'
import polarWebhook from './_polarWebhook.route.js'

// Polar and the Supabase Send Email hook are both signed Standard Webhooks and
// both need the RAW body, so they share one function (Hobby: max 12 per
// deployment). Public URLs are unchanged — vercel.json rewrites
// /api/polar-webhook and /api/auth-email here with ?op=.

export const config = { api: { bodyParser: false } }

const OPS: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
  'polar-webhook': polarWebhook,
  'auth-email': authEmail,
}

function opOf(req: VercelRequest): string {
  const q = req.query?.op
  const fromQuery = Array.isArray(q) ? q[0] : q
  if (fromQuery) return fromQuery
  return (req.url ?? '').split('?')[0].split('/').pop() ?? ''
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const run = OPS[opOf(req)]
  if (!run) return res.status(404).json({ error: 'not_found' })
  return run(req, res)
}
