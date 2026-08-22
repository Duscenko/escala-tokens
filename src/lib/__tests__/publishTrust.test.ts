import { describe, expect, it } from 'vitest'
import {
  claimBlobKey,
  claimStorageKey,
  hostnameOf,
  isTokenBlobPath,
  originAllowed,
  originsForHosts,
  parseBearer,
  PROJECT_REQUIRED,
  tokenBlobKey,
} from '../publishTrust'

describe('publishTrust', () => {
  it('maps slugs to token and claim blob keys without a global fallback', () => {
    expect(tokenBlobKey('acme')).toBe('tokens/acme.json')
    expect(claimBlobKey('acme')).toBe('claims/acme.json')
    expect(claimStorageKey('acme')).toBe('sd-publish-claim:acme')
    expect(PROJECT_REQUIRED).toMatch(/\?project=/)
  })

  it('only treats scoped token payloads as token blobs — not claims', () => {
    expect(isTokenBlobPath('tokens/acme.json')).toBe(true)
    expect(isTokenBlobPath('design-tokens.json')).toBe(false)
    expect(isTokenBlobPath('claims/acme.json')).toBe(false)
    expect(isTokenBlobPath('tokens/nested/x.json')).toBe(false)
  })

  it('parses a Bearer token and rejects anything else', () => {
    expect(parseBearer('Bearer abc.def')).toBe('abc.def')
    expect(parseBearer('bearer  xyz  ')).toBe('xyz')
    expect(parseBearer('Basic abc')).toBe(null)
    expect(parseBearer(undefined)).toBe(null)
    expect(parseBearer(['Bearer a', 'Bearer b'])).toBe('a')
  })

  it('accepts same-origin POST and rejects missing or foreign Origin', () => {
    const allowed = originsForHosts(['escalatokens.com', 'my-app.vercel.app'])
    expect(originAllowed('https://escalatokens.com', allowed)).toBe(true)
    expect(originAllowed('https://my-app.vercel.app', allowed)).toBe(true)
    expect(originAllowed('https://evil.example', allowed)).toBe(false)
    expect(originAllowed(undefined, allowed)).toBe(false)
    expect(originAllowed('', allowed)).toBe(false)
  })

  it('always allows the known production hosts even if Host is a preview', () => {
    const allowed = originsForHosts(['preview-abc.vercel.app'])
    expect(originAllowed('https://escalatokens.com', allowed)).toBe(true)
    expect(originAllowed('https://scalable-designs.vercel.app', allowed)).toBe(true)
  })

  it('normalises Host and forwarded-host values', () => {
    expect(hostnameOf('https://escalatokens.com')).toBe('escalatokens.com')
    expect(hostnameOf('escalatokens.com, other')).toBe('escalatokens.com')
  })
})
