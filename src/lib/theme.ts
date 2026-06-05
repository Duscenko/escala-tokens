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

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle('dark', theme === 'dark')
  listeners.forEach((fn) => fn())
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
