import { describe, expect, it } from 'vitest'
import { moveRadiusLadderV151 } from '../layoutTokens'

// Store v151 (DEC-2026-11-16-002): the radius ladder moves to 0 · 4 · 8 · 12 · 20 · 24 · full.
// A system still on the previous default moves with it; a hand-picked role never does.
const migrate = (state: any) => { moveRadiusLadderV151(state); for (const s of state.savedSystems ?? []) moveRadiusLadderV151(s.snapshot); return state }

describe('store v151 · radius ladder', () => {
  it('moves a system that still holds the previous default', () => {
    const out = migrate({ radiusRoles: { control: 'lg', action: 'xl', container: '2xl', overlay: '2xl', pill: 'full' } })
    expect(out.radiusRoles).toMatchObject({ control: 'sm', action: 'xl', container: 'dimension-20', overlay: '3xl', pill: 'full' })
  })

  it('leaves a hand-picked role alone', () => {
    const roles = { control: 'lg', action: 'sm', container: '2xl', overlay: '2xl', pill: 'full' }
    expect(migrate({ radiusRoles: { ...roles } }).radiusRoles).toEqual(roles)
  })

  it('moves the roles a saved system carries too', () => {
    const out = migrate({ savedSystems: [{ snapshot: { radiusRoles: { control: 'lg', action: 'xl', container: '2xl', overlay: '2xl' } } }] })
    expect(out.savedSystems[0].snapshot.radiusRoles.container).toBe('dimension-20')
  })
})
