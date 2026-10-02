import type { VercelRequest, VercelResponse } from '@vercel/node'
import { originAllowed, originsForHosts } from '../src/lib/publishTrust.js'
import { CONTACT_TOPICS, type ContactTopic } from '../src/lib/legal.js'
import { clientIp, rateLimited } from './_blob.js'

// Contact form → the publisher's inbox, without the inbox ever being public.
//
// The destination address exists ONLY as the CONTACT_TO env var, read here on
// the server. The browser never receives it, and the reply-to is the sender, so
// answering is a normal "Reply" in the mail client.
//
//   GET  ?check=1 → 200 when sending is configured, else 404 (the page shows
//                   the form only then — same gate as /api/github-oauth).
//   POST          → validate, spam-check, send through Resend's REST API.
//
// Privacy (stated in /privacy — keep both in step): nothing is stored on our
// side. The message is relayed once by email; logs carry the topic and the
// outcome, never the sender, their address or the message.
//
// Env: RESEND_API_KEY, CONTACT_TO (inbox), CONTACT_FROM (verified sender on
// escalatokens.com, e.g. "Escala Tokens <contact@escalatokens.com>").

const TOPIC_LABEL: Record<ContactTopic, string> = {
  general: 'General',
  privacy: 'Privacy / GDPR request',
  delete: 'Delete a published system',
  bug: 'Bug report',
  business: 'Business / partnership',
}

const LIMITS = { name: 100, email: 254, message: 5000, system: 80 }
const MIN_MESSAGE = 10
/** A human needs longer than this to read the form and type a message. */
const MIN_FILL_MS = 3000
/** Per-instance soft cap; the Firewall rule on /api/contact is the real one. */
const PER_HOUR = 10

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO && process.env.CONTACT_FROM)
}

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

/** One line, no control characters — anything that lands in a header. */
function oneLine(v: string, max: number): string {
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    return res.status(configured() ? 200 : 404).end()
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  }

  // Same-origin only: the form posts from this site and nowhere else.
  if (!originAllowed(req.headers.origin, requestOrigins(req))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  if (!configured()) {
    return res.status(503).json({ error: 'not_configured' })
  }
  if (rateLimited(`contact:${clientIp(req.headers)}`, PER_HOUR, 60 * 60_000)) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: 'rate_limited' })
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>

  // Spam traps answer 200 on purpose: a bot that learns which field gave it
  // away just adapts. A human never fills the hidden field, and never submits
  // a whole message within three seconds of the page rendering.
  const honeypot = str(body.website)
  const renderedAt = Number(body.renderedAt)
  if (honeypot || !Number.isFinite(renderedAt) || Date.now() - renderedAt < MIN_FILL_MS) {
    console.info(JSON.stringify({ evt: 'contact', result: 'trapped' }))
    return res.status(200).json({ ok: true })
  }

  const topic = (CONTACT_TOPICS as readonly string[]).includes(str(body.topic)) ? (str(body.topic) as ContactTopic) : 'general'
  const name = oneLine(str(body.name), LIMITS.name)
  const email = oneLine(str(body.email), LIMITS.email)
  const system = oneLine(str(body.system), LIMITS.system)
  const message = str(body.message).trim()

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (message.length < MIN_MESSAGE || message.length > LIMITS.message) {
    return res.status(400).json({ error: 'invalid_message' })
  }

  // Plain text only — no HTML part, so nothing a sender types can render as
  // markup in the inbox.
  const text = [
    `Topic: ${TOPIC_LABEL[topic]}`,
    `From: ${name || '(no name)'} <${email}>`,
    system ? `System ID: ${system}` : null,
    '',
    message,
    '',
    '—',
    'Sent from the escalatokens.com contact form. Reply to answer the sender directly.',
  ].filter((l) => l !== null).join('\n')

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM,
        to: [process.env.CONTACT_TO],
        reply_to: email,
        subject: oneLine(`[Escala · ${TOPIC_LABEL[topic]}] ${name || email}`, 160),
        text,
      }),
    })
    console.info(JSON.stringify({ evt: 'contact', topic, result: r.ok ? 'sent' : `resend_${r.status}` }))
    if (!r.ok) return res.status(502).json({ error: 'send_failed' })
    return res.status(200).json({ ok: true })
  } catch {
    console.info(JSON.stringify({ evt: 'contact', topic, result: 'network' }))
    return res.status(502).json({ error: 'send_failed' })
  }
}
