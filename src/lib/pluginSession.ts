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
