// Shared brand/neutral color-apply logic — used by Foundations · Color and the
// Components quick-edit panel so both pick a swatch the same way.
//
// A theme is either "built-in" (light/dark — no `themePalettes` entry, draws
// its brand scale from the global `primaryScale`) or a "custom style theme"
// (has its own `themePalettes[key]`, entirely independent of the global
// scale). Applying a color always targets one specific `themeKey` (the theme
// currently being previewed) so a swatch click visibly updates what's on
// screen, whichever theme that happens to be.

import { useCallback, useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { generateColorScale, generateDarkColorScale } from './colorUtils'
import { ALL_ROLES, recToneFor, recDarkTone } from './semanticRoles'
import { derivedStopsFor } from './gradients'
import { neutralFromBrand, darkBackgroundOptions } from '../components/configurator/colorControls'

// The dark page background's presets are derived from the accent's hue, so when
// the accent moves the background has to move with it — otherwise the dark
// surfaces keep the OLD brand's tint and the dropdown shows an unlabeled hex.
// We re-derive the same preset SLOT (Ink stays Ink, Midnight stays Midnight)
// against the new accent. A background the user typed by hand matches no preset
// and is therefore left exactly as they set it.
function retintDarkBackground(current: string, prevAccent: string, nextAccent: string): string {
  const slot = darkBackgroundOptions(prevAccent).findIndex(
    (o) => o.hex.toLowerCase() === (current ?? '').toLowerCase(),
  )
  if (slot < 0) return current
  return darkBackgroundOptions(nextAccent)[slot]?.hex ?? current
}

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
    setGrayBaseColor, setGrayLightScale, setGrayDarkScale, setDarkBackground,
    gradients, updateGradient,
    colorAlgorithm, contrastShift, pageBackground, darkBackground, primaryColor,
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
          const kind = themeKinds[themeKey] ?? 'light'
          const neutral = neutralFromBrand(hex)
          // A dark-kind custom theme needs a dark-appearance gray ramp too,
          // otherwise its palette's gray would be a light ramp read inverted.
          const gScale = kind === 'dark'
            ? generateDarkColorScale(neutral, colorAlgorithm, contrastShift, darkBackground)
            : generateColorScale(neutral, colorAlgorithm, contrastShift, pageBackground)
          mergeThemePalette(themeKey, { gray: gScale })
          const grayUpdates = grayTokenUpdates(gScale, themes[themeKey] ?? {}, kind)
          if (Object.keys(grayUpdates).length) mergeThemeTokens(themeKey, grayUpdates)
        }
        return
      }

      setPrimaryColor(hex)
      setPrimaryScale(scale)
      // Move the dark page onto the new accent's hue before deriving the dark
      // ramp from it, so background + ramp + brand all agree.
      const nextDarkBg = retintDarkBackground(darkBackground, primaryColor, hex)
      if (nextDarkBg !== darkBackground) setDarkBackground(nextDarkBg)
      const neutral = linked ? neutralFromBrand(hex) : null
      const gScale = neutral ? generateColorScale(neutral, colorAlgorithm, contrastShift, pageBackground) : null
      // The dark twin — same neutral (so it carries the accent's hue), but grown
      // out of the dark page instead of the light one.
      const gDark = neutral ? generateDarkColorScale(neutral, colorAlgorithm, contrastShift, nextDarkBg) : null
      for (const t of themeOrder) {
        if (themePalettes[t]) continue // custom themes keep their own palette
        const kind = themeKinds[t] ?? 'light'
        const updates = brandTokenUpdates(scale, themes[t] ?? {}, kind)
        // Each theme kind re-tints its gray tokens from its own neutral ramp,
        // so dark surfaces track the accent just like the light ones do.
        const ramp = kind === 'dark' ? gDark : gScale
        if (ramp) Object.assign(updates, grayTokenUpdates(ramp, themes[t] ?? {}, kind))
        if (Object.keys(updates).length) mergeThemeTokens(t, updates)
      }
      if (neutral && gScale && gDark) {
        setGrayBaseColor(neutral)
        setGrayLightScale(gScale)
        setGrayDarkScale(gDark)
      }
      // Keep the accent-linked gradients on-brand. The link is an explicit
      // per-gradient lock (`linked`, toggled in the Gradients editor) — an
      // unlocked gradient is the user's to keep, whatever its colors.
      for (const g of gradients) {
        if (!g.linked) continue
        const stops = derivedStopsFor(g.id, hex)
        if (stops) updateGradient(g.id, { stops })
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [setPrimaryColor, setPrimaryScale, themes, themeOrder, themePalettes, themeKinds, mergeThemeTokens, mergeThemePalette, setGrayBaseColor, setGrayLightScale, setGrayDarkScale, setDarkBackground, gradients, updateGradient, colorAlgorithm, contrastShift, pageBackground, darkBackground, primaryColor])
}

// Seeds any still-empty global ramp from its base hex on mount. The primitives
// are normally generated by Home's quick bar (accent/neutral) and state
// swatches — but a system that never touched those controls (or predates them)
// carries empty state scales, and views that READ the ramps would dead-end.
// The Alias/Semantics matrix calls this so it always opens against the same
// primitives Home shows, instead of gating on "pick an accent first".
export function useEnsureColorScales() {
  useEffect(() => {
    const s = useDesignStore.getState()
    const gen = (base: string) => generateColorScale(base, s.colorAlgorithm, s.contrastShift, s.pageBackground)
    try {
      if (!Object.keys(s.primaryScale).length)   s.setPrimaryScale(gen(s.primaryColor))
      if (!Object.keys(s.errorScale).length)     s.setErrorScale(gen(s.errorColor))
      if (!Object.keys(s.warningScale).length)   s.setWarningScale(gen(s.warningColor))
      if (!Object.keys(s.successScale).length)   s.setSuccessScale(gen(s.successColor))
      if (!Object.keys(s.infoScale).length)      s.setInfoScale(gen(s.infoColor))
      if (!Object.keys(s.grayLightScale).length) s.setGrayLightScale(gen(s.grayBaseColor))
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
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
    setGrayBaseColor, setGrayLightScale, setGrayDarkScale,
    colorAlgorithm, contrastShift, pageBackground, darkBackground,
  } = useDesignStore()
  return useCallback((hex: string, themeKey = 'light') => {
    try {
      const scale = generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)
      const dScale = generateDarkColorScale(hex, colorAlgorithm, contrastShift, darkBackground)
      if (themePalettes[themeKey]) {
        const kind = themeKinds[themeKey] ?? 'light'
        const own = kind === 'dark' ? dScale : scale
        mergeThemePalette(themeKey, { gray: own })
        const updates = grayTokenUpdates(own, themes[themeKey] ?? {}, kind)
        if (Object.keys(updates).length) mergeThemeTokens(themeKey, updates)
        return
      }
      setGrayBaseColor(hex)
      setGrayLightScale(scale)
      setGrayDarkScale(dScale)
      // Both kinds re-tint now — a dark theme reads the dark ramp, not the fixed
      // achromatic one it used to be stuck with.
      for (const t of themeOrder) {
        if (themePalettes[t]) continue
        const kind = themeKinds[t] ?? 'light'
        const updates = grayTokenUpdates(kind === 'dark' ? dScale : scale, themes[t] ?? {}, kind)
        if (Object.keys(updates).length) mergeThemeTokens(t, updates)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [themes, themeOrder, themePalettes, themeKinds, mergeThemePalette, mergeThemeTokens, setGrayBaseColor, setGrayLightScale, setGrayDarkScale, colorAlgorithm, contrastShift, pageBackground, darkBackground])
}

// Applies a new DARK page background — the dark-theme twin of
// useApplyPageBackground. It anchors tone 12 of the dark neutral ramp (what dark
// themes read as surface-0), so changing it regenerates that ramp and resyncs
// every dark theme's gray tokens. The light ramps are untouched: a dark page and
// a light page are independent primitives.
export function useApplyDarkBackground() {
  return useCallback((hex: string) => {
    const s = useDesignStore.getState()
    try {
      const gDark = generateDarkColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, hex)
      s.setDarkBackground(hex)
      s.setGrayDarkScale(gDark)
      for (const t of s.themeOrder) {
        if (s.themePalettes[t] || (s.themeKinds[t] ?? 'light') !== 'dark') continue
        const updates = grayTokenUpdates(gDark, s.themes[t] ?? {}, 'dark')
        if (Object.keys(updates).length) s.mergeThemeTokens(t, updates)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
}

// Applies a new state/status color (error · warning · success · info) — sets the
// base hex and regenerates its 1–12 ramp against the current page background.
// Shared by Foundations · Color and Home's Background & State Colors panel so a
// swatch means the same thing in both.
export type StateRole = 'error' | 'warning' | 'success' | 'info'

export function useApplyStateColor() {
  return useCallback((role: StateRole, hex: string) => {
    const s = useDesignStore.getState()
    try {
      const scale = generateColorScale(hex, s.colorAlgorithm, s.contrastShift, s.pageBackground)
      if (role === 'error')        { s.setErrorColor(hex);   s.setErrorScale(scale) }
      else if (role === 'warning') { s.setWarningColor(hex); s.setWarningScale(scale) }
      else if (role === 'success') { s.setSuccessColor(hex); s.setSuccessScale(scale) }
      else                         { s.setInfoColor(hex);    s.setInfoScale(scale) }
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
}
