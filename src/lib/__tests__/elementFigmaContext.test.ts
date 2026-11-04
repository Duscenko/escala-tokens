import { describe, expect, it } from 'vitest'
import { buildElementFigmaContext, buildFigmaContext, extractEscalaPayload } from '../figmaContext'
import type { FigmaSyncMode } from '../figmaSyncModes'
import { COMPONENT_KEYS } from '../componentCatalogue'

const modes = [{ theme: 'light', appearance: 'light' }] as FigmaSyncMode[]
const base = { project: 'Acme', modes, viewports: ['desktop'] as const, brandName: (k: string) => k }
const element = { component: 'Button', label: 'Button', variant: { Variant: 'outline', Size: 'sm', State: 'Default' } }

describe('Copy this element → the Figma plugin', () => {
  const ctx = buildElementFigmaContext({ ...base, viewports: ['desktop'], element })
  const raw = JSON.parse(extractEscalaPayload(ctx.text))

  it('is the brand payload the plugin imports, plus `copy`', () => {
    const whole = JSON.parse(extractEscalaPayload(buildFigmaContext({ ...base, viewports: ['desktop'] }).text))
    const { copy, ...rest } = raw
    expect(rest).toEqual(whole)
    expect(copy).toEqual({ kind: 'element', ...element })
  })

  it('matches what the plugin looks for (`"copy":` in the text, colors in the payload)', () => {
    expect(/"copy"\s*:/.test(ctx.text)).toBe(true)
    expect(raw.colors).toBeTruthy()
  })

  it('names the element in the readable part', () => {
    expect(ctx.text).toContain('it builds Button and places it on the page you are on')
  })

  it('a whole-system copy carries no `copy` key', () => {
    const whole = buildFigmaContext({ ...base, viewports: ['desktop'] }).text
    expect(/"copy"\s*:/.test(whole)).toBe(false)
  })

  it('every catalogue component can be copied', () => {
    for (const key of COMPONENT_KEYS) {
      const one = JSON.parse(extractEscalaPayload(buildElementFigmaContext({
        ...base, viewports: ['desktop'], element: { component: key, label: key, variant: {} },
      }).text))
      expect(one.copy.component).toBe(key)
    }
  }, 60_000)
})
