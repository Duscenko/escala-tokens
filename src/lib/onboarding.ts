// Whether this browser has ever been "in" the workspace before — used only to
// decide the initial TopNav tab (About vs. Variables · Color), never
// persisted through the design store itself. A UI preference, same treatment
// as `theme.ts`'s `sd-theme`.

const KEY = 'sd-onboarded'
// The zustand persist key (`store/useDesignStore.ts`'s `name:
// 'scalable-designs-store'`). Its mere presence means this browser already
// has a system in progress — grandfathers every existing user without a
// migration, since only a browser with NEITHER key counts as new.
const STORE_KEY = 'scalable-designs-store'

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1' || localStorage.getItem(STORE_KEY) !== null
  } catch {
    return true
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}
