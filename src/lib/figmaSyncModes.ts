import { appearanceOrder, themeModeKey, type ThemeAppearance } from './themeModes'

/** Figma Professional allows 4 modes per collection. Sync caps at 3 so one
 *  column stays free and a Free-plan file (1 mode) still gets a clear skip. */
export const FIGMA_SYNC_MODE_CAP = 3

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

/** First library theme, both appearances — preferred kind leads. */
export function defaultFigmaSyncModes(
  themes: readonly string[],
  themeKinds: Record<string, string | undefined>,
): FigmaSyncMode[] {
  const first = themes[0]
  if (!first) return []
  const preferred: ThemeAppearance = themeKinds[first] === 'dark' ? 'dark' : 'light'
  return appearanceOrder(preferred).map((appearance) => ({ theme: first, appearance }))
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
