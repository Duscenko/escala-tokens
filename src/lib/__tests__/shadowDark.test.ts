import { describe, expect, it } from 'vitest'
import { buildStudioTokens, studioLook } from '../pluginStudio'
import { darkShadowMap, darkShadow } from '../colorUtils'
import { SHADOW_PRESETS, darkShadowsOf, matchDarkShadowPreset } from '../shadowTokens'

const preset = (label: string) => SHADOW_PRESETS.find((p) => p.label === label)!.values
type Fbt = Record<string, { shadows: Record<string, string>; shadowsDark: Record<string, string> }>

describe('Dark picks its own shadow ramp', () => {
  it('derives Dark from Light when no dark ramp is picked', () => {
    expect(darkShadowsOf({ shadows: preset('Soft') })).toEqual(darkShadowMap(preset('Soft')))
    expect(matchDarkShadowPreset(darkShadowMap(preset('Strong')))).toBe('Strong')
    expect(matchDarkShadowPreset({ md: 'nope' })).toBeNull()
  })

  it('fills a partial dark ramp from the derived twin', () => {
    const out = darkShadowsOf({ shadows: preset('Soft'), shadowsDark: { md: 'none' } })
    expect(out.md).toBe('none')
    expect(out.lg).toBe(darkShadow(preset('Soft').lg))
  })

  it('ships each brand its own light and dark ramps', () => {
    const out = buildStudioTokens({ accent: '#2970ff', name: 'A', shadow: 'Subtle', shadowDark: 'Strong' }, 'pro')
    if ('error' in out) throw new Error(out.error)
    const fbt = (out.tokens as { foundationsByTheme: Fbt }).foundationsByTheme
    for (const f of Object.values(fbt)) {
      expect(f.shadows).toEqual(preset('Subtle'))
      expect(f.shadowsDark).toEqual(darkShadowMap(preset('Strong')))
    }
  })

  it('keeps Dark on Light when only Light is picked', () => {
    const out = buildStudioTokens({ accent: '#2970ff', name: 'A', shadow: 'Strong' }, 'pro')
    if ('error' in out) throw new Error(out.error)
    for (const f of Object.values((out.tokens as { foundationsByTheme: Fbt }).foundationsByTheme)) {
      expect(f.shadowsDark).toEqual(darkShadowMap(preset('Strong')))
    }
  })

  it('previews the dark pick in dark and the light pick in light', () => {
    const c = { accent: '#2970ff', shadow: 'Subtle', shadowDark: 'None' }
    expect(studioLook({ ...c, kind: 'light' }).shadow).toBe(preset('Subtle').md)
    expect(studioLook({ ...c, kind: 'dark' }).shadow).toBe('none')
  })
})
