import { useEffect, useRef } from 'react'
import { captureSnapshot, useDesignStore, type DesignSnapshot } from '../store/useDesignStore'

// WHEN EACH THEME LAST CHANGED — derived from the store, never stamped by hand.
//
// Home sorts My themes by recency and compares each theme against the last
// Figma publish and GitHub push. Hooking ~80 store actions to record a time
// would drift the first time someone adds an action; instead one subscription
// fingerprints the design data and stamps whatever moved:
//   · a change inside a theme's OWN maps (its semantics, sources, foundations,
//     label…) stamps that theme;
//   · a change to the SHARED design data (ramps, global foundations, families)
//     stamps the theme on screen — the editor always writes through the
//     previewed theme, so that is the theme the person was working on.
// Loading a library or resetting replaces `themeUpdatedAt` itself; that is a
// new baseline, not an edit, so nothing is stamped for it.

const PER_THEME = [
  'themes', 'themeSemantics', 'themeKinds', 'themeLabels', 'themeSources', 'themeFoundations', 'themeOrigin',
] as const satisfies readonly (keyof DesignSnapshot)[]

/** Snapshot keys that are not part of how any theme LOOKS. */
const NOT_DESIGN = new Set<keyof DesignSnapshot>([
  ...PER_THEME, 'themeUpdatedAt', 'themeOrder', 'projectName', 'projectDescription', 'publishId',
  'figmaLastPublishAt', 'githubRepo', 'githubLastPushAt', 'savedColors', 'completedFoundations', 'selectedComponents',
])

export interface ThemeFingerprints {
  shared: string
  perTheme: Record<string, string>
}

export function themeFingerprints(state: DesignSnapshot): ThemeFingerprints {
  const snap = captureSnapshot(state) as unknown as Record<string, unknown>
  const shared: Record<string, unknown> = {}
  for (const key of Object.keys(snap)) {
    if (!NOT_DESIGN.has(key as keyof DesignSnapshot)) shared[key] = snap[key]
  }
  const perTheme: Record<string, string> = {}
  for (const theme of state.themeOrder) {
    perTheme[theme] = JSON.stringify(PER_THEME.map((field) => (state[field] as Record<string, unknown> | undefined)?.[theme] ?? null))
  }
  return { shared: JSON.stringify(shared), perTheme }
}

/** Which themes `next` changed relative to `prev`. Pure — the hook only adds timing. */
export function changedThemes(prev: ThemeFingerprints, next: ThemeFingerprints, onScreen: string): string[] {
  const out = new Set<string>()
  for (const [theme, print] of Object.entries(next.perTheme)) {
    if (prev.perTheme[theme] !== print) out.add(theme)
  }
  if (prev.shared !== next.shared && onScreen in next.perTheme) out.add(onScreen)
  return [...out]
}

/** Most recently edited first; never-edited themes keep their library order after them. */
export function byRecent(keys: string[], updatedAt: Record<string, string>): string[] {
  return keys
    .map((key, index) => ({ key, index, at: updatedAt[key] ? Date.parse(updatedAt[key]) : Number.NEGATIVE_INFINITY }))
    .sort((a, b) => (b.at - a.at) || (a.index - b.index))
    .map(({ key }) => key)
}

const SETTLE_MS = 600

/** Mounted once, in the shell. `onScreen` is the previewed theme. */
export function useThemeActivity(onScreen: string): void {
  const onScreenRef = useRef(onScreen)
  useEffect(() => { onScreenRef.current = onScreen }, [onScreen])

  useEffect(() => {
    let baseline = themeFingerprints(useDesignStore.getState())
    let seenStamps = useDesignStore.getState().themeUpdatedAt
    let timer: ReturnType<typeof setTimeout> | null = null
    let writing = false
    const settle = () => {
      timer = null
      const state = useDesignStore.getState()
      const next = themeFingerprints(state)
      // Our own stamp writes are excluded from the fingerprint, so a changed
      // map reference here means a load / reset / import replaced it.
      if (state.themeUpdatedAt !== seenStamps) {
        baseline = next
        seenStamps = state.themeUpdatedAt
        return
      }
      const changed = changedThemes(baseline, next, onScreenRef.current)
      baseline = next
      if (changed.length) {
        writing = true
        state.stampThemesUpdated(changed, new Date().toISOString())
        writing = false
        seenStamps = useDesignStore.getState().themeUpdatedAt
      }
    }
    const unsubscribe = useDesignStore.subscribe((state, prev) => {
      if (writing) return
      if (state.themeUpdatedAt !== prev.themeUpdatedAt && state.themeUpdatedAt !== seenStamps) {
        // A wholesale replacement — re-baseline right away, before any
        // pending settle can read the loaded system as an edit.
        if (timer) clearTimeout(timer)
        timer = null
        baseline = themeFingerprints(state)
        seenStamps = state.themeUpdatedAt
        return
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(settle, SETTLE_MS)
    })
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
