// Chrome theme (light/dark) for the configurator UI. This is a UI preference,
// kept out of the Zustand design store. Default is light; the initial class is
// applied pre-paint by the inline script in index.html.

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'sd-theme'

const listeners = new Set<() => void>()

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
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
      document.startViewTransition(() => applyThemeClass(theme))
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
