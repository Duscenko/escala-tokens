// Ephemeral "try-on" for a System Style preset.
//
// Clicking a preset in the Themes Library should let the designer SEE it on the
// live preview before committing — but a theme is real, persisted, auto-synced
// data (see `mintTheme`), so a try-on must not touch the store at all.
//
// This builds an OVERLAY store: a shallow copy of the real store with the
// preset's derived colour ramps, foundation overrides and appearance swapped in
// for `themeKey`, then runs it through the ordinary `resolvePreviewTokens`. No
// theme is minted, nothing persists, nothing syncs — clearing the overlay
// returns the preview to the real system in the same frame. The colour maths
// mirrors what `mintTheme` would produce, minus the commit.

import {
  generateColorScale,
  generateDarkColorScale,
  generateFamilyDarkScale,
  previewHarmony,
} from './colorUtils'
import { resolvePreviewTokens } from './previewTokens'
import type { ThemeStylePreset, ThemeStyleSemantics } from './themePresets'
import { themeModeKey, type ThemeAppearance } from './themeModes'
import type { useDesignStore } from '../store/useDesignStore'
import type { PreviewTokens } from '../components/preview/ButtonPreview'

type StoreState = ReturnType<typeof useDesignStore.getState>

/**
 * What the Themes Library hands the preview: a preset AND the appearance to
 * read it in. The appearance is a real second axis, not a property of the
 * preset — every preset's ramps carry a dark twin (Radix two-scale model), so
 * "Neo in dark" is a genuine reading of the same tokens, not a different style.
 * `preset.preferredAppearance` is only the STARTING position.
 */
export interface StylePreview {
  preset: ThemeStylePreset
  appearance: ThemeAppearance
}

function omitKey<T extends Record<string, unknown>>(obj: T | undefined, key: string): T {
  const clone = { ...(obj ?? {}) } as T
  delete clone[key]
  return clone
}

/**
 * A style's `semantics` expanded onto one theme's mode keys and merged into an
 * `architectureOverrides` map.
 *
 * Shared by the try-on (which builds a throwaway overlay) and `adoptPreset`
 * (which writes the real store), so a previewed style and the theme it mints
 * resolve from byte-identical overrides — the same reason `MintPages` exists.
 * Per-token, not per-theme: an entry the style doesn't name keeps whatever the
 * user had, and one it does name is replaced outright rather than merged, so a
 * second try-on can't inherit the first style's border recipe.
 */
export function withStyleSemantics(
  current: Record<string, Record<string, Record<string, string>>>,
  semantics: ThemeStyleSemantics | undefined,
  themeKey: string,
  architecture = 'categorical',
): Record<string, Record<string, Record<string, string>>> {
  if (!semantics) return current
  const forArch: Record<string, Record<string, string>> = { ...(current[architecture] ?? {}) }
  for (const [tokenId, modes] of Object.entries(semantics)) {
    const entry = { ...(forArch[tokenId] ?? {}) }
    for (const appearance of ['light', 'dark'] as const) {
      const ref = modes[appearance]
      const key = themeModeKey(themeKey, appearance)
      if (ref) entry[key] = ref
      else delete entry[key]
    }
    if (Object.keys(entry).length) forArch[tokenId] = entry
    else delete forArch[tokenId]
  }
  return { ...current, [architecture]: forArch }
}

/**
 * The preset's BRAND ramp in one appearance, derived exactly the way the
 * overlay below derives it — same pages, same algorithm, same contrast shift.
 *
 * Exported because the CHROME needs it too: `--accent-ui` / `--accent-solid`
 * and the Layer 0 wash resolve from `themeBrandRamp`, which reads the real
 * store and is therefore blind to a try-on — so trying a style on repainted the
 * canvas while the workspace around it stayed on the open system's accent. Two
 * accents on screen at once, from one selection. Sharing this derivation (not a
 * second, simpler one) is what keeps the chrome's blue and the canvas's blue the
 * same blue.
 */
export function stylePreviewBrandRamp(
  store: StoreState,
  preset: ThemeStylePreset,
  appearance: ThemeAppearance,
): Record<number, string> {
  const h = previewHarmony(preset.accent, preset.neutralTint)
  const alg = store.colorAlgorithm
  const shift = store.contrastShift
  return appearance === 'dark'
    ? generateFamilyDarkScale(preset.accent, alg, shift, h.pageDark)
    : generateColorScale(preset.accent, alg, shift, h.pageLight)
}

export function resolveStylePreviewTokens(
  store: StoreState,
  { preset, appearance }: StylePreview,
  themeKey: string,
): PreviewTokens {
  const tint = preset.neutralTint
  const h = previewHarmony(preset.accent, tint)
  const alg = store.colorAlgorithm
  const shift = store.contrastShift
  // THE PAGE IS THE PRESET'S, NOT THE OPEN SYSTEM'S.
  //
  // This read `store.pageBackground` / `store.darkBackground`, which made every
  // style's `neutralTint` invisible — the single most-reported bug about this
  // panel ("the neutral tint is the same in all of them"). The page is DERIVED
  // from the neutral and the tint (`backgroundFromBase`, see "Base drives the
  // page"), and tone 1 of the light ramp is that page emitted verbatim — so
  // anchoring six differently-tinted neutrals to ONE borrowed page produced six
  // identical surfaces. Measured, previewing every preset over the default
  // system: light `#ffffff` and dark `#0c0e12` for all six, where Retro should
  // read `#fff8f3` / `#1c110b` (warm paper) and Nature `#f6fdf0` / `#0f1706`.
  //
  // `previewHarmony` already computes both pages for exactly this purpose; the
  // fields were simply never read. Every ramp — accent and status too, not just
  // the neutral — anchors to them, because a family grows out of the page it
  // will actually sit on.
  const light = h.pageLight
  const dark = h.pageDark

  // The preset IS the reading of the primitives — drop this theme's own family
  // references, semantic overrides and materialised map so the projection can't
  // be pinned to them, exactly like a freshly minted theme wouldn't have any.
  const overlay: StoreState = {
    ...store,
    neutralTint: tint,
    pageBackground: light,
    darkBackground: dark,
    primaryColor: preset.accent,
    grayBaseColor: h.neutral,
    errorColor: h.states.error,
    warningColor: h.states.warning,
    successColor: h.states.success,
    infoColor: h.states.info,
    primaryScale: generateColorScale(preset.accent, alg, shift, light),
    primaryDarkScale: generateFamilyDarkScale(preset.accent, alg, shift, dark),
    grayLightScale: generateColorScale(h.neutral, alg, shift, light, 'light', tint),
    grayDarkScale: generateDarkColorScale(h.neutral, alg, shift, dark, tint),
    errorScale: generateColorScale(h.states.error, alg, shift, light),
    errorDarkScale: generateFamilyDarkScale(h.states.error, alg, shift, dark),
    warningScale: generateColorScale(h.states.warning, alg, shift, light),
    warningDarkScale: generateFamilyDarkScale(h.states.warning, alg, shift, dark),
    successScale: generateColorScale(h.states.success, alg, shift, light),
    successDarkScale: generateFamilyDarkScale(h.states.success, alg, shift, dark),
    infoScale: generateColorScale(h.states.info, alg, shift, light),
    infoDarkScale: generateFamilyDarkScale(h.states.info, alg, shift, dark),
    themeSources: omitKey(store.themeSources, themeKey),
    themeSemantics: omitKey(store.themeSemantics, themeKey),
    themes: omitKey(store.themes, themeKey),
    themeKinds: { ...store.themeKinds, [themeKey]: appearance },
    // The style's own role overrides, expanded onto THIS theme's mode keys —
    // the same shape `setArchitectureOverride` writes, so the try-on resolves
    // them through the identical `buildArchitectureView` path an adopted theme
    // does. Merged UNDER the store's existing overrides for other tokens but
    // OVER this theme's own entries for the tokens the style names, so trying a
    // style on never silently keeps the previous style's border recipe.
    architectureOverrides: withStyleSemantics(store.architectureOverrides, preset.semantics, themeKey),
    // The preset REPLACES this theme's foundations; it does not layer over them.
    // Merging `store.themeFoundations[themeKey]` underneath meant every
    // foundation the preset doesn't define (grid, gradients, icons) leaked in
    // from whichever theme happened to be open — so the same style previewed
    // differently depending on where you clicked it from. A try-on has to show
    // the style, not the style wearing another theme's leftovers.
    themeFoundations: { ...store.themeFoundations, [themeKey]: preset.foundations },
  }

  return resolvePreviewTokens(overlay, themeKey, appearance)
}
