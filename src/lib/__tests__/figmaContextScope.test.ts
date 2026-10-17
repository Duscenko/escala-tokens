import { describe, expect, it } from 'vitest'
import { buildFigmaContext, extractEscalaPayload } from '../figmaContext'
import type { FigmaSyncMode, FigmaViewport } from '../figmaSyncModes'

const build = (modes: FigmaSyncMode[], viewports: FigmaViewport[]) => {
  const ctx = buildFigmaContext({ project: 'Acme', modes, viewports, brandName: (k) => k })
  return { ctx, raw: JSON.parse(extractEscalaPayload(ctx.text)) }
}
const both = [{ theme: 'light', appearance: 'light' }, { theme: 'dark', appearance: 'dark' }] as FigmaSyncMode[]

describe('Figma context follows the controls panel', () => {
  it('is a payload the plugin classifies as escala (colors present, parses)', () => {
    const { raw } = build(both, ['desktop', 'tablet', 'mobile'])
    expect(raw.colors).toBeTruthy()
    expect(raw.project).toBe('Acme')
  })

  it('ships only the viewports checked', () => {
    expect(build(both, ['desktop', 'tablet', 'mobile']).raw.viewports).toEqual(['desktop', 'tablet', 'mobile'])
    expect(build(both, ['mobile']).raw.viewports).toEqual(['mobile'])
    expect(build(both, ['desktop', 'mobile']).raw.viewports).toEqual(['desktop', 'mobile'])
  })

  it('ships only the theme columns checked', () => {
    const one = build([both[0]], ['desktop']).raw
    const two = build(both, ['desktop']).raw
    expect(one.colors.themeOrder.length).toBe(1)
    expect(two.colors.themeOrder.length).toBe(2)
    expect(JSON.stringify(Object.keys(one.colors.themes ?? {}))).not.toEqual(JSON.stringify(Object.keys(two.colors.themes ?? {})))
  })

  it('states the same scope in the readable header and shrinks with it', () => {
    const small = build([both[0]], ['mobile'])
    const big = build(both, ['desktop', 'tablet', 'mobile'])
    expect(small.ctx.text).toContain('Viewports: Mobile')
    expect(big.ctx.text).toContain('Viewports: Desktop · Tablet · Mobile')
    expect(small.ctx.bytes).toBeLessThan(big.ctx.bytes)
    expect(small.ctx.themes).toBe(1)
    expect(big.ctx.themes).toBe(2)
  })
})
