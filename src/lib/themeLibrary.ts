/**
 * My themes — how many the rail shows, when to warn, when to stop minting.
 * A theme is a reading of primitives plus its own families; past a dozen the
 * editor and export get heavy. The rail is a switcher, not a file cabinet.
 */

export const MY_THEME_RAIL_LIMIT = 5
export const MY_THEME_SOFT_CAP = 8
export const MY_THEME_HARD_CAP = 12

export const MY_THEME_FULL_ERROR =
  'This system is at {count} themes. Delete one to add another.'

/** Own keys only — never the built-in `light`/`dark` scaffolding. */
export function myThemeKeys(themeOrder: string[], themes: Record<string, unknown>): string[] {
  return themeOrder.filter((key) => key !== 'light' && key !== 'dark' && Boolean(themes[key]))
}

export function canAddMyTheme(count: number): boolean {
  return count < MY_THEME_HARD_CAP
}

export function myThemeRoom(count: number): 'ok' | 'warn' | 'full' {
  if (count >= MY_THEME_HARD_CAP) return 'full'
  if (count >= MY_THEME_SOFT_CAP) return 'warn'
  return 'ok'
}

/**
 * Pin the previewed theme, then the newest in `themeOrder` (create appends).
 * Under the rail limit the list is unchanged so a short library doesn't jump.
 */
export function visibleMyThemes(
  keys: string[],
  previewed: string,
  limit = MY_THEME_RAIL_LIMIT,
): string[] {
  if (keys.length <= limit) return keys
  const newest = keys.slice(-limit)
  if (!keys.includes(previewed) || newest.includes(previewed)) return newest
  return [previewed, ...newest.slice(1)]
}
