// Who may read a published system once the launch promo is over.
//
// Hosted sync is an Escala Pro feature, and it costs money on every request, so
// the rule has to bind the READ side too: a plugin polling a blob every 10
// seconds is the expensive half. Publishing needs a valid licence key
// (`api/tokens.ts`); what it leaves behind is a small stamp inside the stored
// payload saying "published under a licence, good until <date>". Reads then
// need no key and no extra Blob fetch — the data they were already loading
// carries its own answer.
//
// A blob with no stamp (published during the free promo) stays readable until
// the promo ends, then stops, until its owner publishes again with a key.
//
// Pure and DOM-free: the endpoints and the tests share it.

import { entitlementAt } from './entitlement.js'

export const LICENCE_STAMP = 'escalaLicence'

interface Stamp { until: string | null }

/** The payload with the stamp added. `until` is the key's expiry, or null for a
 *  key that does not expire. Never mutates the caller's object. */
export function stampLicence<T extends object>(body: T, until: string | null): T & Record<typeof LICENCE_STAMP, Stamp> {
  return { ...body, [LICENCE_STAMP]: { until } } as T & Record<typeof LICENCE_STAMP, Stamp>
}

function stampOf(data: unknown): Stamp | null {
  if (!data || typeof data !== 'object') return null
  const raw = (data as Record<string, unknown>)[LICENCE_STAMP]
  if (!raw || typeof raw !== 'object') return null
  const until = (raw as { until?: unknown }).until
  return { until: typeof until === 'string' ? until : null }
}

/** May this published payload be served right now? */
export function isServable(data: unknown, now: Date): boolean {
  if (entitlementAt(now).promo) return true
  const stamp = stampOf(data)
  if (!stamp) return false
  return stamp.until === null || Date.parse(stamp.until) > now.getTime()
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
