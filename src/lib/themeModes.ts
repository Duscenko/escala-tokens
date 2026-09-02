export type ThemeAppearance = 'light' | 'dark'

export type ThemeSemanticModes = Record<
  string,
  Record<ThemeAppearance, Record<string, string>>
>

/**
 * A theme always owns both appearances. Its preferred appearance leads the
 * editor so a dark-spectrum theme opens Dark first without storing a second
 * piece of ordering state that could drift.
 */
export function appearanceOrder(preferred: ThemeAppearance = 'light'): readonly [ThemeAppearance, ThemeAppearance] {
  return preferred === 'dark' ? ['dark', 'light'] : ['light', 'dark']
}

export function oppositeAppearance(appearance: ThemeAppearance): ThemeAppearance {
  return appearance === 'dark' ? 'light' : 'dark'
}

const MODE_SEPARATOR = '::'

export function themeModeKey(themeKey: string, appearance: ThemeAppearance): string {
  return `${themeKey}${MODE_SEPARATOR}${appearance}`
}

export function appearanceFromModeKey(modeKey: string): ThemeAppearance | null {
  const value = modeKey.split(MODE_SEPARATOR).at(-1)
  return value === 'light' || value === 'dark' ? value : null
}

export function semanticModesFor(
  themeSemantics: ThemeSemanticModes | undefined,
  legacyThemes: Record<string, Record<string, string>>,
  themeKey: string,
  preferred: ThemeAppearance,
): Record<ThemeAppearance, Record<string, string>> {
  const existing = themeSemantics?.[themeKey]
  if (existing?.light && existing?.dark) return existing

  const legacy = legacyThemes[themeKey] ?? {}
  return {
    light: preferred === 'light' ? legacy : {},
    dark: preferred === 'dark' ? legacy : {},
  }
}
