import { describe, expect, it } from 'vitest'
import { accountFocus, accountHref, matchAccountPath } from '../accountRoutes'
import { displayNameOf, hasEmailPassword } from '../auth'

describe('account routes', () => {
  it('is one home, and an older path names the section to open', () => {
    expect(accountHref()).toBe('/account')
    expect(matchAccountPath('/account')).toBe('profile')
    expect(matchAccountPath('/account/profile')).toBe('profile')
    expect(matchAccountPath('/account/password/')).toBe('password')
    expect(matchAccountPath('/account/nope')).toBe('unknown')
    expect(matchAccountPath('/login')).toBeNull()
    expect(accountFocus('/account', '')).toBeNull()
    expect(accountFocus('/account', '#plan')).toBe('plan')
    expect(accountFocus('/account', '#email')).toBeNull()
    expect(accountFocus('/account/verification', '')).toBeNull()
    expect(accountFocus('/account/password', '')).toBe('password')
    expect(accountFocus('/account/security', '')).toBe('password')
    expect(accountFocus('/login', '#plan')).toBeNull()
  })
})

describe('account identity', () => {
  it('prefers the name this app saved over the provider name', () => {
    expect(displayNameOf({
      user_metadata: { display_name: 'Ada', full_name: 'Ada Lovelace', name: 'ada' },
    })).toBe('Ada')
    expect(displayNameOf({ user_metadata: { full_name: 'Ada Lovelace' } })).toBe('Ada Lovelace')
    expect(displayNameOf({ user_metadata: {} })).toBe('')
  })

  it('treats an email identity as a password account', () => {
    expect(hasEmailPassword({ identities: [{ provider: 'email' }] })).toBe(true)
    expect(hasEmailPassword({ identities: [{ provider: 'github' }] })).toBe(false)
    expect(hasEmailPassword({ identities: [] })).toBe(false)
  })
})
