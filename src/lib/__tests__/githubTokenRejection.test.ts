import { describe, expect, it } from 'vitest'
import { GitHubError, isRejectedTokenError } from '../github'

// The stored GitHub token is deleted only when GitHub itself refuses it.
// Anything else (offline, rate limit, a 5xx) must keep the token.
describe('isRejectedTokenError', () => {
  it('is true only for a 401', () => {
    expect(isRejectedTokenError(new GitHubError('Bad credentials', 401))).toBe(true)
  })
  it('keeps the token on rate limits, server errors and network failures', () => {
    expect(isRejectedTokenError(new GitHubError('rate limit', 403))).toBe(false)
    expect(isRejectedTokenError(new GitHubError('oops', 502))).toBe(false)
    expect(isRejectedTokenError(new TypeError('Failed to fetch'))).toBe(false)
  })
})
