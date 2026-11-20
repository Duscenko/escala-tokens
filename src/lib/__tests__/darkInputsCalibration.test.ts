import { describe, expect, it } from 'vitest'
import { wcagRatio } from '../color/apca'
import { FIGMA_FILE_PALETTE } from '../figmaFilePalette'

/**
 * DEC-2026-11-18-002: the fields of the Figma file, calibrated on 2026-11-18. The numbers are the file's own steps
 * (Storybook pins this palette), composited where the role is translucent.
 */
const { gray, accent } = FIGMA_FILE_PALETTE.families
const over = (bg: string, alpha: number, ink: 0 | 255) => {
  const c = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16))
  return `#${c.map((v) => Math.round(v * (1 - alpha) + ink * alpha).toString(16).padStart(2, '0')).join('')}`
}
const STEP_03 = 0.149 // Neutrals/Black Alpha/03 · White Alpha/03 in the file.

describe('the field roles, measured', () => {
  const dark = { input: gray.dark[2], layer2: gray.dark[3], raised: gray.dark[4], subtle: gray.dark[10] }
  const light = { input: accent.light[1], subtle: gray.light[10] }

  it('Dark: a field sits about one step under its card', () => {
    expect(wcagRatio(dark.input, dark.layer2)).toBeCloseTo(1.07, 1)
    expect(wcagRatio(dark.input, dark.raised)).toBeCloseTo(1.17, 1)
  })
  it('content.subtle on surface.input: Light 3.6:1, Dark 4.0:1', () => {
    expect(wcagRatio(light.subtle, light.input)).toBeCloseTo(3.6, 1)
    expect(wcagRatio(dark.subtle, dark.input)).toBeCloseTo(4.0, 1)
  })
  it('border.control stays a soft hairline in both themes (EXC-2026-11-16-001)', () => {
    expect(wcagRatio(over(dark.input, STEP_03, 255), dark.input)).toBeCloseTo(1.57, 1)
    expect(wcagRatio(over(light.input, STEP_03, 0), light.input)).toBeCloseTo(1.41, 1)
  })
})
