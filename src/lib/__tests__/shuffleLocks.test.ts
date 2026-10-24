import { describe, expect, it } from 'vitest'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { FOUNDATION_AXIS, SHUFFLE_AXES, applyShuffleLocks, type ShuffleAxis } from '../shuffleLocks'

const byId = (id: string) => {
  const preset = THEME_STYLE_PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`no preset ${id}`)
  return preset
}

// Two styles that differ on every axis: Core's blue Inter vs Retro's orange Courier Prime.
const prev = byId('core-minimal')
const next = byId('retro-vintage')

const lock = (...axes: ShuffleAxis[]) => new Set(axes)

describe('applyShuffleLocks', () => {
  it('returns the dealt system untouched when nothing is locked', () => {
    expect(applyShuffleLocks(prev, next, lock())).toBe(next)
  })

  it('colour lock keeps the accent, neutral, states and role recipe', () => {
    const out = applyShuffleLocks(prev, next, lock('color'))
    expect(out.accent).toBe(prev.accent)
    expect(out.neutralTint).toBe(prev.neutralTint)
    expect(out.states).toEqual(prev.states)
    expect(out.semantics).toEqual(prev.semantics)
    // …and only that: the type still comes from the dice.
    expect(out.foundations.typography).toEqual(next.foundations.typography)
  })

  it('type lock keeps the whole typography, nothing else', () => {
    const out = applyShuffleLocks(prev, next, lock('type'))
    expect(out.foundations.typography).toEqual(prev.foundations.typography)
    expect(out.accent).toBe(next.accent)
    expect(out.foundations.radiusRoles).toEqual(next.foundations.radiusRoles)
  })

  it('the two fixtures really differ on every axis', () => {
    expect(next.accent).not.toBe(prev.accent)
    expect(next.foundations.typography).not.toEqual(prev.foundations.typography)
    expect(next.foundations.radiusRoles).not.toEqual(prev.foundations.radiusRoles)
  })

  it('shape lock keeps radius roles and shadows', () => {
    const out = applyShuffleLocks(prev, next, lock('shape'))
    expect(out.foundations.radiusRoles).toEqual(prev.foundations.radiusRoles)
    expect(out.foundations.shadows).toEqual(prev.foundations.shadows)
  })

  it('a locked key the previous system never set stays unset', () => {
    const bare = { ...prev, foundations: { ...prev.foundations, shadows: undefined } }
    delete bare.foundations.shadows
    const dealt = { ...next, foundations: { ...next.foundations, shadows: { sm: '0 1px 2px #0002' } } }
    expect('shadows' in applyShuffleLocks(bare, dealt, lock('shape')).foundations).toBe(false)
  })

  it('does not mutate either input', () => {
    const before = JSON.stringify([prev, next])
    applyShuffleLocks(prev, next, lock(...SHUFFLE_AXES))
    expect(JSON.stringify([prev, next])).toBe(before)
  })

  it('every lock on reproduces the previous system', () => {
    const out = applyShuffleLocks(prev, next, lock(...SHUFFLE_AXES))
    expect(out.accent).toBe(prev.accent)
    for (const key of Object.keys(FOUNDATION_AXIS)) {
      expect((out.foundations as Record<string, unknown>)[key]).toEqual((prev.foundations as Record<string, unknown>)[key])
    }
  })
})
