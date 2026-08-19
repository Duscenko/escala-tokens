import { describe, expect, it } from 'vitest'
import { Hct, SchemeTonalSpot, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
import { tonalPalette, tonalPalettes, TONAL_SCHEME } from '../semanticArchitectures'
import { wcagRatio, apcaLc } from '../color/apca'
import { hexToOklch } from '../color/gamut'

/**
 * DEFECT C2 — the Tonal architecture is real HCT now, not an OKLCH lookalike.
 *
 * The previous implementation set `L = tone / 100` in OKLCH and tapered chroma
 * with a sine. Tone is CIE `L*`, and HCT takes the maximum in-gamut chroma per
 * tone rather than any smooth curve. These tests hold the replacement to the
 * reference implementation AND to the contrast guarantees the M3 scheme makes,
 * which the fabrication could not deliver.
 */

const SEEDS = ['#7f56d9', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#6750a4']

describe('conformance against material-color-utilities', () => {
  it('reproduces SchemeTonalSpot palettes exactly', () => {
    for (const seed of SEEDS) {
      const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), false, 0)
      const ours = tonalPalettes(seed, '#dc2626')

      const expected: [string, typeof scheme.primaryPalette][] = [
        ['primary', scheme.primaryPalette],
        ['secondary', scheme.secondaryPalette],
        ['tertiary', scheme.tertiaryPalette],
        ['neutral', scheme.neutralPalette],
        ['neutral-variant', scheme.neutralVariantPalette],
      ]

      for (const [name, palette] of expected) {
        for (const tone of Object.keys(ours[name]).map(Number)) {
          expect(ours[name][tone], `${seed} ${name}.${tone}`).toBe(hexFromArgb(palette.tone(tone)))
        }
      }
    }
  })

  it('tone IS CIE L*, within HCT gamut-mapping tolerance', () => {
    // The direct statement of what C2 got wrong. `Hct.fromInt(...).tone` of the
    // colour we emit at tone T must be T. If someone reverts to `L = t/100` in
    // OKLCH, tone 40 comes back as ~33 and this fails immediately.
    const palette = tonalPalette('#7f56d9', { chroma: 36 })
    for (const t of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
      const actual = Hct.fromInt(argbFromHex(palette[t])).tone
      expect(actual, `tone ${t}`).toBeCloseTo(t, 0)
    }
  })

  it('OKLab L is NOT tone/100 — the trap, stated as a test', () => {
    // Documents WHY the old implementation was wrong, in numbers. If these ever
    // became equal, the two lightness functions would have merged and this
    // whole module could be simplified. They will not.
    const palette = tonalPalette('#7f56d9', { chroma: 36 })
    const oklabL40 = hexToOklch(palette[40]).l
    expect(oklabL40).toBeGreaterThan(0.44) // ≈ 0.48, not 0.40
    expect(Math.abs(oklabL40 - 0.4)).toBeGreaterThan(0.05)
  })

  it('chroma follows the in-gamut envelope, not a smooth curve', () => {
    // A sine taper is symmetric about tone 50 and monotonic on each side. The
    // real envelope is neither. Measuring the asymmetry is the cheapest way to
    // tell them apart without hard-coding hexes.
    const palette = tonalPalette('#dc2626', { chroma: 84 })
    const c = (t: number) => hexToOklch(palette[t]).c
    // A sine would make these two nearly equal; HCT does not.
    expect(Math.abs(c(30) - c(70))).toBeGreaterThan(0.02)
  })
})

describe('the M3 contrast guarantees actually hold', () => {
  // The whole point of tone being L*: a fixed tone DELTA buys a known contrast.
  // The fabrication silently voided this, leaving every `on-*` role unverified.
  // Only tones present in the STANDARD stop set — 6 and 98 exist solely on the
  // extended neutral scale, and asking a chromatic palette for them returns
  // undefined. The surface pairs are covered by the TONAL_SCHEME test below,
  // which reads each role from the palette it is actually assigned to.
  const PAIRS: [fg: number, bg: number][] = [
    [40, 100], // primary on on-primary (light)
    [10, 90],  // on-primary-container on primary-container (light)
    [80, 20],  // primary on on-primary (dark)
    [90, 30],  // on-primary-container on primary-container (dark)
    [10, 95],  // dark ink on a near-white container
    [90, 20],  // light ink on a dark container
  ]

  it('every documented tone pair clears WCAG AA', () => {
    for (const seed of SEEDS) {
      for (const [name, chroma] of [['primary', 36], ['secondary', 16], ['error', 84]] as const) {
        const p = tonalPalette(seed, { chroma })
        for (const [fg, bg] of PAIRS) {
          expect(wcagRatio(p[fg], p[bg]), `${seed} ${name}: tone ${fg} on ${bg}`)
            .toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('the full TONAL_SCHEME resolves with no unreadable on-* pair', () => {
    for (const seed of SEEDS) {
      const palettes = tonalPalettes(seed, '#dc2626')
      const byRole = new Map<string, string>()
      for (const e of TONAL_SCHEME) {
        byRole.set(`${e.role}:light`, palettes[e.palette][e.light])
        byRole.set(`${e.role}:dark`, palettes[e.palette][e.dark])
      }
      for (const theme of ['light', 'dark'] as const) {
        for (const e of TONAL_SCHEME) {
          if (!e.role.startsWith('on-')) continue
          const base = e.role.slice(3)
          const fg = byRole.get(`${e.role}:${theme}`)
          const bg = byRole.get(`${base}:${theme}`)
          if (!fg || !bg) continue
          expect(wcagRatio(fg, bg), `${seed} ${theme}: ${e.role} on ${base}`).toBeGreaterThanOrEqual(4.5)
          expect(Math.abs(apcaLc(fg, bg)), `${seed} ${theme}: ${e.role} on ${base} (APCA)`).toBeGreaterThanOrEqual(60)
        }
      }
    }
  })
})
