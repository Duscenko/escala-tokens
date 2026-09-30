// ── Theme → primitive resolution ────────────────────────────────────────────
// A theme stores which FAMILY each slot reads (`ThemeSources`), never a ramp of
// its own. Everything that needs a theme's actual ramps resolves them here, so
// retinting a family in Primitives moves every theme pointing at it — a theme
// can't drift from the primitives because it never held a copy to drift with.

import type { ColorScale } from '../types/tokens'
import type { ThemePalette, ThemeSources } from '../store/useDesignStore'

export const FAMILY_SLOTS = ['brand', 'gray', 'error', 'warning', 'success', 'info'] as const
export type FamilySlot = (typeof FAMILY_SLOTS)[number]

/** Extra brand palettes a theme may carry besides its `brand` slot. These are
 *  primitive families filed under Accents — they do NOT feed Categorical
 *  roles. Sequential: tertiary only exists once secondary does. */
export const BRAND_EXTRA_RANKS = ['secondary', 'tertiary'] as const
export type BrandExtraRank = (typeof BRAND_EXTRA_RANKS)[number]

export const BRAND_EXTRA_LABEL: Record<BrandExtraRank, string> = {
  secondary: 'Secondary',
  tertiary: 'Tertiary',
}

/** Accents nav ranks — Primary is the brand slot, extras are optional palettes.
 *  Display names stay rank-based so a theme called "Core Copy" does not rename
 *  the row to "Core Copy Accent". Token prefixes (`accent`, `core-copy-brand`)
 *  are unchanged. */
export const BRAND_PRIMARY_LABEL = 'Primary'
export type BrandRank = 'primary' | BrandExtraRank

export const BRAND_RANK_LABEL: Record<BrandRank, string> = {
  primary: BRAND_PRIMARY_LABEL,
  ...BRAND_EXTRA_LABEL,
}

/** Slot names in the Variables rail — never the theme name. Export keys stay
 *  the unique family prefix (`core-copy-error`); only the label is a slot. */
export const SLOT_DISPLAY_LABEL: Record<FamilySlot, string> = {
  brand: BRAND_PRIMARY_LABEL,
  gray: 'Neutral',
  error: 'Error',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
}

/** Every family key a theme points at — semantic slots PLUS extra brand palettes. */
export function allThemeFamilyKeys(refs: ThemeSources): string[] {
  const keys = FAMILY_SLOTS.map((slot) => refs[slot]).filter(Boolean)
  for (const rank of BRAND_EXTRA_RANKS) {
    const extra = refs[rank]
    if (extra) keys.push(extra)
  }
  return keys
}

export function themePointsAtFamily(refs: ThemeSources, familyKey: string): boolean {
  return allThemeFamilyKeys(refs).includes(familyKey)
}

export function nextBrandExtraRank(refs: ThemeSources | undefined): BrandExtraRank | null {
  if (!refs?.secondary) return 'secondary'
  if (!refs.tertiary) return 'tertiary'
  return null
}

export function brandExtraRankOf(
  familyKey: string,
  refs: ThemeSources | undefined,
): BrandExtraRank | null {
  if (!refs) return null
  for (const rank of BRAND_EXTRA_RANKS) {
    if (refs[rank] === familyKey) return rank
  }
  return null
}

/** Which Accents rank a family occupies. `accent` is always Primary; a custom
 *  family is Primary only while some theme's `brand` slot points at it. */
export function brandRankOf(
  familyKey: string,
  sources: Record<string, ThemeSources>,
): BrandRank | null {
  if (familyKey === 'accent') return 'primary'
  for (const refs of Object.values(sources)) {
    if (refs.brand === familyKey) return 'primary'
    const extra = brandExtraRankOf(familyKey, refs)
    if (extra) return extra
  }
  return null
}

export function brandRankLabel(
  familyKey: string,
  sources: Record<string, ThemeSources>,
  isAlpha = false,
): string | null {
  const rank = brandRankOf(familyKey, sources)
  if (!rank) return null
  const base = BRAND_RANK_LABEL[rank]
  return isAlpha ? `${base}-Alpha` : base
}

/** Rail / table label for a family: Primary · Neutral · Error · … regardless
 *  of the theme that minted it. null = not a slot family (a free-standing
 *  custom stays on its stored name). Export keys are NOT this string. */
export function familyDisplayLabel(
  familyKey: string,
  sources: Record<string, ThemeSources>,
  isAlpha = false,
): string | null {
  const branded = brandRankLabel(familyKey, sources, isAlpha)
  if (branded) return branded
  for (const slot of FAMILY_SLOTS) {
    if (GLOBAL_FAMILY[slot] === familyKey) {
      const base = SLOT_DISPLAY_LABEL[slot]
      return isAlpha ? `${base}-Alpha` : base
    }
  }
  const slot = familySlotFor(familyKey, sources)
  if (!slot) return null
  const base = SLOT_DISPLAY_LABEL[slot]
  return isAlpha ? `${base}-Alpha` : base
}

/** Themes whose sources point at this family — slots AND extra palettes. */
export function themesPointingAtFamily(
  familyKey: string,
  themeSources: Record<string, ThemeSources>,
): string[] {
  return Object.entries(themeSources)
    .filter(([, refs]) => allThemeFamilyKeys(refs).includes(familyKey))
    .map(([theme]) => theme)
}

/**
 * Export-wizard family chip. Same slot names as the rail, but when TWO
 * exported prefixes collapse onto one slot (Core Copy Error + Glass Error)
 * the theme name is appended so the checklist cannot offer two "Error"s.
 * A single theme, or two themes sharing one family, stays just "Error".
 */
export function primitiveDisplayLabel(
  familyKey: string,
  sources: Record<string, ThemeSources>,
  themeLabels: Record<string, string>,
  exportFamilyKeys: readonly string[],
  storedLabel?: string,
): string {
  const isAlpha = familyKey.endsWith('-a')
  const solidKey = isAlpha ? familyKey.slice(0, -2) : familyKey
  const slotLabel = familyDisplayLabel(solidKey, sources, isAlpha)
  const fallback = storedLabel ?? familyKey.charAt(0).toUpperCase() + familyKey.slice(1)
  const base = slotLabel ?? fallback
  const slotOf = (key: string) => {
    const solid = key.endsWith('-a') ? key.slice(0, -2) : key
    return familyDisplayLabel(solid, sources, false)
  }
  const thisSlot = slotOf(familyKey)
  if (!thisSlot) return base
  const colliding = exportFamilyKeys.filter((key) => {
    if (key.endsWith('-a') !== isAlpha) return false
    return slotOf(key) === thisSlot
  })
  if (colliding.length <= 1) return base
  const owner = themesPointingAtFamily(solidKey, sources)
    .map((theme) => themeDisplayName(theme, themeLabels))
    .join(', ')
  return owner ? `${base} · ${owner}` : base
}

/** The family key each slot falls back to — the global ramps. */
export const GLOBAL_FAMILY: Record<FamilySlot, string> = {
  brand: 'accent', gray: 'neutral', error: 'error',
  warning: 'warning', success: 'success', info: 'info',
}

/** The primitives a resolution reads — the store's ramps, structurally. */
export interface PrimitiveScales {
  primaryScale: ColorScale
  primaryDarkScale?: ColorScale
  grayLightScale: ColorScale
  grayDarkScale?: ColorScale
  errorScale: ColorScale
  errorDarkScale?: ColorScale
  warningScale: ColorScale
  warningDarkScale?: ColorScale
  successScale: ColorScale
  successDarkScale?: ColorScale
  infoScale: ColorScale
  infoDarkScale?: ColorScale
  customColors: { key: string; scale: ColorScale; darkScale?: ColorScale }[]
}

/**
 * The ramp a family key resolves to. EVERY family has a dark twin (the Radix
 * two-scale model), so `kind` picks between them for all of them — not just
 * the neutral. Falls back to the light ramp for pre-v40 data.
 */
export function scaleForFamily(
  key: string,
  kind: 'light' | 'dark',
  p: PrimitiveScales,
): ColorScale | undefined {
  const pick = (light: ColorScale, dark?: ColorScale) =>
    kind === 'dark' && dark && Object.keys(dark).length ? dark : light
  switch (key) {
    case 'accent':  return pick(p.primaryScale, p.primaryDarkScale)
    case 'neutral': return pick(p.grayLightScale, p.grayDarkScale)
    case 'error':   return pick(p.errorScale, p.errorDarkScale)
    case 'warning': return pick(p.warningScale, p.warningDarkScale)
    case 'success': return pick(p.successScale, p.successDarkScale)
    case 'info':    return pick(p.infoScale, p.infoDarkScale)
    default: {
      const fam = p.customColors.find((c) => c.key === key)
      return fam ? pick(fam.scale, fam.darkScale) : undefined
    }
  }
}

/**
 * A theme's resolved ramps, or undefined for a theme that carries no sources
 * (built-in light/dark read the globals directly). A reference that no longer
 * resolves — a family deleted out from under it — falls back to its global, so
 * the matrix degrades to "the system's own colour" instead of blanking out.
 */
export function resolveThemePalette(
  sources: ThemeSources | undefined,
  kind: 'light' | 'dark',
  p: PrimitiveScales,
): ThemePalette | undefined {
  if (!sources) return undefined
  const pick = (slot: FamilySlot): ColorScale =>
    scaleForFamily(sources[slot], kind, p) ??
    scaleForFamily(GLOBAL_FAMILY[slot], kind, p) ??
    p.primaryScale
  return {
    brand: pick('brand'), gray: pick('gray'), error: pick('error'),
    warning: pick('warning'), success: pick('success'), info: pick('info'),
  }
}

/**
 * The BRAND ramp a theme resolves to, in that theme's own appearance.
 *
 * Gradients need exactly this and nothing else: a linked stop references a tone
 * of "the accent", and which family that is depends on the theme
 * (`themeSources[t].brand`), while which of its two ramps depends on the
 * theme's kind. Undefined when the theme has no resolvable brand — the caller
 * then falls back to the stop's own cached colour.
 *
 * Kept here rather than in `gradients.ts`, which is deliberately dependency-free
 * (see its header): the resolver takes a plain ramp, the store lookup lives with
 * the other store-aware resolvers.
 */
export function themeBrandRamp(
  themeKey: string,
  themeSources: Record<string, ThemeSources>,
  themeKinds: Record<string, 'light' | 'dark'>,
  p: PrimitiveScales,
  /**
   * Force the appearance the ramp resolves in, ignoring `themeKinds[themeKey]`.
   * The Escala CHROME needs the previewed theme's brand FAMILY but painted for
   * its OWN light/dark — otherwise previewing a light theme while the workspace
   * is in dark mode bleeds a light-ramp splash into the dark chrome. The
   * preview canvas itself still resolves in the theme's real appearance.
   */
  kindOverride?: 'light' | 'dark',
): ColorScale | undefined {
  const kind = kindOverride ?? themeKinds[themeKey] ?? 'light'
  const brand = themeSources[themeKey]?.brand ?? GLOBAL_FAMILY.brand
  return scaleForFamily(brand, kind, p) ?? scaleForFamily(GLOBAL_FAMILY.brand, kind, p)
}

/**
 * The slot a family serves across the themes — 'brand' when some theme reads it
 * as its accent, 'gray' as its neutral, a status slot for intents. Drives the
 * Primitives nav's folders: a family minted for a theme's accent files under
 * Accents automatically, its linked neutral under Neutrals. null = referenced
 * by no theme (a free-standing custom family).
 */
export function familySlotFor(
  familyKey: string,
  themeSources: Record<string, ThemeSources>,
): FamilySlot | null {
  for (const refs of Object.values(themeSources)) {
    for (const slot of FAMILY_SLOTS) {
      if (refs[slot] === familyKey) return slot
    }
  }
  return null
}

/** Themes referencing `familyKey` — the guard behind "can't delete in use". */
export function themesUsingFamily(
  familyKey: string,
  themeSources: Record<string, ThemeSources>,
): string[] {
  return Object.entries(themeSources)
    .filter(([, refs]) => FAMILY_SLOTS.some((s) => refs[s] === familyKey))
    .map(([theme]) => theme)
}

/**
 * A theme's display name — its user-set label, else a prettified key.
 *
 * ONE implementation. `ThemePreviewHub` and `ThemeLibraryRail` each carried
 * their own, and they had already drifted: one normalised `[-_]+`, the other
 * only `-`, so a `my_theme` key rendered "My Theme" in the hub and "My_theme"
 * in the rail. The Export wizard needed a third copy, which is the point at
 * which it moves here instead.
 */
export function themeDisplayName(key: string, labels: Record<string, string> = {}): string {
  if (labels[key]?.trim()) return labels[key].trim()
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
