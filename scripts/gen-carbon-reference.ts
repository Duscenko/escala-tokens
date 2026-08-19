/**
 * `npm run gen:carbon-reference`
 *
 * Regenerates `src/lib/color/carbonReference.ts` from `@carbon/colors` and
 * `@carbon/themes`.
 *
 * Carbon, like Tailwind, has no palette generator — its scales are hand-tuned
 * IBM brand values. What Carbon DOES have that nothing else here has is the
 * **layer model**: a contextual token set where `layer`, `field` and
 * `border-subtle` resolve differently by nesting depth.
 *
 * THE IMPORTANT OUTPUT IS `CARBON_TOKENS`
 * ─────────────────────────────────────────────────────────────────────────────
 * Every core UI token, in every theme, expressed as the **palette stop IBM
 * chose** (`gray-70`, `blue-60`, `white`) rather than as a hex. That form is
 * what lets the architecture be generated instead of hand-written: the token
 * list and the per-theme stop are IBM's by construction, and the only thing
 * Escala supplies is one documented stop → ramp-tone mapping. A hand-authored
 * tone table drifts from IBM the moment IBM ships a token; this cannot.
 *
 * Three token values are not literal palette entries, and each is snapped to
 * its nearest stop with `exact: false` and IBM's literal value retained:
 *
 *   · hover values (`#e8e8e8`, `#d1d1d1`, `#474747`…) — IBM computes these off
 *     the ladder, so no stop is exactly equal
 *   · `rgba()` tokens (`textPlaceholder`, `iconDisabled`, `backgroundHover`…) —
 *     composited over that theme's `layer01`, which is what they render as
 *   · a handful of one-off hexes
 *
 * WHAT IS DELIBERATELY NOT CAPTURED
 * ─────────────────────────────────────────────────────────────────────────────
 * IBM's white theme carries 235 string tokens. 130 of them are excluded:
 *
 *   · `syntax*` (88) — a code-editor colour theme. A different product from a
 *     design system's colour layer, and Escala has no editor to theme.
 *   · `ai*` (21) and `chat*` (21) — product-surface gradients, auras and
 *     shadows. Not ramp-derivable; they are compositions, not colour roles.
 *   · `colorScheme` — the string `'light'`/`'dark'`, not a colour.
 *   · `shadow` — an elevation value. Escala models shadows as their own
 *     foundation, so importing Carbon's here would be a second source.
 *
 * That leaves **104 core UI tokens**, which is the contract this architecture
 * claims to implement. The count is asserted in `__tests__/carbon.test.ts` so
 * "we cover Carbon" stays a checkable statement.
 *
 * Output is COMMITTED so the runtime carries no dependency on either package.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as CarbonColors from '@carbon/colors'
import * as CarbonThemes from '@carbon/themes'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const ver = (pkg: string) =>
  (JSON.parse(readFileSync(resolve(root, `node_modules/${pkg}/package.json`), 'utf8')) as { version: string }).version

/** The families Carbon documents. `*Hover` variants are derived, not scales. */
const FAMILIES = [
  'blue', 'cyan', 'gray', 'coolGray', 'warmGray', 'green',
  'magenta', 'orange', 'purple', 'red', 'teal', 'yellow',
] as const

const STOPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const

/** Carbon's four themes, light to dark. */
const THEMES = ['white', 'g10', 'g90', 'g100'] as const

/**
 * The tokens that make up the layer model. `background` is depth 0 — the page
 * itself — and each of `layer`/`field`/`borderSubtle` has a variant per depth.
 * `borderSubtle` uniquely starts at 00, for elements sitting directly on the
 * page rather than inside a layer.
 */
const LAYER_TOKENS = {
  layer: ['layer01', 'layer02', 'layer03'],
  layerHover: ['layerHover01', 'layerHover02', 'layerHover03'],
  layerActive: ['layerActive01', 'layerActive02', 'layerActive03'],
  layerSelected: ['layerSelected01', 'layerSelected02', 'layerSelected03'],
  field: ['field01', 'field02', 'field03'],
  fieldHover: ['fieldHover01', 'fieldHover02', 'fieldHover03'],
  borderSubtle: ['borderSubtle00', 'borderSubtle01', 'borderSubtle02', 'borderSubtle03'],
  borderStrong: ['borderStrong01', 'borderStrong02', 'borderStrong03'],
} as const

/** Token families excluded from the core UI set — see the header for why. */
const EXCLUDED_PREFIX = /^(syntax|ai|chat)/
const EXCLUDED_EXACT = new Set(['colorScheme', 'shadow'])

const colors = CarbonColors as unknown as Record<string, Record<number, string>>
const themes = CarbonThemes as unknown as Record<string, Record<string, string>>

// ── Palette ──────────────────────────────────────────────────────────────────
const palette: Record<string, string[]> = {}
for (const family of FAMILIES) {
  const scale = colors[family]
  if (!scale) throw new Error(`gen-carbon-reference: missing family "${family}"`)
  palette[family] = STOPS.map((s) => {
    const hex = scale[s]
    if (typeof hex !== 'string') throw new Error(`gen-carbon-reference: ${family}.${s} is not a hex string`)
    return hex.toLowerCase()
  })
}

// ── Colour maths, local to the generator ─────────────────────────────────────
// Deliberately NOT imported from `src/lib/color/gamut.ts`: a generator that
// shares its conversion code with the runtime can agree with itself while both
// are wrong. Snapping to the nearest stop is a ranking, so plain OKLab distance
// on sRGB is sufficient and independent.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function oklab(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '')
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}
const dist = (a: string, b: string) => {
  const [x, y, z] = oklab(a)
  const [p, q, r] = oklab(b)
  return Math.hypot(x - p, y - q, z - r)
}

/** `rgba(…)`/`rgb(…)` composited over `base`; hex values pass through. */
function flatten(value: string, base: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/.exec(value)
  if (!m) throw new Error(`gen-carbon-reference: cannot parse "${value}"`)
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const a = m[4] === undefined ? 1 : Number(m[4])
  const bh = base.replace(/^#/, '')
  const mix = (fg: number, i: number) =>
    Math.round(parseInt(bh.slice(i, i + 2), 16) * (1 - a) + fg * a)
  const hx = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${hx(mix(r, 0))}${hx(mix(g, 2))}${hx(mix(b, 4))}`
}

/**
 * Snap candidates: every palette entry plus the two extremes.
 *
 * `coolGray` and `warmGray` are EXCLUDED. Carbon's four stock themes are built
 * on `gray`; the other two neutrals exist for custom themes. Leaving them in
 * made every off-ladder hover value (`#e8e8e8`, `#d1d1d1`) snap to `warmGray`
 * by a hair of hue — technically nearest, and a false reading of which ladder
 * IBM was walking.
 */
const SNAP_FAMILIES = FAMILIES.filter((f) => f !== 'coolGray' && f !== 'warmGray')
const CANDIDATES: { family: string; stop: number; hex: string }[] = [
  { family: 'white', stop: 0, hex: '#ffffff' },
  { family: 'black', stop: 0, hex: '#000000' },
  ...SNAP_FAMILIES.flatMap((f) => STOPS.map((s, i) => ({ family: f, stop: s, hex: palette[f][i] }))),
]

type StopRef = { family: string; stop: number; exact: boolean; raw: string }

function snap(value: string, base: string): StopRef {
  const flat = flatten(value, base)
  let best = CANDIDATES[0]
  let bestD = Infinity
  for (const c of CANDIDATES) {
    const d = dist(flat, c.hex)
    if (d < bestD) { bestD = d; best = c }
  }
  return { family: best.family, stop: best.stop, exact: bestD === 0 && flat === value.toLowerCase(), raw: value.toLowerCase() }
}

/** camelCase → kebab, with Carbon's trailing depth digits kept as `-01`. */
const kebab = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])(\d)/g, '$1-$2').toLowerCase()

// ── Themes ───────────────────────────────────────────────────────────────────
type ThemeData = { flat: Record<string, string>; layers: Record<string, string[]>; tokens: Record<string, StopRef> }
const themeData: Record<string, ThemeData> = {}

/** Theme-level tokens that are NOT depth-indexed — kept for `carbonToken()`. */
const FLAT_TOKENS = [
  'background', 'backgroundHover', 'backgroundActive', 'backgroundInverse',
  'textPrimary', 'textSecondary', 'textPlaceholder', 'textHelper',
  'textOnColor', 'textInverse', 'textDisabled', 'textError',
  'linkPrimary', 'linkSecondary', 'linkInverse', 'linkVisited',
  'iconPrimary', 'iconSecondary', 'iconOnColor', 'iconInverse', 'iconDisabled',
  'interactive', 'focus', 'focusInverse', 'highlight', 'overlay',
  'borderInteractive', 'borderInverse', 'borderDisabled',
  'supportError', 'supportSuccess', 'supportWarning', 'supportInfo',
  'supportErrorInverse', 'supportSuccessInverse', 'supportWarningInverse', 'supportInfoInverse',
] as const

let coreCount = 0
for (const name of THEMES) {
  const theme = themes[name]
  if (!theme) throw new Error(`gen-carbon-reference: missing theme "${name}"`)

  const flat: Record<string, string> = {}
  for (const token of FLAT_TOKENS) {
    const v = theme[token]
    if (typeof v === 'string') flat[token] = v.toLowerCase()
  }

  const layers: Record<string, string[]> = {}
  for (const [group, tokens] of Object.entries(LAYER_TOKENS)) {
    layers[group] = tokens.map((t) => {
      const v = theme[t]
      if (typeof v !== 'string') throw new Error(`gen-carbon-reference: ${name}.${t} missing`)
      return v.toLowerCase()
    })
  }

  // Alpha tokens are composited over layer01 — the surface they most often sit
  // on, and the one IBM's own contrast documentation measures them against.
  const base = String(theme.layer01)
  const tokens: Record<string, StopRef> = {}
  for (const key of Object.keys(theme).sort()) {
    if (typeof theme[key] !== 'string') continue
    if (EXCLUDED_PREFIX.test(key) || EXCLUDED_EXACT.has(key)) continue
    tokens[kebab(key)] = snap(theme[key], base)
  }
  if (coreCount && Object.keys(tokens).length !== coreCount) {
    throw new Error(`gen-carbon-reference: theme "${name}" has ${Object.keys(tokens).length} core tokens, expected ${coreCount}`)
  }
  coreCount = Object.keys(tokens).length

  themeData[name] = { flat, layers, tokens }
}

const q = (v: string) => `'${v}'`
const fmtRecord = (r: Record<string, string>, indent: string) =>
  Object.entries(r).map(([k, v]) => `${indent}${k}: ${q(v)},`).join('\n')

const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npm run gen:carbon-reference\`.
 *
 * IBM Carbon's palette, its four themes, and every core UI token expressed as
 * the palette stop IBM chose. Carbon's scales are hand-tuned IBM brand values —
 * there is no generator to port, the same as Tailwind.
 *
 * Sources: @carbon/colors@${ver('@carbon/colors')}, @carbon/themes@${ver('@carbon/themes')}
 */

export const CARBON_COLORS_VERSION = '${ver('@carbon/colors')}'
export const CARBON_THEMES_VERSION = '${ver('@carbon/themes')}'

/** Carbon scale stops, lightest to darkest. */
export const CARBON_STOPS = [${STOPS.join(', ')}] as const

export const CARBON_FAMILY_NAMES = [
${FAMILIES.map((f) => `  '${f}',`).join('\n')}
] as const

export const CARBON_NEUTRAL_FAMILY_NAMES = ['gray', 'coolGray', 'warmGray'] as const

/** Theme names, lightest page to darkest. */
export const CARBON_THEME_NAMES = [${THEMES.map(q).join(', ')}] as const

/** \`family → hex per stop\`, index-aligned with \`CARBON_STOPS\`. */
export const CARBON_PALETTE: Record<string, readonly string[]> = {
${Object.entries(palette).map(([f, hexes]) =>
  `  ${f}: [${hexes.map(q).join(', ')}],`).join('\n')}
}

/**
 * Depth-indexed token groups. \`borderSubtle\` has FOUR entries because depth 0
 * exists for it — an element sitting directly on the page rather than inside a
 * layer. Every other group starts at layer 01.
 */
export type CarbonLayerGroup = ${Object.keys(LAYER_TOKENS).map(q).join(' | ')}

export type CarbonTheme = {
  flat: Record<string, string>
  layers: Record<CarbonLayerGroup, readonly string[]>
}

export const CARBON_THEMES: Record<string, CarbonTheme> = {
${THEMES.map((name) => {
  const d = themeData[name]
  return `  ${name}: {
    flat: {
${fmtRecord(d.flat, '      ')}
    },
    layers: {
${Object.entries(d.layers).map(([g, v]) => `      ${g}: [${v.map(q).join(', ')}],`).join('\n')}
    },
  },`
}).join('\n')}
}

/**
 * One core UI token in one theme, as the palette position IBM picked.
 *
 * \`exact: false\` means IBM's value is NOT a literal palette entry — an
 * off-ladder hover hex, or an \`rgba()\` composited over that theme's
 * \`layer01\` — and \`family\`/\`stop\` is the nearest stop to its effective
 * colour. \`raw\` keeps IBM's literal value so the snap stays checkable.
 */
export type CarbonStopRef = {
  family: string
  stop: number
  exact: boolean
  raw: string
}

/** How many core UI tokens each theme carries. Asserted by the test suite. */
export const CARBON_CORE_TOKEN_COUNT = ${coreCount}

/**
 * \`theme → kebab token name → stop\`. THIS is what the semantic architecture
 * is generated from: the token list and the per-theme stop are IBM's, and the
 * only thing Escala adds is a stop → ramp-tone mapping.
 */
export const CARBON_TOKENS: Record<string, Record<string, CarbonStopRef>> = {
${THEMES.map((name) => `  ${name}: {
${Object.entries(themeData[name].tokens).map(([k, r]) =>
  `    '${k}': { family: '${r.family}', stop: ${r.stop}, exact: ${r.exact}, raw: '${r.raw}' },`).join('\n')}
  },`).join('\n')}
}
`

const out = resolve(root, 'src/lib/color/carbonReference.ts')
writeFileSync(out, file)
console.log(`wrote ${out}`)
console.log(`  ${FAMILIES.length} families × ${STOPS.length} stops, ${THEMES.length} themes`)
console.log(`  ${coreCount} core UI tokens per theme`)
