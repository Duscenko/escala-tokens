// Which THEMES a brand ships. See design-plans/brands-and-themes.md.
//
//   Design system → Brand → Theme (Light, Dark)
//
// On screen a "brand" is what the code calls a theme key (`themeOrder`,
// `themeSources`…) and a "theme" is what the code calls an appearance. The
// identifiers were not renamed; only the words people read were.
//
// What a brand ships is a LIST of theme ids, never a `hasDark` boolean: the day
// a third theme exists (High contrast, Dim) it is one more entry in
// `BRAND_THEME_DEFS` and one more id in the list. Nothing here may assume the
// list has at most two members.
//
// In the editor a brand always has every theme (the ramps are derived, so they
// cost nothing). This list only decides what leaves: Figma sync, downloads.

import type { ThemeAppearance } from './themeModes'

/** A theme id. A string on purpose — see the note above. */
export type BrandThemeId = string

export interface BrandThemeDef {
  id: BrandThemeId
  label: string
  /** The appearance whose ramps and solvers this theme is built on. */
  base: ThemeAppearance
}

/** Every theme a brand can ship today, in display order. */
export const BRAND_THEME_DEFS: readonly BrandThemeDef[] = [
  { id: 'light', label: 'Light', base: 'light' },
  { id: 'dark', label: 'Dark', base: 'dark' },
]

export const BRAND_THEME_IDS: readonly BrandThemeId[] = BRAND_THEME_DEFS.map((def) => def.id)

/** Brand key → the theme ids it ships. A brand with no entry ships them all. */
export type BrandThemes = Record<string, BrandThemeId[]>

export function brandThemeDef(id: BrandThemeId): BrandThemeDef | undefined {
  return BRAND_THEME_DEFS.find((def) => def.id === id)
}

export function brandThemeLabel(id: BrandThemeId): string {
  return brandThemeDef(id)?.label ?? id
}

/** Known ids only, no repeats, in `BRAND_THEME_DEFS` order. Never empty: a
 *  brand that ships nothing is not a state, so an empty or unknown list reads
 *  as "all of them". */
export function normalizeBrandThemes(ids: readonly BrandThemeId[] | undefined | null): BrandThemeId[] {
  const kept = BRAND_THEME_IDS.filter((id) => ids?.includes(id))
  return kept.length ? kept : [...BRAND_THEME_IDS]
}

/** The themes `brand` ships, `preferred` first (a dark-led brand lists Dark
 *  first, which is the order its Figma columns are created in). */
export function shippedThemes(
  brandThemes: BrandThemes | undefined,
  brand: string,
  preferred?: BrandThemeId,
): BrandThemeId[] {
  const ids = normalizeBrandThemes(brandThemes?.[brand])
  if (!preferred || !ids.includes(preferred)) return ids
  return [preferred, ...ids.filter((id) => id !== preferred)]
}

export function shipsEveryTheme(ids: readonly BrandThemeId[]): boolean {
  return BRAND_THEME_IDS.every((id) => ids.includes(id))
}

/** "Light + Dark", "Light only". Callers translate the result. */
export function brandThemesSummary(ids: readonly BrandThemeId[]): string {
  const list = normalizeBrandThemes(ids)
  return list.length === 1 ? `${brandThemeLabel(list[0])} only` : list.map(brandThemeLabel).join(' + ')
}

export interface BrandThemeChoice {
  /** Stable id of the choice, not of a theme: 'light+dark', 'light', 'dark'. */
  id: string
  ids: BrandThemeId[]
  label: string
}

/** The choices the create form offers: every theme together, then each one
 *  alone. Derived from the registry, so a third theme adds its own "only" row
 *  and widens the first one without anyone editing this list. */
export const BRAND_THEME_CHOICES: readonly BrandThemeChoice[] = [
  { id: BRAND_THEME_IDS.join('+'), ids: [...BRAND_THEME_IDS], label: brandThemesSummary(BRAND_THEME_IDS) },
  ...BRAND_THEME_DEFS.map((def) => ({ id: def.id, ids: [def.id], label: brandThemesSummary([def.id]) })),
]

export function brandThemeChoiceFor(ids: readonly BrandThemeId[]): BrandThemeChoice {
  const key = normalizeBrandThemes(ids).join('+')
  return BRAND_THEME_CHOICES.find((choice) => choice.id === key) ?? BRAND_THEME_CHOICES[0]
}

/** How many themes the listed brands ship in total — the number of modes the
 *  system needs in Figma's Color Semantics collection. */
export function countShippedThemes(brands: readonly string[], brandThemes: BrandThemes | undefined): number {
  return brands.reduce((total, brand) => total + shippedThemes(brandThemes, brand).length, 0)
}

/** Drops entries for brands that no longer exist and stores nothing for a
 *  brand that ships everything (absent already means that). */
export function pruneBrandThemes(brandThemes: BrandThemes | undefined, brands: readonly string[]): BrandThemes {
  const out: BrandThemes = {}
  for (const brand of brands) {
    const ids = brandThemes?.[brand]
    if (!ids) continue
    const kept = normalizeBrandThemes(ids)
    if (!shipsEveryTheme(kept)) out[brand] = kept
  }
  return out
}

/** What a brand ships under the account's plan. Free ships ONE theme, so a
 *  stored list of several reads as the brand's leading theme. The stored list
 *  is never rewritten by the plan — it is what a Pro account gets back. The
 *  card, the picker and the summaries all go through this, so they cannot show
 *  two different answers for one brand. */
export function plannedBrandThemes(
  stored: readonly BrandThemeId[],
  lead: BrandThemeId | undefined,
  free: boolean,
): BrandThemeId[] {
  const ids = normalizeBrandThemes(stored)
  return free && lead && ids.length > 1 && ids.includes(lead) ? [lead] : ids
}

/** The one appearance a brand ships when it ships a single theme — what a Free
 *  cut must honour over "whatever is on screen". Undefined while the brand
 *  ships several: then nothing was chosen and the caller keeps its own rule. */
export function soleShippedAppearance(brandThemes: BrandThemes | undefined, brand: string): ThemeAppearance | undefined {
  const stored = brandThemes?.[brand]
  if (!stored) return undefined
  const ids = normalizeBrandThemes(stored)
  return ids.length === 1 ? brandThemeDef(ids[0])?.base : undefined
}
