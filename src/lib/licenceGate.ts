// Who may read a published system once the launch promo is over.
//
// Hosted sync is an Escala Pro feature, and it costs money on every request, so
// the rule has to bind the READ side too: a plugin polling a blob every 10
// seconds is the expensive half. Publishing needs a valid licence key
// (`api/tokens.ts`); what it leaves behind is a small stamp inside the stored
// payload saying "published under a licence, good until <date>, sealed at
// <date>". The seal is 30 days and is rewritten on every successful publish.
// Reads then need no key and no extra Blob fetch — the data they were already
// loading carries its own answer.
//
// A blob with no stamp (published during the free promo) stays readable until
// the promo ends, then stops, until its owner publishes again with a key.
//
// Pure and DOM-free: the endpoints and the tests share it.

import { entitlementAt } from './entitlement.js'

export const LICENCE_STAMP = 'escalaLicence'

/** How long a publish keeps hosted sync alive. Each successful publish
 *  rewrites `sealed`, so a customer who keeps publishing renews it. A refund
 *  makes the next publish fail at Polar, and this stamp then lapses on its
 *  own — the published URL does not stay up until the licence's own expiry. */
export const LICENCE_SEAL_MS = 30 * 24 * 60 * 60 * 1000

interface Stamp { until: string | null; sealed?: string }

/** The payload with the stamp added. `until` is the key's expiry, or null for a
 *  key that does not expire. `sealed` is when this publish happened. A Polar
 *  refund webhook strips this stamp the same day; the seal is the fallback
 *  when that webhook has not run. Never mutates the caller's object. */
export function stampLicence<T extends object>(body: T, until: string | null, sealedAt: Date = new Date()): T & Record<typeof LICENCE_STAMP, Stamp> {
  return { ...body, [LICENCE_STAMP]: { until, sealed: sealedAt.toISOString() } } as T & Record<typeof LICENCE_STAMP, Stamp>
}

function stampOf(data: unknown): Stamp | null {
  if (!data || typeof data !== 'object') return null
  const raw = (data as Record<string, unknown>)[LICENCE_STAMP]
  if (!raw || typeof raw !== 'object') return null
  const until = (raw as { until?: unknown }).until
  const sealed = (raw as { sealed?: unknown }).sealed
  return {
    until: typeof until === 'string' ? until : null,
    ...(typeof sealed === 'string' ? { sealed } : {}),
  }
}

/** May this published payload be served right now? */
export function isServable(data: unknown, now: Date): boolean {
  if (entitlementAt(now).promo) return true
  const stamp = stampOf(data)
  if (!stamp) return false
  if (stamp.until !== null && Date.parse(stamp.until) <= now.getTime()) return false
  // A stamp from before seals existed has no `sealed` and keeps its old
  // expiry. Every publish from here on writes one, and it has to be fresh.
  if (stamp.sealed) {
    const at = Date.parse(stamp.sealed)
    if (!Number.isFinite(at) || now.getTime() >= at + LICENCE_SEAL_MS) return false
  }
  return true
}

/** The payload without the stamp — consumers (the plugin, the MCP) never see it. */
export function stripLicence<T>(data: T): T {
  if (!data || typeof data !== 'object' || !(LICENCE_STAMP in (data as object))) return data
  const rest = { ...(data as Record<string, unknown>) }
  delete rest[LICENCE_STAMP]
  return rest as T
}

/** The one message every refusal carries, so the plugin log and the app say the
 *  same thing. */
export const LICENCE_REQUIRED_MESSAGE =
  'Hosted sync is part of Escala Pro. Get a licence at escalatokens.com/pricing, or import tokens.json in the plugin by hand.'
