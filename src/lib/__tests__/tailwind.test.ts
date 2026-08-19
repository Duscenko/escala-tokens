import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  tailwindFamily, tailwindFamilyOklch, deriveTailwindScale, nearestTailwindFamilies,
  TAILWIND_STOPS, TAILWIND_FAMILY_NAMES, TAILWIND_BASE_INDEX,
} from '../color/tailwind'
import { TAILWIND_SOURCE_VERSION } from '../color/tailwindReference'
import { hexToOklch, inSrgbGamut } from '../color/gamut'

/** Hue difference in degrees, shortest way round. */
const hueDelta = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

const root = resolve(__dirname, '../../..')
const themeCss = readFileSync(resolve(root, 'node_modules/tailwindcss/theme.css'), 'utf8')

describe('the palette IS Tailwind', () => {
  it('every family and stop equals the value in theme.css EXACTLY', () => {
    // Asserted on raw OKLCH, parsed independently of the generator so a bug
    // there cannot make this pass by agreeing with itself. Exactness is only
    // meaningful before the sRGB round-trip — see the next test for why.
    let checked = 0
    for (const family of TAILWIND_FAMILY_NAMES) {
      const scale = tailwindFamilyOklch(family)
      for (const stop of TAILWIND_STOPS) {
        const re = new RegExp(`--color-${family}-${stop}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+(none|[\\d.]+)\\s*\\)`)
        const m = re.exec(themeCss)
        expect(m, `--color-${family}-${stop} not found in theme.css`).toBeTruthy()

        const [, l, c, h] = m!
        expect(scale[stop].l, `${family}-${stop} L`).toBe(Number(l) / 100)
        expect(scale[stop].c, `${family}-${stop} C`).toBe(Number(c))
        expect(scale[stop].h, `${family}-${stop} H`).toBe(h === 'none' ? 0 : Number(h))
        checked++
      }
    }
    expect(checked).toBe(TAILWIND_FAMILY_NAMES.length * TAILWIND_STOPS.length)
  })

  it('a third of the palette is OUTSIDE sRGB — the hex form is lossy', () => {
    // Tailwind v4 publishes for P3 displays. `amber-400` is declared at chroma
    // 0.189, which sRGB cannot hold. This is not a defect in either system; it
    // is why `tailwindFamilyOklch` exists and why the hex assertions below are
    // bounded rather than exact.
    let outside = 0
    let total = 0
    for (const family of TAILWIND_FAMILY_NAMES) {
      const scale = tailwindFamilyOklch(family)
      for (const stop of TAILWIND_STOPS) {
        total++
        if (!inSrgbGamut(scale[stop])) outside++
      }
    }
    expect(total).toBe(286)
    expect(outside).toBeGreaterThan(80)   // measured: 95
    expect(outside / total).toBeLessThan(0.4)
  })

  it('the hex form is gamut-MAPPED, never hue-shifted', () => {
    // Chroma may only come down, and hue must survive within the tolerance CSS
    // Color 4 guarantees (one JND, which at chroma C is 0.02/C radians).
    for (const family of TAILWIND_FAMILY_NAMES) {
      const raw = tailwindFamilyOklch(family)
      const hex = tailwindFamily(family)
      for (const stop of TAILWIND_STOPS) {
        const got = hexToOklch(hex[stop])
        const want = raw[stop]
        // One JND — the tolerance CSS Color 4 gamut mapping actually promises.
        // A tighter bound would be stricter than the spec and fails on
        // legitimate output (measured worst: 0.0075 on cyan-400).
        expect(Math.abs(got.l - want.l), `${family}-${stop} L`).toBeLessThan(0.02)
        expect(got.c, `${family}-${stop} C`).toBeLessThanOrEqual(want.c + 0.005)
        if (want.c > 0.02) {
          const allowed = ((0.02 / got.c) * 180) / Math.PI
          expect(hueDelta(got.h, want.h), `${family}-${stop} H`).toBeLessThanOrEqual(allowed)
        }
      }
    }
  })

  it('covers all 26 families at 11 stops', () => {
    expect(TAILWIND_FAMILY_NAMES.length).toBe(26)
    expect(TAILWIND_STOPS).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
    expect(TAILWIND_STOPS[TAILWIND_BASE_INDEX]).toBe(500)
  })
})

describe('the generated table is current', () => {
  it('was built from the installed tailwindcss', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'node_modules/tailwindcss/package.json'), 'utf8'),
    ) as { version: string }
    expect(TAILWIND_SOURCE_VERSION).toBe(pkg.version)
  })

  it('regenerating produces the committed file byte-for-byte', () => {
    const path = resolve(root, 'src/lib/color/tailwindReference.ts')
    const before = readFileSync(path, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-tailwind-reference.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(path, 'utf8')).toBe(before)
  }, 60_000)
})

describe('derivation — and its provenance', () => {
  it('returns Tailwind VERBATIM when the seed is a Tailwind colour', () => {
    // `blue-500`. The point of the provenance field: a user who picked a
    // Tailwind colour gets Tailwind, and is told so.
    const blue500 = tailwindFamily('blue')[500]
    const d = deriveTailwindScale(blue500)
    expect(d.provenance).toBe('tailwind')
    expect(d.nearestFamily).toBe('blue')
    expect(d.scale).toEqual(tailwindFamily('blue'))
  })

  it('marks a non-Tailwind seed as escala-derived, never as Tailwind', () => {
    const d = deriveTailwindScale('#7f56d9')
    expect(d.provenance).toBe('escala-derived')
    expect(d.scale).not.toEqual(tailwindFamily(d.nearestFamily))
  })

  it('keeps Tailwind\'s hand-tuned lightness curve EXACTLY', () => {
    // This is what makes a derived ramp read as Tailwind: the L progression is
    // borrowed untouched. Only hue and chroma move. Asserted on raw OKLCH —
    // the hex round-trip would blur it by the gamut-mapping tolerance.
    for (const seed of ['#7f56d9', '#0d9488', '#ff0055']) {
      const d = deriveTailwindScale(seed)
      const family = tailwindFamilyOklch(d.nearestFamily)
      for (const stop of TAILWIND_STOPS) {
        expect(d.oklch[stop].l, `${seed} stop ${stop}`).toBe(family[stop].l)
      }
    }
  })

  it('rotates every stop onto the seed\'s hue, exactly', () => {
    for (const seed of ['#7f56d9', '#0d9488', '#d97706', '#ff0055']) {
      const d = deriveTailwindScale(seed)
      const target = hexToOklch(seed).h
      for (const stop of TAILWIND_STOPS) {
        expect(d.oklch[stop].h, `${seed} stop ${stop}`).toBe(target)
      }
    }
  })

  it('the emitted hex holds that hue within the gamut-mapping tolerance', () => {
    for (const seed of ['#7f56d9', '#0d9488', '#d97706', '#ff0055']) {
      const d = deriveTailwindScale(seed)
      const target = hexToOklch(seed).h
      for (const stop of [300, 400, 500, 600, 700]) {
        const { c, h } = hexToOklch(d.scale[stop])
        if (c < 0.02) continue // hue is meaningless here (skill rule 5)
        const allowed = ((0.02 / c) * 180) / Math.PI
        expect(hueDelta(h, target), `${seed} stop ${stop}`).toBeLessThanOrEqual(allowed)
      }
    }
  })

  it('lands the seed\'s chroma on the base stop', () => {
    for (const seed of ['#7f56d9', '#2563eb', '#16a34a']) {
      const d = deriveTailwindScale(seed)
      expect(d.oklch[500].c).toBeCloseTo(hexToOklch(seed).c, 10)
    }
  })

  it('survives an achromatic seed without dividing by zero', () => {
    const d = deriveTailwindScale('#808080')
    expect(TAILWIND_STOPS.every((s) => /^#[0-9a-f]{6}$/.test(d.scale[s]))).toBe(true)
  })

  it('demotes the near-identical neutrals when a chromatic family is closer', () => {
    // slate / gray / zinc / neutral / stone sit within a hair of each other, so
    // a runner-up neutral carries no information — same reasoning as Radix's
    // grey demotion.
    const ranked = nearestTailwindFamilies('#7f56d9', 3)
    expect(ranked[0].family).toBe('violet')
    expect(ranked.slice(0, 2).filter((r) =>
      ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(r.family)).length)
      .toBeLessThanOrEqual(1)
  })
})

describe('DEFECT C1 — this is not the OKLCH preset, and not Radix either', () => {
  it('produces 11 stops on Tailwind\'s scale numbers, not 12 Radix steps', () => {
    const d = deriveTailwindScale('#7f56d9')
    expect(Object.keys(d.scale).map(Number).sort((a, b) => a - b)).toEqual([...TAILWIND_STOPS])
  })

  it('has no notion of a page background', () => {
    // Tailwind stops are ABSOLUTE — `bg-slate-50` is the same colour in every
    // project. Radix transposes onto the page; applying that here would be
    // inventing Tailwind behaviour. The signature has no `background` argument,
    // and this asserts it stays that way.
    expect(deriveTailwindScale.length).toBe(1)
  })
})
