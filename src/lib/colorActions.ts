// Shared brand/neutral color-apply logic — used by Foundations · Color and the
// Components quick-edit panel so both pick a swatch the same way.
//
// Every theme resolves its ramps through primitive FAMILIES (`themeSources`),
// so "apply a colour to theme X" means: retint the family X reads for that
// slot. A theme pointing at a global family ('accent' / 'neutral') therefore
// edits the system's own primitive; one pointing at a custom family edits that
// family. Applying always targets a specific `themeKey` (the previewed one) so
// a swatch click visibly updates what's on screen.

import { useCallback, useEffect, useRef } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { generateColorScale, generateDarkColorScale, generateFamilyDarkScale, backgroundFromBase, recommendStateColors } from './colorUtils'
import { ALL_ROLES, recToneFor, recDarkTone } from './semanticRoles'
import { linkedStopsFor } from './gradients'
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
// stale brand color. A theme that reads a CUSTOM family instead retints that
// family: the theme owns no colour, so editing "its" accent means editing the
// primitive it points at (which every other theme on that family sees too).
export function useApplyAccentColor() {
  const {
    setPrimaryColor, setPrimaryScale, setPrimaryDarkScale, themes, themeOrder, themeSources, themeKinds,
    mergeThemeTokens, updateCustomColor,
    setGrayBaseColor, setGrayLightScale, setGrayDarkScale,
    setPageBackground, setDarkBackground,
    gradients, updateGradient,
    colorAlgorithm, contrastShift, pageBackground, darkBackground, neutralTint, linkStatesToAccent,
  } = useDesignStore()

  return useCallback((hex: string, linked = true, themeKey = 'light') => {
    try {
      const refs = themeSources[themeKey]
      if (refs && refs.brand !== 'accent') {
        // Retint the family this theme reads. No token resync needed here: the
        // theme resolves through the family, so it follows automatically.
        const scale = generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground)
        const dark = generateFamilyDarkScale(hex, colorAlgorithm, contrastShift, darkBackground)
        updateCustomColor(refs.brand, { base: hex, scale, darkScale: dark })
        if (linked && refs.gray !== 'neutral') {
          const kind = themeKinds[themeKey] ?? 'light'
          const neutral = neutralFromBrand(hex, neutralTint)
          const gScale = kind === 'dark'
            ? generateDarkColorScale(neutral, colorAlgorithm, contrastShift, darkBackground)
            : generateColorScale(neutral, colorAlgorithm, contrastShift, pageBackground)
          updateCustomColor(refs.gray, { base: neutral, scale: gScale, darkScale: gScale })
        }
        return
      }

      // The page follows the BASE, not the accent — so it only moves when the
      // base does, i.e. while the link is on. Unlinked, the user's base (and the
      // page computed from it) is theirs to keep.
      const neutral = linked ? neutralFromBrand(hex, neutralTint) : null
      const nextBg = neutral ? backgroundFromBase(neutral, 'light', neutralTint) : pageBackground
      const nextDarkBg = neutral ? backgroundFromBase(neutral, 'dark', neutralTint) : darkBackground
      const pageMoved = nextBg !== pageBackground
      // Every ramp is re-anchored to whatever page we land on — tone 1 grows
      // out of it, so a moved page that only rebuilt the brand would leave the
      // status ramps anchored to the old one.
      const gen = (base: string) => generateColorScale(base, colorAlgorithm, contrastShift, nextBg)
      const scale = gen(hex)
      // Every coloured family keeps a dark twin in step with its light ramp.
      const genDark = (base: string) => generateFamilyDarkScale(base, colorAlgorithm, contrastShift, nextDarkBg)
      const scaleDark = genDark(hex)
      // The NEUTRAL's own ramps pass the tint; the coloured families above
      // deliberately don't. `chromaLink` means "continue from the page's
      // chroma", which is only meaningful for the family the page is DERIVED
      // from — same hue. Feeding it to the accent would paint the page's
      // chroma at the accent's hue and turn its step 2 into a saturated fill.
      const gScale = neutral ? generateColorScale(neutral, colorAlgorithm, contrastShift, nextBg, 'light', neutralTint) : null
      // The dark twin — same neutral (so it carries the accent's hue), but grown
      // out of the dark page instead of the light one.
      const gDark = neutral ? generateDarkColorScale(neutral, colorAlgorithm, contrastShift, nextDarkBg, neutralTint) : null

      if (pageMoved) setPageBackground(nextBg)
      if (nextDarkBg !== darkBackground) setDarkBackground(nextDarkBg)
      setPrimaryColor(hex)
      setPrimaryScale(scale)
      setPrimaryDarkScale(scaleDark)
      if (pageMoved) {
        const s = useDesignStore.getState()
        s.customColors.forEach((c) => s.updateCustomColor(c.key, { scale: gen(c.base), darkScale: genDark(c.base) }))
      }
      // States (error/warning/success/info) optionally track the accent too —
      // same contract as the neutral link just above, for the four status
      // primitives. Linked, `recommendStateColors` blends the NEW accent's
      // chroma into each canonical hue (hue + lightness stay put, so red stays
      // red) — the exact math the old one-shot "match states" button ran, now
      // re-applied on every accent edit instead of a manual click. Unlinked, a
      // state's own colour is left untouched but its ramp still re-anchors when
      // the page moved, same as every other coloured family above.
      if (linkStatesToAccent || pageMoved) {
        const s = useDesignStore.getState()
        const rec = linkStatesToAccent ? recommendStateColors(hex) : null
        const nextError = rec?.error ?? s.errorColor
        const nextWarning = rec?.warning ?? s.warningColor
        const nextSuccess = rec?.success ?? s.successColor
        const nextInfo = rec?.info ?? s.infoColor
        if (rec) s.setErrorColor(nextError)
        s.setErrorScale(gen(nextError)); s.setErrorDarkScale(genDark(nextError))
        if (rec) s.setWarningColor(nextWarning)
        s.setWarningScale(gen(nextWarning)); s.setWarningDarkScale(genDark(nextWarning))
        if (rec) s.setSuccessColor(nextSuccess)
        s.setSuccessScale(gen(nextSuccess)); s.setSuccessDarkScale(genDark(nextSuccess))
        if (rec) s.setInfoColor(nextInfo)
        s.setInfoScale(gen(nextInfo)); s.setInfoDarkScale(genDark(nextInfo))
      }
      for (const t of themeOrder) {
        // Only themes reading the GLOBAL accent follow this change.
        if ((themeSources[t]?.brand ?? 'accent') !== 'accent') continue
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
      // Re-resolved against the new RAMP, passing the current stops so the
      // user's own tones, positions and stop count survive the retint — a
      // linked gradient tracks the accent, it isn't reset by it.
      for (const g of gradients) {
        if (!g.linked) continue
        // Both ramps: one `tone` reference, resolved into a light value AND a
        // dark one, so a linked gradient tracks the accent in both appearances
        // rather than going stale the moment the preview flips to dark.
        const stops = linkedStopsFor(g.id, scale, g.stops, scaleDark)
        if (stops) updateGradient(g.id, { stops })
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [setPrimaryColor, setPrimaryScale, setPrimaryDarkScale, themes, themeOrder, themeSources, themeKinds, mergeThemeTokens, updateCustomColor, setGrayBaseColor, setGrayLightScale, setGrayDarkScale, setPageBackground, setDarkBackground, gradients, updateGradient, colorAlgorithm, contrastShift, pageBackground, darkBackground, neutralTint, linkStatesToAccent])
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
    const genDark = (base: string) => generateFamilyDarkScale(base, s.colorAlgorithm, s.contrastShift, s.darkBackground)
    const empty = (o?: Record<number, string>) => !o || !Object.keys(o).length
    try {
      if (!Object.keys(s.primaryScale).length)   s.setPrimaryScale(gen(s.primaryColor))
      if (!Object.keys(s.errorScale).length)     s.setErrorScale(gen(s.errorColor))
      if (!Object.keys(s.warningScale).length)   s.setWarningScale(gen(s.warningColor))
      if (!Object.keys(s.successScale).length)   s.setSuccessScale(gen(s.successColor))
      if (!Object.keys(s.infoScale).length)      s.setInfoScale(gen(s.infoColor))
      // `genNeutral`, not `gen`: only the neutral carries the tint's chroma link.
      if (!Object.keys(s.grayLightScale).length) s.setGrayLightScale(generateColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, s.pageBackground, 'light', s.neutralTint))
      // Dark twins — backfills systems created before the two-scale model.
      if (empty(s.primaryDarkScale)) s.setPrimaryDarkScale(genDark(s.primaryColor))
      if (empty(s.errorDarkScale))   s.setErrorDarkScale(genDark(s.errorColor))
      if (empty(s.warningDarkScale)) s.setWarningDarkScale(genDark(s.warningColor))
      if (empty(s.successDarkScale)) s.setSuccessDarkScale(genDark(s.successColor))
      if (empty(s.infoDarkScale))    s.setInfoDarkScale(genDark(s.infoColor))
      s.customColors.forEach((c) => { if (empty(c.darkScale)) s.updateCustomColor(c.key, { darkScale: genDark(c.base) }) })
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
}

// Rebuilds EVERY ramp from its stored base colour when the contrast shift (or
// the scale algorithm) changes — those inputs feed `generateColorScale`, but
// the ramps themselves are materialised in the store, so without this the
// slider changed a number that nothing ever re-read.
//
// This logic used to live as a local effect inside `Step2_ColorPalette`, which
// `Configurator.tsx` stopped rendering when it special-cased the Color
// foundation to mount `ColorHub` instead — so the effect silently never ran
// and the control was inert no matter what the maths did. Mounted at the shell
// now, so it can't be orphaned by a future re-route again.
//
// Deliberately does NOT fire on mount: `prev` is seeded with the CURRENT value
// on first render, so only a real change regenerates. Firing on mount would
// overwrite every hand-edited tone with a freshly generated one on each page
// load.
export function useRegenerateScalesOnScaleSettings() {
  const contrastShift = useDesignStore((s) => s.contrastShift)
  const colorAlgorithm = useDesignStore((s) => s.colorAlgorithm)
  const prev = useRef<string | null>(null)

  useEffect(() => {
    const key = `${colorAlgorithm}:${contrastShift}`
    if (prev.current === null) { prev.current = key; return }
    if (prev.current === key) return
    prev.current = key

    const s = useDesignStore.getState()
    const gen = (base: string) => generateColorScale(base, s.colorAlgorithm, s.contrastShift, s.pageBackground)
    const genDark = (base: string) => generateFamilyDarkScale(base, s.colorAlgorithm, s.contrastShift, s.darkBackground)
    try {
      s.setPrimaryScale(gen(s.primaryColor))
      s.setPrimaryDarkScale(genDark(s.primaryColor))
      s.setErrorScale(gen(s.errorColor))
      s.setErrorDarkScale(genDark(s.errorColor))
      s.setWarningScale(gen(s.warningColor))
      s.setWarningDarkScale(genDark(s.warningColor))
      s.setSuccessScale(gen(s.successColor))
      s.setSuccessDarkScale(genDark(s.successColor))
      s.setInfoScale(gen(s.infoColor))
      s.setInfoDarkScale(genDark(s.infoColor))
      // Gray's dark twin is a genuine dark-neutral ramp (anchored to the dark
      // page), not the generic family transform — same split useEnsureColorScales
      // and the accent applier use.
      s.setGrayLightScale(generateColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, s.pageBackground, 'light', s.neutralTint))
      s.setGrayDarkScale(generateDarkColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, s.darkBackground, s.neutralTint))
      s.customColors.forEach((c) =>
        s.updateCustomColor(c.key, { scale: gen(c.base), darkScale: genDark(c.base) }),
      )
    } catch {
      /* invalid hex — leave the ramps as they are */
    }
  }, [contrastShift, colorAlgorithm])
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
        if ((s.themeSources[t]?.brand ?? 'accent') !== 'accent') continue
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

// Applies a new BASE hex — the neutral every surface is computed from. Since
// HeroUI's model landed, the base is also what the page background derives from
// (`backgroundFromBase`), so a base change is a page change: both backgrounds
// are rewritten and EVERY ramp is re-anchored to the new light page, because
// `pageBackground` is what tone 1 of each ramp grows out of. A theme reading a
// CUSTOM neutral family retints that family instead and leaves the globals (and
// the page) alone — only the system's own Base moves the page.
export function useApplyGrayColor() {
  /** `fromLink` marks the ONE caller that isn't a user edit: the accent applier
   *  re-deriving the neutral because the link is on. Every other path is a
   *  person setting the neutral by hand, which unlinks it — otherwise their
   *  choice would be silently overwritten on the next accent change. The accent
   *  applier writes the gray inline (it doesn't route through here), so this
   *  defaults to `false` safely; the flag exists for any future caller that
   *  does need to recompute without unlinking. */
  return useCallback((hex: string, themeKey = 'light', fromLink = false) => {
    const s = useDesignStore.getState()
    try {
      if (!fromLink && s.linkNeutralToAccent) s.setLinkNeutralToAccent(false)
      const refs = s.themeSources[themeKey]
      if (refs && refs.gray !== 'neutral') {
        const kind = s.themeKinds[themeKey] ?? 'light'
        const own = kind === 'dark'
          ? generateDarkColorScale(hex, s.colorAlgorithm, s.contrastShift, s.darkBackground)
          : generateColorScale(hex, s.colorAlgorithm, s.contrastShift, s.pageBackground)
        s.updateCustomColor(refs.gray, { base: hex, scale: own })
        return
      }

      const bg = backgroundFromBase(hex, 'light', s.neutralTint)
      const darkBg = backgroundFromBase(hex, 'dark', s.neutralTint)
      const gen = (base: string) => generateColorScale(base, s.colorAlgorithm, s.contrastShift, bg)
      const genDark = (base: string) => generateFamilyDarkScale(base, s.colorAlgorithm, s.contrastShift, darkBg)
      // Generate everything first — an invalid base throws before any write.
      // `hex` IS the neutral here, so its two ramps take the tint; `gen` (used
      // for brand/status/customs below) deliberately doesn't.
      const scale = generateColorScale(hex, s.colorAlgorithm, s.contrastShift, bg, 'light', s.neutralTint)
      const dScale = generateDarkColorScale(hex, s.colorAlgorithm, s.contrastShift, darkBg, s.neutralTint)
      const brandScale = gen(s.primaryColor)
      const errorScale = gen(s.errorColor)
      const warningScale = gen(s.warningColor)
      const successScale = gen(s.successColor)
      const infoScale = gen(s.infoColor)
      const customScales = s.customColors.map((c) => [c.key, gen(c.base), genDark(c.base)] as const)

      s.setGrayBaseColor(hex)
      s.setPageBackground(bg)
      s.setDarkBackground(darkBg)
      s.setGrayLightScale(scale)
      s.setGrayDarkScale(dScale)
      s.setPrimaryScale(brandScale)
      s.setErrorScale(errorScale)
      s.setWarningScale(warningScale)
      s.setSuccessScale(successScale)
      s.setInfoScale(infoScale)
      // The page moved, so every dark twin is re-anchored to the new dark page.
      s.setPrimaryDarkScale(genDark(s.primaryColor))
      s.setErrorDarkScale(genDark(s.errorColor))
      s.setWarningDarkScale(genDark(s.warningColor))
      s.setSuccessDarkScale(genDark(s.successColor))
      s.setInfoDarkScale(genDark(s.infoColor))
      customScales.forEach(([key, sc, dk]) => s.updateCustomColor(key, { scale: sc, darkScale: dk }))

      // Both kinds re-tint: a dark theme reads the dark ramp, and every theme's
      // brand tokens move too since their ramp was re-anchored to the new page.
      for (const t of s.themeOrder) {
        if ((s.themeSources[t]?.gray ?? 'neutral') !== 'neutral') continue
        const kind = s.themeKinds[t] ?? 'light'
        const updates = brandTokenUpdates(brandScale, s.themes[t] ?? {}, kind)
        Object.assign(updates, grayTokenUpdates(kind === 'dark' ? dScale : scale, s.themes[t] ?? {}, kind))
        if (Object.keys(updates).length) s.mergeThemeTokens(t, updates)
      }
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
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
      const gDark = generateDarkColorScale(s.grayBaseColor, s.colorAlgorithm, s.contrastShift, hex, s.neutralTint)
      s.setDarkBackground(hex)
      s.setGrayDarkScale(gDark)
      for (const t of s.themeOrder) {
        if ((s.themeSources[t]?.gray ?? 'neutral') !== 'neutral' || (s.themeKinds[t] ?? 'light') !== 'dark') continue
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
  /** `fromLink` marks the ONE caller that isn't a user edit: the accent
   *  applier re-deriving this state because `linkStatesToAccent` is on — same
   *  contract as `useApplyGrayColor`'s `fromLink`. Every other path is a
   *  person setting the state by hand, which unlinks it, so their choice is
   *  never silently overwritten on the next accent change. */
  return useCallback((role: StateRole, hex: string, fromLink = false) => {
    const s = useDesignStore.getState()
    try {
      if (!fromLink && s.linkStatesToAccent) s.setLinkStatesToAccent(false)
      const scale = generateColorScale(hex, s.colorAlgorithm, s.contrastShift, s.pageBackground)
      const dark = generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, s.darkBackground)
      if (role === 'error')        { s.setErrorColor(hex);   s.setErrorScale(scale); s.setErrorDarkScale(dark) }
      else if (role === 'warning') { s.setWarningColor(hex); s.setWarningScale(scale); s.setWarningDarkScale(dark) }
      else if (role === 'success') { s.setSuccessColor(hex); s.setSuccessScale(scale); s.setSuccessDarkScale(dark) }
      else                         { s.setInfoColor(hex);    s.setInfoScale(scale); s.setInfoDarkScale(dark) }
    } catch {
      /* invalid hex — ignore */
    }
  }, [])
}
