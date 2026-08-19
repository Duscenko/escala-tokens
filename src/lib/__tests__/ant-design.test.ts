import { describe, expect, it } from 'vitest'
import { generate } from '@ant-design/colors'
import { antPalette, ANT_PRIMARY_INDEX } from '../color/antDesign'
import { hexToOklch } from '../color/gamut'
import { generateColorScale } from '../colorUtils'

/**
 * Conformance: our port must BE `@ant-design/colors`, not resemble it.
 *
 * `@ant-design/colors` is a devDependency used only here. `color/antDesign.ts`
 * ships with zero runtime dependencies — same arrangement as APCA.
 */

const SEEDS = [
  '#1677ff', // Ant's own daybreak blue
  '#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#13c2c2',
  '#722ed1', '#eb2f96', '#000000', '#ffffff', '#8c8c8c',
  '#ff0055', '#0d9488', '#7f56d9',
]

describe('Ant Design — conformance against @ant-design/colors', () => {
  it('light palettes are byte-identical for a curated seed set', () => {
    for (const seed of SEEDS) {
      expect(antPalette(seed), seed).toEqual(generate(seed))
    }
  })

  it('dark palettes are byte-identical, default background', () => {
    for (const seed of SEEDS) {
      expect(antPalette(seed, { theme: 'dark' }), seed)
        .toEqual(generate(seed, { theme: 'dark' }))
    }
  })

  it('dark palettes are byte-identical with a custom background', () => {
    for (const seed of SEEDS) {
      expect(antPalette(seed, { theme: 'dark', backgroundColor: '#0c0e12' }), seed)
        .toEqual(generate(seed, { theme: 'dark', backgroundColor: '#0c0e12' }))
    }
  })

  it('matches across 1500 deterministic random seeds', () => {
    // The curated set above covers the documented hues. This covers the rest of
    // the space — in particular the 60°/240° hue-direction boundary and the
    // saturation clamps, which is where a port silently diverges.
    let s = 0x51a2f3
    const rnd = () => {
      s ^= s << 13; s >>>= 0
      s ^= s >>> 17
      s ^= s << 5; s >>>= 0
      return s / 0xffffffff
    }
    const hex = () =>
      '#' + Array.from({ length: 3 }, () =>
        Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')

    const mismatches: string[] = []
    for (let i = 0; i < 1500; i++) {
      const seed = hex()
      const ours = antPalette(seed)
      const theirs = generate(seed)
      if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
        mismatches.push(`${seed}\n  ours   ${ours.join(' ')}\n  theirs ${theirs.join(' ')}`)
      }
      const oursDark = antPalette(seed, { theme: 'dark' })
      const theirsDark = generate(seed, { theme: 'dark' })
      if (JSON.stringify(oursDark) !== JSON.stringify(theirsDark)) {
        mismatches.push(`${seed} (dark)\n  ours   ${oursDark.join(' ')}\n  theirs ${theirsDark.join(' ')}`)
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([])
  })
})

describe('Ant Design — structural properties', () => {
  it('produces 10 stops with the primary at index 5, verbatim', () => {
    for (const seed of SEEDS) {
      const p = antPalette(seed)
      expect(p).toHaveLength(10)
      expect(p[ANT_PRIMARY_INDEX].toLowerCase()).toBe(seed.toLowerCase())
    }
  })

  it('rotates hue away from the primary — the thing OKLCH interpolation cannot do', () => {
    // A cool seed (in the 60–240 band) and a warm one must bend in OPPOSITE
    // directions. This is the single clearest signature that this is Ant's
    // algorithm and not a re-tuned lightness ramp.
    const signedDrift = (seed: string) => {
      const p = antPalette(seed)
      const h0 = hexToOklch(p[ANT_PRIMARY_INDEX]).h
      const hLightest = hexToOklch(p[0]).h
      return ((hLightest - h0 + 540) % 360) - 180
    }
    const cool = signedDrift('#1677ff') // h ≈ 215, inside the band
    const warm = signedDrift('#fa8c16') // h ≈ 31, outside it
    expect(Math.sign(cool)).not.toBe(Math.sign(warm))
    expect(Math.abs(cool)).toBeGreaterThan(2)
    expect(Math.abs(warm)).toBeGreaterThan(2)
  })
})

describe('DEFECT C1 — the port is measurably a different algorithm', () => {
  it('rotates hue systematically where the OKLCH preset only wobbles', () => {
    // The definitive signature. `buildScale` carries `baseH` through every step,
    // so the OKLCH `ant` preset is hue-STABLE by construction — what little
    // spread it shows is gamut mapping plus 8-bit quantisation, not intent. The
    // real algorithm rotates 2° per step, deliberately.
    //
    // Asserted as a RATIO rather than an absolute, because the preset's noise
    // floor depends on the seed's chroma (measured 0.31°–4.70° across these
    // four) while Ant's rotation depends on where the hue sits relative to the
    // 60°–240° band. The gap is 3×–24×; nothing near 1× could be a re-tuning.
    const spread = (hexes: string[]) => {
      const hs = hexes.map((h) => hexToOklch(h).h)
      return Math.max(...hs) - Math.min(...hs)
    }
    for (const seed of ['#1677ff', '#fa8c16', '#52c41a', '#f5222d']) {
      const presetScale = generateColorScale(seed, 'ant', 0, '#ffffff', 'light')
      // Steps 5–10 carry enough chroma for hue to be meaningful (see the
      // colour-science-core skill, rule 5).
      const presetSpread = spread([5, 6, 7, 8, 9, 10].map((t) => presetScale[t]))
      const realSpread = spread(antPalette(seed).slice(2, 8))
      expect(realSpread / presetSpread, `${seed}: preset ${presetSpread.toFixed(2)}° vs real ${realSpread.toFixed(2)}°`)
        .toBeGreaterThan(2.5)
    }
  })

  it('places its primary at a different index than the 12-step taxonomy', () => {
    // 10 stops with the anchor at index 5, versus 12 with the anchor at 9.
    // A consumer cannot treat one as the other, which is why the port is
    // exposed as its own function rather than swapped in behind `SPECS`.
    expect(antPalette('#1677ff')).toHaveLength(10)
    expect(ANT_PRIMARY_INDEX).toBe(5)
    expect(Object.keys(generateColorScale('#1677ff', 'ant', 0, '#ffffff', 'light'))).toHaveLength(12)
  })
})
