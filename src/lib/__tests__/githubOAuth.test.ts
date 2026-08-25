import { describe, expect, it, beforeEach, vi } from 'vitest'
import { interpretOAuthMessage, isGithubOAuthConfigured } from '../githubOAuth'
import { getStoredToken, clearStoredToken } from '../github'

const STATE = 'the-state-this-popup-requested'

// `lib/github.ts` calls the bare `localStorage` global directly (correctly —
// it's browser-only code, same as every other storage helper in this repo).
// This suite runs under vitest's project-wide `environment: 'node'` (kept
// DOM-free on purpose for the color layer — see vitest.config.ts), which has
// no such global, so a minimal in-memory stand-in is scoped to just this
// file rather than reaching for jsdom project-wide.
function installLocalStorageStub() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
}

describe('interpretOAuthMessage', () => {
  beforeEach(() => {
    installLocalStorageStub()
    clearStoredToken()
  })

  it('stores the token and reports ok on a matching, successful message', () => {
    const result = interpretOAuthMessage({ source: 'escala-github-oauth', token: 'ghu_abc', state: STATE }, STATE)
    expect(result).toEqual({ ok: true })
    expect(getStoredToken()).toBe('ghu_abc')
  })

  it('rejects a mismatched state BEFORE looking at the token — a stale or forged message must not authenticate', () => {
    const result = interpretOAuthMessage(
      { source: 'escala-github-oauth', token: 'ghu_should_not_be_stored', state: 'someone-elses-state' },
      STATE,
    )
    expect(result).toEqual({ ok: false, error: 'state_mismatch' })
    expect(getStoredToken()).toBeNull()
  })

  it('surfaces the server-reported error verbatim on a matching state', () => {
    const result = interpretOAuthMessage({ source: 'escala-github-oauth', error: 'access_denied', state: STATE }, STATE)
    expect(result).toEqual({ ok: false, error: 'access_denied' })
    expect(getStoredToken()).toBeNull()
  })

  it('reports no_token when the message matches but carries neither a token nor an error', () => {
    const result = interpretOAuthMessage({ source: 'escala-github-oauth', state: STATE }, STATE)
    expect(result).toEqual({ ok: false, error: 'no_token' })
    expect(getStoredToken()).toBeNull()
  })
})

describe('isGithubOAuthConfigured', () => {
  // This suite runs in vitest's `environment: 'node'` (see vitest.config.ts —
  // deliberate, so the lib layer stays DOM-free), which means `window` is
  // undefined here exactly as it would be off-browser. `isLiveEnvironment()`
  // returns false in that case BEFORE touching `window.location`, which is
  // the same short-circuit that keeps this from ever firing a real network
  // request from `vite dev` on localhost — there is no `/api/*` route there,
  // and Vite's own SPA fallback answers unmatched paths with `index.html`
  // (200 OK), which would otherwise make an unguarded fetch report
  // "configured" against nothing.
  it('resolves false with no fetch call when there is no window to check an origin against', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(await isGithubOAuthConfigured()).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
