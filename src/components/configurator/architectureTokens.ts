// The Categorical projection, resolved for ONE theme — shared derivation.
//
// Two surfaces render the same semantic tokens and must never disagree about
// them: the Semantics TABLE (`Step3_SemanticTokens`) and Theme Preview's
// inspector Token Details drawer. Both need the identical chain —
// `scales` → `resolveThemePalette` per mode → `buildArchitectureView` — and
// that chain is where the subtle rules live (the dark twin under `scales.dark`,
// `pageBackground`/`darkBackground` being REQUIRED or every alpha ref resolves
// `transparent`, the per-theme mode keys). A second copy of it is a second
// answer to "what colour is `surface.page` in this theme".
//
// It reads the store itself rather than taking a snapshot, so both surfaces
// repaint together on any primitive edit.

import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { buildArchitectureView } from '../../lib/semanticArchitectures'
import { resolveThemePalette } from '../../lib/themeSources'
import type { GlobalScales } from '../../lib/semanticRoles'
import {
  appearanceFromModeKey, appearanceOrder, semanticModesFor, themeModeKey, type ThemeAppearance,
} from '../../lib/themeModes'

type StoreState = ReturnType<typeof useDesignStore.getState>

export function useArchitectureTokens(
  previewTheme: string,
  previewAppearance?: ThemeAppearance,
  /** A try-on overlay — same object `resolveStylePreviewTokens` paints the
   *  board from. Omit it and the drawer reads the live store, which is how
   *  pointing at a Nature card opened Token Details on the committed cyan
   *  theme's refs (accent.7 on `surface.layer-1`). */
  overlay?: StoreState | null,
) {
  const live = useDesignStore()
  const store = overlay ?? live
  const {
    primaryScale, primaryDarkScale, grayLightScale, grayDarkScale,
    errorScale, errorDarkScale, warningScale, warningDarkScale,
    successScale, successDarkScale, infoScale, infoDarkScale,
    primaryColor, errorColor, pageBackground, darkBackground,
    themes, themeSemantics, themeSources, themeKinds, themeOrder, customColors,
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

  const activeTheme = previewTheme && themeOrder.includes(previewTheme)
    ? previewTheme
    : (themeOrder[0] ?? 'light')
  const preferredAppearance = themeKinds[activeTheme] ?? 'light'
  const activeAppearance = previewAppearance ?? preferredAppearance
  const activeThemeSemantics = semanticModesFor(themeSemantics, themes, activeTheme, preferredAppearance)
  // The theme's spectrum leads: a dark-spectrum theme reads Dark → Light.
  const themeCols = appearanceOrder(preferredAppearance)
  const archThemeCols = themeCols.map((appearance) => themeModeKey(activeTheme, appearance))

  const resolvedPalettes = useMemo(() => {
    const out: Record<string, NonNullable<ReturnType<typeof resolveThemePalette>>> = {}
    for (const appearance of themeCols) {
      const p = resolveThemePalette(themeSources[activeTheme], appearance, store)
      if (p) out[themeModeKey(activeTheme, appearance)] = p
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTheme, themeSources, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, customColors])

  const isFlat = semanticArchitecture === 'flat'
  const archView = useMemo(
    () =>
      isFlat
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
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semanticArchitecture, primaryColor, errorColor, primaryScale, grayLightScale, grayDarkScale, errorScale, warningScale, successScale, infoScale, activeThemeSemantics, resolvedPalettes, architectureOverrides, themeCols, archThemeCols, pageBackground, darkBackground],
  )

  const kindOf = (mode: string): ThemeAppearance =>
    appearanceFromModeKey(mode) ?? (mode === 'dark' ? 'dark' : 'light')
  const archModeKeys = archView?.modeKeys ?? archThemeCols
  /** The mode key whose value the user is currently LOOKING at. */
  const previewedMode =
    archModeKeys.find((mode) => kindOf(mode) === activeAppearance) ?? archModeKeys[0]

  return {
    store, scales, isFlat,
    activeTheme, preferredAppearance, activeAppearance, activeThemeSemantics,
    themeCols, archThemeCols, resolvedPalettes,
    archView, kindOf, archModeKeys, previewedMode,
    pageBackground, darkBackground, semanticArchitecture,
  }
}
