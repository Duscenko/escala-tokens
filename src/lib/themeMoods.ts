// Theme MOODS — the colour + geometry inputs Random draws from.
//
// Reported as Random feeling repetitive next to DaisyUI's theme generator
// (daisyui.com/theme-generator). Read side by side, DaisyUI's themes get their
// character from four moves Escala's Random never made:
//
//   1. The PAGE carries its own hue. Abyss is a deep teal page under a neon lime
//      primary; Synthwave a near-black indigo under hot pink. Escala's Random
//      kept the neutral linked to the accent, so the page could only ever be a
//      tint of the accent — one hue per theme, every time.
//   2. The four severities change with the theme, at one shared depth.
//      Escala's Random never touched them, so every spin kept the same red.
//   3. The three radius axes are picked independently (pill selectors beside
//      square fields is a DaisyUI signature — Abyss again).
//   4. The border sometimes goes 2px (Cupcake, Pastel) and depth is a choice.
//
// So a mood is exactly those inputs, and nothing else: an accent, a neutral
// seed WITH ITS OWN HUE, the neutral tint level, four severity seeds, the
// three radius picks, a border width and a depth flag. Every ramp, every ink
// and every contrast pair is still solved by Escala — a mood is a seed, never
// a hex that ships as-is.
//
// Two sources, one shape:
//   • CURATED — DaisyUI v5's built-in themes (MIT), their OKLCH values copied
//     to the digit from `daisyui/theme/object.js` and mapped onto Escala's
//     inputs by `moodFromSpec`. Near-black or white primaries (lofi, black,
//     luxury, silk, caramellatte) and the all-grey wireframe are left out: a
//     single-accent system has nothing to solve a brand ramp from there.
//   • PROCEDURAL — DaisyUI's own randomiser (`themeGeneratorRandomizer.js`),
//     ported onto the Tailwind palette Escala already ships (`color/tailwind`).
//
// Kept DOM-free and store-free: `themePresets` builds System Styles from these
// moods, and `randomTheme` builds the Random recipe from them.

import { RADIUS_GROUP_STEPS, type RadiusGroupStep } from './layoutTokens'
import { NEUTRAL_TINTS, type NeutralTint } from './colorUtils'
import { hexToOklch, oklchToHex } from './color/gamut'
import { tailwindFamilyOklch } from './color/tailwind'
import type { MotionPresetKey } from './motion'

type Oklch = readonly [l: number, c: number, h: number]

/** One DaisyUI theme (or one procedural draw), in DaisyUI's own vocabulary. */
export interface MoodSpec {
  scheme: 'light' | 'dark'
  /** `--color-base-100` — the page. */
  base: Oklch
  /** `--color-neutral` — the dark chip colour; carries the neutral's hue
   *  when the page itself is achromatic. */
  neutral: Oklch
  primary: Oklch
  info: Oklch
  success: Oklch
  warning: Oklch
  error: Oklch
  /** `--radius-selector / -field / -box`, already on Escala's ladder:
   *  0 · 0.25 · 0.5 · 1 · 2rem = none · sm · lg · 2xl · 4xl (0/4/8/16/32px). */
  radius: { selectors: RadiusGroupStep; fields: RadiusGroupStep; boxes: RadiusGroupStep }
  /** `--border`, px. */
  border: number
  /** `--depth`. */
  depth: 0 | 1
  /** Escala's addition: how the mood moves. Curated moods take theirs from
   *  `CURATED_MOOD_MOTION`; a procedural draw carries its own. */
  motion?: MotionPresetKey
}

export interface MoodStates {
  error: string
  warning: string
  success: string
  info: string
}

/** A mood in Escala's own inputs — what Random and the System Styles consume. */
export interface ThemeMood {
  id: string
  appearance: 'light' | 'dark'
  accent: string
  /** Neutral seed hex. Its HUE is the page's hue — independent of the accent. */
  neutral: string
  neutralTint: NeutralTint
  states: MoodStates
  radius: { boxes: RadiusGroupStep; fields: RadiusGroupStep; selectors: RadiusGroupStep }
  /** `stroke.sm` in px — every control and divider. */
  border: number
  depth: 0 | 1
  /** The motion preset (lib/motion.ts) the mood moves with. */
  motion: MotionPresetKey
}

/** DaisyUI v5.0.43 built-in themes, verbatim. */
export const DAISY_MOOD_SPECS: Record<string, MoodSpec> = {
  forest: { scheme: 'dark', base: [0.2084, 0.008, 17.911], neutral: [0.307, 0.039, 171.364], primary: [0.6863, 0.185, 148.958], info: [0.7206, 0.191, 231.6], success: [0.648, 0.15, 160], warning: [0.8471, 0.199, 83.87], error: [0.7176, 0.221, 22.18], radius: { selectors: '2xl', fields: '4xl', boxes: '2xl' }, border: 1, depth: 0 },
  cyberpunk: { scheme: 'light', base: [0.9451, 0.179, 104.32], neutral: [0.2304, 0.065, 269.31], primary: [0.7422, 0.209, 6.35], info: [0.7206, 0.191, 231.6], success: [0.648, 0.15, 160], warning: [0.8471, 0.199, 83.87], error: [0.7176, 0.221, 22.18], radius: { selectors: 'none', fields: 'none', boxes: 'none' }, border: 1, depth: 0 },
  cupcake: { scheme: 'light', base: [0.9779, 0.004, 56.375], neutral: [0.27, 0.006, 286.033], primary: [0.85, 0.138, 181.071], info: [0.68, 0.169, 237.323], success: [0.69, 0.17, 162.48], warning: [0.79, 0.184, 86.047], error: [0.64, 0.246, 16.439], radius: { selectors: '2xl', fields: '4xl', boxes: '2xl' }, border: 2, depth: 1 },
  fantasy: { scheme: 'light', base: [1, 0, 0], neutral: [0.2781, 0.029, 256.847], primary: [0.3745, 0.189, 325.02], info: [0.7206, 0.191, 231.6], success: [0.648, 0.15, 160], warning: [0.8471, 0.199, 83.87], error: [0.7176, 0.221, 22.18], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 1 },
  cmyk: { scheme: 'light', base: [1, 0, 0], neutral: [0.2178, 0, 0], primary: [0.7177, 0.133, 239.443], info: [0.6847, 0.094, 217.284], success: [0.4695, 0.162, 321.406], warning: [0.7124, 0.159, 52.023], error: [0.6201, 0.208, 28.717], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  emerald: { scheme: 'light', base: [1, 0, 0], neutral: [0.3552, 0.032, 262.988], primary: [0.7666, 0.135, 153.45], info: [0.7206, 0.191, 231.6], success: [0.648, 0.15, 160], warning: [0.8471, 0.199, 83.87], error: [0.7176, 0.221, 22.18], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  nord: { scheme: 'light', base: [0.9513, 0.007, 260.731], neutral: [0.4523, 0.035, 264.131], primary: [0.5944, 0.077, 254.027], info: [0.6921, 0.062, 332.664], success: [0.7683, 0.074, 131.063], warning: [0.8549, 0.089, 84.093], error: [0.6061, 0.12, 15.341], radius: { selectors: '2xl', fields: 'sm', boxes: 'lg' }, border: 1, depth: 0 },
  halloween: { scheme: 'dark', base: [0.21, 0.006, 56.043], neutral: [0.2437, 0.046, 65.681], primary: [0.7748, 0.204, 60.62], info: [0.5462, 0.215, 262.88], success: [0.627, 0.169, 149.213], warning: [0.6658, 0.157, 58.318], error: [0.6572, 0.199, 27.33], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 1 },
  night: { scheme: 'dark', base: [0.2077, 0.039, 265.754], neutral: [0.2795, 0.036, 260.03], primary: [0.7535, 0.138, 232.661], info: [0.6845, 0.148, 237.251], success: [0.7845, 0.132, 181.911], warning: [0.8324, 0.139, 82.95], error: [0.7178, 0.17, 13.118], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  coffee: { scheme: 'dark', base: [0.24, 0.023, 329.708], neutral: [0.1651, 0.015, 326.261], primary: [0.72, 0.123, 62.756], info: [0.7949, 0.063, 184.558], success: [0.7472, 0.072, 131.116], warning: [0.8815, 0.14, 87.722], error: [0.7732, 0.128, 31.871], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  winter: { scheme: 'light', base: [1, 0, 0], neutral: [0.1962, 0.063, 257.651], primary: [0.5686, 0.255, 257.57], info: [0.8813, 0.085, 214.515], success: [0.8049, 0.077, 197.823], warning: [0.8917, 0.045, 71.47], error: [0.7309, 0.11, 20.076], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  light: { scheme: 'light', base: [1, 0, 0], neutral: [0.14, 0.005, 285.823], primary: [0.45, 0.24, 277.023], info: [0.74, 0.16, 232.661], success: [0.76, 0.177, 163.223], warning: [0.82, 0.189, 84.429], error: [0.71, 0.194, 13.428], radius: { selectors: 'lg', fields: 'sm', boxes: 'lg' }, border: 1, depth: 1 },
  valentine: { scheme: 'light', base: [0.97, 0.014, 343.198], neutral: [0.4, 0.153, 2.432], primary: [0.65, 0.241, 354.308], info: [0.86, 0.127, 207.078], success: [0.84, 0.143, 164.978], warning: [0.75, 0.183, 55.934], error: [0.63, 0.237, 25.331], radius: { selectors: '2xl', fields: '4xl', boxes: '2xl' }, border: 1, depth: 0 },
  lemonade: { scheme: 'light', base: [0.9871, 0.02, 123.72], neutral: [0.3098, 0.075, 108.6], primary: [0.5892, 0.199, 134.6], info: [0.8619, 0.047, 224.14], success: [0.8619, 0.047, 157.85], warning: [0.8619, 0.047, 102.15], error: [0.8619, 0.047, 25.85], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  retro: { scheme: 'light', base: [0.9164, 0.034, 90.515], neutral: [0.44, 0.011, 73.639], primary: [0.8, 0.114, 19.571], info: [0.58, 0.158, 241.966], success: [0.51, 0.096, 186.391], warning: [0.64, 0.222, 41.116], error: [0.7, 0.191, 22.216], radius: { selectors: 'sm', fields: 'sm', boxes: 'lg' }, border: 1, depth: 0 },
  aqua: { scheme: 'dark', base: [0.37, 0.146, 265.522], neutral: [0.27, 0.146, 265.522], primary: [0.8566, 0.144, 198.645], info: [0.5462, 0.215, 262.88], success: [0.627, 0.169, 149.213], warning: [0.6658, 0.157, 58.318], error: [0.7395, 0.19, 27.33], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 1 },
  dark: { scheme: 'dark', base: [0.2533, 0.016, 252.42], neutral: [0.14, 0.005, 285.823], primary: [0.58, 0.233, 277.117], info: [0.74, 0.16, 232.661], success: [0.76, 0.177, 163.223], warning: [0.82, 0.189, 84.429], error: [0.71, 0.194, 13.428], radius: { selectors: 'lg', fields: 'sm', boxes: 'lg' }, border: 1, depth: 1 },
  dim: { scheme: 'dark', base: [0.3086, 0.023, 264.149], neutral: [0.2473, 0.02, 264.094], primary: [0.8613, 0.141, 139.549], info: [0.8608, 0.142, 206.182], success: [0.8617, 0.142, 166.534], warning: [0.8616, 0.142, 94.818], error: [0.8242, 0.099, 33.756], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  dracula: { scheme: 'dark', base: [0.2882, 0.022, 277.508], neutral: [0.3945, 0.032, 275.524], primary: [0.7546, 0.183, 346.812], info: [0.8826, 0.093, 212.846], success: [0.871, 0.219, 148.024], warning: [0.9553, 0.134, 112.757], error: [0.6822, 0.206, 24.43], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  corporate: { scheme: 'light', base: [1, 0, 0], neutral: [0, 0, 0], primary: [0.58, 0.158, 241.966], info: [0.6, 0.126, 221.723], success: [0.62, 0.194, 149.214], warning: [0.85, 0.199, 91.936], error: [0.7, 0.191, 22.216], radius: { selectors: 'sm', fields: 'sm', boxes: 'sm' }, border: 1, depth: 0 },
  bumblebee: { scheme: 'light', base: [1, 0, 0], neutral: [0.37, 0.01, 67.558], primary: [0.85, 0.199, 91.936], info: [0.74, 0.16, 232.661], success: [0.76, 0.177, 163.223], warning: [0.82, 0.189, 84.429], error: [0.7, 0.191, 22.216], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 1 },
  business: { scheme: 'dark', base: [0.2435, 0, 0], neutral: [0.2744, 0.013, 253.041], primary: [0.417, 0.099, 251.473], info: [0.6262, 0.143, 240.033], success: [0.7023, 0.094, 156.596], warning: [0.7748, 0.115, 81.519], error: [0.5161, 0.146, 29.674], radius: { selectors: 'none', fields: 'sm', boxes: 'sm' }, border: 1, depth: 0 },
  acid: { scheme: 'light', base: [0.98, 0, 0], neutral: [0.2131, 0.128, 278.68], primary: [0.719, 0.357, 330.759], info: [0.6072, 0.227, 252.05], success: [0.8572, 0.266, 158.53], warning: [0.9101, 0.212, 100.5], error: [0.6484, 0.293, 29.349], radius: { selectors: '2xl', fields: '2xl', boxes: '2xl' }, border: 1, depth: 1 },
  sunset: { scheme: 'dark', base: [0.22, 0.019, 237.69], neutral: [0.26, 0.019, 237.69], primary: [0.747, 0.158, 39.947], info: [0.8556, 0.085, 206.015], success: [0.8556, 0.085, 144.778], warning: [0.8557, 0.084, 74.427], error: [0.8551, 0.078, 16.886], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  garden: { scheme: 'light', base: [0.9295, 0.002, 17.197], neutral: [0.2416, 0.049, 89.07], primary: [0.6245, 0.278, 3.836], info: [0.7206, 0.191, 231.6], success: [0.648, 0.15, 160], warning: [0.8471, 0.199, 83.87], error: [0.7176, 0.221, 22.18], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  autumn: { scheme: 'light', base: [0.9581, 0, 0], neutral: [0.5437, 0.037, 51.902], primary: [0.4072, 0.161, 17.53], info: [0.6922, 0.097, 207.284], success: [0.6099, 0.08, 174.616], warning: [0.7008, 0.164, 56.844], error: [0.5307, 0.241, 24.16], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 1 },
  pastel: { scheme: 'light', base: [1, 0, 0], neutral: [0.55, 0.046, 257.417], primary: [0.9, 0.063, 306.703], info: [0.86, 0.127, 207.078], success: [0.87, 0.15, 154.449], warning: [0.83, 0.128, 66.29], error: [0.8, 0.114, 19.571], radius: { selectors: '2xl', fields: '4xl', boxes: '2xl' }, border: 2, depth: 0 },
  synthwave: { scheme: 'dark', base: [0.15, 0.09, 281.288], neutral: [0.45, 0.24, 277.023], primary: [0.71, 0.202, 349.761], info: [0.74, 0.16, 232.661], success: [0.77, 0.152, 181.912], warning: [0.9, 0.182, 98.111], error: [0.737, 0.121, 32.639], radius: { selectors: '2xl', fields: 'lg', boxes: '2xl' }, border: 1, depth: 0 },
  abyss: { scheme: 'dark', base: [0.2, 0.08, 209], neutral: [0.3, 0.08, 209], primary: [0.92, 0.2653, 125], info: [0.74, 0.16, 232.661], success: [0.79, 0.209, 151.711], warning: [0.848, 0.1962, 84.62], error: [0.65, 0.1985, 24.22], radius: { selectors: '4xl', fields: 'sm', boxes: 'lg' }, border: 1, depth: 1 },
}

// ── Mapping a spec onto Escala's inputs ─────────────────────────────────────

/**
 * Where each severity's hue is allowed to sit (OKLCH degrees). The hue IS the
 * semantics — a magenta "success" (DaisyUI's cmyk) or a pink "info" (nord)
 * stops reading as its severity — so a seed outside its band falls back to
 * the conventional one. Bands are generous: amber and orange are both
 * warnings, teal is a success, sky and indigo are both info.
 */
const SEVERITY_HUES: Record<keyof MoodStates, readonly (readonly [number, number])[]> = {
  error: [[0, 45], [340, 360]],
  warning: [[40, 112]],
  success: [[118, 200]],
  info: [[195, 290]],
}

/** Core's conventional severities — the fallback for an off-band seed. */
const FALLBACK_STATES: MoodStates = {
  error: '#d92d20',
  warning: '#dc6803',
  success: '#079455',
  info: '#1570ef',
}

const hexOf = ([l, c, h]: Oklch) => oklchToHex(l, c, h)

/** Checked on the colour that SHIPS — after gamut mapping, which can move a
 *  hue: DaisyUI retro's warning is declared at 41° and lands on `#f34700` at
 *  37°, an orange that reads as an error beside it. */
function stateOf(role: keyof MoodStates, value: Oklch): string {
  const hex = hexOf(value)
  const { c, h: raw } = hexToOklch(hex)
  const h = ((raw % 360) + 360) % 360
  const inBand = SEVERITY_HUES[role].some(([lo, hi]) => h >= lo && h <= hi)
  return c > 0.02 && inBand ? hex : FALLBACK_STATES[role]
}

/**
 * The neutral TINT whose page chroma ceiling first covers the spec's page —
 * so a white DaisyUI page stays `pure`, a cream one lands `subtle`, Nord's
 * cool paper `tinted`, and Abyss / Synthwave `vivid`. Escala's ceiling is
 * tinted PAPER (see NEUTRAL_TINTS), so a page louder than that — Cyberpunk's
 * yellow, Aqua's mid-blue — is honestly clamped to `vivid`, not faked.
 */
function tintFor(base: Oklch, appearance: 'light' | 'dark'): NeutralTint {
  if (base[1] < 0.003) return 'pure'
  for (const spec of NEUTRAL_TINTS) {
    if (spec.key === 'pure') continue
    if (spec[appearance].cap >= base[1]) return spec.key
  }
  return 'vivid'
}

/**
 * Neutral seed whose page — through `backgroundFromBase` — reads as the spec's
 * own page. The page is `min(seedChroma × mul, cap)` at the tint's fixed
 * lightness, so the seed carries the page's chroma divided back through the
 * tint's multiplier, at the page's HUE. When the page has no hue of its own
 * (white paper), the hue comes from DaisyUI's `neutral` chip, which is how
 * Winter or Fantasy keep their cool slate greys on a white page.
 */
function neutralSeedFor(spec: MoodSpec, tint: NeutralTint): string {
  const appearance = spec.scheme
  const { mul } = NEUTRAL_TINTS.find((t) => t.key === tint)![appearance]
  const hue = spec.base[1] > 0.004 ? spec.base[2] : (spec.neutral[1] > 0.008 ? spec.neutral[2] : spec.base[2])
  const chroma = Math.min(0.14, Math.max(spec.neutral[1], mul ? spec.base[1] / mul : 0, 0.004))
  return oklchToHex(0.52, chroma, hue)
}

export function moodFromSpec(id: string, spec: MoodSpec): ThemeMood {
  const tint = tintFor(spec.base, spec.scheme)
  return {
    id,
    appearance: spec.scheme,
    accent: hexOf(spec.primary),
    neutral: neutralSeedFor(spec, tint),
    neutralTint: tint,
    states: {
      error: stateOf('error', spec.error),
      warning: stateOf('warning', spec.warning),
      success: stateOf('success', spec.success),
      info: stateOf('info', spec.info),
    },
    radius: { ...spec.radius },
    border: spec.border,
    depth: spec.depth,
    motion: spec.motion ?? CURATED_MOOD_MOTION[id] ?? 'standard',
  }
}

/** Each DaisyUI built-in's motion, by its character (the six that are also
 *  System Styles match that style's pick). DaisyUI has no motion: Escala's call. */
export const CURATED_MOOD_MOTION: Record<string, MotionPresetKey> = {
  forest: 'calm', cyberpunk: 'snappy', cupcake: 'playful', fantasy: 'playful', cmyk: 'snappy',
  emerald: 'standard', nord: 'standard', halloween: 'expressive', night: 'standard', coffee: 'calm',
  winter: 'standard', light: 'standard', valentine: 'playful', lemonade: 'playful', retro: 'snappy',
  aqua: 'expressive', dark: 'standard', dim: 'calm', dracula: 'expressive', corporate: 'snappy',
  bumblebee: 'playful', business: 'snappy', acid: 'expressive', sunset: 'expressive', garden: 'calm',
  autumn: 'calm', pastel: 'playful', synthwave: 'expressive', abyss: 'expressive',
}

/** Standard 40 %, each of the other four 15 % — the plan's procedural draw. */
export function drawMotionPreset(rng: Rng = Math.random): MotionPresetKey {
  const r = rng()
  if (r < 0.4) return 'standard'
  const others: MotionPresetKey[] = ['snappy', 'expressive', 'playful', 'calm']
  return others[Math.min(3, Math.floor((r - 0.4) / 0.15))]
}

export const CURATED_MOODS: ThemeMood[] = Object.entries(DAISY_MOOD_SPECS)
  .map(([id, spec]) => moodFromSpec(id, spec))

export function curatedMood(id: string): ThemeMood | undefined {
  return CURATED_MOODS.find((mood) => mood.id === id)
}

// ── Procedural: DaisyUI's randomiser, on the Tailwind palette ───────────────

type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

const BASE_GRAYS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const
const BASE_HUES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const

/** DaisyUI's brand weights, minus `black` and the greys: a single-accent
 *  system needs a hue to build its brand ramp from. */
const BRAND_WEIGHTS: Record<string, number> = {
  amber: 3, blue: 4, cyan: 2, emerald: 3, fuchsia: 1, green: 3, indigo: 4,
  lime: 3, orange: 3, pink: 3, purple: 3, red: 3, rose: 1, sky: 2, teal: 3,
  violet: 3, yellow: 3,
}
const BRAND_POOL = Object.entries(BRAND_WEIGHTS).flatMap(([name, w]) => Array<string>(w).fill(name))

/** Mostly 1px, sometimes heavier — DaisyUI's own weighting. */
const BORDER_POOL = [1, 1, 1, 1, 1, 1, 1, 1, 1.5, 2] as const

function tw(name: string, stop: number): Oklch {
  const { l, c, h } = tailwindFamilyOklch(name)[stop]
  return [l, c, Number.isNaN(h) ? 0 : h]
}

/**
 * One draw of DaisyUI's `randomizeThemeColors`: light or dark at even odds; a
 * grey page 70% of the time and a COLOURED one (that family's 50 in light,
 * 950 in dark) 30%; the four severities on ONE shared shade, each from its own
 * family set; the brand from the weighted pool at a 300–600 shade; the three
 * radius axes independently. Same output shape as a curated mood.
 */
export function proceduralMoodSpec(rng: Rng = Math.random): MoodSpec {
  const scheme = rng() > 0.5 ? 'dark' : 'light'
  const baseFamily = rng() < 0.3 ? pick(BASE_HUES, rng) : pick(BASE_GRAYS, rng)
  const stateShade = pick([400, 500, 600] as const, rng)
  const brandShade = pick([300, 400, 500, 600] as const, rng)
  return {
    scheme,
    base: tw(baseFamily, scheme === 'dark' ? 950 : 50),
    neutral: tw(baseFamily, pick([600, 700, 800, 900, 950] as const, rng)),
    primary: tw(pick(BRAND_POOL, rng), brandShade),
    info: tw(pick(['cyan', 'sky', 'blue'], rng), stateShade),
    success: tw(pick(['lime', 'green', 'emerald', 'teal'], rng), stateShade),
    warning: tw(pick(['yellow', 'amber', 'orange'], rng), stateShade),
    error: tw(pick(['red', 'pink', 'rose'], rng), stateShade),
    radius: {
      selectors: pick(RADIUS_GROUP_STEPS, rng),
      fields: pick(RADIUS_GROUP_STEPS, rng),
      boxes: pick(RADIUS_GROUP_STEPS, rng),
    },
    border: pick(BORDER_POOL, rng),
    depth: rng() < 0.5 ? 0 : 1,
    // Drawn last, so every earlier draw lands where it always did.
    motion: drawMotionPreset(rng),
  }
}

export const PROCEDURAL_MOOD_ID = 'procedural'

/** Share of Random spins drawn from the curated set; the rest are procedural. */
export const CURATED_SHARE = 0.75

/**
 * The mood for one Random spin. Mostly curated (DaisyUI's built-ins are the
 * part people call "very nice"), sometimes a fresh procedural draw so the set
 * never feels finite. `avoid` is the last mood id, never repeated twice in a
 * row.
 */
export function pickMood(rng: Rng = Math.random, avoid?: string): ThemeMood {
  if (rng() < CURATED_SHARE) {
    const pool = CURATED_MOODS.filter((mood) => mood.id !== avoid)
    return pick(pool.length ? pool : CURATED_MOODS, rng)
  }
  return moodFromSpec(PROCEDURAL_MOOD_ID, proceduralMoodSpec(rng))
}
