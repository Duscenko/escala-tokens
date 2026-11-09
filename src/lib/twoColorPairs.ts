// Two-colour pairs — Bold's curated deck.
//
// Bold paints the page in a colour opposite the accent. Random picks that
// pair for you; this is the list to pick it YOURSELF. Each entry is two
// colours that are known to work together (a dark page and a light accent),
// taken from the "Two color combinations" collection at 2colors.colorion.co.
// Pure black on white is left out: white has no hue to seed an accent from.
//
// ONE pair, ONE accent, both themes. DARK is the reference — it is how the
// pair is shown in the collection — and LIGHT is derived from it:
//   • DARK: the accent verbatim (tone 9 of the dark ramp), on a page in the
//     darker colour's hue. Audited: every accent clears 4.6:1 on its page.
//   • LIGHT: the SAME accent, deepened just enough to read on a light page
//     (`lightAccentOf`) — same hue, chroma held up so a pastel turns into a
//     richer version of itself instead of grey. The page is an off-white in
//     the dark page's hue.
// An earlier "Flip" swapped which colour was the accent, so Light showed a
// different brand; and Escala's generic `lightTwinOf` keeps the colour's
// RELATIVE saturation, which turned cream into grey-olive (#f0edcc → #7a7762)
// and pale pink into scarlet (#ffdfde → #e9003d). Neither is the same accent.
//
// The page is still derived (`backgroundFromBase`), never typed in: the darker
// colour seeds the neutral at `tinted`, the one tint that gives both a clearly
// coloured dark page (L 0.19, C ≤ 0.04) and an off-white light one
// (L 0.985, C ≤ 0.018). `vivid` painted the light page and every card on it.
//
// Two STRENGTHS of the same deck (`PairStrength`):
//   • `soft` (Bold) — the above: `tinted`, a calm dark page, off-white light.
//   • `rich` (Free) — `vivid`: the deep, clearly coloured dark page of the
//     collection (navy L 0.21 C 0.075 against soft's C 0.04), with cards that
//     carry the hue. The cost, stated: its light page is a coloured paper
//     (C ≤ 0.042), since one tint drives both pages.
// Severities are the canonical four (red · green · amber · blue), skipping the
// accent's own family, as a Safe spin picks them.
//
// Pure: no store, no DOM.

import { hexToOklch, maxChromaSrgb, oklchToHex } from './color/gamut'
import { backgroundFromBase, type NeutralTint } from './colorUtils'
import { checkRoleColor, rolePasses } from './colorRoles'
import { drawStates, hueOf, radixFamilyNearHue } from './radixPalettes'
import type { MoodStates } from './themeMoods'

export interface TwoColorPair {
  /** Stable id, the collection's number. */
  id: string
  /** The two colours, as the collection lists them. */
  a: string
  b: string
}

/** 29 pairs: the collection's 30, minus black on white. */
export const TWO_COLOR_PAIRS: TwoColorPair[] = [
  { id: 'p01', a: '#02343f', b: '#f0edcc' },
  { id: 'p02', a: '#331b3f', b: '#acc7b4' },
  { id: 'p03', a: '#0a174e', b: '#f5d042' },
  { id: 'p04', a: '#07553b', b: '#ced46a' },
  { id: 'p05', a: '#50586c', b: '#dce2f0' },
  { id: 'p06', a: '#815854', b: '#f9ebde' },
  { id: 'p07', a: '#1e4174', b: '#dda94b' },
  { id: 'p08', a: '#a4193d', b: '#ffdfb9' },
  { id: 'p09', a: '#1aafbc', b: '#80634c' },
  { id: 'p10', a: '#ffdfde', b: '#6a7ba2' },
  { id: 'p11', a: '#3b1877', b: '#da5a2a' },
  { id: 'p12', a: '#5f4b8b', b: '#e69a8d' },
  { id: 'p13', a: '#00203f', b: '#adefd1' },
  { id: 'p14', a: '#606060', b: '#d6ed17' },
  { id: 'p15', a: '#2c5f2d', b: '#97bc62' },
  { id: 'p16', a: '#00539c', b: '#eea47f' },
  { id: 'p17', a: '#0063b2', b: '#9cc3d5' },
  { id: 'p18', a: '#101820', b: '#fee715' },
  { id: 'p19', a: '#cbce91', b: '#d3687f' },
  { id: 'p20', a: '#b1624e', b: '#5cc8d7' },
  { id: 'p21', a: '#7b9acc', b: '#fcf6f5' },
  { id: 'p22', a: '#101820', b: '#f2aa4c' },
  { id: 'p23', a: '#a07855', b: '#d4b996' },
  { id: 'p24', a: '#195190', b: '#a2a2a1' },
  { id: 'p25', a: '#603f83', b: '#c7d3d4' },
  { id: 'p26', a: '#2bae66', b: '#fcf6f5' },
  { id: 'p27', a: '#fad0c9', b: '#6e6e6d' },
  { id: 'p28', a: '#2d2926', b: '#ed6f63' },
  { id: 'p29', a: '#daa03d', b: '#616247' },
]

/** Page (the darker colour) and accent (the lighter one) of a pair. */
export function pairRoles(pair: TwoColorPair): { page: string; accent: string } {
  const aDarker = hexToOklch(pair.a).l <= hexToOklch(pair.b).l
  return aDarker ? { page: pair.a, accent: pair.b } : { page: pair.b, accent: pair.a }
}

/** Chroma a deepened accent keeps, as a share of what sRGB allows there. */
const LIGHT_ACCENT_CHROMA = 0.6
/** Below this an accent is a grey: deepening it must not invent a hue. */
const GREY_CHROMA = 0.02

/**
 * The light-theme version of an accent chosen for a dark page: the same hue,
 * lowered in lightness until it is visible on the light page AND carries a
 * label (`rolePasses`, the rule every Light anchor meets). Chroma never drops
 * below `LIGHT_ACCENT_CHROMA` of the gamut at that lightness, so a pastel
 * becomes the saturated colour it is a tint of, not a dusty grey. An accent
 * that already passes is its own light version.
 */
export function lightAccentOf(accent: string, lightPage: string): string {
  if (rolePasses(checkRoleColor(accent, lightPage), 'light')) return accent.toLowerCase()
  const { l: l0, c: c0, h } = hexToOklch(accent)
  const hue = h || 0
  let last = accent
  for (let l = Math.min(l0, 0.9); l >= 0.25; l -= 0.005) {
    const wall = maxChromaSrgb(l, hue)
    const c = c0 < GREY_CHROMA ? c0 : Math.min(wall, Math.max(c0, wall * LIGHT_ACCENT_CHROMA))
    last = oklchToHex(l, c, hue)
    if (rolePasses(checkRoleColor(last, lightPage), 'light')) return last
  }
  return last
}

export type PairStrength = 'soft' | 'rich'

/** The neutral tint each strength reads the page colour at. */
export const PAIR_NEUTRAL_TINT: Record<PairStrength, NeutralTint> = { soft: 'tinted', rich: 'vivid' }

export interface TwoColorPalette {
  /** The accent on the dark page — the pair's own hex. */
  accent: string
  /** The same accent, adapted to the light page. */
  accentLight: string
  /** Neutral seed: the darker colour (its hue is both pages' hue). */
  neutral: string
  neutralTint: NeutralTint
  pages: { light: string; dark: string }
  states: MoodStates
}

export function pairPalette(pair: TwoColorPair, strength: PairStrength = 'soft'): TwoColorPalette {
  const { page, accent } = pairRoles(pair)
  const tint = PAIR_NEUTRAL_TINT[strength]
  const pages = {
    light: backgroundFromBase(page, 'light', tint),
    dark: backgroundFromBase(page, 'dark', tint),
  }
  return {
    accent: accent.toLowerCase(),
    accentLight: lightAccentOf(accent, pages.light),
    neutral: page,
    neutralTint: tint,
    pages,
    // Canonical severities: the pair already carries the personality.
    states: drawStates('conservative', radixFamilyNearHue(hueOf(accent)), () => 0),
  }
}

// ── "Pick a pair" — the Bold menu asks, the board that owns Random answers ──

export const PICK_TWO_COLOR_PAIR = 'escala:pick-two-color-pair'

export interface PickTwoColorPairDetail { pair: TwoColorPair; strength: PairStrength }

export function requestTwoColorPair(pair: TwoColorPair, strength: PairStrength): void {
  window.dispatchEvent(new CustomEvent<PickTwoColorPairDetail>(PICK_TWO_COLOR_PAIR, { detail: { pair, strength } }))
}
