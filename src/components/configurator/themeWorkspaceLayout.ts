/** Shared outer boundary for every drawer opened from the Themes workspace. */
export const THEME_LIBRARY_WIDTH = 196
/** Height of the inspector's tab block (Theme · Variables · Code · Docs) —
 *  and of the Theme preview header beside it, so the two rules under them
 *  run on ONE line across the card and the inspector. */
export const INSPECTOR_TABS_H = 60

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
 * Workspace destination tabs (Theme preview · Variables) use the shared
 * Chrome tab silhouette (`ChromeTabBackground` + `.color-hub-tab`), not
 * these chips. The chips remain for other workspace controls (e.g. code
 * format scope).
 */
export const WORKSPACE_TAB_TRACK = 'inline-flex min-w-0 items-center gap-[14px] p-[4.5px]'
export const WORKSPACE_CHIP_REST = 'bg-transparent text-fg-muted'
export const WORKSPACE_CHIP_HOVER = 'hover:text-fg'
export const WORKSPACE_CHIP_ACTIVE = 'bg-app text-fg dark:bg-chip-rest'

/** Session chips (language · appearance · search · Export) — same fill + hover.
 *  Hover is a VERY subtle dark wash via inset overlay — keeps the chip fill and
 *  never swaps to `--surface` (lighter than `--chip-rest` in light, so the old
 *  `hover:bg-surface` washed controls out). Dark chrome lifts slightly instead. */
/** Portaled shell menus (TopNav, token search) — above workspace drawers (≤60) and in-header overlays. */
export const CHROME_MENU_Z = 200

export const CHROME_CONTROL_SHELL = 'bg-chip-rest'

/**
 * SEGMENTED CONTROLS — one look for "which of N is on" (inspector tabs, Light /
 * Dark, Desktop / Tablet / Mobile). Measured before this: the selected segment
 * was a fill one shade off the track (1.06:1 tabs, 1.18:1 Light/Dark) and, in
 * dark, DARKER than the track, so it read as a hole rather than a raised key.
 * A full ring fixed the contrast but was too heavy for a quiet chrome control.
 *
 * Now, with no border, the selected segment is told apart by three cues, none
 * of them colour alone:
 *  · a RAISED fill — white in light (with a soft shadow, the iOS / macOS key),
 *    and in dark a lift TOWARD the ink (`fg` at 16 % ≈ 1.55:1 vs the track),
 *  · full-strength ink, against the unselected segments' 75 % ink,
 *  · semibold against medium.
 * Unselected labels use `text-fg/75`, not `text-fg-muted`: muted measured
 * 4.25:1 on the light track — under AA for a 12px label. 75 % ink clears it in
 * both appearances while still reading as the quieter state.
 */
export const SEGMENT_SELECTED_FILL = 'bg-app shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:bg-fg/[0.16] dark:shadow-none'
export const SEGMENT_ACTIVE = `${SEGMENT_SELECTED_FILL} font-semibold text-fg`
export const SEGMENT_INACTIVE = 'font-medium text-fg/75 hover:bg-fg/[0.06] hover:text-fg'
export const CHROME_CONTROL_HOVER = 'hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.06)] dark:hover:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.07)] hover:text-fg'

export const CHROME_CONTROL_ACTIVE = 'shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.08)] text-fg dark:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.09)]'
export const CHROME_CONTROL_FOCUS = 'focus-within:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.06)] dark:focus-within:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.07)] focus-within:text-fg'

/** TopNav + workspace tab row when the live strip isn't mounted yet. */
export const SHELL_DRAWER_TOP_FALLBACK = 52 + 52

/** Attribution footer (`h-7`) + gap when `footer` isn't in the DOM. */
export const SHELL_DRAWER_BOTTOM_FALLBACK = 28 + 8

export type ShellDrawerInsets = { top: number; bottom: number }

/**
 * Vertical insets for a right-docked drawer that should fill the workspace
 * column: from the bottom of the Themes tab strip down to the top of the
 * shell footer (plugin banner height is included automatically via the tab
 * strip's box).
 */
export function measureShellDrawerInsets(): ShellDrawerInsets {
  const tabRect = document.querySelector('.theme-workspace-tab-bar')?.getBoundingClientRect()
  let top = SHELL_DRAWER_TOP_FALLBACK
  if (tabRect && tabRect.bottom > 0) top = tabRect.bottom
  else {
    const layerRect = document.querySelector('.foundation-layer-bar')?.getBoundingClientRect()
    if (layerRect && layerRect.bottom > 0) top = layerRect.bottom
  }

  const footerRect = document.querySelector('footer')?.getBoundingClientRect()
  const bottom =
    footerRect && footerRect.top > 0 && footerRect.top <= window.innerHeight
      ? Math.max(0, window.innerHeight - footerRect.top)
      : SHELL_DRAWER_BOTTOM_FALLBACK

  return { top, bottom }
}

// ── THE dropdown ─────────────────────────────────────────────────────────────
// Every select-style trigger in the workspace (rail presets, Theme preview's
// font / radius menus, colour family selects, the theme slot pickers) and every
// listbox it opens share ONE shell: the chrome control radius `rounded-lg`
// (8px — the same `RAIL_SURFACE_RADIUS` the edition cards use), a softened
// `line-strong` edge and an `elevated` fill. They had drifted into two
// silhouettes (`rounded-[13px] bg-surface border-line-strong` beside
// `rounded-lg bg-elevated`), so two dropdowns in one card read as two controls.
// A trigger composes `SELECT_SHELL` + `SELECT_FOCUS` with its own size/padding;
// a plain text select uses `SELECT_TRIGGER`.
export const SELECT_SHELL = 'rounded-lg border border-line-strong/80 bg-elevated/70 hover:border-line-strong hover:bg-elevated transition-colors'
export const SELECT_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
export const SELECT_TRIGGER = `w-full h-9 px-2.5 flex items-center gap-2 text-left ${SELECT_SHELL} ${SELECT_FOCUS}`
export const SELECT_LIST = 'rounded-lg border border-line-strong bg-app shadow-lg p-1'
export const SELECT_OPTION = 'w-full px-2.5 py-1.5 rounded-md text-left transition-colors'
export const SELECT_OPTION_ON = 'bg-elevated text-fg font-medium'
export const SELECT_OPTION_OFF = 'text-fg-muted hover:bg-surface hover:text-fg'
