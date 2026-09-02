// ── Theme → primitive resolution ────────────────────────────────────────────
// A theme stores which FAMILY each slot reads (`ThemeSources`), never a ramp of
// its own. Everything that needs a theme's actual ramps resolves them here, so
// retinting a family in Primitives moves every theme pointing at it — a theme
// can't drift from the primitives because it never held a copy to drift with.

import type { ColorScale } from '../types/tokens'
import type { ThemePalette, ThemeSources } from '../store/useDesignStore'

export const FAMILY_SLOTS = ['brand', 'gray', 'error', 'warning', 'success', 'info'] as const
export type FamilySlot = (typeof FAMILY_SLOTS)[number]

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
