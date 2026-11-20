// A control's track (SegmentedControl, Switch off, Slider) has to read on the card it sits on. The Figma file keeps
// `Surface/muted` one tone above `Surface/layer-2`; a style that lifts the card in Dark lifts the track with it.
import { describe, expect, it } from 'vitest'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { liftTrackAboveLayer2V155 } from '../../store/useDesignStore'

const SCHEMA = { 'surface.layer-2': 3, 'surface.muted': 4, 'surface.raised': 6 } as const

function darkTone(semantics: Record<string, { dark?: string }> | undefined, role: keyof typeof SCHEMA): number {
  const ref = semantics?.[role]?.dark
  const step = ref ? /^\{neutral-dark\.(\d+)\}$/.exec(ref)?.[1] : undefined
  return step ? Number(step) : SCHEMA[role]
}

describe('a track reads on its card in Dark', () => {
  it.each(THEME_STYLE_PRESETS.map((p) => [p.id, p] as const))('%s', (_id, preset) => {
    const semantics = preset.semantics as Record<string, { dark?: string }> | undefined
    expect(darkTone(semantics, 'surface.muted')).toBeGreaterThan(darkTone(semantics, 'surface.layer-2'))
    expect(darkTone(semantics, 'surface.raised')).toBeGreaterThan(darkTone(semantics, 'surface.muted'))
  })
})

describe('store v155', () => {
  const mode = 'core::dark'

  it('lifts a saved brand whose card landed on the track', () => {
    const state = { architectureOverrides: { categorical: { 'surface.layer-2': { [mode]: '{neutral-dark.4}' } } } } as any
    liftTrackAboveLayer2V155(state)
    expect(state.architectureOverrides.categorical['surface.muted'][mode]).toBe('{neutral-dark.5}')
    expect(state.architectureOverrides.categorical['surface.muted-hover'][mode]).toBe('{neutral-dark.6}')
    expect(state.architectureOverrides.categorical['surface.raised']).toBeUndefined()
  })

  it('keeps the selected segment above a higher track', () => {
    const state = { architectureOverrides: { categorical: { 'surface.layer-2': { [mode]: '{neutral-dark.5}' } } } } as any
    liftTrackAboveLayer2V155(state)
    expect(state.architectureOverrides.categorical['surface.raised'][mode]).toBe('{neutral-dark.7}')
  })

  it('never touches a hand-picked track', () => {
    const state = { architectureOverrides: { categorical: { 'surface.layer-2': { [mode]: '{neutral-dark.4}' }, 'surface.muted': { [mode]: '{neutral-dark.9}' } } } } as any
    liftTrackAboveLayer2V155(state)
    expect(state.architectureOverrides.categorical['surface.muted'][mode]).toBe('{neutral-dark.9}')
    expect(state.architectureOverrides.categorical['surface.muted-hover']).toBeUndefined()
  })
})
