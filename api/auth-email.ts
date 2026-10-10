import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyPolarWebhook } from './_polarWebhook.js'
import {
  authActionEmail,
  authLinkType,
  authPageUrl,
  mailLocale,
  type AuthMailAction,
} from '../src/lib/authEmail.js'

// Supabase Auth → Send Email hook. Replaces the built-in confirmation,
// recovery, magic-link and email-change letters with the same card
// api/password-reset.ts already sends. Until this hook is enabled in
// Authentication → Hooks, signup still uses the dashboard template.
//
// AUTH_EMAIL_HOOK_SECRET is the Standard Webhooks secret (`whsec_…`).
// RESEND_API_KEY and AUTH_FROM (or CONTACT_FROM) are the same sender as
// password reset. Logs name the action and the outcome, never the address
// or the token.

export const config = { api: { bodyParser: false } }

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

function fromAddress(): string {
  return process.env.AUTH_FROM || process.env.CONTACT_FROM || ''
}

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

function actionOf(raw: unknown): AuthMailAction | null {
  if (raw === 'email') return 'signup'
  if (raw === 'reauthentication') return 'reauthentication'
  return authLinkType(typeof raw === 'string' ? raw : null)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const secret = process.env.AUTH_EMAIL_HOOK_SECRET?.trim() ?? ''
  if (!secret || !process.env.RESEND_API_KEY || !fromAddress()) {
    return res.status(503).json({ error: 'not_configured' })
  }

  const raw = await rawBody(req)
  const signed = verifyPolarWebhook(raw, {
    id: header(req, 'webhook-id'),
    timestamp: header(req, 'webhook-timestamp'),
    signature: header(req, 'webhook-signature'),
  }, secret)
  if (!signed) return res.status(401).json({ error: 'invalid_signature' })

  let body: {
    user?: { email?: unknown; user_metadata?: { locale?: unknown } }
    email_data?: { token?: unknown; token_hash?: unknown; email_action_type?: unknown }
  }
  try {
    body = JSON.parse(raw) as typeof body
  } catch {
    return res.status(400).json({ error: 'invalid_json' })
  }

  const action = actionOf(body.email_data?.email_action_type)
  const email = typeof body.user?.email === 'string' ? body.user.email.trim().toLowerCase() : ''
  const tokenHash = typeof body.email_data?.token_hash === 'string' ? body.email_data.token_hash : ''
  const code = typeof body.email_data?.token === 'string' ? body.email_data.token : ''
  if (!action || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_payload' })
  if (action !== 'reauthentication' && tokenHash.length < 8) return res.status(400).json({ error: 'invalid_payload' })

  const mail = authActionEmail({
    locale: mailLocale(body.user?.user_metadata?.locale),
    email,
    action,
    url: action === 'reauthentication' ? '' : authPageUrl(tokenHash, action),
    code: action === 'reauthentication' ? code : undefined,
  })

  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [email],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    })
    console.info(JSON.stringify({ evt: 'auth_email', action, result: sent.ok ? 'sent' : `resend_${sent.status}` }))
    if (!sent.ok) return res.status(503).json({ error: 'send_failed' })
    return res.status(200).json({})
  } catch {
    console.info(JSON.stringify({ evt: 'auth_email', action, result: 'network' }))
    return res.status(503).json({ error: 'send_failed' })
  }
}
