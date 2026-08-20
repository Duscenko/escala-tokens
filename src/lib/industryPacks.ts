// Industry accent packs — four curated brand hexes per field, drawn only from
// `PRESET_GROUPS` so a pick here is the same colour you'd get from the palette
// dropdown. Detection maps the current accent onto a field via exact hero
// match, then mean ΔE among packs that contain the hex, then nearest accent.

import chroma from 'chroma-js'
import { BRAND_PRESETS, BRAND_SPECTRUM } from './brandPalette'

export const INDUSTRY_IDS = [
  'food', 'fashion', 'hospitality', 'luxury',
  'business', 'tech', 'education', 'energy',
  'health', 'nature', 'recreation', 'art',
] as const
export type IndustryId = (typeof INDUSTRY_IDS)[number]

export const INDUSTRY_GROUP_ORDER = ['market', 'work', 'life'] as const
export type IndustryGroupId = (typeof INDUSTRY_GROUP_ORDER)[number]

export const INDUSTRY_GROUP_LABEL: Record<IndustryGroupId, string> = {
  market: 'Market',
  work: 'Work',
  life: 'Life',
}

export interface IndustryAccent {
  label: string
  hex: string
}

export interface IndustryPack {
  id: IndustryId
  label: string
  group: IndustryGroupId
  /** One line. Colour-theory reason this field sits in these hues. */
  theory: string
  /** `accents[0]` is the hero — unique across packs, used to detect the field. */
  accents: [IndustryAccent, IndustryAccent, IndustryAccent, IndustryAccent]
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: 'food',
    label: 'Food',
    group: 'market',
    theory: 'Appetite sits in warm fruit hues — orange, citrus, berry, leaf.',
    accents: [
      { label: 'Orange', hex: '#ef6820' },
      { label: 'Yellow', hex: '#eaaa08' },
      { label: 'Rosé',   hex: '#f63d68' },
      { label: 'Green',  hex: '#16b364' },
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion',
    group: 'market',
    theory: 'Cosmetic chroma — pink, berry, fuchsia. Seasonal, not corporate.',
    accents: [
      { label: 'Pink',    hex: '#ee46bc' },
      { label: 'Rosé',    hex: '#f63d68' },
      { label: 'Fuchsia', hex: '#d444f1' },
      { label: 'Purple',  hex: '#7a5af8' },
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    group: 'market',
    theory: 'Warm welcome — berry, citrus, tea. Invitation, not urgency.',
    accents: [
      { label: 'Rosé',   hex: '#f63d68' },
      { label: 'Orange', hex: '#ef6820' },
      { label: 'Yellow', hex: '#eaaa08' },
      { label: 'Teal',   hex: '#15b79e' },
    ],
  },
  {
    id: 'luxury',
    label: 'Luxury',
    group: 'market',
    theory: 'Jewel tones. Rare, not loud — violet, indigo, pink.',
    accents: [
      { label: 'Violet', hex: '#875bf7' },
      { label: 'Purple', hex: '#7a5af8' },
      { label: 'Indigo', hex: '#6172f3' },
      { label: 'Pink',   hex: '#ee46bc' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    group: 'work',
    theory: 'Trust and authority sit in blue through indigo.',
    accents: [
      { label: 'Blue Dark', hex: '#2970ff' },
      { label: 'Blue',      hex: '#2e90fa' },
      { label: 'Indigo',    hex: '#6172f3' },
      { label: 'Violet',    hex: '#875bf7' },
    ],
  },
  {
    id: 'tech',
    label: 'Tech',
    group: 'work',
    theory: 'Signal — cyan, electric blue. Screens, not navy boardrooms.',
    accents: [
      { label: 'Cyan',       hex: '#06aed4' },
      { label: 'Blue Light', hex: '#0ba5ec' },
      { label: 'Indigo',     hex: '#6172f3' },
      { label: 'Purple',     hex: '#7a5af8' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    group: 'work',
    theory: 'Clarity and highlight — sky, cyan, a mark of yellow.',
    accents: [
      { label: 'Blue Light', hex: '#0ba5ec' },
      { label: 'Cyan',       hex: '#06aed4' },
      { label: 'Indigo',     hex: '#6172f3' },
      { label: 'Yellow',     hex: '#eaaa08' },
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    group: 'work',
    theory: 'Heat and charge — fire orange, sun, earth.',
    accents: [
      { label: 'Orange Dark', hex: '#ff4405' },
      { label: 'Orange',      hex: '#ef6820' },
      { label: 'Yellow',      hex: '#eaaa08' },
      { label: 'Moss',        hex: '#669f2a' },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    group: 'life',
    theory: 'Calm vitality — teal, green, cyan. Clinical without going cold.',
    accents: [
      { label: 'Teal',       hex: '#15b79e' },
      { label: 'Green',      hex: '#16b364' },
      { label: 'Cyan',       hex: '#06aed4' },
      { label: 'Blue Light', hex: '#0ba5ec' },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    group: 'life',
    theory: 'Growth. Moss and leaf — earthbound, not neon.',
    accents: [
      { label: 'Moss',        hex: '#669f2a' },
      { label: 'Green Light', hex: '#66c61c' },
      { label: 'Green',       hex: '#16b364' },
      { label: 'Teal',        hex: '#15b79e' },
    ],
  },
  {
    id: 'recreation',
    label: 'Recreation',
    group: 'life',
    theory: 'Motion outdoors — sun, lime, a hit of fire.',
    accents: [
      { label: 'Green Light', hex: '#66c61c' },
      { label: 'Orange',      hex: '#ef6820' },
      { label: 'Yellow',      hex: '#eaaa08' },
      { label: 'Orange Dark', hex: '#ff4405' },
    ],
  },
  {
    id: 'art',
    label: 'Art',
    group: 'life',
    theory: 'Expression in fuchsia, purple, pink — hue as the signature.',
    accents: [
      { label: 'Fuchsia', hex: '#d444f1' },
      { label: 'Purple',  hex: '#7a5af8' },
      { label: 'Pink',    hex: '#ee46bc' },
      { label: 'Violet',  hex: '#875bf7' },
    ],
  },
]

/** Dedupe every accent the scale-guide agent offers. */
function collectIndustryAccents(): Map<string, IndustryAccent> {
  const byHex = new Map<string, IndustryAccent>()
  for (const group of INDUSTRY_GROUP_ORDER) {
    for (const pack of INDUSTRY_PACKS.filter((p) => p.group === group)) {
      for (const accent of pack.accents) {
        const key = accent.hex.toLowerCase()
        if (!byHex.has(key)) byHex.set(key, accent)
      }
    }
  }
  return byHex
}

/** Same hexes as the agent, ordered hue-continuous (Blues → Pinks → Warm →
 *  Greens) via `BRAND_SPECTRUM` — the picker bar reads as one rainbow, not
 *  industry rows shuffled together. */
function buildIndustrySpectrum(): IndustryAccent[] {
  const byHex = collectIndustryAccents()
  const ordered: IndustryAccent[] = []
  for (const preset of BRAND_SPECTRUM) {
    const hit = byHex.get(preset.hex.toLowerCase())
    if (hit) {
      ordered.push({ label: preset.label, hex: preset.hex })
      byHex.delete(preset.hex.toLowerCase())
    }
  }
  if (byHex.size === 0) return ordered
  // Guard: anything off-spectrum falls back to ascending hue.
  const rest = [...byHex.values()].sort((a, b) => {
    const ah = chroma(a.hex).get('hsl.h')
    const bh = chroma(b.hex).get('hsl.h')
    const aHue = typeof ah === 'number' && !Number.isNaN(ah) ? ah : 0
    const bHue = typeof bh === 'number' && !Number.isNaN(bh) ? bh : 0
    return aHue - bHue
  })
  return [...ordered, ...rest]
}

export const INDUSTRY_SPECTRUM: IndustryAccent[] = buildIndustrySpectrum()

export function packById(id: IndustryId): IndustryPack {
  return INDUSTRY_PACKS.find((p) => p.id === id) ?? INDUSTRY_PACKS.find((p) => p.id === 'business')!
}

export function packsInGroup(group: IndustryGroupId): IndustryPack[] {
  return INDUSTRY_PACKS.filter((p) => p.group === group)
}

/** Four swatches in ascending hue — reads as a mini rainbow per row. */
export function sortAccentsByHue(accents: readonly IndustryAccent[]): IndustryAccent[] {
  return [...accents].sort((a, b) => {
    const ah = chroma(a.hex).get('hsl.h')
    const bh = chroma(b.hex).get('hsl.h')
    const aHue = typeof ah === 'number' && !Number.isNaN(ah) ? ah : 0
    const bHue = typeof bh === 'number' && !Number.isNaN(bh) ? bh : 0
    if (aHue !== bHue) return aHue - bHue
    return chroma(a.hex).get('hsl.l') - chroma(b.hex).get('hsl.l')
  })
}

function meanDelta(hex: string, pack: IndustryPack): number {
  return pack.accents.reduce((sum, a) => sum + chroma.deltaE(hex, a.hex), 0) / pack.accents.length
}

/** Hue → field, used only when the hex isn't in any pack (a custom accent). */
export function industryFromHue(h: number): IndustryId {
  const hue = ((h % 360) + 360) % 360
  if (hue < 18)  return 'energy'
  if (hue < 50)  return 'food'
  if (hue < 100) return 'recreation'
  if (hue < 145) return 'nature'
  if (hue < 175) return 'health'
  if (hue < 200) return 'tech'
  if (hue < 235) return 'business'
  if (hue < 270) return 'luxury'
  if (hue < 310) return 'art'
  if (hue < 340) return 'fashion'
  return 'hospitality'
}

export function industryFromHex(hex: string): IndustryId {
  try {
    chroma(hex)
  } catch {
    return 'business'
  }

  const exact = INDUSTRY_PACKS.filter((p) => p.accents.some((a) => hexEq(a.hex, hex)))
  if (exact.length === 1) return exact[0].id
  if (exact.length > 1) {
    const hero = exact.find((p) => hexEq(p.accents[0].hex, hex))
    if (hero) return hero.id
    return [...exact].sort((a, b) => meanDelta(hex, a) - meanDelta(hex, b))[0].id
  }

  let bestDist = Infinity
  const hits: IndustryId[] = []
  for (const pack of INDUSTRY_PACKS) {
    for (const a of pack.accents) {
      const d = chroma.deltaE(hex, a.hex)
      if (d < bestDist - 0.05) {
        bestDist = d
        hits.length = 0
        hits.push(pack.id)
      } else if (Math.abs(d - bestDist) <= 0.05 && !hits.includes(pack.id)) {
        hits.push(pack.id)
      }
    }
  }
  if (hits.length === 1) return hits[0]
  const hue = chroma(hex).get('hsl.h')
  const byHue = industryFromHue(typeof hue === 'number' && !Number.isNaN(hue) ? hue : 0)
  if (hits.includes(byHue)) return byHue
  return hits[0] ?? 'business'
}

export function hexEq(a: string, b: string): boolean {
  return a.replace('#', '').toLowerCase() === b.replace('#', '').toLowerCase()
}

/** Every pack hex is a curated preset — a guard so packs can't drift off-palette. */
export function industryPacksAreCurated(): boolean {
  const allowed = new Set(BRAND_PRESETS.map((h) => h.toLowerCase()))
  return INDUSTRY_PACKS.every((p) => p.accents.every((a) => allowed.has(a.hex.toLowerCase())))
}

/** Each field's first swatch is unique, so an exact hero hex maps to one row. */
export function industryHeroesAreUnique(): boolean {
  const heroes = INDUSTRY_PACKS.map((p) => p.accents[0].hex.toLowerCase())
  return new Set(heroes).size === heroes.length
}
