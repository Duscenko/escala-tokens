import { describe, expect, it } from 'vitest'
import { FREE_MAX_THEMES, PRO_MAX_THEMES, PROMO_ENDS_AT, entitlementAt, promoDaysLeft } from '../entitlement'

describe('launch promo entitlement', () => {
  it('ends at 23:59:59 on Oct 7 in Paris (CEST, before the Oct 25 DST change)', () => {
    expect(new Date(PROMO_ENDS_AT).toISOString()).toBe('2026-10-07T21:59:59.000Z')
  })

  it('grants Pro limits through the last second, Free limits after it', () => {
    const last = entitlementAt(new Date('2026-10-07T21:59:59Z'))
    expect(last).toMatchObject({ promo: true, pro: true, maxThemes: PRO_MAX_THEMES })
    const after = entitlementAt(new Date('2026-10-07T22:00:00Z'))
    expect(after).toMatchObject({ promo: false, pro: false, maxThemes: FREE_MAX_THEMES })
  })

  it('counts whole days rounded up, and 0 once over', () => {
    expect(promoDaysLeft(new Date('2026-10-03T09:00:00Z'))).toBe(5)
    expect(promoDaysLeft(new Date('2026-10-07T12:00:00Z'))).toBe(1)
    expect(promoDaysLeft(new Date('2026-10-08T00:00:00Z'))).toBe(0)
  })

  it('reports the clock it was computed against', () => {
    expect(entitlementAt(new Date('2026-10-03T09:00:00Z')).now).toBe('2026-10-03T09:00:00.000Z')
  })
})

describe('launch price', () => {
  it('is $45 through Nov 15 in Paris, $69 from the next second', () => {
    expect(entitlementAt(new Date('2026-10-08T16:00:00Z'))).toMatchObject({ launchPrice: true, priceUsd: 45, promo: false, pro: false })
    expect(entitlementAt(new Date('2026-11-15T22:59:59Z'))).toMatchObject({ launchPrice: true, priceUsd: 45 })
    expect(entitlementAt(new Date('2026-11-15T23:00:00Z'))).toMatchObject({ launchPrice: false, priceUsd: 69 })
  })
})
