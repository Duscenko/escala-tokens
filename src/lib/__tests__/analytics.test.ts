import { describe, expect, it } from 'vitest'
import { beforeSend, scrubUrl } from '../analytics'

// The privacy contract in analytics.ts: a publish ID is a read capability, so
// it must never reach the analytics provider inside a pageview URL.
describe('scrubUrl', () => {
  it('drops publish IDs and OAuth params, keeps navigation params', () => {
    const out = scrubUrl('https://escalatokens.com/?project=esc_7K2M&section=themes/dark&code=x&state=y')
    expect(out).not.toContain('project=')
    expect(out).not.toContain('code=')
    expect(out).not.toContain('state=')
    expect(out).toContain('section=themes%2Fdark')
  })

  it('falls back to stripping the whole query on an unparsable URL', () => {
    expect(scrubUrl('not a url?project=secret')).toBe('not a url')
  })

  it('beforeSend applies the scrub', () => {
    const e = beforeSend({ type: 'pageview', url: 'https://escalatokens.com/?project=abc' })
    expect(e?.url).toBe('https://escalatokens.com/')
  })
})
