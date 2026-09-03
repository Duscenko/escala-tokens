/** Shared outer boundary for every drawer opened from the Themes workspace. */
export const THEME_LIBRARY_WIDTH = 196

/**
 * Workspace tabs — Figma `11:5128` (Tablist - Theme workspace).
 * Clear strip (no track fill), active = `bg-app` pill (#f5f5f5 in light),
 * inactive = transparent + muted type, hairline dividers between tabs.
 */
export const WORKSPACE_TAB_TRACK = 'inline-flex min-w-0 items-center gap-[14px] p-[4.5px]'
export const WORKSPACE_CHIP_REST = 'bg-transparent text-fg-muted'
export const WORKSPACE_CHIP_HOVER = 'hover:text-fg'
export const WORKSPACE_CHIP_ACTIVE = 'bg-app text-fg dark:bg-chip-rest'

/** Session chips (language · appearance · search · Export) — same fill + hover.
 *  Hover is a VERY subtle dark wash via inset overlay — keeps the chip fill and
 *  never swaps to `--surface` (lighter than `--chip-rest` in light, so the old
 *  `hover:bg-surface` washed controls out). Dark chrome lifts slightly instead. */
export const CHROME_CONTROL_SHELL = 'bg-chip-rest'
export const CHROME_CONTROL_HOVER = 'hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.06)] dark:hover:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.07)] hover:text-fg'
export const CHROME_CONTROL_ACTIVE = 'shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.08)] text-fg dark:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.09)]'
export const CHROME_CONTROL_FOCUS = 'focus-within:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.06)] dark:focus-within:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.07)] focus-within:text-fg'
