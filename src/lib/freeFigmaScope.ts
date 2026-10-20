// What a download for the Figma plugin carries when the person has no Escala
// Pro: every brand and theme, on the Desktop, Tablet and Mobile viewports
// (grid styles XL Desktop, MD Tablet and SM Mobile), up to FREE_MAX_MODES (10)
// theme columns — the free tier on /pricing. More than 10 modes is Pro.
//
// A SOFT limit, and meant to be understood as one: the exporter is MIT, so a
// fork can lift it, and the compiled plugin can still be read. The hard limits
// live on the server (hosted sync). The same cut is applied to every
// download a Free account can take — Figma JSON, CSS, W3C, Tailwind, Markdown,
// the Skill zip and the agent package — and it is simply absent whenever the
// account is Pro (or accounts are off, so a local checkout stays whole).

import type { ThemeAppearance } from './themeModes'
import { figmaSyncThemeKeys } from './themeLibrary'
import { soleShippedAppearance, type BrandThemes } from './brandThemes'
import { FREE_MAX_MODES } from './entitlement'
import type { GenerateTokenOptions } from './tokenGenerator'

export type FigmaScope = Pick<GenerateTokenOptions, 'themes' | 'modes' | 'viewports' | 'gridStyles'>

/** The scope a free download uses. `preferred` is the theme on screen when
 *  there is one and leads the list; the rest follow in My themes order, up to
 *  the Free cap. A brand set to ship ONE theme ships that one; otherwise both
 *  columns. With no themes at all there is nothing to narrow, so only the
 *  viewports are limited. `appearance` and `themeKinds` are kept in the
 *  signature for callers; Free no longer picks a single appearance. */
export function freeFigmaScope(
  preferred: string | undefined,
  themeOrder: string[],
  themes: Record<string, unknown>,
  _themeKinds: Record<string, string | undefined>,
  _appearance?: ThemeAppearance,
  brandThemes?: BrandThemes,
): FigmaScope {
  const viewports: FigmaScope['viewports'] = ['desktop', 'tablet', 'mobile']
  const gridStyles: FigmaScope['gridStyles'] = ['xl-desktop', 'md-tablet', 'sm-mobile']
  const keys = figmaSyncThemeKeys(themeOrder, themes)
  const lead = preferred && keys.includes(preferred) ? [preferred] : []
  const chosen = [...lead, ...keys.filter((k) => !lead.includes(k))]
  if (!chosen.length) return { viewports, gridStyles }
  const modes = chosen.flatMap((theme) => {
    const one = soleShippedAppearance(brandThemes, theme)
    const both: ThemeAppearance[] = one ? [one] : ['light', 'dark']
    return both.map((appearance) => ({ theme, appearance }))
  }).slice(0, FREE_MAX_MODES)
  return { themes: [...new Set(modes.map((m) => m.theme))], modes, viewports, gridStyles }
}

/** The store `buildCSS` / `buildMarkdown` actually read: one theme, and the
 *  semantic map of the one appearance in `scope`. Primitives stay — a dark
 *  theme's JSON still ships the light ramps it aliases. No mode in the scope
 *  (no themes yet) leaves the store as it is; viewports are a CSS concern. */
export function freeDownloadStore<T extends {
  themeOrder: string[]
  themes: Record<string, Record<string, string>>
  themeKinds: Record<string, 'light' | 'dark'>
  themeSemantics?: Record<string, Partial<Record<ThemeAppearance, Record<string, string>>>>
}>(store: T, scope: FigmaScope): T {
  const mode = scope.modes?.[0]
  const single = scope.modes?.length === 1
  if (scope.themes && !single) {
    // Several columns ship: narrow to the allowed themes, keep every appearance.
    const keep = new Set(scope.themes)
    const only = <V,>(rec: Record<string, V>) => Object.fromEntries(Object.entries(rec).filter(([k]) => keep.has(k) || !store.themeOrder.includes(k)))
    return {
      ...store,
      themeOrder: store.themeOrder.filter((k) => keep.has(k)),
      themes: only(store.themes),
      themeKinds: only(store.themeKinds) as typeof store.themeKinds,
    }
  }
  const semantics = mode
    ? store.themeSemantics?.[mode.theme]?.[mode.appearance] ?? store.themes[mode.theme]
    : undefined
  if (!mode || !semantics) return store
  return {
    ...store,
    themeOrder: [mode.theme],
    themes: { [mode.theme]: semantics },
    themeKinds: { ...store.themeKinds, [mode.theme]: mode.appearance },
  }
}
