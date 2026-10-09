import { afterEach, describe, expect, it, vi } from 'vitest'
import { PUBLIC_SITE, RECOVERY_TEMPLATE_HREF, recoveryEmail, recoveryPageUrl } from '../authEmail'

const { resetPasswordForEmail } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
}))

vi.mock('../supabase', () => ({
  accountsEnabled: true,
  supabase: { auth: { resetPasswordForEmail } },
  authProviders: [],
}))

import { sendPasswordReset } from '../auth'

const LINK = 'https://www.escalatokens.com/login?token_hash=abc&type=recovery'

describe('recoveryEmail', () => {
  it('builds a link on the public site', () => {
    const url = recoveryPageUrl('tok en')
    expect(url.startsWith(`${PUBLIC_SITE}/login?`)).toBe(true)
    expect(new URL(url).searchParams.get('token_hash')).toBe('tok en')
    expect(new URL(url).searchParams.get('type')).toBe('recovery')
    expect(url.includes('supabase.co')).toBe(false)
  })

  it('has a header, a footer and the reset link in every language', () => {
    for (const locale of ['en', 'es', 'fr'] as const) {
      const mail = recoveryEmail({ locale, email: 'ada@studio.com', url: LINK })
      expect(mail.subject.toLowerCase()).toContain('escala')
      expect(mail.html).toContain('Escala Tokens')
      expect(mail.html).toContain('background:#18181b')
      expect(mail.html).toContain(`${PUBLIC_SITE}/privacy`)
      expect(mail.html).toContain(`${PUBLIC_SITE}/terms`)
      expect(mail.html).toContain('href="https://www.escalatokens.com/login?token_hash=abc&amp;type=recovery"')
      expect(mail.text).toContain(LINK)
      expect(mail.text).toContain('ada@studio.com')
    }
  })

  it('keeps a raw ampersand in the Supabase template href', () => {
    const mail = recoveryEmail({ locale: 'en', email: '{{ .Email }}', url: RECOVERY_TEMPLATE_HREF })
    expect(mail.html).toContain(`href="${RECOVERY_TEMPLATE_HREF}"`)
    expect(mail.html).toContain('background:#18181b')
    expect(mail.html).toContain('If you did not ask for this')
  })

  it('escapes an address so it cannot become markup', () => {
    const mail = recoveryEmail({
      locale: 'en',
      email: 'a<b>&"@x.com',
      url: 'https://www.escalatokens.com/login?token_hash=1&type=recovery',
    })
    expect(mail.html).not.toContain('a<b>')
    expect(mail.html).toContain('a&lt;b&gt;&amp;&quot;@x.com')
    expect(mail.html).toContain('token_hash=1&amp;type=recovery')
  })
})

describe('sendPasswordReset', () => {
  afterEach(() => {
    resetPasswordForEmail.mockClear()
    vi.unstubAllGlobals()
  })

  it('does not also ask Supabase to mail when the branded sender accepts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })))
    const result = await sendPasswordReset('ada@studio.com', 'es')
    expect(result).toEqual({ ok: true, value: undefined })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
    const body = JSON.parse(String((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body))
    expect(body).toEqual({ email: 'ada@studio.com', locale: 'es' })
  })

  it('falls back to Supabase when the branded sender is not configured', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://www.escalatokens.com' } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    const result = await sendPasswordReset('ada@studio.com', 'en')
    expect(result.ok).toBe(true)
    expect(resetPasswordForEmail).toHaveBeenCalledOnce()
  })

  it('reports a rate limit without sending a second mail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })))
    const result = await sendPasswordReset('ada@studio.com', 'en')
    expect(result).toEqual({ ok: false, problem: 'rate_limited' })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })
})
