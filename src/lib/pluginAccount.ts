import { supabase } from './supabase'
import { getLicenceActivation, getLicenceKey } from './licence'
import { librariesFromPersist, type PluginLibrary } from './pluginSession'

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

export type { PluginLibrary }
