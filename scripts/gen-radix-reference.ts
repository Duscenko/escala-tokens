/**
 * `npx tsx scripts/gen-radix-reference.ts`
 *
 * Regenerates `src/lib/color/radixReference.ts` — the 36 reference scales the
 * Radix generator transposes onto a seed, precomputed to OKLCH.
 *
 * Run this only when bumping `@radix-ui/colors`. The output is COMMITTED so the
 * runtime carries no dependency on that package: it needs the numbers, not the
 * library. `__tests__/radix.test.ts` re-derives them and asserts the committed
 * file is current, so a stale table cannot go unnoticed.
 *
 * Radix's own generator reads the **P3** variants (`${scale}P3`, `${scale}DarkP3`),
 * not the sRGB ones — so this converts from display-p3, which needs different
 * primaries than sRGB on the way to XYZ.
 */

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as RadixColors from '@radix-ui/colors'
// The XYZ→OKLab constants live in ONE place — see the no-duplication rule.
import { xyzToOklab } from '../src/lib/color/gamut'

const GRAY_SCALES = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand'] as const
const SCALES = [
  ...GRAY_SCALES,
  'tomato', 'red', 'ruby', 'crimson', 'pink', 'plum', 'purple', 'violet',
  'iris', 'indigo', 'blue', 'cyan', 'teal', 'jade', 'green', 'grass',
  'brown', 'orange', 'sky', 'mint', 'lime', 'yellow', 'amber',
] as const

/** `color(display-p3 r g b)` → the three gamma-encoded channels. */
function parseP3(str: string): [number, number, number] {
  const m = /color\(display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(str.trim())
  if (!m) throw new Error(`not a display-p3 color: "${str}"`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

// Display-P3 shares sRGB's transfer function; only the primaries differ.
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/** Linear display-p3 → CIE XYZ (D65). */
function p3ToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    0.4865709486482162 * r + 0.26566769316909306 * g + 0.1982172852343625 * b,
    0.2289745640697488 * r + 0.6917385218365064 * g + 0.079286914093745 * b,
    0.0 * r + 0.04511338185890264 * g + 1.043944368900976 * b,
  ]
}

function p3ToOklch(str: string): [number, number, number] {
  const [r, g, b] = parseP3(str).map(toLinear) as [number, number, number]
  const { l: L, a, b: bb } = xyzToOklab(p3ToXyz(r, g, b))
  const c = Math.hypot(a, bb)
  const h = c < 1e-7 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  // FULL precision, deliberately. Rounding to 6 decimals shifts an 8-bit
  // channel at the boundary: measured `#120f1b` where upstream emits `#120f1c`.
  // The file is bigger; the output is exact.
  return [L, c, h]
}

function build(names: readonly string[], suffix: 'P3' | 'DarkP3') {
  const out: Record<string, [number, number, number][]> = {}
  for (const name of names) {
    const key = `${name}${suffix}` as keyof typeof RadixColors
    const scale = RadixColors[key] as Record<string, string> | undefined
    if (!scale) throw new Error(`missing @radix-ui/colors export: ${String(key)}`)
    out[name] = Object.values(scale).map(p3ToOklch)
  }
  return out
}

const data = {
  light: build(SCALES, 'P3'),
  dark: build(SCALES, 'DarkP3'),
  lightGray: build(GRAY_SCALES, 'P3'),
  darkGray: build(GRAY_SCALES, 'DarkP3'),
}

const pkgVersion = (
  JSON.parse(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (await import('node:fs')).readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/@radix-ui/colors/package.json'),
      'utf8',
    ),
  ) as { version: string }
).version

const fmt = (scales: Record<string, [number, number, number][]>) =>
  Object.entries(scales)
    .map(([name, steps]) =>
      `  ${name}: [\n${steps.map(([l, c, h]) => `    [${l}, ${c}, ${h}],`).join('\n')}\n  ],`)
    .join('\n')

const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npx tsx scripts/gen-radix-reference.ts\`.
 *
 * The Radix Colors reference scales, converted from their **display-p3**
 * definitions to OKLCH \`[L, C, H]\`. Radix's own generator reads the P3
 * variants, so these are the numbers its nearest-scale search actually runs
 * against; using the sRGB variants would give subtly different neighbours.
 *
 * Source: @radix-ui/colors@${pkgVersion}
 */

export type OklchTriple = readonly [l: number, c: number, h: number]
export type ReferenceScale = readonly OklchTriple[]

export const RADIX_SOURCE_VERSION = '${pkgVersion}'

export const RADIX_GRAY_SCALE_NAMES = [
${GRAY_SCALES.map((n) => `  '${n}',`).join('\n')}
] as const

export const RADIX_LIGHT: Record<string, ReferenceScale> = {
${fmt(data.light)}
}

export const RADIX_DARK: Record<string, ReferenceScale> = {
${fmt(data.dark)}
}

export const RADIX_LIGHT_GRAY: Record<string, ReferenceScale> = {
${fmt(data.lightGray)}
}

export const RADIX_DARK_GRAY: Record<string, ReferenceScale> = {
${fmt(data.darkGray)}
}
`

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/color/radixReference.ts')
writeFileSync(out, file)
console.log(`wrote ${out}`)
console.log(`  ${SCALES.length} scales × 12 steps × light/dark, from @radix-ui/colors@${pkgVersion}`)
