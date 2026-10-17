// The two ways a visitor with no account keeps their design system: save it
// with an account, or push it to their own GitHub repo. Without either it lives
// only in this browser's storage — `UnsavedNotice` says so, nothing blocks.
//
// The notice sits deep in the inspector; the GitHub page is a shell surface.
// One window event connects them, the same shape as `requestOpenFaq`.

export const OPEN_GITHUB_EVENT = 'escala:open-github'

/** Open Theme preview's GitHub surface (handled by `Configurator`). */
export function requestOpenGithub(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_GITHUB_EVENT))
}
