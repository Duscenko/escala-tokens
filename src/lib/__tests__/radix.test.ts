import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { generateRadixColors } from '../../../test-fixtures/upstream-generate-radix-colors'
import { generateRadixPalette } from '../color/radix'
import { RADIX_SOURCE_VERSION } from '../color/radixReference'
import { generateColorScale } from '../colorUtils'
import { hexToOklch } from '../color/gamut'

/**
 * Conformance against the ACTUAL upstream generator.
 *
 * `test-fixtures/upstream-generate-radix-colors.ts` is
 * `radix-ui/website · components/generate-radix-colors.tsx`, unmodified except
 * for the removed `"use client"` directive. It runs on `colorjs.io` +
 * `bezier-easing` + `@radix-ui/colors`, all devDependencies.
 *
 * `src/lib/color/radix.ts` ships with **zero runtime dependencies** — it reads
 * the committed OKLCH table in `radixReference.ts` and implements the bezier
 * easing, ΔE_OK and alpha solving itself. This file is what proves the two
 * agree.
 */

/**
 * colorjs shortens `#ffffff` to `#fff` when serialising. That is a formatting
 * choice, not a colour difference, and long-form is the better token value — so
 * the port emits long-form and the comparison expands upstream's shorthand.
 * The only normalisation applied anywhere in this file.
 */
const long = (hex: string) =>
  /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((c) => c + c).join('')
    : hex

const CASES: { appearance: 'light' | 'dark'; accent: string; gray: string; background: string }[] = [
  { appearance: 'light', accent: '#7f56d9', gray: '#6c737f', background: '#ffffff' },
  { appearance: 'dark', accent: '#7f56d9', gray: '#6c737f', background: '#111111' },
  { appearance: 'light', accent: '#2563eb', gray: '#8b8d98', background: '#fdfdfc' },
  { appearance: 'dark', accent: '#2563eb', gray: '#8b8d98', background: '#0c0e12' },
  // Near-neutral seed — exercises the grey-scale skip-forward branch.
  { appearance: 'light', accent: '#6c737f', gray: '#6c737f', background: '#ffffff' },
  // Pure white / black — the borrow-the-grey-tint branch.
  { appearance: 'light', accent: '#ffffff', gray: '#8b8d98', background: '#ffffff' },
  { appearance: 'dark', accent: '#000000', gray: '#8b8d98', background: '#111111' },
  // Out-of-sRGB-gamut seed.
  { appearance: 'light', accent: '#ff0055', gray: '#8b8d98', background: '#ffffff' },
  // Tinted pages, both directions.
  { appearance: 'light', accent: '#0d9488', gray: '#7c7a85', background: '#fdf8f6' },
  { appearance: 'dark', accent: '#d97706', gray: '#7c7a85', background: '#1a1614' },
  // A dark page LIGHTER than the reference's own step 1 — the ease-relaxation
  // branch, which is unreachable with a conventional near-black page.
  { appearance: 'dark', accent: '#16a34a', gray: '#8b8d98', background: '#2a2a2a' },
]

describe('Radix — conformance against the upstream generator', () => {
  for (const args of CASES) {
    const label = `${args.appearance} · accent ${args.accent} · bg ${args.background}`

    it(`matches every output field — ${label}`, () => {
      const upstream = generateRadixColors(args)
      const ours = generateRadixPalette(args)

      expect(ours.accentScale, 'accentScale').toEqual(upstream.accentScale.map(long))
      expect(ours.grayScale, 'grayScale').toEqual(upstream.grayScale.map(long))
      expect(ours.accentScaleAlpha, 'accentScaleAlpha').toEqual(upstream.accentScaleAlpha.map(long))
      expect(ours.grayScaleAlpha, 'grayScaleAlpha').toEqual(upstream.grayScaleAlpha.map(long))
      expect(ours.accentContrast, 'accentContrast').toEqual(long(upstream.accentContrast))
      expect(ours.background, 'background').toEqual(long(upstream.background))
    })
  }

  it('matches across 300 deterministic random configurations', () => {
    let s = 0x3f1c7d
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
    for (let i = 0; i < 300; i++) {
      const appearance = rnd() > 0.5 ? 'light' : 'dark'
      const args = {
        appearance: appearance as 'light' | 'dark',
        accent: hex(),
        gray: hex(),
        background: appearance === 'light'
          ? '#' + Array.from({ length: 3 }, () => (224 + Math.floor(rnd() * 32)).toString(16)).join('')
          : '#' + Array.from({ length: 3 }, () => Math.floor(rnd() * 40).toString(16).padStart(2, '0')).join(''),
      }
      const upstream = generateRadixColors(args)
      const ours = generateRadixPalette(args)
      const up = {
        accentScale: upstream.accentScale.map(long),
        accentScaleAlpha: upstream.accentScaleAlpha.map(long),
        grayScale: upstream.grayScale.map(long),
        accentContrast: long(upstream.accentContrast),
      }
      if (JSON.stringify(ours.accentScale) !== JSON.stringify(up.accentScale)) {
        mismatches.push(`${JSON.stringify(args)}\n  ours     ${ours.accentScale.join(' ')}\n  upstream ${up.accentScale.join(' ')}`)
      } else if (JSON.stringify(ours.grayScale) !== JSON.stringify(up.grayScale)) {
        mismatches.push(`${JSON.stringify(args)} (gray)\n  ours     ${ours.grayScale.join(' ')}\n  upstream ${up.grayScale.join(' ')}`)
      } else if (JSON.stringify(ours.accentScaleAlpha) !== JSON.stringify(up.accentScaleAlpha)) {
        mismatches.push(`${JSON.stringify(args)} (alpha)\n  ours     ${ours.accentScaleAlpha.join(' ')}\n  upstream ${up.accentScaleAlpha.join(' ')}`)
      } else if (ours.accentContrast !== up.accentContrast) {
        mismatches.push(`${JSON.stringify(args)} (contrast) ours ${ours.accentContrast} upstream ${up.accentContrast}`)
      }
    }
    expect(mismatches.slice(0, 3)).toEqual([])
  })
})

describe('the generated reference table is current', () => {
  it('was built from the installed @radix-ui/colors', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../../../node_modules/@radix-ui/colors/package.json'), 'utf8'),
    ) as { version: string }
    expect(RADIX_SOURCE_VERSION).toBe(pkg.version)
  })

  it('regenerating produces the committed file byte-for-byte', () => {
    // The table is generated data. If someone bumps the package without
    // re-running the generator, or hand-edits the file, this catches it — the
    // alternative is a silently stale palette that still passes every other
    // test because the upstream comparison uses the same stale package.
    const root = resolve(__dirname, '../../..')
    const path = resolve(root, 'src/lib/color/radixReference.ts')
    const before = readFileSync(path, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-radix-reference.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(path, 'utf8')).toBe(before)
  }, 60_000)
})

describe('DEFECT C1 — the port is not the OKLCH preset', () => {
  it('produces a different scale than `SPECS.radix` for the same seed', () => {
    const seed = '#7f56d9'
    const preset = generateColorScale(seed, 'radix', 0, '#ffffff', 'light')
    const real = generateRadixPalette({
      appearance: 'light', accent: seed, gray: '#6c737f', background: '#ffffff',
    }).accentScale

    // Step 9 is the seed in BOTH — that is the one thing they agree on. Every
    // other step is inherited from hand-tuned reference data in the port and
    // interpolated in the preset.
    expect(real[8].toLowerCase()).toBe(seed.toLowerCase())
    expect(preset[9].toLowerCase()).toBe(seed.toLowerCase())

    const differing = real.filter((hex, i) => hex.toLowerCase() !== preset[i + 1]?.toLowerCase())
    expect(differing.length).toBeGreaterThanOrEqual(10)
  })

  it('the reference-transposed lightness curve is not the preset\'s interpolation', () => {
    const seed = '#2563eb'
    const preset = generateColorScale(seed, 'radix', 0, '#ffffff', 'light')
    const real = generateRadixPalette({
      appearance: 'light', accent: seed, gray: '#8b8d98', background: '#ffffff',
    }).accentScale

    const maxDelta = Math.max(
      ...[2, 3, 4, 5, 6, 7, 8].map((t) =>
        Math.abs(hexToOklch(preset[t]).l - hexToOklch(real[t - 1]).l)),
    )
    // The preset front-loads BG_WEIGHTS; Radix inherits its curve from the
    // reference scale. They cannot coincide.
    expect(maxDelta).toBeGreaterThan(0.02)
  })
})
