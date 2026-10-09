import { describe, expect, it } from 'vitest'
import {
  collectPluginLibraries,
  isPluginPairCode,
  librariesFromPersist,
  pluginProUntil,
  pluginProUntilRefresh,
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
    expect(pluginProUntil({ valid: true, expiresAt: '2027-01-01T00:00:00Z' }, null)).toBe('2027-01-01T00:00:00Z')
    expect(pluginProUntil({ valid: true, expiresAt: null }, '2027-06-01T00:00:00Z')).toBe('lifetime')
    expect(pluginProUntil({ valid: false, expiresAt: null }, 'lifetime')).toBe('lifetime')
    expect(pluginProUntil(null, 'unknown')).toBeUndefined()
    expect(pluginProUntil(null, null)).toBeUndefined()
  })

  it('a later open upgrades Free and does not strip a live plan when Polar is down', () => {
    expect(pluginProUntilRefresh(undefined, 'lifetime', now)).toBe('lifetime')
    expect(pluginProUntilRefresh(undefined, 'unknown', now)).toBeUndefined()
    expect(pluginProUntilRefresh('lifetime', null, now)).toBe('lifetime')
    expect(pluginProUntilRefresh('2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z', now)).toBe('2027-01-01T00:00:00Z')
    expect(pluginProUntilRefresh('lifetime', 'unknown', now)).toBe('lifetime')
  })
})
