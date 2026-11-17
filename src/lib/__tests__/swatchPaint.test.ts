// A colour sample never paints a translucent value straight onto the chrome:
// a Light role's 12 % red on a dark Storybook read as a black smudge
// ("enmascarado", 2026-11-17). See src/lib/swatchPaint.ts.
import { describe, expect, it } from 'vitest'
import { isTranslucent, swatchPaint } from '../swatchPaint'

describe('swatchPaint', () => {
  it('detects translucency in every notation', () => {
    for (const c of ['#e82b011f', '#0000', 'rgba(237, 32, 0, 0.42)', 'rgb(0 0 0 / 15%)', 'transparent']) expect(isTranslucent(c), c).toBe(true)
    for (const c of ['#e7000b', '#e7000bff', 'rgb(231, 0, 11)', 'rgba(1,2,3,1)', 'var(--x)']) expect(isTranslucent(c), c).toBe(false)
  })
  it('paints an opaque colour as itself', () => {
    expect(swatchPaint('#e7000b', '#fefdff')).toEqual({ background: '#e7000b' })
  })
  it('draws a translucent colour over ITS page and a checker, never alone', () => {
    const s = swatchPaint('#e82b011f', '#fefdff')
    expect(s.background).toBeUndefined()
    expect(String(s.backgroundImage)).toContain('#fefdff')
    expect(String(s.backgroundImage)).toContain('repeating-conic-gradient')
    expect(String(swatchPaint('#e82b011f').backgroundImage)).toContain('repeating-conic-gradient')
  })
})
