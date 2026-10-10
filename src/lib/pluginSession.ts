/**
 * Account libraries the Figma plugin lists after sign-in.
 *
 * The plugin never asks for a publish id or a page URL. Those stay internal:
 * a library is a name plus the id the blob is already stored under. DOM-free
 * so the API and the connect page share one list.
 */

import { canonicalizePublishId } from './publishId.js'

export interface PluginLibrary {
  id: string
  name: string
  updatedAt: string
}

export const PLUGIN_LIBRARY_CAP = 40
const NAME_MAX = 80

/** Pairing code in `/plugin?code=`. 10 Crockford symbols — not a publish id. */
const PAIR_CODE_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/

export function isPluginPairCode(value: unknown): value is string {
  return typeof value === 'string' && PAIR_CODE_RE.test(value.trim().toUpperCase())
}

function cleanName(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value : ''
  const name = raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, NAME_MAX)
  return name || fallback
}

/** Drop anything that is not a real publish id. First occurrence wins. */
export function collectPluginLibraries(
  rows: Array<{ id?: unknown; name?: unknown }>,
): Array<{ id: string; name: string }> {
  const seen = new Set<string>()
  const out: Array<{ id: string; name: string }> = []
  for (const row of rows) {
    const id = typeof row.id === 'string' ? canonicalizePublishId(row.id) : null
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ id, name: cleanName(row.name, id) })
  }
  return out
}

/**
 * Libraries sitting in this browser. Reads the Zustand persist blob
 * (`scalable-designs-store`): the system on screen, then each saved library
 * that already has a publish id. A library that was never published is absent
 * — there is nothing for the plugin to sync.
 */
export function librariesFromPersist(raw: unknown): Array<{ id: string; name: string }> {
  const root = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const state = root && root.state && typeof root.state === 'object'
    ? root.state as Record<string, unknown>
    : root
  if (!state) return []
  const rows: Array<{ id?: unknown; name?: unknown }> = [{
    id: state.publishId,
    name: state.projectName,
  }]
  const saved = Array.isArray(state.savedSystems) ? state.savedSystems : []
  for (const entry of saved) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const snapshot = record.snapshot && typeof record.snapshot === 'object'
      ? record.snapshot as Record<string, unknown>
      : null
    const named = typeof record.name === 'string' && record.name.trim()
      ? record.name
      : snapshot?.projectName
    rows.push({ id: snapshot?.publishId, name: named })
  }
  return collectPluginLibraries(rows)
}

export type PluginPlanName = 'pro' | 'free' | 'unknown'

export interface PluginPlanDecision {
  plan: PluginPlanName
  /** Set only for `pro`. `'lifetime'` when Polar gave the grant no expiry. */
  proUntil?: string
}

type KeyProof = { valid: boolean; expiresAt: string | null; reason?: string } | null

function emailGrant(emailUntil: string | null | 'unknown'): string | undefined {
  if (typeof emailUntil === 'string' && emailUntil.length > 0 && emailUntil !== 'unknown') return emailUntil
  return undefined
}

function liveUntil(value: string | undefined, now: Date): boolean {
  return !!value && (value === 'lifetime' || Date.parse(value) > now.getTime())
}

/** What the account's own record says (`lib/accountPlan.ts`), or `'unknown'`
 *  when the record could not be read. */
export type AccountProof = string | null | 'revoked' | 'unknown'

function accountGrant(account: AccountProof | undefined, now: Date): string | undefined {
  if (typeof account !== 'string' || account === 'revoked' || account === 'unknown') return undefined
  return liveUntil(account, now) ? account : undefined
}

/** Which proof made the decision. Logged, so a Pro account that signs in as
 *  Free can be traced to the source that was missing. */
export type PluginPlanVia = 'key' | 'email' | 'account' | 'none'

/** Plan to store when the plugin signs in. Three proofs, in this order:
 *  a key Polar accepted in THIS browser (including one this login must not
 *  activate — `activation_limit`, the key is real, the device cap is full),
 *  a grant on the signed-in email, then the account's own record of a key it
 *  proved in some other browser. A proof that could not be asked is
 *  `unknown`, never Free. Free is only a definite miss on all three. */
export function pluginPlan(
  key: KeyProof,
  emailUntil: string | null | 'unknown',
  now = new Date(),
  account?: AccountProof,
): PluginPlanDecision & { via: PluginPlanVia } {
  if (key?.valid || key?.reason === 'activation_limit') {
    const until = key.expiresAt ?? 'lifetime'
    if (until === 'lifetime' || Date.parse(until) > now.getTime()) return { plan: 'pro', proUntil: until, via: 'key' }
  }
  const grant = emailGrant(emailUntil)
  if (grant) return { plan: 'pro', proUntil: grant, via: 'email' }
  const bound = accountGrant(account, now)
  if (bound) return { plan: 'pro', proUntil: bound, via: 'account' }
  if (emailUntil === 'unknown' || account === 'unknown' || key?.reason === 'unavailable') return { plan: 'unknown', via: 'none' }
  return { plan: 'free', via: 'none' }
}

/** Plan on a later open. A definite grant (email, or the account's record)
 *  upgrades Free. A refund on the account's key ends Pro. A proof that could
 *  not be asked keeps a live Pro and an already-recorded Free. A live expiry
 *  is not stripped when neither proof has a grant: the pasted key may be the
 *  proof. A session that was never classified becomes Free only on a definite
 *  miss, so the next open can correct a login nothing could answer. */
export function pluginPlanRefresh(
  current: { proUntil?: string; plan?: 'pro' | 'free' },
  emailUntil: string | null | 'unknown',
  now: Date,
  account?: AccountProof,
): PluginPlanDecision {
  const live = liveUntil(current.proUntil, now)
  const grant = emailGrant(emailUntil)
  if (grant) return { plan: 'pro', proUntil: grant }
  const bound = accountGrant(account, now)
  if (bound) return { plan: 'pro', proUntil: bound }
  if (account === 'revoked') return { plan: 'free' }
  if (emailUntil === 'unknown' || account === 'unknown') {
    if (live) return { plan: 'pro', proUntil: current.proUntil }
    if (current.plan === 'free') return { plan: 'free' }
    return { plan: 'unknown' }
  }
  if (live) return { plan: 'pro', proUntil: current.proUntil }
  return { plan: 'free' }
}

/** Incoming rows replace the same id and move to the front. A blank name keeps the one already stored. Capped. */
export function upsertPluginLibraries(
  current: PluginLibrary[],
  incoming: Array<{ id?: unknown; name?: unknown }>,
  now: string,
): PluginLibrary[] {
  const byId = new Map<string, PluginLibrary>()
  for (const row of current) {
    const id = canonicalizePublishId(row.id)
    if (!id || byId.has(id)) continue
    byId.set(id, { id, name: cleanName(row.name, id), updatedAt: row.updatedAt || now })
  }
  const freshIds = new Set<string>()
  for (const raw of incoming) {
    const id = typeof raw.id === 'string' ? canonicalizePublishId(raw.id) : null
    if (!id) continue
    const prev = byId.get(id)
    const named = typeof raw.name === 'string' ? raw.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, NAME_MAX) : ''
    byId.delete(id)
    byId.set(id, { id, name: named || prev?.name || id, updatedAt: now })
    freshIds.add(id)
  }
  const ordered = [...byId.values()]
  ordered.sort((a, b) => {
    const af = freshIds.has(a.id) ? 1 : 0
    const bf = freshIds.has(b.id) ? 1 : 0
    if (af !== bf) return bf - af
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
  })
  return ordered.slice(0, PLUGIN_LIBRARY_CAP)
}
