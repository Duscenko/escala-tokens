// The Categorical projection for ONE brand, as a pure function of the store.
//
// `scales` → `resolveThemePalette` per mode → `buildArchitectureView`. The
// subtle rules live in this chain: the dark twin under `scales.dark`,
// `pageBackground` / `darkBackground` being REQUIRED (every alpha ref resolves
// `transparent` without them) and the per-theme mode keys. The Semantics table,
// the Token Details drawer and the design system dashboard all read it from
// here, so they cannot give two answers to "what colour is `surface.page`".

import type { useDesignStore } from '../store/useDesignStore'
import { buildArchitectureView } from './semanticArchitectures'
import { resolveThemePalette } from './themeSources'
import type { GlobalScales } from './semanticRoles'
import { appearanceOrder, semanticModesFor, themeModeKey } from './themeModes'

type StoreState = ReturnType<typeof useDesignStore.getState>

export function buildThemeArchitecture(store: StoreState, theme: string) {
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
    primaryColor, errorColor, pageBackground, darkBackground,
    themes, themeSemantics, themeSources, themeKinds, themeOrder,
    semanticArchitecture, architectureOverrides,
  } = store

  // `grayDark` is what dark themes resolve their gray roles from and MUST be
  // passed — see Step3's own note: omitting it makes every dark gray look stale.
  const scales: GlobalScales = {
    gray: grayLightScale,
    grayDark: grayDarkScale,
    dark: {
      gray: grayDarkScale,
      brand: primaryDarkScale,
      error: errorDarkScale,
      warning: warningDarkScale,
      success: successDarkScale,
      info: infoDarkScale,
    },
    brand: primaryScale,
    error: errorScale,
    warning: warningScale,
    success: successScale,
    info: infoScale,
  }

  const activeTheme = theme && themeOrder.includes(theme) ? theme : (themeOrder[0] ?? 'light')
  const preferredAppearance = themeKinds[activeTheme] ?? 'light'
  const activeThemeSemantics = semanticModesFor(themeSemantics, themes, activeTheme, preferredAppearance)
  // The theme's spectrum leads: a dark-spectrum theme reads Dark → Light.
  const themeCols = appearanceOrder(preferredAppearance)
  const archThemeCols = themeCols.map((appearance) => themeModeKey(activeTheme, appearance))

  const resolvedPalettes: Record<string, NonNullable<ReturnType<typeof resolveThemePalette>>> = {}
  for (const appearance of themeCols) {
    const p = resolveThemePalette(themeSources[activeTheme], appearance, store)
    if (p) resolvedPalettes[themeModeKey(activeTheme, appearance)] = p
  }

  const isFlat = semanticArchitecture === 'flat'
  const archView = isFlat
    ? null
    : buildArchitectureView(
        semanticArchitecture,
        {
          themes: Object.fromEntries(
            themeCols.map((appearance) => [themeModeKey(activeTheme, appearance), activeThemeSemantics[appearance]]),
          ),
          themeKinds: Object.fromEntries(
            themeCols.map((appearance) => [themeModeKey(activeTheme, appearance), appearance]),
          ),
          themePalettes: resolvedPalettes,
          scales,
          accent: primaryColor,
          // REQUIRED — `{accent-a.N}` is composited against the page on
          // demand and resolves `undefined` without them.
          pageBackground,
          darkBackground,
        },
        errorColor,
        architectureOverrides[semanticArchitecture] ?? {},
        archThemeCols,
      )

  return {
    scales, isFlat, activeTheme, preferredAppearance, activeThemeSemantics,
    themeCols, archThemeCols, resolvedPalettes, archView,
  }
}
