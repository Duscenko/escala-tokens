import { describe, expect, it } from 'vitest'
import { defaultFigmaSyncModes, figmaModeCapFor, figmaModesUsed, toggleFigmaSyncAppearance } from '../figmaSyncModes'
import { FREE_MAX_MODES, PRO_MAX_MODES } from '../entitlement'

describe('modes per plan', () => {
  // Modes count brands once there are two or more (a Brand mode each, Light ·
  // Dark shared), so 12 brands overflow the Free cap of 10.
  const keys = Array.from({ length: 12 }, (_, i) => `b${i}`)
  const kinds = Object.fromEntries(keys.map((k) => [k, 'light']))

  it('Free holds 10 modes, Pro more than 10', () => {
    expect(figmaModeCapFor(true)).toBe(FREE_MAX_MODES)
    expect(figmaModeCapFor(false)).toBe(PRO_MAX_MODES)
    expect(PRO_MAX_MODES).toBeGreaterThan(FREE_MAX_MODES)
  })

  it('the default selection stops at 10 unless a larger cap is passed', () => {
    expect(figmaModesUsed(defaultFigmaSyncModes(keys, kinds))).toBe(10)
    expect(defaultFigmaSyncModes(keys, kinds, undefined, PRO_MAX_MODES)).toHaveLength(24)
  })

  it('adding past 10 works only with the Pro cap', () => {
    const ten = defaultFigmaSyncModes(keys, kinds)
    expect(toggleFigmaSyncAppearance(ten, 'b10', 'light')).toEqual(ten)
    expect(figmaModesUsed(toggleFigmaSyncAppearance(ten, 'b10', 'light', PRO_MAX_MODES))).toBe(11)
  })
})
