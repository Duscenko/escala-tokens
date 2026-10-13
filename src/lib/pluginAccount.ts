import { supabase } from './supabase'
import { getLicenceActivation, getLicenceKey } from './licence'
import { CLAIM_STORAGE_PREFIX } from './publishTrust'
import { librariesFromPersist, orphanedPublishIds, publishIdsInPersist, type PluginLibrary } from './pluginSession'

/** Session key for the pairing code while `/login` is in the way. */
export const PLUGIN_CODE_KEY = 'escala-plugin-code'

type LibraryInput = { id: string; name: string }

/** The plan the plugin session was given. `unknown` when nothing could be
 *  asked — the plugin asks again on its next open. */
export type ConnectedPlan = 'pro' | 'free' | 'unknown'

async function postAccount(
  op: 'approve' | 'register',
  accessToken: string,
  body: { code?: string; libraries: LibraryInput[]; licenceKey?: string; activationId?: string },
): Promise<{ ok: true; plan: ConnectedPlan } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/plugin-session?op=${op}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })
    const parsed = await res.json().catch(() => null) as { error?: unknown; plan?: unknown } | null
    if (res.ok) {
      const plan = parsed?.plan === 'pro' || parsed?.plan === 'free' ? parsed.plan : 'unknown'
      return { ok: true, plan }
    }
    const error = typeof parsed?.error === 'string' ? parsed.error : 'Could not reach Escala.'
    return { ok: false, error }
  } catch {
    return { ok: false, error: 'Could not reach Escala.' }
  }
}

/** Libraries this browser can hand the plugin: persist blob, live store included. */
export function librariesOnThisBrowser(): LibraryInput[] {
  try {
    return librariesFromPersist(JSON.parse(window.localStorage.getItem('scalable-designs-store') || 'null'))
  } catch {
    return []
  }
}

export async function approvePluginSignIn(
  code: string,
  libraries: LibraryInput[],
): Promise<{ ok: true; plan: ConnectedPlan } | { ok: false; error: string }> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return { ok: false, error: 'Sign in first.' }
  // The key rides along once so the plugin session knows the plan; the server
  // validates it with Polar and keeps only the expiry.
  return postAccount('approve', token, {
    code,
    libraries,
    licenceKey: getLicenceKey() ?? undefined,
    activationId: getLicenceActivation() ?? undefined,
  })
}

/** After a successful publish, so the plugin's list includes this library. Best-effort. */
export async function registerPublishedLibrary(id: string, name: string): Promise<void> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token || !id) return
  await postAccount('register', token, { libraries: [{ id, name }] })
}

/** A design system was deleted here: take it off the plugin's list and mark
 *  its published tokens deleted, so a Figma file still syncing it stops. The
 *  publish claim from this browser is what proves it is ours to delete.
 *  Best-effort. */
export async function unregisterPublishedLibraries(ids: string[]): Promise<void> {
  const clean = ids.filter((id) => typeof id === 'string' && id)
  if (clean.length === 0) return
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return
  const claims: Record<string, string> = {}
  try {
    const { getStoredClaim } = await import('./figmaSync')
    for (const id of clean) {
      const claim = getStoredClaim(id)
      if (claim) claims[id] = claim
    }
  } catch { /* no claim: the server erases only what is unclaimed and listed */ }
  try {
    await fetch('/api/plugin-session?op=unregister', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: clean, deleteSystems: true, claims }),
    })
  } catch { /* the plugin's own Remove covers it */ }
}

const SWEEP_CAP = 20

/** Every publish id some system in this browser still uses: the one on screen,
 *  the saved copies, and what other accounts parked here on sign-out. Missing
 *  one would take a live system down, so anything unreadable aborts the sweep
 *  (`null`) instead of being skipped. */
function publishIdsInUse(): string[] | null {
  try {
    const ids = new Set<string>()
    const persisted = window.localStorage.getItem('scalable-designs-store')
    if (!persisted) return null
    for (const id of publishIdsInPersist(JSON.parse(persisted))) ids.add(id)
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith('sd-account-files:')) continue
      const parked = window.localStorage.getItem(key)
      if (parked) for (const id of publishIdsInPersist(JSON.parse(parked))) ids.add(id)
    }
    return [...ids]
  } catch {
    return null
  }
}

/**
 * Take down what this browser published and no longer has a system for.
 *
 * Before the id was kept across a reset, every reset and every replaced system
 * left its published tokens behind, listed in the plugin and still synced by
 * any file that had them. A publish claim in this browser's storage whose id no
 * system uses is the proof it is ours to erase; the server checks the claim
 * again and refuses anything it does not match. Once the server says it is
 * gone the local claim goes too, so the sweep is idempotent and cheap.
 */
export async function sweepOrphanedPublishes(): Promise<string[]> {
  if (typeof window === 'undefined') return []
  const inUse = publishIdsInUse()
  if (!inUse) return []
  const claims: Record<string, string> = {}
  const keys: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key?.startsWith(CLAIM_STORAGE_PREFIX)) keys.push(key)
  }
  const claimed = keys.map((key) => key.slice(CLAIM_STORAGE_PREFIX.length))
  const orphans = orphanedPublishIds(claimed, inUse).slice(0, SWEEP_CAP)
  if (orphans.length === 0) return []
  for (const id of orphans) {
    const key = keys.find((k) => k.slice(CLAIM_STORAGE_PREFIX.length).toUpperCase() === id.toUpperCase())
    const claim = key ? window.localStorage.getItem(key) : null
    if (claim) claims[id] = claim
  }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return []
  try {
    const res = await fetch('/api/plugin-session?op=unregister', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: orphans, deleteSystems: true, claims }),
    })
    if (!res.ok) return []
    const parsed = await res.json().catch(() => null) as { erased?: unknown } | null
    const erased = Array.isArray(parsed?.erased) ? parsed.erased.filter((id): id is string => typeof id === 'string') : []
    for (const id of erased) {
      for (const key of keys) {
        if (key.slice(CLAIM_STORAGE_PREFIX.length).toUpperCase() === id.toUpperCase()) window.localStorage.removeItem(key)
      }
    }
    return erased
  } catch {
    return []
  }
}

export type { PluginLibrary }
