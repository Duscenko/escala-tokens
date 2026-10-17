import { describe, expect, it } from 'vitest'
import {
  FREE_MY_THEME_LIMIT,
  freeAnotherThemeBlocked,
  freeAnotherThemeBlockedNow,
  licenceStillOpen,
} from '../freeThemeLimit'

describe('free theme create gate', () => {
  it('blocks a signed-in Free account that already has three brands', () => {
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: false, count: 2 })).toBe(false)
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: false, count: 3 })).toBe(true)
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: false, count: 4 })).toBe(true)
  })

  it('allows the first theme, Pro, a signed-out visitor, and accounts off', () => {
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: false, count: 0 })).toBe(false)
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: true, pro: true, count: 4 })).toBe(false)
    expect(freeAnotherThemeBlocked({ accountsOn: true, signedIn: false, pro: false, count: 4 })).toBe(false)
    expect(freeAnotherThemeBlocked({ accountsOn: false, signedIn: true, pro: false, count: 4 })).toBe(false)
  })

  it('keeps a saved key open while Polar has not answered', () => {
    expect(licenceStillOpen('checking', true)).toBe(true)
    expect(licenceStillOpen('unavailable', true)).toBe(true)
    expect(licenceStillOpen('checking', false)).toBe(false)
    expect(licenceStillOpen('invalid', true)).toBe(false)
    expect(licenceStillOpen('none', false)).toBe(false)
    expect(FREE_MY_THEME_LIMIT).toBe(3)
  })

  it('does not block when this process has no stored session', () => {
    expect(freeAnotherThemeBlockedNow(4)).toBe(false)
  })
})

describe('Free allowance counts saved brands, not studio drafts', () => {
  const base = {
    themeOrder: ['light', 'dark', 'draft'],
    themes: { light: {}, dark: {}, draft: {} },
    savedSystems: [],
    githubRepo: null,
    projectName: 'Escala',
  }

  it('a draft left behind does not spend the one brand', async () => {
    const { savedBrandKeysFrom } = await import('../libraryStatus')
    expect(savedBrandKeysFrom(base, { draft: true })).toEqual([])
  })

  it('a brand the saved copy already holds still counts', async () => {
    const { savedBrandKeysFrom } = await import('../libraryStatus')
    const saved = {
      ...base,
      savedSystems: [{ id: 'local:escala', snapshot: { themeOrder: ['light', 'dark', 'draft'] } }],
    }
    expect(savedBrandKeysFrom(saved, { draft: true })).toEqual(['draft'])
  })
})
