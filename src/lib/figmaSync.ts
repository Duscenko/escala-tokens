import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { generateTokenJSON } from './tokenGenerator'
import { slugify } from './utils'

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

/** Relative endpoint used for the POST (and what the plugin should GET). */
export function syncPath(): string {
  return `/api/tokens?project=${encodeURIComponent(syncProjectId())}`
}

/** Absolute, copy-pasteable sync URL for the active system (for display). */
export function syncUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${syncPath()}`
}

/**
 * POST the current token set to this system's scoped endpoint so an installed
 * plugin picks it up on its next sync. Records the publish time on success.
 * Resolves to whether the publish succeeded (never throws).
 */
export async function publishTokens(): Promise<boolean> {
  try {
    const res = await fetch(syncPath(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateTokenJSON()),
    })
    if (res.ok) {
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
