// Radix palettes for Random — the colour half of a spin, in three levels.
//
// Radix Colors is a CURATED set: 23 accent families, each tuned by hand, and
// six greys, each paired with the accents it belongs to ("natural pairing" in
// the Radix docs: mauve for the pinks and purples, slate for the blues, sage for
// the greens, olive for grass and lime, sand for the yellows and browns). Random
// draws its seeds from that set instead of an open hue wheel, so every spin
// starts from a colour someone designed.
//
// Three levels, one shape:
//   • CONSERVATIVE — the product accents (no neon), the natural grey, the four
//     canonical severities (red · green · amber · blue), a near-neutral page,
//     mostly Light. What a design system ships by default.
//   • LIBERAL — any family, any grey (or a page tinted toward the accent),
//     severities drawn from each band, Light or Dark at even odds.
//   • BOLD — the page takes the hue OPPOSITE the accent (the Radix family
//     nearest the complement), at a vivid tint, mostly Dark. The high-impact
//     look: lime on deep violet, orange on teal.
//
// A palette is SEEDS. Every ramp, ink and contrast pair is still solved by the
// engine (`generateColorScale`, `brandSolidPair`, the role solvers), so a bold
// palette is as readable as a conservative one.
//
// Pure: no store, no DOM.

import { RADIX_LIGHT, RADIX_LIGHT_GRAY } from './color/radixReference'
import { oklchToHex, hexToOklch } from './color/gamut'
import { neutralFromBrand, type NeutralTint } from './colorUtils'
import { hueDelta, oppositeNeutralHue } from './randomAccent'
import type { MoodStates } from './themeMoods'

export type PaletteLevel = 'conservative' | 'liberal' | 'bold'
export const PALETTE_LEVELS: PaletteLevel[] = ['conservative', 'liberal', 'bold']

export type RadixGray = 'gray' | 'mauve' | 'slate' | 'sage' | 'olive' | 'sand'

/** Every Radix accent family and its natural grey (Radix docs). */
export const RADIX_NATURAL_GRAY: Record<string, RadixGray> = {
  tomato: 'mauve', red: 'mauve', ruby: 'mauve', crimson: 'mauve', pink: 'mauve',
  plum: 'mauve', purple: 'mauve', violet: 'mauve',
  iris: 'slate', indigo: 'slate', blue: 'slate', sky: 'slate', cyan: 'slate',
  mint: 'sage', teal: 'sage', jade: 'sage', green: 'sage',
  grass: 'olive', lime: 'olive',
  yellow: 'sand', amber: 'sand', orange: 'sand', brown: 'sand',
}
export const RADIX_ACCENTS = Object.keys(RADIX_NATURAL_GRAY)

/** Radix's "bright" families — designed for dark text on their solid. Fine as
 *  a statement accent, too loud for a default system. */
const BRIGHT = new Set(['sky', 'mint', 'lime', 'yellow', 'amber'])
/** The product accents a conservative spin draws from. */
const CONSERVATIVE_ACCENTS = RADIX_ACCENTS.filter((f) => !BRIGHT.has(f) && f !== 'brown')

/** Each severity's Radix families, the conventional one first. */
const STATE_FAMILIES: Record<keyof MoodStates, string[]> = {
  error: ['red', 'tomato', 'crimson', 'ruby'],
  success: ['green', 'grass', 'jade', 'teal'],
  warning: ['amber', 'orange', 'yellow'],
  info: ['blue', 'sky', 'cyan', 'indigo'],
}

type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

/** A family's solid (step 9), the colour Radix designed as its brand anchor. */
export function radixSolid(family: string): string {
  const scale = RADIX_LIGHT[family] ?? RADIX_LIGHT_GRAY[family]
  if (!scale) throw new Error(`Unknown Radix family: ${family}`)
  const [l, c, h] = scale[8]
  return oklchToHex(l, c, h)
}

/** A grey's own step 9 — its hue and its (low) chroma, as a neutral seed. */
export function radixGraySeed(gray: RadixGray): string {
  const [l, c, h] = RADIX_LIGHT_GRAY[gray][8]
  return oklchToHex(l, c, h)
}

function hueOf(hex: string): number {
  return hexToOklch(hex).h || 0
}

/** The Radix accent family whose solid sits nearest `hue`. */
export function radixFamilyNearHue(hue: number, pool: readonly string[] = RADIX_ACCENTS): string {
  let best = pool[0]
  let gap = Infinity
  for (const f of pool) {
    const d = hueDelta(hueOf(radixSolid(f)), hue)
    if (d < gap) { gap = d; best = f }
  }
  return best
}

/** The Radix family whose solid IS `hex`, if any. */
export function radixFamilyOf(hex: string | undefined): string | undefined {
  if (!hex) return undefined
  const h = hex.toLowerCase()
  return RADIX_ACCENTS.find((f) => radixSolid(f) === h)
}

export interface RadixPalette {
  level: PaletteLevel
  /** Radix family the accent is. */
  accentFamily: string
  accent: string
  /** Neutral seed (its hue is the page's hue). */
  neutral: string
  neutralTint: NeutralTint
  states: MoodStates
  appearance: 'light' | 'dark'
  /** The page sits on the far side of the wheel from the accent. */
  oppositePage: boolean
}

/** Severities: never the accent's own family. Liberal and Bold also skip a hue
 *  that reads as the accent (within 20°), so a red brand does not get a red
 *  error that looks like a second button. */
function drawStates(level: PaletteLevel, accentFamily: string, rng: Rng): MoodStates {
  const accentHue = hueOf(radixSolid(accentFamily))
  const out = {} as MoodStates
  for (const role of Object.keys(STATE_FAMILIES) as (keyof MoodStates)[]) {
    const all = STATE_FAMILIES[role]
    const clear = all.filter((f) => f !== accentFamily && hueDelta(hueOf(radixSolid(f)), accentHue) > 20)
    const pool = clear.length ? clear : all.filter((f) => f !== accentFamily)
    // Conservative keeps the canonical family unless it IS the accent: a
    // tomato brand still gets red errors, the convention people read.
    const family = level === 'conservative'
      ? all.find((f) => f !== accentFamily) ?? all[0]
      : pick(pool.length ? pool : all, rng)
    out[role] = radixSolid(family)
  }
  return out
}

/**
 * One palette at `level`. `avoid` is the accent family just shown — never dealt
 * twice in a row.
 */
export function radixPalette(level: PaletteLevel, rng: Rng = Math.random, avoid?: string): RadixPalette {
  const source = level === 'conservative' ? CONSERVATIVE_ACCENTS : RADIX_ACCENTS
  const pool = source.filter((f) => f !== avoid)
  const accentFamily = pick(pool.length ? pool : source, rng)
  const accent = radixSolid(accentFamily)
  const states = drawStates(level, accentFamily, rng)

  if (level === 'conservative') {
    return {
      level, accentFamily, accent, states,
      neutral: radixGraySeed(RADIX_NATURAL_GRAY[accentFamily]),
      neutralTint: rng() < 0.3 ? 'pure' : 'subtle',
      appearance: rng() < 0.7 ? 'light' : 'dark',
      oppositePage: false,
    }
  }

  if (level === 'liberal') {
    // Half the time the natural grey; otherwise any grey, or a page tinted
    // toward the accent itself (analogous — one hue family, calmer than bold).
    const r = rng()
    const neutral = r < 0.5
      ? radixGraySeed(RADIX_NATURAL_GRAY[accentFamily])
      : r < 0.8
        ? radixGraySeed(pick(Object.keys(RADIX_LIGHT_GRAY) as RadixGray[], rng))
        : neutralFromBrand(accent, 'tinted')
    return {
      level, accentFamily, accent, states, neutral,
      neutralTint: pick(['subtle', 'tinted', 'tinted'] as NeutralTint[], rng),
      appearance: rng() < 0.5 ? 'light' : 'dark',
      oppositePage: false,
    }
  }

  // BOLD: the page carries the complement — the Radix family nearest the
  // accent's opposite hue — at a tint strong enough for it to show.
  const neutralTint: NeutralTint = rng() < 0.6 ? 'vivid' : 'tinted'
  const opposite = radixFamilyNearHue(oppositeNeutralHue(hueOf(accent), rng), RADIX_ACCENTS.filter((f) => f !== accentFamily))
  return {
    level, accentFamily, accent, states,
    neutral: neutralFromBrand(radixSolid(opposite), neutralTint),
    neutralTint,
    appearance: rng() < 0.65 ? 'dark' : 'light',
    oppositePage: true,
  }
}

// ── The level a person chose, remembered per browser ────────────────────────

const LEVEL_KEY = 'sd-random-level'

export function readPaletteLevel(): PaletteLevel {
  try {
    const v = localStorage.getItem(LEVEL_KEY)
    if (v === 'conservative' || v === 'liberal' || v === 'bold') return v
  } catch { /* storage blocked */ }
  return 'liberal'
}

const listeners = new Set<() => void>()
let current: PaletteLevel | null = null

export function getPaletteLevel(): PaletteLevel {
  if (!current) current = readPaletteLevel()
  return current
}

export function writePaletteLevel(level: PaletteLevel): void {
  current = level
  try { localStorage.setItem(LEVEL_KEY, level) } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn())
}

/** For `useSyncExternalStore`: the rail's picker and the board's Random read
 *  one level. */
export function subscribePaletteLevel(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
