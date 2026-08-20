import { useDesignStore, DEFAULT_GRAY_DARK_SCALE } from '../store/useDesignStore'
import { getIconLibrary } from './iconLibraries'
import { toneLabel, generateAlphaScale, darkShadowMap, type ColorNaming } from './colorUtils'
import { resolveThemePalette } from './themeSources'
import { ALL_ROLES, sourceScaleFor, normalizeThemeValue, type GlobalScales } from './semanticRoles'
import { projectArchitecture, projectCategorical } from './semanticArchitectures'
import { gradientToCss, gradientSlug } from './gradients'

// Version of the tokens.json contract shared with the Figma plugin. The plugin
// declares the schema it supports and logs a warning when this is newer.
// v2: primitive color families renamed brand→accent, gray→neutral.
// v3: semantic token KEYS renamed to a readable taxonomy (bg-primary → surface-0,
//     bg-accent-solid → action-primary, fg-* → icon-*, text-*_on-accent → text-on-brand-*).
// v5: `opacity` REMOVED — a standalone 0–100% transparency scale duplicated
//     what `colors.primitiveAlpha` (accent-a-1…12, composited per family
//     against the real page) already covers, and shipping both read as two
//     conflicting answers to "what's the transparency token." The plugin's
//     `tokens.opacity` import is already guarded (`if (tokens.opacity)`), so
//     an older configurator's payload (still carrying the field) keeps
//     importing fine — this bump is for anything that treats an ABSENT field
//     as a real gap rather than "not part of this system."
export const TOKEN_SCHEMA_VERSION = 5

// Flatten a numeric color scale into prefixed string keys, e.g. accent-1 … accent-12
// (or accent-50 … accent-1000 under the "hundreds" naming scheme).
export function flattenScale(
  name: string,
  scale: Record<number, string>,
  naming: ColorNaming,
): Record<string, string> {
  const result: Record<string, string> = {}
  Object.entries(scale).forEach(([k, v]) => {
    if (v) result[`${name}-${toneLabel(naming, Number(k))}`] = v
  })
  return result
}

/**
 * Everything `projectArchitecture()` (and the "Categorical Semantic
 * (AI-Guided)" export builder, `buildCategoricalSymbolicTokens` below) needs
 * to resolve semantic values against the current primitives. Shared so
 * `generateTokenJSON()` and that export builder can never compute two
 * different answers for the same theme/scale — "everything derives from one
 * source" applies to this resolution step too, not just the final JSON call.
 */
function buildThemeContext(store: ReturnType<typeof useDesignStore.getState>) {
  // Dark-appearance ramps — EVERY family ships both scales (the Radix model),
  // because dark-theme semantics resolve from the dark twin (see
  // sourceScaleFor). Without them the plugin has nothing to alias a dark brand
  // tint to and would fall back to a loose hex.
  const grayDarkScale = store.grayDarkScale ?? DEFAULT_GRAY_DARK_SCALE
  const hasDarkTheme = Object.entries(store.themeKinds ?? {}).some(
    ([t, kind]) => kind === 'dark' && store.themes[t],
  ) || Boolean(store.themes.dark)

  // Themes in the user's column order (themeOrder), with any stragglers appended.
  // The plugin maps each theme to one variable-collection mode (column), so this
  // ordering is the Figma column order.
  const themeNames = [
    ...store.themeOrder.filter((t) => store.themes[t]),
    ...Object.keys(store.themes).filter((t) => !store.themeOrder.includes(t)),
  ]

  // Normalize every semantic value onto its role's CURRENT source ramp: values
  // that are a tone of the ramp pass through; empty or stale ones (left over
  // after a scale was regenerated) snap to the recommended tone. This keeps the
  // export in lockstep with the primitives so the Figma plugin can alias every
  // semantic to a primitive variable instead of holding loose hex values.
  const globalScales: GlobalScales = {
    gray:     store.grayLightScale,
    grayDark: grayDarkScale,
    // Dark twins — a dark theme resolves every family from these.
    dark: {
      gray:    grayDarkScale,
      brand:   store.primaryDarkScale,
      error:   store.errorDarkScale,
      warning: store.warningDarkScale,
      success: store.successDarkScale,
      info:    store.infoDarkScale,
    },
    brand:    store.primaryScale,
    error:    store.errorScale,
    warning:  store.warningScale,
    success:  store.successScale,
    info:     store.infoScale,
  }
  const resolvedPalettes: Record<string, NonNullable<ReturnType<typeof resolveThemePalette>>> = {}
  for (const name of themeNames) {
    const p = resolveThemePalette(store.themeSources[name], store.themeKinds[name] ?? 'light', store)
    if (p) resolvedPalettes[name] = p
  }
  const orderedThemes: Record<string, Record<string, string>> = {}
  for (const name of themeNames) {
    const kind = store.themeKinds[name] ?? 'light'
    const palette = resolveThemePalette(store.themeSources[name], kind, store)
    // Build from scratch (not a spread of the stored map) so only current
    // catalogue roles ship — stale keys from a prior architecture never leak.
    // The stored map is still READ, per role, as `normalizeThemeValue`'s
    // `current`: that's what preserves a hand-edited token.
    //
    // This used to pass `normalized[role.key]` — the map being built, which is
    // empty on the very line that fills it, so `current` was ALWAYS undefined
    // and normalizeThemeValue always fell through to `recHexFor` (the
    // recommended default). Every manual edit in the Semantics table was
    // silently discarded at export: the configurator showed the edited colour,
    // tokens.json (and therefore Figma) carried the default. Reported as
    // "cambié los tokens en la capa semantic y no se exportó tal cual".
    //
    // Reading the stored value does NOT reintroduce the stale-key leak the
    // comment above guards: only ALL_ROLES keys are ever iterated, and
    // normalizeThemeValue keeps `current` only when it's a real tone of THIS
    // theme's resolved scale — a value left over from another palette fails
    // that check and falls back to the recommendation.
    const stored = store.themes[name] ?? {}
    const normalized: Record<string, string> = {}
    for (const role of ALL_ROLES) {
      const scale = sourceScaleFor(role, kind, globalScales, palette)
      if (!scale || Object.keys(scale).length === 0) continue
      const hex = normalizeThemeValue(role, kind, scale, stored[role.key])
      if (hex) normalized[role.key] = hex
    }
    orderedThemes[name] = normalized
  }

  return { grayDarkScale, hasDarkTheme, themeNames, globalScales, resolvedPalettes, orderedThemes }
}

/**
 * The Categorical architecture's SYMBOLIC ref tree — group → key → theme →
 * `"{family.tone}"` — i.e. `projectCategorical()`'s raw output, before
 * `resolveCuratedForExport` turns it into hex. Powers the "Categorical
 * Semantic (AI-Guided)" export format (see `exportWizard.ts`), which needs
 * real aliases (`"$value": "{neutral.12}"`), not resolved colour. Shares
 * `buildThemeContext` with `generateTokenJSON()`, so this can never disagree
 * with the hex `colors.architecture` ships when Categorical is the active
 * architecture.
 */
export function buildCategoricalSymbolicTokens(): {
  themeOrder: string[]
  tokens: Record<string, Record<string, Record<string, string>>>
} {
  const store = useDesignStore.getState()
  const { themeNames, globalScales, resolvedPalettes } = buildThemeContext(store)
  const tokens = projectCategorical(
    { themes: {}, themeKinds: store.themeKinds, themePalettes: resolvedPalettes, scales: globalScales, accent: store.primaryColor },
    themeNames,
  )
  return { themeOrder: themeNames, tokens }
}

export function generateTokenJSON() {
  const store = useDesignStore.getState()
  const { typography, colorNaming } = store
  const { grayDarkScale, hasDarkTheme, themeNames, globalScales, resolvedPalettes, orderedThemes } = buildThemeContext(store)

  // Merge all color scales into a single primitive map with prefixed keys.
  // Only include secondary scales if they've been populated (non-empty objects).
  const primitive: Record<string, string> = {
    ...flattenScale('accent', store.primaryScale, colorNaming),
    ...flattenScale('neutral', store.grayLightScale, colorNaming),
    ...(Object.keys(store.errorScale).length
      ? flattenScale('error', store.errorScale, colorNaming)
      : {}),
    ...(Object.keys(store.warningScale).length
      ? flattenScale('warning', store.warningScale, colorNaming)
      : {}),
    ...(Object.keys(store.successScale).length
      ? flattenScale('success', store.successScale, colorNaming)
      : {}),
    ...(Object.keys(store.infoScale).length
      ? flattenScale('info', store.infoScale, colorNaming)
      : {}),
  }

  if (hasDarkTheme) {
    const dark: [string, Record<number, string> | undefined][] = [
      ['neutral-dark', grayDarkScale],
      ['accent-dark', store.primaryDarkScale],
      ['error-dark', store.errorDarkScale],
      ['warning-dark', store.warningDarkScale],
      ['success-dark', store.successDarkScale],
      ['info-dark', store.infoDarkScale],
    ]
    for (const [name, scale] of dark) {
      if (scale && Object.keys(scale).length) Object.assign(primitive, flattenScale(name, scale, colorNaming))
    }
  }

  // Custom color families adopt the same prefixed structure (teal-1 … teal-12),
  // dark twin included.
  store.customColors.forEach((c) => {
    Object.assign(primitive, flattenScale(c.key, c.scale, colorNaming))
    if (hasDarkTheme && c.darkScale && Object.keys(c.darkScale).length) {
      Object.assign(primitive, flattenScale(`${c.key}-dark`, c.darkScale, colorNaming))
    }
  })

  // Alpha twins (Radix custom-palette architecture): the overlay colour that
  // reproduces each solid step when composited over its page — solved from
  // `solid = α·overlay + (1−α)·page` and verified to rebuild the solid exactly.
  // Background-dependent by construction, and therefore per appearance: a light
  // ramp layers black over the light page, a dark ramp layers white over the
  // dark one. Hence both `*-a*` and `*-dark-a*`.
  const primitiveAlpha: Record<string, string> = {}
  const alphaOf = (name: string, scale: Record<number, string>) => {
    if (!Object.keys(scale).length) return
    Object.assign(primitiveAlpha, flattenScale(name, generateAlphaScale(scale, store.pageBackground, 'light'), colorNaming))
  }
  const alphaDarkOf = (name: string, scale?: Record<number, string>) => {
    if (!hasDarkTheme || !scale || !Object.keys(scale).length) return
    Object.assign(primitiveAlpha, flattenScale(`${name}-dark`, generateAlphaScale(scale, store.darkBackground, 'dark'), colorNaming))
  }
  alphaOf('accent', store.primaryScale);   alphaDarkOf('accent', store.primaryDarkScale)
  alphaOf('neutral', store.grayLightScale); alphaDarkOf('neutral', grayDarkScale)
  alphaOf('error', store.errorScale);      alphaDarkOf('error', store.errorDarkScale)
  alphaOf('warning', store.warningScale);  alphaDarkOf('warning', store.warningDarkScale)
  alphaOf('success', store.successScale);  alphaDarkOf('success', store.successDarkScale)
  alphaOf('info', store.infoScale);        alphaDarkOf('info', store.infoDarkScale)
  store.customColors.forEach((c) => { alphaOf(c.key, c.scale); alphaDarkOf(c.key, c.darkScale) })

  // No per-theme namespaced ramps any more: a theme REFERENCES a family, and
  // every family already shipped above under its own key. The theme's semantics
  // therefore alias the same primitive variables the families export.
  // (themeNames/globalScales/resolvedPalettes/orderedThemes are all resolved
  // above, by the shared `buildThemeContext` call.)

  // Semantic architecture projection (Alias/Semantics picker). Additive: the
  // flat shape above always ships (plugin contract, schemaVersion 3); a
  // non-flat choice ships its projection alongside under colors.architecture.
  const architecture = projectArchitecture(
    store.semanticArchitecture,
    {
      themes: orderedThemes,
      themeKinds: store.themeKinds,
      themePalettes: resolvedPalettes,
      scales: globalScales,
      accent: store.primaryColor,
    },
    store.errorColor,
    // Was missing entirely — table edits (setArchitectureOverride) never
    // reached the actual export, only the live Alias/Semantics preview.
    store.architectureOverrides[store.semanticArchitecture] ?? {},
    // Every theme, so a Categorical system with an added theme ships that
    // column too, not just the two built-ins.
    themeNames,
  )

  return {
    // Contract version the Figma plugin checks on import. Bump only on a
    // breaking change to the payload shape; the plugin warns on a mismatch.
    schemaVersion: TOKEN_SCHEMA_VERSION,
    project: store.projectName,
    colors: {
      // The page background every ramp is generated against and every alpha
      // token composites over (Radix custom-palette "background" input).
      background: store.pageBackground,
      primitive,
      // Alpha twins of the light-appearance primitives, derived vs background.
      primitiveAlpha,
      // 'semantic'/'semanticDark' stay for Figma-plugin compatibility; 'themes'
      // carries the full multi-theme map (incl. user-added themes), and
      // 'themeOrder' is the column order the plugin creates modes in.
      semantic: orderedThemes.light ?? store.themes.light ?? {},
      semanticDark: orderedThemes.dark ?? store.themes.dark ?? {},
      themes: orderedThemes,
      themeOrder: themeNames,
      // Radix-style panel treatment for surface-1 (cards, panels, sections).
      panelBackground: store.panelBackground,
      // Which semantic architecture the system standardizes on, plus the
      // projected token structure when it isn't the flat default.
      semanticArchitecture: store.semanticArchitecture,
      ...(architecture ? { architecture } : {}),
    },
    typography: {
      fontFamily: typography.fontFamily,
      headingFontFamily: typography.headingFontFamily ?? typography.fontFamily,
      sizes: typography.sizes,
      lineHeights: typography.lineHeights,
      weights: typography.weights,
    },
    spacing: store.spacing,
    // Per-side surface padding for padded surfaces (cards, tiles, panels).
    padding: store.padding,
    // Named gradients (slug → CSS) + which one drives each preview surface.
    gradients: Object.fromEntries(store.gradients.map((g) => [gradientSlug(g), gradientToCss(g)])),
    // The dark appearance, ADDITIVE and keyed by the SAME slugs — a consumer
    // that only knows `gradients` reads byte-identical values to before. A
    // gradient with no dark override resolves to its light CSS here, so the map
    // is always complete: a plugin can bind a dark mode without having to check
    // which entries exist.
    gradientsDark: Object.fromEntries(store.gradients.map((g) => [gradientSlug(g), gradientToCss(g, 'dark')])),
    gradientAssignments: (() => {
      const slugOf = (id: string | null) => {
        const g = store.gradients.find((x) => x.id === id)
        return g ? gradientSlug(g) : null
      }
      return { cover: slugOf(store.gradientAssignments.cover), avatar: slugOf(store.gradientAssignments.avatar) }
    })(),
    radius: store.radius,
    shadows: store.shadows,
    // Dark twin of the elevation ramp — ADDITIVE, exactly like `gradientsDark`
    // beside `gradients`: `shadows` is unchanged, this is a complete parallel
    // map under the SAME keys, so a consumer never has to test which entries
    // exist and an older plugin simply ignores the field (hence no
    // schemaVersion bump). It exists because the ramp's near-black shadow
    // colour IS the dark page: unoverridden, every elevation composites to
    // within 0.36 of one 8-bit level of the background. See `darkShadow`.
    shadowsDark: darkShadowMap(store.shadows),
    grid: store.grid,
    sizes: store.sizes,
    icons: {
      library: store.iconLibrary,
      name: getIconLibrary(store.iconLibrary)?.label ?? store.iconLibrary,
      package: getIconLibrary(store.iconLibrary)?.npm ?? '',
      // Iconify collection prefix — the Figma plugin fetches the library's
      // core glyphs from api.iconify.design and imports them as components.
      prefix: getIconLibrary(store.iconLibrary)?.iconifyPrefix ?? store.iconLibrary,
      custom: store.customIcons,
    },
    style: null,
    // 'atoms' is the canonical field name the Figma plugin expects.
    atoms: store.selectedComponents,
  }
}

export function downloadTokenJSON() {
  const tokens = generateTokenJSON()
  const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tokens.project || 'scalable-designs'}-tokens.json`
  a.click()
}
