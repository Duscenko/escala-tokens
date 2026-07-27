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
  grayLightScale: ColorScale
  grayDarkScale?: ColorScale
  errorScale: ColorScale
  warningScale: ColorScale
  successScale: ColorScale
  infoScale: ColorScale
  customColors: { key: string; scale: ColorScale }[]
}

/**
 * The ramp a family key resolves to. Neutral is the only family with a dark
 * twin (colored ramps keep their hue and shift tone instead), so `kind` only
 * changes the answer for it.
 */
export function scaleForFamily(
  key: string,
  kind: 'light' | 'dark',
  p: PrimitiveScales,
): ColorScale | undefined {
  switch (key) {
    case 'accent':  return p.primaryScale
    case 'neutral': return (kind === 'dark' ? p.grayDarkScale : p.grayLightScale) ?? p.grayLightScale
    case 'error':   return p.errorScale
    case 'warning': return p.warningScale
    case 'success': return p.successScale
    case 'info':    return p.infoScale
    default:        return p.customColors.find((c) => c.key === key)?.scale
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
