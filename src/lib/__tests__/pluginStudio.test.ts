import { describe, expect, it } from 'vitest'
import { buildStudioTokens, studioOptions } from '../pluginStudio'

type Payload = { colors: { themeOrder: string[] }; viewports?: string[]; radiusRoles?: Record<string, string>; typography: { fontFamily: string }; shadows: Record<string, string> }

describe('plugin studio build', () => {
  it('Free ships one theme in one mode on Desktop', () => {
    const out = buildStudioTokens({ accent: '#2970ff', name: 'Aurora' }, 'free')
    if ('error' in out) throw new Error(out.error)
    const t = out.tokens as Payload
    expect(t.colors.themeOrder).toEqual(['aurora::light'])
    expect(t.viewports).toEqual(['desktop'])
  })
  it('Pro ships Light and Dark', () => {
    const out = buildStudioTokens({ accent: '#2970ff', name: 'Aurora', kind: 'dark' }, 'pro')
    if ('error' in out) throw new Error(out.error)
    expect((out.tokens as Payload).colors.themeOrder).toHaveLength(2)
  })
  it('applies every step', () => {
    const o = studioOptions()
    const base = buildStudioTokens({ accent: '#2970ff', name: 'A' }, 'pro')
    const out = buildStudioTokens({
      accent: '#2970ff', name: 'A', bodyFont: 'Geist', radiusPreset: 'Pill', spacingMode: 'airy',
      shadow: 'Strong', iconWeight: 'bold', typeScale: 4, radiusAxes: { selectors: 'none' },
    }, 'pro')
    if ('error' in base || 'error' in out) throw new Error('build failed')
    expect(JSON.stringify(out.tokens)).not.toBe(JSON.stringify(base.tokens))
    expect(o.spacingModes.length).toBe(4)
    expect(JSON.stringify(out.tokens)).toContain('Geist')
  })
  it('adopts a System Style', () => {
    const o = studioOptions()
    expect(o.styles.length).toBeGreaterThan(3)
    const out = buildStudioTokens({ style: o.styles[1].id }, 'free')
    if ('error' in out) throw new Error(out.error)
    expect((out.tokens as Payload).colors.themeOrder).toHaveLength(1)
    expect('error' in buildStudioTokens({ style: 'nope' }, 'free')).toBe(true)
  })
  it('ships the primitives every semantic aliases', () => {
    for (const choices of [{ style: 'core-minimal' }, { accent: '#2970ff', name: 'B' }]) {
      const out = buildStudioTokens(choices, 'pro')
      if ('error' in out) throw new Error(out.error)
      const t = out.tokens as { colors: { primitive: Record<string, string>; themeSources: Record<string, Record<string, string>> } }
      for (const src of Object.values(t.colors.themeSources)) {
        for (const fam of Object.values(src)) expect(Object.keys(t.colors.primitive).some((k) => k.startsWith(fam + '-'))).toBe(true)
      }
    }
  })
  it('an accent sent with a style retints it', () => {
    const o = studioOptions()
    const id = o.styles[0].id
    const plain = buildStudioTokens({ style: id }, 'pro')
    const tinted = buildStudioTokens({ style: id, accent: '#e0457b' }, 'pro')
    if ('error' in plain || 'error' in tinted) throw new Error('build failed')
    const nine = (t: unknown) => Object.entries((t as { colors: { primitive: Record<string, string> } }).colors.primitive)
      .filter(([k]) => /-9$/.test(k) && !/dark|gray|error|warning|success|info/.test(k)).map(([, v]) => v)
    expect(nine(tinted.tokens)).toContain('#e0457b')
    expect(nine(plain.tokens)).not.toContain('#e0457b')
  })
  it('rejects a bad accent', () => {
    expect('error' in buildStudioTokens({ accent: 'blue' }, 'free')).toBe(true)
  })
})
