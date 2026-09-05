/** Shared outer boundary for every drawer opened from the Themes workspace. */
export const THEME_LIBRARY_WIDTH = 196

/**
 * Shell frame — TopNav, the Themes library (same 196px column as the brand
 * lockup), and the attribution footer. `--nav` is the outermost chrome
 * level (#f5f5f5 light / #151516 dark). The library must stay here: its
 * right rule is the brand block's rule continued, so a `--tab-bar` fill
 * under a `--nav` lockup is two levels on one column.
 */
export const SHELL_CHROME = 'bg-nav'

/**
 * Workspace chrome — the 52px tab strip, Quick settings / Hub / Get-code
 * rails, Variables' icon + collections columns. `--tab-bar` / `--rail-section`
 * (white / #222223) sit one step above `--nav` and one step off `--app`.
 * Active workspace chips recess with `bg-app` on this plane — do not paint
 * the strip `bg-app` or the chip vanishes. Export stays on `--nav` so the
 * white pill still separates in light.
 */
export const WORKSPACE_CHROME = 'bg-tab-bar'

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
