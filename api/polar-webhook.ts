import type { VercelRequest, VercelResponse } from '@vercel/node'
import { revokeAccountPlans } from './_accountPlan.js'
import { licenceKeyHash } from './_licence.js'
import { revokeLicenceStamps } from './_licenceIndex.js'
import { licenceKeyFromWebhook, verifyPolarWebhook, webhookShouldRevoke } from './_polarWebhook.js'

// Polar → POST /api/polar-webhook. `benefit_grant.revoked` (and a key moved to
// revoked) strips the licence stamp from every system that key published.
// The payload stays; the next read of /api/tokens is a 402. The accounts that
// proved the key stop being Pro in the plugin on their next refresh.
//
// POLAR_WEBHOOK_SECRET is the Standard Webhooks secret (`whsec_…`). If it is
// unset this answers 503 and does nothing, so Polar retries after the secret
// is added. The raw key is never logged.

export const config = { api: { bodyParser: false } }

async function rawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function header(req: VercelRequest, name: string): string {
  const raw = req.headers[name]
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim() ?? ''
  if (!secret) return res.status(503).json({ error: 'webhook_unconfigured' })

  const raw = await rawBody(req)
  const ok = verifyPolarWebhook(raw, {
    id: header(req, 'webhook-id'),
    timestamp: header(req, 'webhook-timestamp'),
    signature: header(req, 'webhook-signature'),
  }, secret)
  if (!ok) return res.status(401).json({ error: 'invalid_signature' })

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return res.status(400).json({ error: 'invalid_json' })
  }
  if (!webhookShouldRevoke(body)) return res.status(200).json({ ok: true, ignored: true })

  const key = licenceKeyFromWebhook(body)
  if (!key) return res.status(200).json({ ok: true, cleared: [] })

  try {
    const projects = await revokeLicenceStamps(key)
    const accounts = await revokeAccountPlans(licenceKeyHash(key))
    console.info(JSON.stringify({
      evt: 'license',
      op: 'revoke',
      keyHash: licenceKeyHash(key),
      projects,
      accounts,
    }))
    return res.status(200).json({ ok: true, cleared: projects.length })
  } catch {
    return res.status(503).json({ error: 'revoke_failed' })
  }
}
