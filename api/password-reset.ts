import type { VercelRequest, VercelResponse } from '@vercel/node'
import { originAllowed, originsForHosts } from '../src/lib/publishTrust.js'
import { mailLocale, PUBLIC_SITE, recoveryEmail, recoveryPageUrl } from '../src/lib/authEmail.js'
import { clientIp, rateLimited } from './_blob.js'

// Branded password-recovery mail. Supabase's built-in Recovery template is a
// bare "Follow this link" with the button pointing at *.supabase.co, which is
// the message inboxes flag. This route builds the link on www.escalatokens.com
// and sends the header / body / footer from src/lib/authEmail.ts.
//
// Always answers the same way for an address that does not have an account, so
// the form cannot be used to learn who signed up. Logs carry the outcome, never
// the address or the token.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, and AUTH_FROM or CONTACT_FROM (a verified sender, e.g.
// "Escala Tokens <hello@mail.escalatokens.com>"). Missing config → 503, and the
// browser falls back to Supabase's own mail.

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/
const PER_HOUR = 5

function configured(): boolean {
  return Boolean(supabaseUrl() && serviceKey() && process.env.RESEND_API_KEY && fromAddress())
}

function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function fromAddress(): string {
  return process.env.AUTH_FROM || process.env.CONTACT_FROM || ''
}

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    'www.escalatokens.com',
    'escalatokens.com',
  ])
}

function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, '').trim().slice(0, 254)
}

type LinkResult = 'unknown' | 'limited' | 'failed' | { token: string }

async function recoveryToken(email: string): Promise<LinkResult> {
  let res: Response
  try {
    res = await fetch(`${supabaseUrl()}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey()}`,
        apikey: serviceKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'recovery',
        email,
        options: { redirect_to: `${PUBLIC_SITE}/login` },
      }),
    })
  } catch {
    return 'failed'
  }
  if (res.status === 429) return 'limited'
  const body = await res.json().catch(() => null) as {
    hashed_token?: unknown
    action_link?: unknown
    error_code?: unknown
    msg?: unknown
  } | null
  if (!res.ok || !body) {
    const code = typeof body?.error_code === 'string' ? body.error_code : ''
    const msg = typeof body?.msg === 'string' ? body.msg : ''
    if (res.status === 404 || res.status === 422 || code === 'user_not_found' || /not found/i.test(msg)) return 'unknown'
    return 'failed'
  }
  if (typeof body.hashed_token === 'string' && body.hashed_token.length > 8) return { token: body.hashed_token }
  if (typeof body.action_link === 'string') {
    try {
      const token = new URL(body.action_link).searchParams.get('token')
      if (token && token.length > 8) return { token }
    } catch {
      return 'failed'
    }
  }
  return 'failed'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  if (!originAllowed(req.headers.origin, requestOrigins(req))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  if (!configured()) return res.status(503).json({ error: 'not_configured' })

  const ip = clientIp(req.headers)
  if (rateLimited(`reset:${ip}`, PER_HOUR, 60 * 60_000)) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const email = oneLine(typeof body.email === 'string' ? body.email : '').toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (rateLimited(`reset-email:${email}`, 3, 60 * 60_000)) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const link = await recoveryToken(email)
  if (link === 'unknown') return res.status(200).json({ ok: true })
  if (link === 'limited') {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }
  if (link === 'failed') return res.status(503).json({ error: 'not_configured' })

  const mail = recoveryEmail({
    locale: mailLocale(body.locale),
    email,
    url: recoveryPageUrl(link.token),
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
    console.info(JSON.stringify({ evt: 'password_reset', result: sent.ok ? 'sent' : `resend_${sent.status}` }))
    if (!sent.ok) return res.status(503).json({ error: 'not_configured' })
    return res.status(200).json({ ok: true })
  } catch {
    console.info(JSON.stringify({ evt: 'password_reset', result: 'network' }))
    return res.status(503).json({ error: 'not_configured' })
  }
}
