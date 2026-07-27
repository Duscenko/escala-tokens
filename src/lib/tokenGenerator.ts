import { useDesignStore, GRAY_DARK_SCALE, type ThemePalette } from '../store/useDesignStore'
import { getIconLibrary } from './iconLibraries'
import { toneLabel, generateAlphaScale, type ColorNaming } from './colorUtils'
import { resolveThemePalette } from './themeSources'
import { ALL_ROLES, sourceScaleFor, normalizeThemeValue, type GlobalScales } from './semanticRoles'
import { projectArchitecture } from './semanticArchitectures'
import { gradientToCss, gradientSlug } from './gradients'

// Version of the tokens.json contract shared with the Figma plugin. The plugin
// declares the schema it supports and logs a warning when this is newer.
// v2: primitive color families renamed brand→accent, gray→neutral.
// v3: semantic token KEYS renamed to a readable taxonomy (bg-primary → surface-0,
//     bg-accent-solid → action-primary, fg-* → icon-*, text-*_on-accent → text-on-brand-*).
export const TOKEN_SCHEMA_VERSION = 3

// Flatten a numeric color scale into prefixed string keys, e.g. accent-1 … accent-12
// (or accent-50 … accent-1000 under the "hundreds" naming scheme).
function flattenScale(
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

export function generateTokenJSON() {
  const store = useDesignStore.getState()
  const { typography, colorNaming } = store

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

  // Dark-mode neutral ramp — dark-theme gray semantics resolve from it (see
  // sourceScaleFor), so it must ship as primitives too, otherwise the Figma
  // plugin has nothing to alias dark neutrals to. It's now generated from the
  // neutral against `darkBackground` rather than a fixed constant.
  const grayDarkScale = store.grayDarkScale ?? GRAY_DARK_SCALE
  const hasDarkTheme = Object.entries(store.themeKinds ?? {}).some(
    ([t, kind]) => kind === 'dark' && store.themes[t] && (store.themeSources[t]?.gray ?? 'neutral') === 'neutral',
  ) || Boolean(store.themes.dark)
  if (hasDarkTheme) {
    Object.assign(primitive, flattenScale('neutral-dark', grayDarkScale, colorNaming))
  }

  // Custom color families adopt the same prefixed structure (teal-1 … teal-12).
  store.customColors.forEach((c) => {
    Object.assign(primitive, flattenScale(c.key, c.scale, colorNaming))
  })

  // Alpha twins (Radix custom-palette architecture): for every light-appearance
  // ramp, the overlay color that reproduces each solid step when composited
  // over the page background (#rrggbbaa). Background-dependent by construction
  // — which is why `pageBackground` ships alongside as `colors.background`.
  const primitiveAlpha: Record<string, string> = {}
  const alphaOf = (name: string, scale: Record<number, string>) => {
    if (!Object.keys(scale).length) return
    Object.assign(primitiveAlpha, flattenScale(name, generateAlphaScale(scale, store.pageBackground), colorNaming))
  }
  alphaOf('accent', store.primaryScale)
  alphaOf('neutral', store.grayLightScale)
  alphaOf('error', store.errorScale)
  alphaOf('warning', store.warningScale)
  alphaOf('success', store.successScale)
  alphaOf('info', store.infoScale)
  store.customColors.forEach((c) => alphaOf(c.key, c.scale))

  // No per-theme namespaced ramps any more: a theme REFERENCES a family, and
  // every family already shipped above under its own key. The theme's semantics
  // therefore alias the same primitive variables the families export.

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
    const normalized: Record<string, string> = {}
    for (const role of ALL_ROLES) {
      const scale = sourceScaleFor(role, kind, globalScales, palette)
      if (!scale || Object.keys(scale).length === 0) continue
      const hex = normalizeThemeValue(role, kind, scale, normalized[role.key])
      if (hex) normalized[role.key] = hex
    }
    orderedThemes[name] = normalized
  }

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
    gradientAssignments: (() => {
      const slugOf = (id: string | null) => {
        const g = store.gradients.find((x) => x.id === id)
        return g ? gradientSlug(g) : null
      }
      return { cover: slugOf(store.gradientAssignments.cover), avatar: slugOf(store.gradientAssignments.avatar) }
    })(),
    radius: store.radius,
    opacity: store.opacity,
    shadows: store.shadows,
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
