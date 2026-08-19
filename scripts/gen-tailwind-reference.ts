/**
 * `npm run gen:tailwind-reference`
 *
 * Regenerates `src/lib/color/tailwindReference.ts` from the installed
 * `tailwindcss` package.
 *
 * Tailwind v4 publishes its palette as OKLCH custom properties in `theme.css`,
 * so this is a parse rather than a conversion — the numbers below are Tailwind's
 * own, to the digit. That matters: the palette is HAND-TUNED, there is no
 * generator to port, and any value we computed ourselves would not be Tailwind's.
 *
 * Output is COMMITTED so the runtime carries no dependency on `tailwindcss`.
 * `__tests__/tailwind.test.ts` re-derives it and asserts the committed file is
 * current.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const css = readFileSync(resolve(root, 'node_modules/tailwindcss/theme.css'), 'utf8')
const pkg = JSON.parse(
  readFileSync(resolve(root, 'node_modules/tailwindcss/package.json'), 'utf8'),
) as { version: string }

/**
 * `--color-red-500: oklch(63.7% 0.237 25.331);`
 *
 * The hue may be the CSS keyword `none` rather than a number — Tailwind writes
 * that for achromatic stops such as `--color-mauve-50: oklch(98.5% 0 none)`,
 * where chroma is 0 and the angle is genuinely undefined. Stored as 0, matching
 * how `gamut.oklabToOklch` reports a hueless colour.
 */
const DECL = /--color-([a-z]+)-(\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+(none|[\d.]+)\s*\)/g

const families = new Map<string, Map<number, [number, number, number]>>()
for (const m of css.matchAll(DECL)) {
  const [, family, stopStr, lStr, cStr, hStr] = m
  const stop = Number(stopStr)
  if (!families.has(family)) families.set(family, new Map())
  // L is a percentage in the source; store it 0–1 like every other OKLCH value
  // in this codebase.
  families.get(family)!.set(stop, [Number(lStr) / 100, Number(cStr), hStr === 'none' ? 0 : Number(hStr)])
}

if (families.size === 0) throw new Error('gen-tailwind-reference: parsed no colours — did theme.css change format?')

// Pure black and white are declared without a scale number and are not part of
// any family ramp; the loop above already skips them.
const sorted = [...families.entries()].sort(([a], [b]) => a.localeCompare(b))
const STOPS = [...(sorted[0][1].keys())].sort((a, b) => a - b)

for (const [name, stops] of sorted) {
  const got = [...stops.keys()].sort((a, b) => a - b)
  if (got.join(',') !== STOPS.join(',')) {
    throw new Error(`gen-tailwind-reference: family "${name}" has stops ${got.join(',')}, expected ${STOPS.join(',')}`)
  }
}

const body = sorted
  .map(([name, stops]) =>
    `  ${name}: [\n${STOPS.map((s) => {
      const [l, c, h] = stops.get(s)!
      return `    [${l}, ${c}, ${h}], // ${s}`
    }).join('\n')}\n  ],`)
  .join('\n')

const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npm run gen:tailwind-reference\`.
 *
 * The Tailwind CSS palette, verbatim from \`tailwindcss/theme.css\`. Lightness is
 * converted from the source's percentage to 0–1; nothing else is touched.
 *
 * These values are HAND-TUNED by the Tailwind team. There is no algorithm to
 * port — see \`tailwind.ts\` for what that means for custom brand seeds.
 *
 * Source: tailwindcss@${pkg.version}
 */

import type { ReferenceScale } from './scaleMatch'

export const TAILWIND_SOURCE_VERSION = '${pkg.version}'

/** The stop numbers every family carries, ascending. */
export const TAILWIND_STOPS = [${STOPS.join(', ')}] as const

/** Index of the stop Tailwind treats as a family's "base" (\`bg-blue-500\`). */
export const TAILWIND_BASE_INDEX = ${STOPS.indexOf(500)}

export const TAILWIND_FAMILY_NAMES = [
${sorted.map(([n]) => `  '${n}',`).join('\n')}
] as const

export const TAILWIND_NEUTRAL_FAMILY_NAMES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
] as const

export const TAILWIND: Record<string, ReferenceScale> = {
${body}
}
`

const out = resolve(root, 'src/lib/color/tailwindReference.ts')
writeFileSync(out, file)
console.log(`wrote ${out}`)
console.log(`  ${sorted.length} families × ${STOPS.length} stops, from tailwindcss@${pkg.version}`)
