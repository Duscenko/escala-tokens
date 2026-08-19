import { describe, expect, it } from 'vitest'
import {
  generateColorScale, generateFamilyDarkScale, generateDarkColorScale,
  backgroundFromBase, neutralFromBrand, DEFAULT_NEUTRAL_TINT,
  type ColorAlgorithm,
} from '../colorUtils'

/**
 * THE BASELINE.
 *
 * These snapshots pin the EXACT hex output of every shipping ramp generator for
 * a fixed seed matrix. They are not asserting the output is *correct* — several
 * of these ramps are known to be wrong (see ESCALA-COLOR-RESEARCH-PLAN.md). They
 * assert that output only changes when someone MEANT to change it.
 *
 * When a snapshot fails: do not run `-u` reflexively. Read the diff, decide
 * whether the change is the one you intended, and say so in the commit message.
 * That review step is the entire point of this file.
 */

const SEEDS: [name: string, hex: string][] = [
  ['violet', '#7f56d9'],
  ['blue', '#2563eb'],
  ['amber', '#d97706'],
  ['vivid-magenta', '#ff0055'],   // out-of-gamut stress case
  ['near-neutral', '#6c737f'],
]

const ALGORITHMS: ColorAlgorithm[] = [
  'default', 'radix', 'tailwind', 'ant',
  'lightness', 'saturation', 'hueShift', 'monochromatic',
  'analogous', 'complementary',
]

describe('ramp golden baseline', () => {
  for (const [name, hex] of SEEDS) {
    describe(`${name} (${hex})`, () => {
      const neutral = neutralFromBrand(hex, DEFAULT_NEUTRAL_TINT)
      const lightBg = backgroundFromBase(neutral, 'light', DEFAULT_NEUTRAL_TINT)
      const darkBg = backgroundFromBase(neutral, 'dark', DEFAULT_NEUTRAL_TINT)

      for (const algo of ALGORITHMS) {
        it(`${algo} — light`, () => {
          expect(generateColorScale(hex, algo, 0, lightBg, 'light', DEFAULT_NEUTRAL_TINT))
            .toMatchSnapshot()
        })

        it(`${algo} — dark family`, () => {
          expect(generateFamilyDarkScale(hex, algo, 0, darkBg)).toMatchSnapshot()
        })
      }

      it('neutral ramp — light', () => {
        expect(generateColorScale(neutral, 'radix', 0, lightBg, 'light', DEFAULT_NEUTRAL_TINT))
          .toMatchSnapshot()
      })

      it('neutral ramp — dark', () => {
        expect(generateDarkColorScale(neutral, 'radix', 0, darkBg, DEFAULT_NEUTRAL_TINT))
          .toMatchSnapshot()
      })

      it('derived page backgrounds', () => {
        expect({ neutral, lightBg, darkBg }).toMatchSnapshot()
      })
    })
  }
})

describe('contrastShift baseline', () => {
  // The gamma reshaping in buildScale is the subtlest part of the engine.
  // Pin it across the whole slider range.
  for (const shift of [-1, -0.5, 0, 0.5, 1]) {
    it(`shift ${shift}`, () => {
      expect(generateColorScale('#7f56d9', 'radix', shift, '#ffffff', 'light')).toMatchSnapshot()
    })
  }
})

describe('neutral tint baseline', () => {
  for (const tint of ['pure', 'subtle', 'tinted', 'vivid'] as const) {
    it(`tint ${tint}`, () => {
      const neutral = neutralFromBrand('#7f56d9', tint)
      const bg = backgroundFromBase(neutral, 'light', tint)
      expect({
        neutral,
        bg,
        scale: generateColorScale(neutral, 'radix', 0, bg, 'light', tint),
      }).toMatchSnapshot()
    })
  }
})
