import { describe, expect, it } from 'vitest'
import { contactDraftError, contactMailto } from '../contactMail'
import { PUBLIC_CONTACT_EMAIL } from '../legal'

describe('contactMail', () => {
  it('rejects a draft the API would reject', () => {
    expect(contactDraftError('not-an-email', 'hello there friend')).toBe('invalid_email')
    expect(contactDraftError('a@b.co', 'short')).toBe('invalid_message')
    expect(contactDraftError('a@b.co', 'a real question about my system')).toBeNull()
  })

  it('addresses the public inbox and keeps the system id when the topic needs it', () => {
    const href = contactMailto({
      topicLabel: 'Delete a published system',
      name: 'Ada',
      email: 'ada@example.com',
      system: 'esc_7K2M-9QX4-N3PD',
      message: 'Please delete this published system.',
    })
    expect(href.startsWith(`mailto:${PUBLIC_CONTACT_EMAIL}?`)).toBe(true)
    const url = new URL(href)
    expect(url.searchParams.get('subject')).toBe('[Escala · Delete a published system] Ada')
    expect(url.searchParams.get('body')).toContain('System ID: esc_7K2M-9QX4-N3PD')
    expect(url.searchParams.get('body')).toContain('Please delete this published system.')
  })
})
