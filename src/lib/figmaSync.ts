import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { generateTokenJSON } from './tokenGenerator'
import { DEFAULT_PUBLISH_ORIGIN } from './agentInstall'
import { claimStorageKey } from './publishTrust'
import { slugify } from './utils'

/** Ephemeral UI feedback for an explicit user-initiated Figma publish. This
 * deliberately does not live in the persisted design-system store: a spinner
 * or failed request belongs to the current interaction, not the system. */
export type FigmaPublishState = 'idle' | 'publishing' | 'done' | 'error'

// Single source of truth for the publish-to-Figma flow. Both the manual "Sync"
// pill (TopNav), the Figma connect view, and the auto-sync subscription go
// through here so they all hit the same endpoint and update the same status.

/** `/api/tokens` only exists on the deployed app — `vite dev` has no function. */
export function isLiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  const o = window.location.origin
  return !o.includes('localhost') && !o.includes('127.0.0.1')
}

/**
 * Per-system scoping key derived from the project name. Each design system
 * publishes to its own blob (`/api/tokens?project=<id>`) so the plugin can sync
 * one system without other systems overwriting it. Renaming a system changes
 * its key (and its sync URL) — that's expected.
 */
export function syncProjectId(): string {
  return slugify(useDesignStore.getState().projectName) || 'design-system'
}

/**
 * Origin used for published URLs (Figma Sync and MCP). Same host for both so
 * a project slug copied from Sync is valid on `resolve_token`.
 */
export function publishOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_PUBLISH_ORIGIN
  return window.location.origin || DEFAULT_PUBLISH_ORIGIN
}

/** Relative endpoint used for the POST (and what the plugin should GET). */
export function syncPath(): string {
  return `/api/tokens?project=${encodeURIComponent(syncProjectId())}`
}

/** Absolute, copy-pasteable sync URL for the active system (for display). */
export function syncUrl(): string {
  return `${publishOrigin()}${syncPath()}`
}

export function getStoredClaim(slug: string): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(claimStorageKey(slug))
}

export function setStoredClaim(slug: string, claim: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(claimStorageKey(slug), claim)
}

/**
 * POST the current token set to this system's scoped endpoint so an installed
 * plugin picks it up on its next sync. Records the publish time on success.
 * Resolves to whether the publish succeeded (never throws).
 *
 * First successful publish to a slug returns a claim; later writes send it as
 * `Authorization: Bearer`. The claim also lands in `.escala/system.json` when
 * the system is pushed to GitHub, so another machine can recover it.
 */
export async function publishTokens(): Promise<boolean> {
  try {
    const slug = syncProjectId()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const claim = getStoredClaim(slug)
    if (claim) headers.Authorization = `Bearer ${claim}`

    const res = await fetch(syncPath(), {
      method: 'POST',
      headers,
      body: JSON.stringify(generateTokenJSON()),
    })
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { claim?: unknown } | null
      if (typeof body?.claim === 'string' && body.claim) {
        setStoredClaim(slug, body.claim)
      }
      useDesignStore.getState().setFigmaLastPublishAt(new Date().toISOString())
    }
    return res.ok
  } catch {
    return false
  }
}

/**
 * While `autoSyncFigma` is on (and we're live), re-publish the token set ~1.5s
 * after the designer stops editing, so Figma always reads the current state.
 *
 * The change signal is the JSON of `generateTokenJSON()` — it excludes the
 * connection timestamps, so the `figmaLastPublishAt` write that `publishTokens`
 * triggers can't feed back into another publish. Re-importing unchanged payloads
 * is also cheap on the plugin side (it hashes before importing), but debouncing
 * + signature dedupe keeps the endpoint quiet during rapid edits.
 */
export function useAutoFigmaSync(): void {
  const auto = useDesignStore((s) => s.autoSyncFigma)

  useEffect(() => {
    if (!auto || !isLiveEnvironment()) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let lastSig = ''

    const schedule = () => {
      const sig = JSON.stringify(generateTokenJSON())
      if (sig === lastSig) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        lastSig = sig
        void publishTokens()
      }, 1500)
    }

    schedule() // publish the current state immediately when auto-sync turns on
    const unsubscribe = useDesignStore.subscribe(schedule)

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [auto])
}
