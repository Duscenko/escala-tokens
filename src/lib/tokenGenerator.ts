import { useDesignStore } from '../store/useDesignStore'
import { getIconLibrary } from './iconLibraries'
import { toneLabel, type ColorNaming } from './colorUtils'

// Version of the tokens.json contract shared with the Figma plugin. The plugin
// declares the schema it supports and logs a warning when this is newer.
export const TOKEN_SCHEMA_VERSION = 1

// Flatten a numeric color scale into prefixed string keys, e.g. brand-1 … brand-12
// (or brand-50 … brand-1000 under the "hundreds" naming scheme).
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
    ...flattenScale('brand', store.primaryScale, colorNaming),
    ...flattenScale('gray', store.grayLightScale, colorNaming),
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

  // Custom color families adopt the same prefixed structure (teal-1 … teal-12).
  store.customColors.forEach((c) => {
    Object.assign(primitive, flattenScale(c.key, c.scale, colorNaming))
  })

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
