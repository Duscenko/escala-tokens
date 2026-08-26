import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chroma from 'chroma-js'

import { checkContrast, isAccessible, WCAG_AA, WCAG_AAA } from '../colorUtils'
import { wcagRatio, wcagLuminance, apcaLc } from '../color/apca'
import { hexToOklch } from '../color/gamut'

/**
 * DRIFT GUARDS.
 *
 * The colour layer deliberately contains a small amount of parallel code. This
 * file makes each instance either impossible (a lint-style assertion) or safe
 * (a numerical equivalence assertion), so "we have two of these" can never
 * quietly become "we have two of these and they disagree".
 *
 * Three cases, and what we do about each:
 *
 *  1. WCAG contrast — ELIMINATED. `colorUtils.checkContrast` now delegates to
 *     `color/apca.wcagRatio`. Guarded by a source assertion below.
 *  2. OKLab conversion — INTENTIONAL. `color/gamut.ts` implements it natively
 *     rather than via chroma-js, because gamut mapping must not inherit another
 *     library's rounding. Guarded by an equivalence assertion.
 *  3. The `color-science-core` skill's `contrast.mjs` — INTENTIONAL. The skill
 *     must be portable and dependency-free, so it carries a JS mirror of
 *     `apca.ts` + `gamut.ts`. Guarded by an equivalence assertion when the
 *     skill is present in the workspace.
 */

const src = (p: string) => readFileSync(resolve(__dirname, p), 'utf8')

describe('1 · WCAG contrast has exactly one implementation', () => {
  it('every remaining chroma.contrast call is an annotated continuous-precision one', () => {
    const lines = src('../colorUtils.ts').split('\n')

    // Two call sites legitimately survive: they operate on un-quantised
    // `chroma.Color` objects mid-search, which is a DIFFERENT input domain from
    // the 8-bit hex `wcagRatio` takes — rounding inside the bisection would make
    // it non-monotonic. Every one of them must say so, in the four lines above.
    // A new, unannotated call site means someone reintroduced the duplicate.
    const offenders: string[] = []
    lines.forEach((line, i) => {
      if (!/chroma\.contrast\(/.test(line)) return
      const context = lines.slice(Math.max(0, i - 4), i).join('\n')
      if (!/CONTINUOUS-PRECISION/.test(context)) offenders.push(`${i + 1}: ${line.trim()}`)
    })

    expect(offenders, `unannotated chroma.contrast call sites:\n${offenders.join('\n')}`).toEqual([])
  })

  it('no string-level contrast call bypasses the single implementation', () => {
    const code = src('../colorUtils.ts')
    // `readableInk` compares two hex strings — must go through checkContrast.
    expect(code).toMatch(/checkContrast\(lightInk, bg\) >= checkContrast\(darkInk, bg\)/)
    // `lightnessForContrast` measures the EMITTED hex in both metrics. If this
    // stops matching, someone reintroduced a continuous-precision WCAG search
    // there — which is what made step 11 land at exactly 4.50 (defect H5).
    expect(code).toMatch(/wcagRatio\(hex, bg\) >= target\.wcag && Math\.abs\(apcaLc\(hex, bg\)\) >= target\.apcaLc/)
  })

  it('checkContrast IS wcagRatio, not a copy of it', () => {
    for (const [a, b] of [
      ['#000000', '#ffffff'], ['#7f56d9', '#ffffff'],
      ['#6c737f', '#0c0e12'], ['#ff0055', '#e5e7eb'],
    ]) {
      expect(checkContrast(a, b)).toBe(wcagRatio(a, b))
    }
  })

  it('the delegation changed nothing — bit-identical to the old chroma path', () => {
    // 5 000 deterministic pairs. This is the evidence that swapping the
    // implementation was a no-op, and it stays in the suite so the claim
    // remains checkable rather than historical.
    let s = 0x1234567
    const rnd = () => {
      s ^= s << 13; s >>>= 0
      s ^= s >>> 17
      s ^= s << 5; s >>>= 0
      return s / 0xffffffff
    }
    const hex = () =>
      '#' + Array.from({ length: 3 }, () =>
        Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')

    let worst = 0
    for (let i = 0; i < 5000; i++) {
      const a = hex()
      const b = hex()
      worst = Math.max(worst, Math.abs(checkContrast(a, b) - chroma.contrast(a, b)))
    }
    expect(worst).toBe(0)
  })

  it('isAccessible uses the exported thresholds, not inline literals', () => {
    expect(WCAG_AA).toBe(4.5)
    expect(WCAG_AAA).toBe(7)
    // A pair at exactly 4.5 must pass AA and fail AAA.
    const code = src('../colorUtils.ts')
    expect(code).toMatch(/level === 'AA' \? contrast >= WCAG_AA : contrast >= WCAG_AAA/)
    expect(isAccessible('#767676', '#ffffff', 'AA')).toBe(true)
    expect(isAccessible('#767676', '#ffffff', 'AAA')).toBe(false)
  })
})

describe('2 · gamut.ts OKLab agrees with chroma-js', () => {
  it('to 1e-4 across a hue sweep', () => {
    for (let h = 0; h < 360; h += 20) {
      for (const [l, c] of [[0.3, 0.08], [0.55, 0.15], [0.8, 0.06]]) {
        const hex = chroma.oklch(l, c, h).hex()
        const ours = hexToOklch(hex)
        const [cl, cc] = chroma(hex).oklch()
        expect(ours.l).toBeCloseTo(cl, 4)
        expect(ours.c).toBeCloseTo(cc, 4)
      }
    }
  })

  it('is the ONLY sRGB transfer function — cvd.ts borrows it, never restates it', () => {
    // `cvd.ts` works in linear light, so it needs the sRGB EOTF. Copying the
    // 0.04045 / 2.4 constants there would create a second decode that could
    // drift from `hexToOklch`, and then a palette could pass the CVD gate while
    // failing the contrast audit on the same hexes.
    const code = src('../color/cvd.ts')
    expect(code).toMatch(/hexToLinearRgb/)
    expect(code, 'cvd.ts restates the sRGB transfer function').not.toMatch(/0\.04045|1\.055|12\.92/)
  })
})

describe('3 · the skill mirror does not drift', () => {
  // The skill lives in this repo at .claude/skills/ — the Claude Code project
  // convention, so it is versioned with the code it describes and available to
  // any session opened here. From src/lib/__tests__/ that is three levels up.
  const skillPath = resolve(__dirname, '../../../.claude/skills/color-science-core/scripts/contrast.mjs')

  it('produces identical APCA and WCAG numbers to the TypeScript modules', async () => {
    type Mirror = Pick<typeof import('../color/apca'), 'apcaLc' | 'wcagRatio' | 'wcagLuminance'>
    let mod: Mirror | null = null
    try {
      mod = (await import(/* @vite-ignore */ skillPath)) as Mirror
    } catch {
      // Skill not present in this workspace — nothing to compare against.
      return
    }
    if (!mod) return

    let s = 0x7ab3c1
    const rnd = () => {
      s ^= s << 13; s >>>= 0
      s ^= s >>> 17
      s ^= s << 5; s >>>= 0
      return s / 0xffffffff
    }
    const hex = () =>
      '#' + Array.from({ length: 3 }, () =>
        Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')

    let worstApca = 0
    let worstWcag = 0
    let worstLum = 0
    for (let i = 0; i < 1000; i++) {
      const a = hex()
      const b = hex()
      worstApca = Math.max(worstApca, Math.abs(apcaLc(a, b) - mod.apcaLc(a, b)))
      worstWcag = Math.max(worstWcag, Math.abs(wcagRatio(a, b) - mod.wcagRatio(a, b)))
      worstLum = Math.max(worstLum, Math.abs(wcagLuminance(a) - mod.wcagLuminance(a)))
    }
    expect(worstApca).toBeLessThan(1e-12)
    expect(worstWcag).toBeLessThan(1e-12)
    expect(worstLum).toBeLessThan(1e-12)
  })
})

describe('4 · resolved collision — now a permanent guarantee', () => {
  // This was an `it.fails` documenting a real collision: `compositeOver` was
  // exported from BOTH `colorUtils` (2 args, alpha read from the overlay hex)
  // and `semanticArchitectures` (3 args, alpha passed separately) — same name,
  // same concept, different signatures, so importing the wrong one
  // type-errored at best and silently mis-composited at worst.
  //
  // It was fixed by DELETION rather than by renaming: the 3-arg copy belonged
  // to the Vibrancy architecture (alpha label/fill layers), and Vibrancy went
  // when every architecture but Categorical was removed. Per this repo's own
  // rule, an `it.fails` that starts passing loses the `.fails` and becomes a
  // guarantee — so a future module cannot quietly reintroduce the name.
  it('compositeOver is defined in exactly one module', () => {
    const a = src('../colorUtils.ts').includes('export function compositeOver')
    const b = src('../semanticArchitectures.ts').includes('export function compositeOver')
    expect(a).toBe(true)
    expect(b).toBe(false)
  })
})
