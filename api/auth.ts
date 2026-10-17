import type { VercelRequest, VercelResponse } from '@vercel/node'
import signup from './_signup.js'
import passwordReset from './_passwordReset.js'

// One function for the two account-mail routes: the Hobby plan caps a
// deployment at 12 Serverless Functions. The public URLs are unchanged —
// vercel.json rewrites /api/signup and /api/password-reset here with ?op=.
// Handlers live in _signup.ts / _passwordReset.ts (underscore = not a function).

const OPS: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
  signup,
  'password-reset': passwordReset,
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
