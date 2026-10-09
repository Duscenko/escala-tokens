import { describe, expect, it } from 'vitest'
import { buildStudioTokens, studioOptions, studioLook, readCode, harmonyFor } from '../pluginStudio'

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

  it('reads shadcn-style CSS into choices a build accepts', () => {
    const css = `:root { --background: oklch(1 0 0); --primary: oklch(0.55 0.22 264); --radius: 0.625rem; --destructive: oklch(0.577 0.245 27.325); font-family: 'Geist', sans-serif }
      .dark { --background: oklch(0.145 0 0); --primary: oklch(0.72 0.17 264); }`
    const r = readCode(css, 'Mine')
    if (!r.ok) throw new Error(r.error)
    expect(r.reading.found.hasDark).toBe(true)
    expect(r.reading.choices.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(r.reading.found.radiusPx).toBe(10)
    expect(r.reading.choices.radiusPreset).toBe('Rounded')
    expect(r.reading.choices.bodyFont).toBe('Geist')
    const built = buildStudioTokens(r.reading.choices, 'free')
    expect('error' in built).toBe(false)
  })
  it('says what is missing when the CSS has no primary colour', () => {
    expect(readCode('body { margin: 0 }').ok).toBe(false)
    expect(readCode('').ok).toBe(false)
  })

  it('applies neutral tint, contrast and states from the colour edition', () => {
    const base = buildStudioTokens({ accent: '#2970ff', name: 'C' }, 'free')
    const out = buildStudioTokens({ accent: '#2970ff', name: 'C', neutralTint: 'vivid', contrastShift: 0.5, states: { error: '#c0362c' } }, 'free')
    if ('error' in base || 'error' in out) throw new Error('build failed')
    const prim = (t: unknown) => (t as { colors: { primitive: Record<string, string> } }).colors.primitive
    expect(JSON.stringify(prim(out.tokens))).not.toBe(JSON.stringify(prim(base.tokens)))
    expect(Object.entries(prim(out.tokens)).some(([k, v]) => /error-9$/.test(k) && v === '#c0362c')).toBe(true)
  })
  it('a style with a colour edit keeps its own fonts', () => {
    const o = studioOptions()
    const sty = o.styles.find((x) => x.font !== 'Inter') ?? o.styles[0]
    const out = buildStudioTokens({ style: sty.id, neutralTint: 'pure' }, 'free')
    if ('error' in out) throw new Error(out.error)
    expect(JSON.stringify(out.tokens)).toContain(sty.font)
  })

  it('gives the states an accent produces, the ones a build uses', () => {
    const h = harmonyFor('#2970ff', 'subtle')
    if (!h) throw new Error('no harmony')
    const out = buildStudioTokens({ accent: '#2970ff', name: 'H' }, 'free')
    if ('error' in out) throw new Error(out.error)
    const prim = Object.values((out.tokens as { colors: { primitive: Record<string, string> } }).colors.primitive)
    for (const hex of Object.values(h.states)) expect(prim).toContain(hex)
    expect(harmonyFor('nope')).toBeNull()
  })
  it('studioLook matches the web radius, spacing, solid and dark shadow', () => {
    const pill = studioLook({ radiusPreset: 'Pill', spacingMode: 'quiet', accent: '#9522e9', kind: 'light', shadow: 'Strong' })
    expect(pill.box).toBe(32)
    expect(pill.field).toBe(32)
    expect(pill.control).toBe(8)
    expect(pill.controlH).toBe(40)
    expect(pill.pad).toBe(20)
    expect(pill.accentRamp).toHaveLength(12)
    expect(pill.accentRamp[8].toLowerCase()).toBe('#9522e9')
    expect(pill.page.toLowerCase()).toBe(pill.neutralRamp[0].toLowerCase())
    expect(pill.accent.toLowerCase()).toBe('#9522e9')
    const dark = studioLook({ accent: '#9522e9', kind: 'dark', shadow: 'Strong' })
    expect(dark.shadow).not.toBe(pill.shadow)
    expect(dark.shadow.startsWith('0 0 0 1px')).toBe(true)
    expect(dark.page).not.toBe(pill.page)
    const sharp = studioLook({ radiusPreset: 'Sharp', spacingMode: 'compact', accent: '#9522e9' })
    expect(sharp.box).toBe(0)
    expect(sharp.controlH).toBe(35)
    expect(sharp.pad).toBe(12)
    const o = studioOptions()
    const quiet = o.spacingModes.find((m) => m.id === 'quiet')
    expect(quiet?.controlH).toBe(40)
    expect(quiet?.pad).toBe(20)
    expect(o.shadows.find((s) => s.label === 'Strong')?.mdDark).toBe(dark.shadow)
    const core = o.styles.find((s) => s.id === 'core-minimal')
    const styled = studioLook({ style: 'core-minimal' })
    expect(styled.box).toBe(core?.radius.boxes)
    expect(styled.accentRamp[8].toLowerCase()).toBe(core?.accent.toLowerCase())
  })
})
