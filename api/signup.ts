import type { VercelRequest, VercelResponse } from '@vercel/node'
import { originAllowed, originsForHosts } from '../src/lib/publishTrust.js'
import { authPageUrl, confirmationEmail, mailLocale, PUBLIC_SITE } from '../src/lib/authEmail.js'
import { clientIp, rateLimited } from './_blob.js'

// Branded account-confirmation mail. Supabase's Confirm signup template is a
// different card, and a link on *.supabase.co. This route creates the account
// with the admin API (which does not send mail) and sends the same card as
// password reset, with the link on www.escalatokens.com.
//
// `resend: true` is the account page's "Resend confirmation". It does not take
// a password and answers the same way when the address is unknown.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, and AUTH_FROM or CONTACT_FROM. Missing config → 503, and the
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

type LinkResult = 'unknown' | 'exists' | 'weak' | 'limited' | 'failed' | { token: string }

async function signupLink(email: string, password: string | undefined, locale: string, resend: boolean): Promise<LinkResult> {
  const options: { redirect_to: string; data?: { locale: string } } = {
    redirect_to: `${PUBLIC_SITE}/login`,
  }
  if (!resend && (locale === 'es' || locale === 'fr')) options.data = { locale }
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
        type: resend ? 'magiclink' : 'signup',
        email,
        ...(password ? { password } : {}),
        options,
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
    if (code === 'weak_password' || (/password/i.test(msg) && /weak|short|at least/i.test(msg))) return 'weak'
    if (code === 'email_exists' || code === 'user_already_exists' || /already/i.test(msg)) return 'exists'
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

async function send(email: string, locale: ReturnType<typeof mailLocale>, token: string, resend: boolean) {
  const mail = confirmationEmail({
    locale,
    email,
    url: authPageUrl(token, resend ? 'magiclink' : 'signup'),
  })
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
  return sent.ok
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
  if (rateLimited(`signup:${ip}`, PER_HOUR, 60 * 60_000)) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const email = oneLine(typeof body.email === 'string' ? body.email : '').toLowerCase()
  const resend = body.resend === true
  const password = typeof body.password === 'string' ? body.password : ''
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (!resend && (password.length < 8 || password.length > 72)) return res.status(422).json({ error: 'weak_password' })
  if (rateLimited(`signup-email:${email}`, 3, 60 * 60_000)) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const locale = mailLocale(body.locale)
  const link = await signupLink(email, resend ? undefined : password, locale, resend)
  if (link === 'unknown') return res.status(200).json({ ok: true })
  if (link === 'exists') return res.status(409).json({ error: 'email_exists' })
  if (link === 'weak') return res.status(422).json({ error: 'weak_password' })
  if (link === 'limited') {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }
  if (link === 'failed') return res.status(503).json({ error: 'not_configured' })

  try {
    const ok = await send(email, locale, link.token, resend)
    console.info(JSON.stringify({ evt: 'signup_email', result: ok ? 'sent' : 'resend_failed', resend }))
    if (!ok) return res.status(503).json({ error: 'send_failed' })
    return res.status(200).json({ ok: true })
  } catch {
    console.info(JSON.stringify({ evt: 'signup_email', result: 'network', resend }))
    return res.status(503).json({ error: 'send_failed' })
  }
}
