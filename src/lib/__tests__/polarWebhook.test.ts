import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { licenceKeyFromWebhook, verifyPolarWebhook, webhookShouldRevoke } from '../../../api/_polarWebhook'

const SECRET = `whsec_${Buffer.from('test-secret-key').toString('base64')}`
const NOW = Date.parse('2026-12-01T12:00:00Z')

function sign(id: string, timestamp: string, body: string): string {
  const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64')
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`
}

describe('verifyPolarWebhook', () => {
  const body = '{"type":"benefit_grant.revoked"}'
  const timestamp = String(Math.floor(NOW / 1000))

  it('accepts a signature over the raw body', () => {
    expect(verifyPolarWebhook(body, {
      id: 'msg_1',
      timestamp,
      signature: sign('msg_1', timestamp, body),
    }, SECRET, NOW)).toBe(true)
  })

  it('rejects a re-stringified body, a stale timestamp and a missing secret', () => {
    const signature = sign('msg_1', timestamp, body)
    expect(verifyPolarWebhook(body + ' ', { id: 'msg_1', timestamp, signature }, SECRET, NOW)).toBe(false)
    expect(verifyPolarWebhook(body, { id: 'msg_1', timestamp: String(Math.floor(NOW / 1000) - 600), signature }, SECRET, NOW)).toBe(false)
    expect(verifyPolarWebhook(body, { id: 'msg_1', timestamp, signature }, '', NOW)).toBe(false)
  })
})

describe('webhook payload', () => {
  it('revokes a benefit grant and a key whose status moved to revoked', () => {
    expect(webhookShouldRevoke({ type: 'benefit_grant.revoked' })).toBe(true)
    expect(webhookShouldRevoke({ type: 'license_key.updated', data: { status: 'revoked' } })).toBe(true)
    expect(webhookShouldRevoke({ type: 'license_key.updated', data: { status: 'granted' } })).toBe(false)
    expect(webhookShouldRevoke({ type: 'order.created' })).toBe(false)
  })

  it('reads the key from the shapes Polar sends, including a UUID key', () => {
    const uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    expect(licenceKeyFromWebhook({ data: { properties: { license_key: { key: 'ESCALA-1' } } } })).toBe('ESCALA-1')
    expect(licenceKeyFromWebhook({ data: { license_key: { key: uuid } } })).toBe(uuid)
    expect(licenceKeyFromWebhook({ data: { key: 'ESCALA-2' } })).toBe('ESCALA-2')
    expect(licenceKeyFromWebhook({ data: {} })).toBeNull()
  })
})

const store = new Map<string, string>()

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (key: string, body: string) => {
    store.set(key, body)
    return { url: `https://blob.test/${key}` }
  }),
}))

vi.mock('../../../api/_blob.js', async () => {
  const actual = await vi.importActual<typeof import('../../../api/_blob.js')>('../../../api/_blob.js')
  return {
    ...actual,
    forgetBlob: () => {},
    learnBlobBase: () => {},
    readJsonBlob: async (key: string) => {
      const raw = store.get(key)
      return raw ? JSON.parse(raw) : null
    },
  }
})

describe('refund clears the stamp', () => {
  afterEach(() => { store.clear() })

  it('strips the licence stamp from every slug that key published', async () => {
    const { rememberLicenceSlug, revokeLicenceStamps } = await import('../../../api/_licenceIndex')
    await rememberLicenceSlug('ESCALA-REFUND', 'my-system')
    store.set('tokens/my-system.json', JSON.stringify({
      colors: { primitive: { 'accent-9': '#9522e9' } },
      escalaLicence: { until: '2027-11-02T00:00:00Z', sealed: '2026-11-01T00:00:00Z' },
    }))
    expect(await revokeLicenceStamps('ESCALA-REFUND')).toEqual(['my-system'])
    const left = JSON.parse(store.get('tokens/my-system.json')!)
    expect(left).not.toHaveProperty('escalaLicence')
    expect(left.colors.primitive['accent-9']).toBe('#9522e9')
  })
})
