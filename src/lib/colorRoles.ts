// The Color edition's roles: which rows exist, what each is called, the hue
// band its slider covers, and how each theme SOLVES a colour when its hue
// moves.
// Pure — the panel and its tests read the same table.

import { colorAtHue, readHuePosition, type HuePosition } from './colorUtils'
import { evaluate, INTENT_THRESHOLDS, wcagLuminance } from './color/apca'
import type { ThemeAppearance } from './themeModes'

export type ColorRoleId = 'accent' | 'neutral' | 'success' | 'error' | 'warning' | 'info'

/** Rows, top to bottom. Critical is the `error` slot under its semantic name. */
export const COLOR_ROLE_ORDER: ColorRoleId[] = ['accent', 'neutral', 'success', 'error', 'warning', 'info']

export const COLOR_ROLE_LABEL: Record<ColorRoleId, string> = {
  accent: 'Accent',
  neutral: 'Neutral',
  success: 'Success',
  error: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

/** OKLCH hue bands, clockwise. Wide enough to give a brand room, narrow
 *  enough that each status keeps reading as itself. */
export const COLOR_ROLE_BAND: Record<Exclude<ColorRoleId, 'neutral'>, [number, number]> = {
  accent: [0, 360],
  error: [355, 50],
  warning: [45, 110],
  success: [120, 180],
  info: [200, 275],
}

/** Label inks a solid can carry — white, or the near-black end of a neutral. */
export const ROLE_LABEL_INKS = ['#ffffff', '#111318'] as const

/** Dark pages glare: a fully saturated fill on near-black vibrates. Dark holds
 *  at most this much of the hue's available chroma. */
export const DARK_SATURATION_CAP = 0.8

/** What a role's anchor (tone 9) must clear in a theme, with the same
 *  thresholds the audit uses:
 *  - against the PAGE as a `ui-component` (WCAG 3:1 + APCA Lc 45), so a
 *    button or a badge is visible as a shape;
 *  - with a label ON it as an `action-label` (WCAG 4.5:1 + APCA Lc 60),
 *    white or near-black, whichever passes. */
export interface RoleCheck {
  pageWcag: number
  pageLc: number
  /** The ink that carries a label, or null when neither does. */
  ink: string | null
  /** The ink the label figures below are for: the passing one, else the closer. */
  labelInk: string
  labelWcag: number
  labelLc: number
  passes: boolean
}

export function checkRoleColor(hex: string, page: string): RoleCheck {
  const onPage = evaluate(hex, page, 'ui-component')
  const labels = ROLE_LABEL_INKS.map((ink) => ({ ink, v: evaluate(ink, hex, 'action-label') }))
  const passing = labels.find(({ v }) => v.passesWcag && v.passesApca)
  const best = passing ?? labels.reduce((a, b) => (b.v.wcag > a.v.wcag ? b : a))
  return {
    pageWcag: onPage.wcag,
    pageLc: Math.abs(onPage.apcaLc),
    ink: passing?.ink ?? null,
    labelInk: best.ink,
    labelWcag: best.v.wcag,
    labelLc: Math.abs(best.v.apcaLc),
    passes: onPage.passesWcag && onPage.passesApca && Boolean(passing),
  }
}

/** How far a colour is from passing, 0 = passes. Used only when no tone of
 *  the hue passes, to land on the closest one rather than a fixed step. */
function shortfall(c: RoleCheck): number {
  const t = INTENT_THRESHOLDS
  return Math.max(0, 1 - c.pageWcag / t['ui-component'].wcag!)
    + Math.max(0, 1 - c.pageLc / t['ui-component'].apcaLc!)
    + Math.max(0, 1 - c.labelWcag / t['action-label'].wcag!)
    + Math.max(0, 1 - c.labelLc / t['action-label'].apcaLc!)
}

const STEPS = 97
const cache = new Map<string, string>()

/**
 * The anchor for a role at `hue` in one theme, SOLVED rather than nudged.
 * Saturation is held (capped in dark); lightness is searched over the hue's
 * whole range and every candidate is measured against the theme's own page.
 *
 * - LIGHT keeps the tone that passes nearest to the colour you chose, so the
 *   brand moves as little as accessibility allows.
 * - DARK takes the DIMMEST tone that passes. On a near-black page a fill has
 *   to be fairly bright to be seen at all (measured: luminance ≥ ~0.43 for
 *   APCA Lc 45), so "less bright" cannot mean dark — it means the least glare
 *   that still clears every threshold, with chroma pulled down.
 *
 * Nothing passes → the tone closest to passing, never a fixed step.
 */
export function solveRoleColor(position: HuePosition, hue: number, appearance: ThemeAppearance, page: string): string {
  const saturation = appearance === 'dark' ? Math.min(position.saturation, DARK_SATURATION_CAP) : position.saturation
  const key = `${appearance}|${page}|${Math.round(hue)}|${saturation.toFixed(3)}|${position.lightness.toFixed(3)}`
  const hit = cache.get(key)
  if (hit) return hit

  const candidates = Array.from({ length: STEPS }, (_, i) => {
    const lightness = (i + 1) / (STEPS + 1)
    const hex = colorAtHue({ saturation, lightness }, hue)
    return { lightness, hex, check: checkRoleColor(hex, page) }
  })
  const passing = candidates.filter((c) => c.check.passes)
  let pick
  if (passing.length) {
    pick = appearance === 'dark'
      ? passing.reduce((a, b) => (wcagLuminance(b.hex) < wcagLuminance(a.hex) ? b : a))
      : passing.reduce((a, b) => (Math.abs(b.lightness - position.lightness) < Math.abs(a.lightness - position.lightness) ? b : a))
  } else {
    pick = candidates.reduce((a, b) => (shortfall(b.check) < shortfall(a.check) ? b : a))
  }
  if (cache.size > 2000) cache.clear()
  cache.set(key, pick.hex)
  return pick.hex
}

/** `hex` moved to `hue`, solved for one theme's page. */
export function roleColorAtHue(hex: string, hue: number, appearance: ThemeAppearance, page: string): string {
  return solveRoleColor(readHuePosition(hex).position, hue, appearance, page)
}
