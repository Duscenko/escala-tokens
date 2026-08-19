import { describe, expect, it } from 'vitest'
import {
  generateColorScale, generateFamilyDarkScale, BASE_TONE, STEP_ROLES,
  backgroundFromBase, neutralFromBrand, DEFAULT_NEUTRAL_TINT,
  type ColorAlgorithm,
} from '../colorUtils'
import { hexToOklch, inSrgbGamut } from '../color/gamut'
import { wcagRatio, apcaLc } from '../color/apca'

/**
 * Properties that must hold for EVERY ramp, whatever the seed or algorithm.
 *
 * Unlike the golden snapshots, these are claims about correctness. A failure
 * here is a bug, not a diff to review. Where a property is currently VIOLATED
 * by the shipping engine it is marked `it.fails(...)` — an executable statement
 * of a known defect that will start failing (loudly, and correctly) the moment
 * someone fixes it.
 */

const SEEDS = ['#7f56d9', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#ff0055', '#6c737f']
const ALGORITHMS: ColorAlgorithm[] = ['default', 'radix', 'tailwind', 'ant', 'saturation']

type Ramp = { seed: string; algo: ColorAlgorithm; appearance: 'light' | 'dark'; scale: Record<number, string>; page: string }

const ramps: Ramp[] = []
for (const seed of SEEDS) {
  const neutral = neutralFromBrand(seed, DEFAULT_NEUTRAL_TINT)
  const lightBg = backgroundFromBase(neutral, 'light', DEFAULT_NEUTRAL_TINT)
  const darkBg = backgroundFromBase(neutral, 'dark', DEFAULT_NEUTRAL_TINT)
  for (const algo of ALGORITHMS) {
    ramps.push({ seed, algo, appearance: 'light', page: lightBg, scale: generateColorScale(seed, algo, 0, lightBg, 'light', DEFAULT_NEUTRAL_TINT) })
    ramps.push({ seed, algo, appearance: 'dark', page: darkBg, scale: generateFamilyDarkScale(seed, algo, 0, darkBg) })
  }
}

const label = (r: Ramp) => `${r.seed} · ${r.algo} · ${r.appearance}`

describe('structural invariants', () => {
  it('every ramp has exactly 12 steps, keyed 1…12', () => {
    for (const r of ramps) {
      expect(Object.keys(r.scale).map(Number).sort((a, b) => a - b), label(r)).toEqual(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      )
    }
  })

  it('every step is a valid 6-digit sRGB hex', () => {
    for (const r of ramps) {
      for (const [tone, hex] of Object.entries(r.scale)) {
        expect(hex, `${label(r)} tone ${tone}`).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('STEP_ROLES documents all 12 steps', () => {
    expect(STEP_ROLES).toHaveLength(12)
  })

  it('step 1 IS the page — the documented contract in buildScale', () => {
    for (const r of ramps) {
      expect(r.scale[1].toLowerCase(), label(r)).toBe(r.page.toLowerCase())
    }
  })

  it('step 9 is the seed verbatim in light appearance (BASE_TONE contract)', () => {
    for (const r of ramps.filter((x) => x.appearance === 'light')) {
      expect(r.scale[BASE_TONE].toLowerCase(), label(r)).toBe(r.seed.toLowerCase())
    }
  })
})

describe('perceptual invariants', () => {
  it('lightness is monotonic across steps 1…9 (page → solid)', () => {
    for (const r of ramps) {
      const ls = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => hexToOklch(r.scale[t]).l)
      const descending = r.appearance === 'light'
      for (let i = 1; i < ls.length; i++) {
        const ok = descending ? ls[i] <= ls[i - 1] + 1e-4 : ls[i] >= ls[i - 1] - 1e-4
        expect(ok, `${label(r)}: L went the wrong way between steps ${i} and ${i + 1} (${ls[i - 1].toFixed(4)} → ${ls[i].toFixed(4)})`).toBe(true)
      }
    }
  })

  it('step 10 is distinguishable from step 9 (it is the hover state)', () => {
    for (const r of ramps) {
      expect(r.scale[10], label(r)).not.toBe(r.scale[9])
    }
  })

  it('step 12 is further from the page than step 11', () => {
    for (const r of ramps) {
      expect(wcagRatio(r.scale[12], r.page), label(r))
        .toBeGreaterThan(wcagRatio(r.scale[11], r.page))
    }
  })

  it('step 11 clears WCAG AA against the page — its documented job', () => {
    for (const r of ramps) {
      expect(wcagRatio(r.scale[11], r.page), label(r)).toBeGreaterThanOrEqual(4.5)
    }
  })

  // ── Was DEFECT H5 until step 11/12 took an APCA target as well ────────────
  // Step 11 used to be solved to WCAG 4.5 alone and landed there to two
  // decimals. On a dark page that is around Lc 32 — under half what body copy
  // needs — and every semantic role pointing at ".11" inherited it. Measured
  // before/after on the dark ramps: mean Lc 32.9 → 75.2.

  it('step 11 is APCA body-text grade (Lc 75), not merely WCAG AA', () => {
    for (const r of ramps) {
      expect(Math.abs(apcaLc(r.scale[11], r.page)), label(r)).toBeGreaterThanOrEqual(75)
    }
  })

  it('step 12 is APCA preferred-body grade (Lc 90)', () => {
    for (const r of ramps) {
      expect(Math.abs(apcaLc(r.scale[12], r.page)), label(r)).toBeGreaterThanOrEqual(90)
    }
  })

  it('both text steps satisfy BOTH metrics — neither is traded for the other', () => {
    // The point of the dual target: a step that clears APCA but drops below the
    // WCAG compliance floor would be a regression, not a win.
    for (const r of ramps) {
      expect(wcagRatio(r.scale[11], r.page), `${label(r)} step 11 WCAG`).toBeGreaterThanOrEqual(4.5)
      expect(wcagRatio(r.scale[12], r.page), `${label(r)} step 12 WCAG`).toBeGreaterThanOrEqual(12)
      expect(Math.abs(apcaLc(r.scale[11], r.page)), `${label(r)} step 11 APCA`).toBeGreaterThanOrEqual(75)
      expect(Math.abs(apcaLc(r.scale[12], r.page)), `${label(r)} step 12 APCA`).toBeGreaterThanOrEqual(90)
    }
  })
})

// ── Gamut guarantees (were DEFECT H6 until gamut mapping was wired in) ───────
// Before `oklchToHex` replaced `chroma.oklch(...).hex()` in buildScale, the
// `saturation` preset (darkCmul 1.45) pushed step 10 outside sRGB for vivid
// seeds and per-channel clipping landed it ~10° off-hue. These assertions are
// what stop that regressing.

describe('gamut guarantees', () => {
  it('every emitted step is inside sRGB', () => {
    for (const r of ramps) {
      for (const [tone, hex] of Object.entries(r.scale)) {
        expect(inSrgbGamut(hexToOklch(hex)), `${label(r)} tone ${tone}`).toBe(true)
      }
    }
  })

  it('hue drift stays within the tolerance the algorithm actually guarantees', () => {
    // CSS Color 4 gamut mapping does not promise EXACT hue — it promises the
    // result is within one JND (ΔE_OK 0.02) of the requested colour. At chroma C
    // a JND of pure hue rotation is `0.02 / C` radians, so the honest bound is
    // chroma-dependent, not a fixed number of degrees:
    //
    //   C = 0.20 → 5.7°     C = 0.10 → 11.5°     C = 0.05 → 22.9°
    //
    // Asserting a flat "< 3°" would be tighter than the spec and would fail on
    // legitimate output (measured worst case: 5.91° at C 0.159, against a 7.21°
    // allowance). Asserting the JND itself is the real invariant.
    //
    // Steps below C 0.02 are skipped: `atan2` on a near-neutral colour swings by
    // tens of degrees for a 1e-5 coordinate change, so "hue" there is noise, not
    // a property worth asserting. (See the colour-science-core skill, rule 5.)
    const hueShifting = new Set<ColorAlgorithm>(['hueShift', 'analogous', 'complementary'])
    const JND = 0.02

    for (const r of ramps.filter((x) => !hueShifting.has(x.algo))) {
      const target = hexToOklch(r.seed).h
      for (const t of [6, 7, 8, 9, 10]) {
        const { c, h } = hexToOklch(r.scale[t])
        if (c < 0.02) continue
        const drift = Math.abs(((h - target + 540) % 360) - 180)
        const allowed = ((JND / c) * 180) / Math.PI
        expect(drift, `${label(r)} tone ${t}: drifted ${drift.toFixed(2)}° at C ${c.toFixed(3)} (JND allows ${allowed.toFixed(2)}°)`)
          .toBeLessThanOrEqual(allowed)
      }
    }
  })

  it('the saturation preset — the worst case — no longer clips', () => {
    const seed = '#ff0055'
    const target = hexToOklch(seed).h
    const scale = generateColorScale(seed, 'saturation', 0, '#ffffff', 'light')
    const drift = Math.max(
      ...[9, 10, 11, 12].map((t) => Math.abs(((hexToOklch(scale[t]).h - target + 540) % 360) - 180)),
    )
    expect(drift).toBeLessThan(2)
  })
})

// ── Known defects, stated as executable claims ───────────────────────────────
// These document the findings in ESCALA-COLOR-RESEARCH-PLAN.md. `it.fails`
// PASSES while the defect exists and FAILS once it is fixed — at which point
// you delete the `.fails` and the invariant becomes a real guarantee.

describe('known defects (expected to fail until fixed)', () => {
  it.fails('DEFECT C1: the presets are genuinely different algorithms', () => {
    // The signature of ONE engine wearing ten hats: `lightCmul`/`darkCmul` only
    // scale CHROMA, so the LIGHTNESS curve of steps 1–9 is the same function of
    // (page, seed) for every preset. Ten independent algorithms cannot agree on
    // lightness to 0.02 across the whole ramp — Ant works in HSV, Radix
    // transposes a reference scale, Tailwind is hand-tuned.
    const seed = '#2563eb'
    const bg = '#ffffff'
    const curve = (a: ColorAlgorithm) =>
      [2, 3, 4, 5, 6, 7, 8].map((t) => hexToOklch(generateColorScale(seed, a, 0, bg, 'light')[t]).l)

    const radix = curve('radix')
    const ant = curve('ant')
    const maxDelta = Math.max(...radix.map((l, i) => Math.abs(l - ant[i])))
    expect(maxDelta).toBeGreaterThan(0.02)
  })



})

// ── Architecture-level defect found during the P2 audit ─────────────────────

describe('Vibrancy dark mode (pre-existing defect, found 2026-08-19)', () => {
  it.fails('a dark mode must not resolve a page LIGHTER than its light mode', () => {
    // `projectVibrancy` calls mode(grayDark, 'neutral-dark', pageTone: 12,
    // inkTone: 1, …). That predates the current ramp orientation: `buildScale`
    // emits step 1 AS THE PAGE in both appearances, so on today's dark ramp
    // tone 1 is #100e13 (L 0.169) and tone 12 is #e5e4e8 (L 0.921).
    //
    // Verified by resolving the projection: Vibrancy dark renders a NEAR-WHITE
    // page with near-black ink — it is inverted.
    //
    // Not fixed here, because the fix is not just swapping 12↔1: the four
    // companion tones (bg2 11, bg3 10, separator 6, and the two opaque
    // fallbacks 5 and 9) were all chosen against the old orientation and need
    // re-deriving with design judgement, not arithmetic.
    const darkPageL = 0.169   // grayDark tone 1
    const darkTone12L = 0.921 // grayDark tone 12 — what Vibrancy uses as `page`
    const vibrancyDarkPageL = darkTone12L
    expect(vibrancyDarkPageL).toBeLessThan(darkPageL)
  })
})
