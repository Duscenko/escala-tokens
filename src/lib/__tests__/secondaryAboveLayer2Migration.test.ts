import { describe, expect, it } from 'vitest'
import { liftSecondaryAboveLayer2V152 } from '../../store/useDesignStore'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { withStyleSemantics } from '../stylePreviewOverlay'

const migrate = (state: any) => {
  liftSecondaryAboveLayer2V152(state)
  for (const s of state.savedSystems ?? []) liftSecondaryAboveLayer2V152(s.snapshot)
  return state
}

// DEC-2026-11-17-001: in Dark the secondary button sits two steps above the
// card. The schema's tone 6 already does that over a lifted layer-2 on tone 4.
describe('store v152: the secondary button sits two steps above the card in Dark', () => {
  it('leaves a brand alone when the schema already clears its layer-2', () => {
    const state = migrate({
      architectureOverrides: { categorical: { 'surface.layer-2': { 'core--minimalist::dark': '{neutral-dark.4}' } } },
    })
    expect(state.architectureOverrides.categorical['action.secondary.default']).toBeUndefined()
  })

  it('lifts the fill two steps above a layer-2 the schema does not clear', () => {
    const state = migrate({
      architectureOverrides: { categorical: { 'surface.layer-2': { 'abyss::dark': '{neutral-dark.5}' } } },
    })
    const cat = state.architectureOverrides.categorical
    expect(cat['action.secondary.default']).toEqual({ 'abyss::dark': '{neutral-dark.7}' })
    expect(cat['action.secondary.hover']).toEqual({ 'abyss::dark': '{neutral-dark.8}' })
    expect(cat['action.secondary.pressed']).toEqual({ 'abyss::dark': '{neutral-dark.9}' })
  })

  it('never touches a hand-picked secondary fill', () => {
    const state = migrate({
      architectureOverrides: { categorical: {
        'surface.layer-2': { 'a::dark': '{neutral-dark.5}' },
        'action.secondary.hover': { 'a::dark': '{accent-dark.3}' },
      } },
    })
    const cat = state.architectureOverrides.categorical
    expect(cat['action.secondary.default']).toBeUndefined()
    expect(cat['action.secondary.hover']).toEqual({ 'a::dark': '{accent-dark.3}' })
  })

  it('leaves Light and non-neutral layer-2 refs alone', () => {
    const state = migrate({
      architectureOverrides: { categorical: { 'surface.layer-2': { 'a::light': '{neutral.6}', 'b::dark': '{white-a.2}' } } },
    })
    expect(state.architectureOverrides.categorical['action.secondary.default']).toBeUndefined()
  })

  it('migrates every saved system, not only the open one', () => {
    const state = migrate({
      architectureOverrides: { categorical: {} },
      savedSystems: [{ snapshot: { architectureOverrides: { categorical: { 'surface.layer-2': { 'x::dark': '{neutral-dark.5}' } } } } }],
    })
    expect(state.savedSystems[0].snapshot.architectureOverrides.categorical['action.secondary.default'])
      .toEqual({ 'x::dark': '{neutral-dark.7}' })
  })

  // A brand adopted before v152 must end up exactly where adopting the style
  // now puts it — or an untouched brand would read as hand-edited.
  it('lands an untouched brand where adopting its style now does', () => {
    for (const preset of THEME_STYLE_PRESETS) {
      if (!preset.semantics) continue
      const now = withStyleSemantics({}, preset.semantics, 'k')
      const before = withStyleSemantics({}, Object.fromEntries(
        Object.entries(preset.semantics).filter(([token]) => !token.startsWith('action.secondary.')),
      ), 'k')
      const state = migrate({ architectureOverrides: structuredClone(before) })
      const pick = (o: any) => Object.fromEntries(Object.entries(o.categorical ?? {}).filter(([t]) => t.startsWith('action.secondary.')))
      expect(pick(state.architectureOverrides), preset.id).toEqual(pick(now))
    }
  })
})
