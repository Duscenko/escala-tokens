import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loginHref,
  pathForNext,
  pendingNext,
  readLoginSearch,
  rememberReturn,
  takeLoginIntent,
  workspaceReturnContext,
} from '../loginReturn'

// vitest runs in `node`: give the module the one browser API it touches.
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { sessionStorage: memoryStorage() })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('loginReturn', () => {
  it('builds /login links from the closed list, never with an intent in the URL', () => {
    expect(loginHref()).toBe('/login')
    expect(loginHref({ next: 'library' })).toBe('/login?next=library')
    expect(loginHref({ next: 'library', mode: 'signup' })).toBe('/login?mode=signup&next=library')
  })

  it('drops a next that is not on the list (no open redirect)', () => {
    expect(readLoginSearch('?next=https://evil.example').next).toBeNull()
    expect(readLoginSearch('?next=//evil.example').next).toBeNull()
    expect(readLoginSearch('?next=__proto__').next).toBeNull()
    expect(readLoginSearch('?next=library&mode=signup')).toEqual({ next: 'library', mode: 'signup' })
    expect(pathForNext(null)).toBe('/?section=library')
    expect(pathForNext('library')).toBe('/?section=library')
    expect(pathForNext('plugin')).toBe('/plugin')
    expect(pathForNext('account')).toBe('/account')
    expect(readLoginSearch('?next=plugin').next).toBe('plugin')
    expect(readLoginSearch('?next=account').next).toBe('account')
  })

  it('header Sign in (next=library, no intent) opens Home', () => {
    rememberReturn('library')
    expect(pathForNext(pendingNext())).toBe('/?section=library')
  })

  it('keeps next across the OAuth round trip and hands the intent over once', () => {
    rememberReturn('library', 'save-library')
    // The login page re-records next on open; the pending intent must survive it.
    rememberReturn('library')
    expect(pendingNext()).toBe('library')
    expect(takeLoginIntent('library')).toBe('save-library')
    expect(takeLoginIntent('library')).toBeNull()
    expect(pendingNext()).toBeNull()
  })

  it('forgets an abandoned return after 30 minutes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T10:00:00Z'))
    rememberReturn('library', 'save-library')
    vi.setSystemTime(new Date('2026-10-05T10:31:00Z'))
    expect(pendingNext()).toBeNull()
    expect(takeLoginIntent('library')).toBeNull()
  })

  describe('workspace return (login funnel)', () => {
    it('returns to the exact Generator section the person left from', () => {
      rememberReturn('workspace', 'export', 'variables/core--minimalist/color/semantics')
      expect(pathForNext(pendingNext())).toBe('/?section=variables%2Fcore--minimalist%2Fcolor%2Fsemantics')
      expect(takeLoginIntent('workspace')).toBe('export')
      expect(takeLoginIntent('workspace')).toBeNull()
    })

    it('refuses a section outside the workspace grammar (no open redirect)', () => {
      rememberReturn('workspace', null, '//evil.example/path')
      expect(pathForNext('workspace')).toBe('/')
      rememberReturn('workspace', null, 'not-a-section')
      expect(pathForNext('workspace')).toBe('/')
    })

    it('keeps the section when the login page re-remembers the same destination', () => {
      rememberReturn('workspace', 'save-library', 'code/core--minimalist')
      rememberReturn('workspace')
      expect(pathForNext('workspace')).toBe('/?section=code%2Fcore--minimalist')
      expect(takeLoginIntent('workspace')).toBe('save-library')
    })
  })

  describe('workspace return context (login page copy)', () => {
    it('names the action and the place the person will land on', () => {
      rememberReturn('workspace', 'export', 'variables/core--minimalist/color/semantics')
      expect(workspaceReturnContext()).toEqual({
        intent: 'export',
        place: ['Variables', 'Color'],
        href: '/?section=variables%2Fcore--minimalist%2Fcolor%2Fsemantics',
      })
    })

    it('maps the other areas and falls back to the editor with no section', () => {
      rememberReturn('workspace', null, 'code/core')
      expect(workspaceReturnContext()?.place).toEqual(['Code'])
      rememberReturn('workspace', null, 'docs/__guide-mcp')
      expect(workspaceReturnContext()?.place).toEqual(['Docs'])
      window.sessionStorage.clear()
      rememberReturn('workspace')
      expect(workspaceReturnContext()).toEqual({ intent: null, place: [], href: '/' })
    })

    it('is null for returns that did not start in the workspace', () => {
      expect(workspaceReturnContext()).toBeNull()
      rememberReturn('library')
      expect(workspaceReturnContext()).toBeNull()
    })

    it('does not consume the intent', () => {
      rememberReturn('workspace', 'save-library', 'code')
      workspaceReturnContext()
      expect(takeLoginIntent('workspace')).toBe('save-library')
    })
  })
})
