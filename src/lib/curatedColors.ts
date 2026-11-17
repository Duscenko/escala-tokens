// Curated colours — a hand-picked accent deck from two references.
//
// CREATE UI (createui.co/docs/colors) — Tailwind v4's palette, read from its
// token reference. Its model:
//   • A PAIR per accent: the 600 step in Light, the 500 step in Dark
//     (indigo `#4f39f6` / `#615fff`), so Dark is a touch brighter.
//   • A zinc neutral — a slightly cool grey, not the accent's hue.
//   • Its own severities: error red · success green · warning orange · info blue.
//   Its accents: primary (indigo) and the brand families verified (sky),
//   highlighted (fuchsia), away (yellow), plus the four status hues, which read
//   as brands too. Listed FIRST: the owner's favourites.
//
// HEROUI (heroui.com/themes) — the sixteen accents of its colour popover. Read
// from its own generated globals.css:
//   • ONE accent, the same value in Light and Dark — only the ink on top flips.
//   • Neutrals that are almost grey: chroma ≈ 0.0015 at the ACCENT's hue.
//   • Fixed, vivid severities (danger · warning · success).
//
// Escala applies both with its own rules where they differ:
//   • DARK: the reference's dark value when it is visible on the dark page and
//     carries a label (`rolePasses`, dark); otherwise the same hue re-solved for
//     the dark page (`darkTwinOf`) — HeroUI's near-black "ink" would vanish.
//   • LIGHT: the reference's light value when it passes on the light page,
//     otherwise the same hue deepened until it does (`lightAccentOf`, the
//     pairs' rule). The owner's call (CLAUDE.md, 2026-10-22): a role must be
//     visible on the page in Light too, so pale accents get deeper there.
//
// Pure: no store, no DOM.

import { hexToOklch, oklchToHex } from './color/gamut'
import { backgroundFromBase, type NeutralTint } from './colorUtils'
import { checkRoleColor, darkTwinOf, rolePasses } from './colorRoles'
import { lightAccentOf, type TwoColorPalette } from './twoColorPairs'
import type { MoodStates } from './themeMoods'

export type CuratedSource = 'createui' | 'heroui'

export interface CuratedColor {
  /** Stable id. */
  id: string
  /** A short name (English; translated at the point of display). */
  name: string
  /** The accent as the reference shows it — its Light value. */
  hex: string
  /** The reference's Dark value, when it has its own (Create UI). Absent: the
   *  same hex in both (HeroUI). */
  dark?: string
  source: CuratedSource
}

/** Each reference in its own order: Create UI's eight accents (Tailwind v4,
 *  600 Light / 500 Dark), HeroUI's sixteen. `CURATED_COLORS` deals them. */
const SOURCE_LIST: CuratedColor[] = [
  { id: 'u01', name: 'Indigo', hex: '#4f39f6', dark: '#615fff', source: 'createui' },
  { id: 'u02', name: 'Blue', hex: '#155dfc', dark: '#2b7fff', source: 'createui' },
  { id: 'u03', name: 'Ocean', hex: '#0084d1', dark: '#00a6f4', source: 'createui' },
  { id: 'u04', name: 'Green', hex: '#00a63e', dark: '#00c950', source: 'createui' },
  { id: 'u05', name: 'Gold', hex: '#d08700', dark: '#f0b100', source: 'createui' },
  { id: 'u06', name: 'Orange', hex: '#f54900', dark: '#ff6900', source: 'createui' },
  { id: 'u07', name: 'Red', hex: '#e7000b', dark: '#fb2c36', source: 'createui' },
  { id: 'u08', name: 'Fuchsia', hex: '#c800de', dark: '#e12afb', source: 'createui' },
  { id: 'c01', name: 'Pink', hex: '#f29cbb', source: 'heroui' },
  { id: 'c02', name: 'Plum', hex: '#a7729f', source: 'heroui' },
  { id: 'c03', name: 'Coral', hex: '#f25f6b', source: 'heroui' },
  { id: 'c04', name: 'Tangerine', hex: '#ff8457', source: 'heroui' },
  { id: 'c05', name: 'Sunflower', hex: '#f8d559', source: 'heroui' },
  { id: 'c06', name: 'Mint', hex: '#35e995', source: 'heroui' },
  { id: 'c07', name: 'Sky', hex: '#6dbbd9', source: 'heroui' },
  { id: 'c08', name: 'Ink', hex: '#282c34', source: 'heroui' },
  { id: 'c09', name: 'Royal blue', hex: '#2662d9', source: 'heroui' },
  { id: 'c10', name: 'Azure', hex: '#1f8fff', source: 'heroui' },
  { id: 'c11', name: 'Teal', hex: '#008080', source: 'heroui' },
  { id: 'c12', name: 'Seafoam', hex: '#79d2c4', source: 'heroui' },
  { id: 'c13', name: 'Pistachio', hex: '#99e6bf', source: 'heroui' },
  { id: 'c14', name: 'Orchid', hex: '#ad5cd6', source: 'heroui' },
  { id: 'c15', name: 'Lavender', hex: '#b38cd9', source: 'heroui' },
  { id: 'c16', name: 'Blush', hex: '#ffc2cc', source: 'heroui' },
]

/** How the deck is shown, in the Random menu AND in Suggested colours: one
 *  vivid Create UI accent, then two softer HeroUI ones, and again — so the
 *  first row already shows how different two picks can be (owner's call:
 *  nobody browses a collection to find that out). */
export const CURATED_COLORS: CuratedColor[] = (() => {
  const vivid = SOURCE_LIST.filter((c) => c.source === 'createui')
  const soft = SOURCE_LIST.filter((c) => c.source === 'heroui')
  const out: CuratedColor[] = []
  while (vivid.length || soft.length) {
    if (vivid.length) out.push(vivid.shift()!)
    out.push(...soft.splice(0, 2))
  }
  return out
})()

/** Both references keep their pages near-grey. */
export const CURATED_NEUTRAL_TINT: NeutralTint = 'subtle'
/** HeroUI: the neutral seed is the accent's hue at a trace of chroma. */
const HEROUI_NEUTRAL = { l: 0.55, c: 0.02 }
/** Create UI: zinc-500, whatever the accent. */
const CREATEUI_NEUTRAL = '#71717b'

/** Each reference's severities, Light values. HeroUI ships no info: blue. */
export const CURATED_STATES: Record<CuratedSource, MoodStates> = {
  createui: { error: '#e7000b', warning: '#f54900', success: '#00a63e', info: '#155dfc' },
  heroui: {
    error: oklchToHex(0.6532, 0.2335, 6.52),
    warning: oklchToHex(0.7819, 0.159, 53.11),
    success: oklchToHex(0.7329, 0.1941, 131.59),
    info: '#0090ff',
  },
}

/** One curated accent as a palette: the same shape the pair decks produce, so
 *  the menu and the rail apply both the same way. `accent` is the Dark value,
 *  `accentLight` the Light one. */
export function curatedPalette(color: CuratedColor): TwoColorPalette {
  const neutral = color.source === 'createui'
    ? CREATEUI_NEUTRAL
    : oklchToHex(HEROUI_NEUTRAL.l, HEROUI_NEUTRAL.c, hexToOklch(color.hex).h || 0)
  const pages = {
    light: backgroundFromBase(neutral, 'light', CURATED_NEUTRAL_TINT),
    dark: backgroundFromBase(neutral, 'dark', CURATED_NEUTRAL_TINT),
  }
  const light = color.hex.toLowerCase()
  const dark = (color.dark ?? color.hex).toLowerCase()
  const accent = rolePasses(checkRoleColor(dark, pages.dark), 'dark') ? dark : darkTwinOf(dark, pages.dark)
  return {
    accent,
    accentLight: lightAccentOf(light, pages.light),
    neutral,
    neutralTint: CURATED_NEUTRAL_TINT,
    pages,
    states: { ...CURATED_STATES[color.source] },
  }
}

// ── "Pick a curated colour" — the Random menu asks, the board's rail answers ──

export const PICK_CURATED_COLOR = 'escala:pick-curated-color'

export interface PickCuratedColorDetail { color: CuratedColor }

export function requestCuratedColor(color: CuratedColor): void {
  window.dispatchEvent(new CustomEvent<PickCuratedColorDetail>(PICK_CURATED_COLOR, { detail: { color } }))
}
