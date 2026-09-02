// Chrome theme (light/dark) for the configurator UI. This is a UI preference,
// kept out of the Zustand design store. **Default is DARK** — this is a dense,
// long-session editor, and dark is the resting state for the tool it sits
// beside (Figma). Only an explicit stored 'light' opts out, so a first visit
// and a storage failure both land dark. The initial class is applied pre-paint
// by the inline script in index.html, which MUST stay the exact inverse of
// `getTheme()` below or the two disagree for a frame.
//
// Deliberately NOT `prefers-color-scheme`: the app ships one default and lets
// the user switch, rather than having the OS decide what an editing surface
// looks like. `previewTheme` in Configurator is seeded from this, so a first
// load also previews the dark theme — which is the point.

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'sd-theme'

const listeners = new Set<() => void>()

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  listeners.forEach((fn) => fn())
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }

  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Crossfade the whole chrome so tabs, scoops and page fill switch as one
  // snapshot — interpolating ink through mid-gray would dip contrast, and
  // painting the scoops a frame ahead of the pill is what read as a bug.
  if (!reduced && typeof document.startViewTransition === 'function') {
    try {
      const transition = document.startViewTransition(() => applyThemeClass(theme))
      // Browsers may skip a view transition when another render/navigation
      // wins the frame. That is a valid fallback, not an application error.
      void transition.ready.catch(() => undefined)
      void transition.finished.catch(() => undefined)
      void transition.updateCallbackDone.catch(() => undefined)
      return
    } catch {
      /* fall through */
    }
  }
  applyThemeClass(theme)
}

export function toggleTheme(): void {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Live theme value that stays in sync across every control that toggles it. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light')
}
