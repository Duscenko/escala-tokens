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
// repaint together on any primitive edit. The chain itself is
// `buildThemeArchitecture` (lib/themeArchitecture.ts), which the design system
// dashboard calls too.

import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { buildThemeArchitecture } from '../../lib/themeArchitecture'
import { appearanceFromModeKey, type ThemeAppearance } from '../../lib/themeModes'

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
  const built = useMemo(() => buildThemeArchitecture(store, previewTheme), [store, previewTheme])
  const {
    scales, isFlat, activeTheme, preferredAppearance, activeThemeSemantics,
    themeCols, archThemeCols, resolvedPalettes, archView,
  } = built
  const { pageBackground, darkBackground, semanticArchitecture } = store
  const activeAppearance = previewAppearance ?? preferredAppearance

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
