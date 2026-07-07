import { useDesignStore, GRAY_DARK_SCALE, type ThemePalette } from '../store/useDesignStore'
import { getIconLibrary } from './iconLibraries'
import { toneLabel, type ColorNaming } from './colorUtils'

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

  // Dark-mode neutral ramp — dark-theme gray semantics are seeded from
  // GRAY_DARK_SCALE (see Step3's scaleFor), so it must ship as primitives too,
  // otherwise the Figma plugin has nothing to alias dark neutrals to.
  const hasDarkTheme = Object.entries(store.themeKinds ?? {}).some(
    ([t, kind]) => kind === 'dark' && store.themes[t] && !store.themePalettes[t],
  ) || Boolean(store.themes.dark)
  if (hasDarkTheme) {
    Object.assign(primitive, flattenScale('neutral-dark', GRAY_DARK_SCALE, colorNaming))
  }

  // Custom color families adopt the same prefixed structure (teal-1 … teal-12).
  store.customColors.forEach((c) => {
    Object.assign(primitive, flattenScale(c.key, c.scale, colorNaming))
  })

  // Custom style themes carry their own source ramps (themePalettes). Export
  // each ramp namespaced by theme ("ocean/accent-7") so that theme's semantic
  // values can alias primitives in Figma instead of holding loose hex values.
  const PALETTE_FAMILY: Record<keyof ThemePalette, string> = {
    brand: 'accent', gray: 'neutral',
    error: 'error', warning: 'warning', success: 'success', info: 'info',
  }
  for (const [theme, pal] of Object.entries(store.themePalettes)) {
    if (!store.themes[theme]) continue
    for (const [src, family] of Object.entries(PALETTE_FAMILY) as [keyof ThemePalette, string][]) {
      const scale = pal[src]
      if (scale && Object.keys(scale).length) {
        Object.assign(primitive, flattenScale(`${theme}/${family}`, scale, colorNaming))
      }
    }
  }

  // Themes in the user's column order (themeOrder), with any stragglers appended.
  // The plugin maps each theme to one variable-collection mode (column), so this
  // ordering is the Figma column order.
  const themeNames = [
    ...store.themeOrder.filter((t) => store.themes[t]),
    ...Object.keys(store.themes).filter((t) => !store.themeOrder.includes(t)),
  ]
  const orderedThemes: Record<string, Record<string, string>> = {}
  for (const name of themeNames) orderedThemes[name] = store.themes[name]

  return {
    // Contract version the Figma plugin checks on import. Bump only on a
    // breaking change to the payload shape; the plugin warns on a mismatch.
    schemaVersion: TOKEN_SCHEMA_VERSION,
    project: store.projectName,
    colors: {
      primitive,
      // 'semantic'/'semanticDark' stay for Figma-plugin compatibility; 'themes'
      // carries the full multi-theme map (incl. user-added themes), and
      // 'themeOrder' is the column order the plugin creates modes in.
      semantic: store.themes.light ?? {},
      semanticDark: store.themes.dark ?? {},
      themes: orderedThemes,
      themeOrder: themeNames,
    },
    typography: {
      fontFamily: typography.fontFamily,
      headingFontFamily: typography.headingFontFamily ?? typography.fontFamily,
      sizes: typography.sizes,
      lineHeights: typography.lineHeights,
      weights: typography.weights,
    },
    spacing: store.spacing,
    radius: store.radius,
    opacity: store.opacity,
    shadows: store.shadows,
    grid: store.grid,
    sizes: store.sizes,
    icons: {
      library: store.iconLibrary,
      name: getIconLibrary(store.iconLibrary)?.label ?? store.iconLibrary,
      package: getIconLibrary(store.iconLibrary)?.npm ?? '',
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
