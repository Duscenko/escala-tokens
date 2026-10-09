// Polar signs webhooks with the Standard Webhooks scheme: HMAC-SHA256 over
// `${id}.${timestamp}.${rawBody}`, secret `whsec_<base64>`, header `v1,<sig>`.
// The signature is over the raw bytes. Re-stringifying a parsed body will not match.

import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_MS = 5 * 60_000

export interface WebhookHeaders {
  id?: string
  timestamp?: string
  signature?: string
}

export function verifyPolarWebhook(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  now = Date.now(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature || !rawBody) return false
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts)) return false
  const tsMs = ts > 1e12 ? ts : ts * 1000
  if (Math.abs(now - tsMs) > MAX_SKEW_MS) return false
  const material = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  let key: Buffer
  try {
    key = Buffer.from(material, 'base64')
  } catch {
    return false
  }
  if (key.length === 0) return false
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest('base64')
  const expectedBuf = Buffer.from(expected)
  for (const part of headers.signature.split(' ')) {
    const sig = part.startsWith('v1,') ? part.slice(3) : part
    const got = Buffer.from(sig)
    if (got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)) return true
  }
  return false
}

/** A refund or a revoked key. Other event types are acknowledged and ignored. */
export function webhookShouldRevoke(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const type = String((body as { type?: unknown }).type ?? '')
  if (type === 'benefit_grant.revoked' || type === 'license_key.revoked') return true
  if (type === 'license_key.updated') {
    const status = (body as { data?: { status?: unknown } }).data?.status
    return status === 'revoked' || status === 'disabled'
  }
  return false
}

function asKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (!key || key.length > 200) return null
  return key
}

/** Polar puts the key in more than one shape. A key can itself be a UUID. */
export function licenceKeyFromWebhook(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const data = (body as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const found: unknown[] = [d.key]
  if (typeof d.license_key === 'string') found.push(d.license_key)
  if (d.license_key && typeof d.license_key === 'object') found.push((d.license_key as { key?: unknown }).key)
  const props = d.properties
  if (props && typeof props === 'object') {
    const p = props as Record<string, unknown>
    found.push(p.key, p.license_key, p.licence_key)
    if (p.license_key && typeof p.license_key === 'object') found.push((p.license_key as { key?: unknown }).key)
  }
  for (const value of found) {
    const key = asKey(value)
    if (key) return key
  }
  return null
}
