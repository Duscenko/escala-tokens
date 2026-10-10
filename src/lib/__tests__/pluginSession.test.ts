import { describe, expect, it } from 'vitest'
import {
  collectPluginLibraries,
  isPluginPairCode,
  librariesFromPersist,
  pluginPlan,
  pluginPlanRefresh,
  upsertPluginLibraries,
} from '../pluginSession'

const ID = 'esc_7K2M-9QX4-N3PD'
const OTHER = 'esc_8K2M-9QX4-N3PD'

describe('plugin session libraries', () => {
  it('accepts only a 10-symbol pairing code', () => {
    expect(isPluginPairCode('7K2M9QX4N3')).toBe(true)
    expect(isPluginPairCode('7k2m9qx4n3')).toBe(true)
    expect(isPluginPairCode(ID)).toBe(false)
    expect(isPluginPairCode('short')).toBe(false)
    expect(isPluginPairCode('7K2M9QX4N!')).toBe(false)
  })

  it('keeps publish ids and drops everything else', () => {
    expect(collectPluginLibraries([
      { id: 'esc_7k2m-9qx4-n3pd', name: '  Core  ' },
      { id: 'escala', name: 'Legacy' },
      { id: ID, name: 'Duplicate' },
      { id: '', name: 'Empty' },
    ])).toEqual([{ id: ID, name: 'Core' }])
  })

  it('reads the system on screen and saved libraries out of the persist blob', () => {
    const libs = librariesFromPersist({
      state: {
        publishId: ID,
        projectName: 'On screen',
        savedSystems: [
          { name: 'Saved', snapshot: { publishId: OTHER, projectName: 'Other' } },
          { name: 'Never published', snapshot: { publishId: '', projectName: 'Nope' } },
        ],
      },
    })
    expect(libs).toEqual([
      { id: ID, name: 'On screen' },
      { id: OTHER, name: 'Saved' },
    ])
  })

  it('moves an updated library to the front and caps the list', () => {
    const now = '2026-10-07T18:00:00.000Z'
    const current = [{ id: OTHER, name: 'Older', updatedAt: '2026-01-01T00:00:00.000Z' }]
    const next = upsertPluginLibraries(current, [{ id: ID, name: 'New' }], now)
    expect(next.map((row) => row.id)).toEqual([ID, OTHER])
    expect(next[0]?.updatedAt).toBe(now)
    expect(upsertPluginLibraries(current, [{ id: OTHER, name: '' }], now)[0]?.name).toBe('Older')

    const rows = Array.from({ length: 45 }, (_, i) => ({
      id: `esc_${i.toString(16).toUpperCase().padStart(4, '0')}-9QX4-N3PD`,
      name: `L${i}`,
    }))
    expect(upsertPluginLibraries([], rows, now)).toHaveLength(40)
  })
})

describe('plugin plan', () => {
  const now = new Date('2026-10-09T12:00:00Z')

  it('a validated key wins, otherwise the account email grant', () => {
    expect(pluginPlan({ valid: true, expiresAt: '2027-01-01T00:00:00Z' }, null)).toEqual({ plan: 'pro', proUntil: '2027-01-01T00:00:00Z', via: 'key' })
    expect(pluginPlan({ valid: true, expiresAt: null }, '2027-06-01T00:00:00Z')).toEqual({ plan: 'pro', proUntil: 'lifetime', via: 'key' })
    expect(pluginPlan({ valid: false, expiresAt: null }, 'lifetime')).toEqual({ plan: 'pro', proUntil: 'lifetime', via: 'email' })
    expect(pluginPlan({ valid: false, expiresAt: '2027-04-01T00:00:00Z', reason: 'activation_limit' }, null)).toEqual({ plan: 'pro', proUntil: '2027-04-01T00:00:00Z', via: 'key' })
    expect(pluginPlan({ valid: false, expiresAt: null, reason: 'activation_limit' }, null)).toEqual({ plan: 'pro', proUntil: 'lifetime', via: 'key' })
  })

  it('Polar unreachable is unknown, and a definite miss is Free', () => {
    expect(pluginPlan(null, 'unknown')).toEqual({ plan: 'unknown', via: 'none' })
    expect(pluginPlan({ valid: false, expiresAt: null, reason: 'unavailable' }, null)).toEqual({ plan: 'unknown', via: 'none' })
    expect(pluginPlan({ valid: false, expiresAt: null, reason: 'revoked' }, 'unknown')).toEqual({ plan: 'unknown', via: 'none' })
    expect(pluginPlan(null, null)).toEqual({ plan: 'free', via: 'none' })
    expect(pluginPlan({ valid: false, expiresAt: null, reason: 'revoked' }, null)).toEqual({ plan: 'free', via: 'none' })
    expect(pluginPlan({ valid: false, expiresAt: '2020-01-01T00:00:00Z', reason: 'activation_limit' }, null, now)).toEqual({ plan: 'free', via: 'none' })
  })

  // The reported bug: the plugin opens a browser, or a host, that has no key
  // cookie, and Polar has nothing on the email. The account proved its key
  // somewhere else, and that has to be enough.
  it('a browser with no key is still Pro when the account proved one elsewhere', () => {
    expect(pluginPlan(null, null, now, 'lifetime')).toEqual({ plan: 'pro', proUntil: 'lifetime', via: 'account' })
    expect(pluginPlan(null, null, now, '2027-03-01T00:00:00Z')).toEqual({ plan: 'pro', proUntil: '2027-03-01T00:00:00Z', via: 'account' })
    expect(pluginPlan({ valid: false, expiresAt: null, reason: 'unknown' }, null, now, 'lifetime')).toMatchObject({ plan: 'pro', via: 'account' })
  })

  it('the account record does not outlive its date or a refund, and a failed read is not Free', () => {
    expect(pluginPlan(null, null, now, '2026-01-01T00:00:00Z')).toEqual({ plan: 'free', via: 'none' })
    expect(pluginPlan(null, null, now, 'revoked')).toEqual({ plan: 'free', via: 'none' })
    expect(pluginPlan(null, null, now, null)).toEqual({ plan: 'free', via: 'none' })
    expect(pluginPlan(null, null, now, 'unknown')).toEqual({ plan: 'unknown', via: 'none' })
  })

  it('a later open upgrades Free and does not strip a live plan when Polar is down', () => {
    expect(pluginPlanRefresh({}, 'lifetime', now)).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({}, 'unknown', now)).toEqual({ plan: 'unknown' })
    expect(pluginPlanRefresh({ plan: 'free' }, 'unknown', now)).toEqual({ plan: 'free' })
    expect(pluginPlanRefresh({ proUntil: 'lifetime' }, null, now)).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({ proUntil: '2026-01-01T00:00:00Z' }, '2027-01-01T00:00:00Z', now)).toEqual({ plan: 'pro', proUntil: '2027-01-01T00:00:00Z' })
    expect(pluginPlanRefresh({ proUntil: 'lifetime' }, 'unknown', now)).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({}, null, now)).toEqual({ plan: 'free' })
  })

  it('a session that signed in as Free turns Pro once the account proves a key', () => {
    expect(pluginPlanRefresh({ plan: 'free' }, null, now, 'lifetime')).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({}, null, now, '2027-03-01T00:00:00Z')).toEqual({ plan: 'pro', proUntil: '2027-03-01T00:00:00Z' })
  })

  it('a refund ends Pro on the next open, and a failed read of the record changes nothing', () => {
    expect(pluginPlanRefresh({ plan: 'pro', proUntil: 'lifetime' }, null, now, 'revoked')).toEqual({ plan: 'free' })
    expect(pluginPlanRefresh({ plan: 'pro', proUntil: 'lifetime' }, 'lifetime', now, 'revoked')).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({ plan: 'pro', proUntil: 'lifetime' }, null, now, 'unknown')).toEqual({ plan: 'pro', proUntil: 'lifetime' })
    expect(pluginPlanRefresh({ plan: 'free' }, null, now, 'unknown')).toEqual({ plan: 'free' })
    expect(pluginPlanRefresh({}, null, now, 'unknown')).toEqual({ plan: 'unknown' })
  })
})
