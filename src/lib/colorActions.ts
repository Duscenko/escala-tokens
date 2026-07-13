// Shared brand/neutral color-apply logic — used by Foundations · Color and the
// Components quick-edit panel so both pick a swatch the same way.
//
// A theme is either "built-in" (light/dark — no `themePalettes` entry, draws
// its brand scale from the global `primaryScale`) or a "custom style theme"
// (has its own `themePalettes[key]`, entirely independent of the global
// scale). Applying a color always targets one specific `themeKey` (the theme
// currently being previewed) so a swatch click visibly updates what's on
// screen, whichever theme that happens to be.

import { useCallback } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { generateColorScale } from './colorUtils'
import { ALL_ROLES, recToneFor, recDarkTone } from './semanticRoles'
import { neutralFromBrand } from '../components/configurator/colorControls'

const BRAND_ROLES = ALL_ROLES.filter((r) => r.scale === 'brand')

// Recomputes the brand-mapped semantic tokens already present in `targetTokens`
// from a freshly generated scale — keeps e.g. action-primary / text-brand in
// sync with the brand color without touching unmapped roles. Resolves each
// role's tone through `recToneFor`, the SAME resolver the Semantic editor and
// export use, so dark themes read their inverted tones (text-brand 12→6, …)
// instead of the light-only tone that made brand text unreadable on dark.
function brandTokenUpdates(
  scale: Record<number, string>,
  targetTokens: Record<string, string>,
  kind: 'light' | 'dark' = 'light',
): Record<string, string> {
  const updates: Record<string, string> = {}
  for (const role of BRAND_ROLES) {
    if (!targetTokens[role.key]) continue
    const t = recToneFor(role, kind, scale)
    if (scale[t]) updates[role.key] = scale[t]
  }
  return updates
}

const GRAY_ROLES = ALL_ROLES.filter((r) => r.scale === 'gray')

// Same idea for gray-mapped tokens (surface-*, text-*, border-*, icon-* grays):
// recomputes every gray role already present in `targetTokens` from a fresh
// neutral scale, so the whole theme re-tints when the neutral changes. Dark
// themes read their tones through recDarkTone (inverted hierarchy).
function grayTokenUpdates(
  scale: Record<number, string>,
  targetTokens: Record<string, string>,
  kind: 'light' | 'dark' = 'light',
): Record<string, string> {
  const updates: Record<string, string> = {}
  for (const role of GRAY_ROLES) {
    if (!targetTokens[role.key]) continue
    const t = kind === 'dark' ? recDarkTone(role) : role.tone
    if (scale[t]) updates[role.key] = scale[t]
  }
  return updates
}

// Applies a new accent (brand) hex to `themeKey`. Built-in themes (light/dark)
// share the global scale, so updating one refreshes every built-in theme's
// already-mapped tokens together — otherwise switching themes would show a
// stale brand color. A custom theme instead gets its own palette updated,
// leaving the global scale and every other theme untouched.
export function useApplyAccentColor() {
  const {
    setPrimaryColor, setPrimaryScale, themes, themeOrder, themePalettes, themeKinds,
    mergeThemeTokens, mergeThemePalette,
    setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift, pageBackground,
  } = useDesignStore()

  return useCallback((hex: string, linked = true, themeKey = 'light') => {
    try {
      const scale = generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)

      if (themePalettes[themeKey]) {
        // Custom style theme — independent palette, doesn't touch the globals.
        mergeThemePalette(themeKey, { brand: scale })
        const updates = brandTokenUpdates(scale, themes[themeKey] ?? {}, themeKinds[themeKey] ?? 'light')
        if (Object.keys(updates).length) mergeThemeTokens(themeKey, updates)
        if (linked) {
          const gScale = generateColorScale(neutralFromBrand(hex), colorAlgorithm, contrastShift, pageBackground)
          mergeThemePalette(themeKey, { gray: gScale })
          const grayUpdates = grayTokenUpdates(gScale, themes[themeKey] ?? {}, themeKinds[themeKey] ?? 'light')
          if (Object.keys(grayUpdates).length) mergeThemeTokens(themeKey, grayUpdates)
        }
        return
      }

      setPrimaryColor(hex)
      setPrimaryScale(scale)
      const gScale = linked ? generateColorScale(neutralFromBrand(hex), colorAlgorithm, contrastShift, pageBackground) : null
      for (const t of themeOrder) {
        if (themePalettes[t]) continue // custom themes keep their own palette
        const updates = brandTokenUpdates(scale, themes[t] ?? {}, themeKinds[t] ?? 'light')
        // Built-in dark keeps its fixed achromatic ramp — only light-kind
        // themes re-tint their gray tokens from the linked neutral.
        if (gScale && (themeKinds[t] ?? 'light') === 'light') {
          Object.assign(updates, grayTokenUpdates(gScale, themes[t] ?? {}))
        }
        if (Object.keys(updates).length) mergeThemeTokens(t, updates)
      }
      if (gScale) {
        setGrayBaseColor(neutralFromBrand(hex))
        setGrayLightScale(gScale)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [setPrimaryColor, setPrimaryScale, themes, themeOrder, themePalettes, themeKinds, mergeThemeTokens, mergeThemePalette, setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift, pageBackground])
}

// Applies a new page background. The background is the anchor every ramp is
// generated against (tone 1 lightness) and the compositing base for the
// exported alpha ramps — so changing it must rebuild every global ramp from
// its current base color AND resync the mapped semantic tokens, exactly like
// an accent/neutral change does. Reads fresh state via getState() so the new
// hex is used immediately (no stale-closure pageBackground). Custom style
// themes keep their own palettes (same scope as the accent/neutral actions).
export function useApplyPageBackground() {
  return useCallback((hex: string) => {
    const s = useDesignStore.getState()
    try {
      const gen = (base: string) => generateColorScale(base, s.colorAlgorithm, s.contrastShift, hex)
      const brandScale = gen(s.primaryColor)
      const grayScale = gen(s.grayBaseColor)
      // Generate everything first — an invalid base throws before any write.
      const errorScale = gen(s.errorColor)
      const warningScale = gen(s.warningColor)
      const successScale = gen(s.successColor)
      const infoScale = gen(s.infoColor)
      const customScales = s.customColors.map((c) => [c.key, gen(c.base)] as const)

      s.setPageBackground(hex)
      s.setPrimaryScale(brandScale)
      s.setGrayLightScale(grayScale)
      s.setErrorScale(errorScale)
      s.setWarningScale(warningScale)
      s.setSuccessScale(successScale)
      s.setInfoScale(infoScale)
      customScales.forEach(([key, scale]) => s.updateCustomColor(key, { scale }))

      // Resync the mapped semantic tokens of every built-in theme so surface-*,
      // text-*, border-* etc. track the re-anchored ramps (custom themes keep
      // their own palettes). Unmapped status-* tokens self-repair via Step3's
      // stale-detection resync on mount.
      for (const t of s.themeOrder) {
        if (s.themePalettes[t]) continue
        const updates = brandTokenUpdates(brandScale, s.themes[t] ?? {}, s.themeKinds[t] ?? 'light')
        if ((s.themeKinds[t] ?? 'light') === 'light') {
          Object.assign(updates, grayTokenUpdates(grayScale, s.themes[t] ?? {}))
        }
        if (Object.keys(updates).length) s.mergeThemeTokens(t, updates)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
}

// Applies a new neutral/gray hex to `themeKey`. Built-in light draws its gray
// scale from the global `grayLightScale` (dark uses a fixed achromatic ramp,
// unaffected by this); a custom theme gets its own palette updated instead.
export function useApplyGrayColor() {
  const {
    themes, themeOrder, themePalettes, themeKinds, mergeThemePalette, mergeThemeTokens,
    setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift, pageBackground,
  } = useDesignStore()
  return useCallback((hex: string, themeKey = 'light') => {
    try {
      const scale = generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)
      if (themePalettes[themeKey]) {
        mergeThemePalette(themeKey, { gray: scale })
        const updates = grayTokenUpdates(scale, themes[themeKey] ?? {}, themeKinds[themeKey] ?? 'light')
        if (Object.keys(updates).length) mergeThemeTokens(themeKey, updates)
        return
      }
      setGrayBaseColor(hex)
      setGrayLightScale(scale)
      for (const t of themeOrder) {
        if (themePalettes[t] || (themeKinds[t] ?? 'light') !== 'light') continue
        const updates = grayTokenUpdates(scale, themes[t] ?? {})
        if (Object.keys(updates).length) mergeThemeTokens(t, updates)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [themes, themeOrder, themePalettes, themeKinds, mergeThemePalette, mergeThemeTokens, setGrayBaseColor, setGrayLightScale, colorAlgorithm, contrastShift, pageBackground])
}
