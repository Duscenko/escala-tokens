// One switch for everything on the About page that moves by itself: the hero
// video, the docs crossfade and the foundation demos. WCAG 2.2.2 (Pause, Stop,
// Hide) asks for a way to pause any motion that starts on its own and lasts
// more than five seconds. The choice lasts for the page view; a visitor who
// asks the OS for reduced motion never sees any of it start (each surface
// already honours `useReducedMotion`).

import { useSyncExternalStore } from 'react'

let paused = false
const listeners = new Set<() => void>()

export function setAboutMotionPaused(next: boolean): void {
  if (paused === next) return
  paused = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** True while the visitor has paused the page's self-running motion. */
export function useAboutMotionPaused(): boolean {
  return useSyncExternalStore(subscribe, () => paused, () => false)
}
