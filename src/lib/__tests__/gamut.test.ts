import { describe, expect, it } from 'vitest'
import chroma from 'chroma-js'
import {
  hexToOklch, oklchToHex, oklchToHexClipped, gamutMapSrgb,
  inSrgbGamut, oklabToOklch, oklchToOklab, deltaEOK, hexToLinearRgb,
  maxChromaSrgb, srgbCusp,
} from '../color/gamut'
import { readHuePosition, colorAtHue } from '../colorUtils'

// A translucent hex used to have its alpha channel silently dropped — the
// colour would be decoded as if it were opaque, with no error. That was
// harmless before alpha primitives (`accent-a-*`, `black-a-*`, …) existed;
// afterward, it would let a translucent token quietly pass the CVD gate (or
// any ΔE comparison) against the wrong colour. See design-plans/alpha-primitives.md.
describe('hexToLinearRgb rejects translucent input', () => {
  it('throws on a real alpha channel (8-digit and 4-digit short form)', () => {
    expect(() => hexToLinearRgb('#00000099')).toThrow(/translucent/)
    expect(() => hexToLinearRgb('#0009')).toThrow(/translucent/)
  })

  it('lets fully-opaque alpha through unchanged', () => {
    expect(hexToLinearRgb('#000000ff')).toEqual(hexToLinearRgb('#000000'))
    expect(hexToLinearRgb('#000f')).toEqual(hexToLinearRgb('#000000'))
  })

  it('still rejects a genuinely malformed hex', () => {
    expect(() => hexToLinearRgb('not-a-color')).toThrow(/not an sRGB hex color/)
  })
})

describe('OKLab round-trip', () => {
  it('hex → OKLCH → hex is lossless for in-gamut colors', () => {
    const samples = ['#000000', '#ffffff', '#7f56d9', '#ff0055', '#00ff88', '#123456', '#6c737f']
    for (const hex of samples) {
      expect(oklchToHexClipped(hexToOklch(hex))).toBe(hex)
    }
  })

  // chroma-js rounds Ottosson's matrices to fewer digits than we do, so the two
  // agree to ~1e-5, not to float precision. 4 decimals is the honest bound —
  // tightening it would be asserting chroma-js's rounding, not our correctness.
  it('agrees with chroma-js on OKLCH coordinates to 1e-4', () => {
    for (const hex of ['#7f56d9', '#ff0055', '#0c0e12', '#e5e7eb']) {
      const [l, c, h] = chroma(hex).oklch()
      const ours = hexToOklch(hex)
      expect(ours.l).toBeCloseTo(l, 4)
      expect(ours.c).toBeCloseTo(c, 4)
      // Hue is only meaningful once there is chroma to carry it. Below ~0.02
      // a 1e-5 difference in a/b swings the angle by degrees — that is polar
      // geometry, not disagreement.
      if (c > 0.02) expect(Math.abs(((ours.h - h + 540) % 360) - 180)).toBeLessThan(0.05)
    }
  })
})

describe('gamut mapping', () => {
  it('leaves in-gamut colors untouched', () => {
    const c = hexToOklch('#7f56d9')
    expect(gamutMapSrgb(c)).toEqual(c)
  })

  it('brings out-of-gamut colors into sRGB', () => {
    // L 0.6 at chroma 0.35 is well outside sRGB for most hues.
    for (let h = 0; h < 360; h += 15) {
      const mapped = gamutMapSrgb({ l: 0.6, c: 0.35, h })
      expect(inSrgbGamut(mapped)).toBe(true)
      expect(mapped.c).toBeLessThanOrEqual(0.35)
    }
  })

  it('beats per-channel clipping on BOTH hue and lightness fidelity', () => {
    const hueErr = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
    const requests = [
      { l: 0.55, c: 0.34, h: 350 },
      { l: 0.6, c: 0.35, h: 140 },
      { l: 0.5, c: 0.33, h: 265 },
      { l: 0.7, c: 0.3, h: 30 },
    ]

    for (const req of requests) {
      const mapped = hexToOklch(oklchToHex(req.l, req.c, req.h))
      const clipped = hexToOklch(oklchToHexClipped(req))

      // Hue: mapping is never worse. (The residual ~1–2° comes from the final
      // clip plus 8-bit hex quantisation, both bounded by the JND.)
      expect(hueErr(mapped.h, req.h)).toBeLessThanOrEqual(hueErr(clipped.h, req.h))

      // Lightness: this is the bigger practical win. Clipping can move L by
      // 0.06 — comparable to a whole ramp step — which is what makes a clipped
      // ramp lose its monotonic feel around steps 8–10.
      expect(Math.abs(mapped.l - req.l)).toBeLessThan(0.02)
      expect(Math.abs(mapped.l - req.l)).toBeLessThan(Math.abs(clipped.l - req.l))
    }
  })

  it('stays within one JND of the requested color', () => {
    for (let h = 0; h < 360; h += 30) {
      for (const l of [0.3, 0.5, 0.7]) {
        const req = { l, c: 0.32, h }
        const got = gamutMapSrgb(req)
        // Lightness is held exactly by the algorithm (only chroma is searched),
        // apart from the final clip, which is bounded by the JND.
        expect(deltaEOK(oklchToOklab(got), oklchToOklab({ ...req, c: got.c })))
          .toBeLessThan(0.021)
      }
    }
  })

  it('handles the achromatic poles without producing NaN', () => {
    expect(oklchToHex(1.2, 0.1, 40)).toBe('#ffffff')
    expect(oklchToHex(-0.1, 0.1, 40)).toBe('#000000')
    expect(oklabToOklch({ l: 0.5, a: 0, b: 0 }).h).toBe(0)
    expect(oklchToHex(0.5, 0.05, NaN)).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('the defect this module fixes, demonstrated', () => {
  it('chroma-js clipping breaks hue monotonicity on a vivid ramp', () => {
    // Sweep chroma upward at fixed L and H, the way buildScale does around
    // steps 8–10 for a vivid brand, and measure how far hue wanders.
    const H = 350
    const L = 0.55
    let worstClipped = 0
    let worstMapped = 0
    const hueErr = (a: number) => Math.abs(((a - H + 540) % 360) - 180)

    for (let c = 0.05; c <= 0.36; c += 0.01) {
      worstClipped = Math.max(worstClipped, hueErr(chroma(chroma.oklch(L, c, H).hex()).oklch()[2]))
      worstMapped = Math.max(worstMapped, hueErr(hexToOklch(oklchToHex(L, c, H)).h))
    }

    expect(worstMapped).toBeLessThan(1.5)
    expect(worstClipped).toBeGreaterThan(worstMapped)
  })
})

// ── The hue axis ────────────────────────────────────────────────────────────
// Moving a colour along hue while holding L and C ABSOLUTE ratchets chroma
// down: sRGB's ceiling is hue-dependent, so the first pass through a narrow
// hue clamps the chroma and every later hue inherits the clamp. Measured on
// the shipped accent, a 304 -> 200 -> 120 -> 60 -> 304 sweep left C at 0.094
// where that hue allows 0.258. These tests pin the fix.
describe('hue axis (readHuePosition / colorAtHue)', () => {
  const ACCENT = '#9522e9'

  it('the sRGB chroma ceiling really is hue-dependent — the reason absolute C fails', () => {
    const at = (h: number) => maxChromaSrgb(0.48, h)
    // Measured: 0.082 at cyan, 0.256 at magenta — a 3.1x swing at ONE lightness.
    expect(at(200)).toBeLessThan(0.1)
    expect(at(300)).toBeGreaterThan(0.25)
    expect(at(300) / at(200)).toBeGreaterThan(3)
  })

  it('every hue peaks at a different lightness — the reason a fixed-L track is mud', () => {
    expect(srgbCusp(120).l).toBeGreaterThan(0.85) // yellow-green is a light colour
    expect(srgbCusp(260).l).toBeLessThan(0.60)    // blue is a dark one
  })

  it('a hue round trip is lossless', () => {
    const { hue, position } = readHuePosition(ACCENT)
    expect(colorAtHue(position, hue)).toBe(ACCENT)
  })

  it('does not ratchet chroma when the value is re-read after every hop', () => {
    const before = hexToOklch(ACCENT)
    let current = ACCENT
    // The exact path that used to destroy the colour, re-reading each time —
    // which is what the component does between renders.
    for (const h of [200, 120, 60, 305, 304]) {
      current = colorAtHue(readHuePosition(current).position, h)
    }
    const after = hexToOklch(current)
    expect(after.c).toBeGreaterThan(before.c * 0.98)
    expect(after.h).toBeCloseTo(before.h, 0)
  })

  it('stays near the gamut wall at every hue, so the track reads as a spectrum', () => {
    const { position } = readHuePosition(ACCENT)
    for (let h = 0; h < 360; h += 15) {
      const ok = hexToOklch(colorAtHue(position, h))
      const ratio = ok.c / maxChromaSrgb(ok.l, h)
      expect(ratio, `${h}deg sat ratio`).toBeGreaterThan(0.85)
    }
  })

  it('a deep blue and a pale lime both sit AT their cusp — lightness is RELATIVE', () => {
    // Both are "the vividest version of their own hue", so both read ~0.48 even
    // though their absolute L is 0.45 vs 0.90. That is the model working: what
    // travels across hues is the position relative to the cusp, not raw L.
    expect(readHuePosition('#2c1fe6').position.lightness).toBeCloseTo(0.48, 2)
    expect(readHuePosition('#cdef37').position.lightness).toBeCloseTo(0.48, 2)
    expect(hexToOklch('#2c1fe6').l).toBeLessThan(0.5)
    expect(hexToOklch('#cdef37').l).toBeGreaterThan(0.85)
  })

  it('keeps a dark colour dark and a light colour light across hues', () => {
    const dark = readHuePosition('#1a0533').position   // deep plum
    const light = readHuePosition('#f5d0ff').position  // pale lilac
    expect(dark.lightness).toBeLessThan(light.lightness)
    for (let h = 0; h < 360; h += 60) {
      expect(hexToOklch(colorAtHue(dark, h)).l).toBeLessThan(hexToOklch(colorAtHue(light, h)).l)
    }
  })

  it('every emitted colour is representable in sRGB', () => {
    const { position } = readHuePosition(ACCENT)
    for (let h = 0; h < 360; h += 5) {
      expect(inSrgbGamut(hexToOklch(colorAtHue(position, h))), `${h}deg`).toBe(true)
    }
  })
})
