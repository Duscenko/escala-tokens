import { describe, expect, it } from 'vitest'
import {
  MAX_CUSTOM_ICONS, MAX_CUSTOM_ICON_BYTES, MAX_SVG_BYTES,
  fitsIconBudget, iconBudget, overIconBudget,
} from '../customIconLimits'
import { MAX_CLOUD_BYTES } from '../accountCloud'

const svg = (n: number) => 'x'.repeat(n)

describe('custom icon budget', () => {
  it('stops at the count, counting the icons accepted in the same batch', () => {
    let b = iconBudget([])
    let accepted = 0
    for (let i = 0; i < 1173; i++) {
      if (fitsIconBudget(b, svg(800)) === null) { b = { count: b.count + 1, bytes: b.bytes + 800 }; accepted++ }
    }
    expect(accepted).toBe(MAX_CUSTOM_ICONS)
  })

  it('refuses one oversized SVG and a set over the total', () => {
    expect(fitsIconBudget(iconBudget([]), svg(MAX_SVG_BYTES + 1))).toBe('size')
    expect(fitsIconBudget({ count: 1, bytes: MAX_CUSTOM_ICON_BYTES - 10 }, svg(100))).toBe('total')
  })

  it('a re-upload under the same name replaces, so it fits at the cap', () => {
    const b = { count: MAX_CUSTOM_ICONS, bytes: 1000 }
    expect(fitsIconBudget(b, svg(500))).toBe('count')
    expect(fitsIconBudget(b, svg(500), svg(400))).toBeNull()
  })

  it('a full set leaves most of the account record for the system itself', () => {
    expect(MAX_CUSTOM_ICON_BYTES).toBeLessThan(MAX_CLOUD_BYTES / 4)
    expect(overIconBudget({ count: 1173, bytes: 1_200_000 })).toBe(true)
  })
})
