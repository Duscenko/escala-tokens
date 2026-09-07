import { appearanceOrder, themeModeKey, type ThemeAppearance } from './themeModes'

/**
 * How many Color Semantics columns Sync will offer — five themes, each as a
 * Light and a Dark column.
 *
 * This is NOT Figma's limit, and it deliberately exceeds it on most plans:
 * Starter allows 1 mode per collection, Professional and Organization 4,
 * Enterprise 40. The cap used to be 3 to stay inside Professional's 4 with a
 * column to spare, which meant a five-theme system could never ship more than
 * one and a half of its themes even on a plan that could hold them.
 *
 * Choosing what to publish and discovering what your plan holds are two
 * different questions, and the plugin already answers the second one honestly:
 * `ensureNamedModes` and the semantics import both wrap `addMode` in a
 * try/catch and log one line naming every column that was skipped and why
 * ("your Figma plan's mode-per-collection limit was reached"). So an
 * over-cap selection imports the columns that fit, in order, and says which
 * ones didn't — rather than the picker deciding on the user's behalf that
 * they are on Professional.
 *
 * The ORDER of `syncModes` is therefore load-bearing on a limited plan: it is
 * the order columns are created in, so whatever the user checked first is what
 * survives the cut.
 */
export const FIGMA_SYNC_MODE_CAP = 10

/** One Figma Color Semantics column: a library theme × Light or Dark. */
export type FigmaSyncMode = {
  theme: string
  appearance: ThemeAppearance
}

export function figmaSyncModeId(mode: FigmaSyncMode): string {
  return themeModeKey(mode.theme, mode.appearance)
}

export function hasFigmaSyncMode(
  modes: readonly FigmaSyncMode[],
  theme: string,
  appearance: ThemeAppearance,
): boolean {
  return modes.some((mode) => mode.theme === theme && mode.appearance === appearance)
}

export function uniqueThemesFromModes(modes: readonly FigmaSyncMode[] | undefined): string[] {
  if (!modes?.length) return []
  return [...new Set(modes.map((mode) => mode.theme))]
}

export function clampFigmaSyncModes(modes: readonly FigmaSyncMode[]): FigmaSyncMode[] {
  return modes.slice(0, FIGMA_SYNC_MODE_CAP)
}

/**
 * File & modes' opening selection: every listed library theme × Light/Dark,
 * preferred kind first, stopped at `FIGMA_SYNC_MODE_CAP`.
 *
 * Used to be the first theme only. That read as "the plugin only imports 2
 * modes" once the cap moved to 10 — Sync published two columns and the
 * plugin created exactly those. A one-theme call (`[key]`) still returns
 * just that theme's pair — Theme Preview's per-row "Sync with Figma".
 */
export function defaultFigmaSyncModes(
  themes: readonly string[],
  themeKinds: Record<string, string | undefined>,
): FigmaSyncMode[] {
  const next: FigmaSyncMode[] = []
  for (const theme of themes) {
    const preferred: ThemeAppearance = themeKinds[theme] === 'dark' ? 'dark' : 'light'
    for (const appearance of appearanceOrder(preferred)) {
      if (next.length >= FIGMA_SYNC_MODE_CAP) return next
      next.push({ theme, appearance })
    }
  }
  return next
}

export function appearanceTitle(appearance: ThemeAppearance): 'Light' | 'Dark' {
  return appearance === 'dark' ? 'Dark' : 'Light'
}

export function figmaSyncModeLabel(themeName: string, appearance: ThemeAppearance): string {
  return `${themeName} ${appearanceTitle(appearance)}`
}

export function toggleFigmaSyncAppearance(
  modes: readonly FigmaSyncMode[],
  theme: string,
  appearance: ThemeAppearance,
): FigmaSyncMode[] {
  if (hasFigmaSyncMode(modes, theme, appearance)) {
    const next = modes.filter((mode) => !(mode.theme === theme && mode.appearance === appearance))
    return next.length ? next : [...modes]
  }
  if (modes.length >= FIGMA_SYNC_MODE_CAP) return [...modes]
  return [...modes, { theme, appearance }]
}

/** Clicking the theme name adds both appearances (room permitting), or
 *  clears that theme if both are already on. Never leaves the list empty. */
export function toggleFigmaSyncTheme(
  modes: readonly FigmaSyncMode[],
  theme: string,
  themeKinds: Record<string, string | undefined>,
): FigmaSyncMode[] {
  const preferred: ThemeAppearance = themeKinds[theme] === 'dark' ? 'dark' : 'light'
  const order = appearanceOrder(preferred)
  const selected = order.filter((appearance) => hasFigmaSyncMode(modes, theme, appearance))
  if (selected.length === order.length) {
    const next = modes.filter((mode) => mode.theme !== theme)
    return next.length ? next : [...modes]
  }
  const next = [...modes]
  for (const appearance of order) {
    if (hasFigmaSyncMode(next, theme, appearance)) continue
    if (next.length >= FIGMA_SYNC_MODE_CAP) break
    next.push({ theme, appearance })
  }
  return next
}
