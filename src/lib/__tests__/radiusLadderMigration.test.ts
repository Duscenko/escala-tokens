import { describe, expect, it } from 'vitest'
import { capSelectorsRadiusV153, moveRadiusLadderV151 } from '../layoutTokens'

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

// Store v153 (component-box-classification §4.3): the Selectors axis stops at md
// (6px). A `radius.control` above it moves to md; nothing else moves.
const cap = (state: any) => { capSelectorsRadiusV153(state); for (const s of state.savedSystems ?? []) capSelectorsRadiusV153(s.snapshot); return state }

describe('store v153 · selectors cap', () => {
  it('moves the old Pill preset (control lg) down to md and touches nothing else', () => {
    const roles = { control: 'lg', item: 'lg', action: '4xl', container: '3xl', overlay: '3xl', pill: 'full' }
    expect(cap({ radiusRoles: { ...roles } }).radiusRoles).toEqual({ ...roles, control: 'md' })
  })

  it('moves any step above md, on every brand and every saved system', () => {
    const out = cap({
      radiusRoles: { control: '2xl' },
      themeFoundations: { a: { radiusRoles: { control: 'full' } }, b: { radiusRoles: { control: 'sm' } }, c: {} },
      savedSystems: [{ snapshot: { radiusRoles: { control: '5xl' } } }],
    })
    expect(out.radiusRoles.control).toBe('md')
    expect(out.themeFoundations.a.radiusRoles.control).toBe('md')
    expect(out.themeFoundations.b.radiusRoles.control).toBe('sm')
    expect(out.savedSystems[0].snapshot.radiusRoles.control).toBe('md')
  })

  it('leaves md and below, and a pinned px, alone', () => {
    for (const control of ['none', 'xs', 'sm', 'md', 'dimension-8', '10px']) {
      expect(cap({ radiusRoles: { control } }).radiusRoles.control).toBe(control)
    }
    expect(cap({}).radiusRoles).toBeUndefined()
  })
})
