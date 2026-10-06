// What a download for the Figma plugin carries when the person has no Escala
// Pro: ONE library theme in ONE appearance (Light or Dark, whichever is on
// screen) and the Desktop viewport with its one grid style, XL Desktop — the
// free tier on /pricing. Pro ships both columns of up to ten themes.
//
// A SOFT limit, and meant to be understood as one: the exporter and the plugin
// are MIT, so anyone can lift it. The hard limits live on the server (hosted
// sync, live MCP). This one is a fair-use nudge at the two places where the
// full multi-theme JSON for Figma is handed out — the Export wizard's Figma
// destination and Save's "tokens.json · Figma plugin" — and it is simply
// absent whenever `useEntitlement().pro` is true (the launch promo included).

import type { ThemeAppearance } from './themeModes'
import { figmaSyncThemeKeys } from './themeLibrary'
import type { GenerateTokenOptions } from './tokenGenerator'

export type FigmaScope = Pick<GenerateTokenOptions, 'themes' | 'modes' | 'viewports' | 'gridStyles'>

/** The scope a free download uses. `preferred` is the theme on screen when
 *  there is one; otherwise the first theme in My themes. `appearance` is the
 *  one column that ships — the one on screen; without it, the theme's own kind.
 *  With no themes at all there is nothing to narrow, so only the viewports are
 *  limited. */
export function freeFigmaScope(
  preferred: string | undefined,
  themeOrder: string[],
  themes: Record<string, unknown>,
  themeKinds: Record<string, string | undefined>,
  appearance?: ThemeAppearance,
): FigmaScope {
  const keys = figmaSyncThemeKeys(themeOrder, themes)
  const theme = preferred && keys.includes(preferred) ? preferred : keys[0]
  if (!theme) return { viewports: ['desktop'], gridStyles: ['xl-desktop'] }
  return { themes: [theme], modes: [{ theme, appearance: appearance ?? (themeKinds[theme] === 'dark' ? 'dark' : 'light') }], viewports: ['desktop'], gridStyles: ['xl-desktop'] }
}
