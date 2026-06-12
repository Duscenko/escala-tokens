import { useDesignStore } from '../store/useDesignStore'
import { getIconLibrary } from './iconLibraries'

// Flatten a numeric color scale into prefixed string keys, e.g. brand-1 … brand-12
function flattenScale(
  name: string,
  scale: Record<number, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  Object.entries(scale).forEach(([k, v]) => {
    if (v) result[`${name}-${k}`] = v
  })
  return result
}

export function generateTokenJSON() {
  const store = useDesignStore.getState()
  const { typography } = store

  // Merge all color scales into a single primitive map with prefixed keys.
  // Only include secondary scales if they've been populated (non-empty objects).
  const primitive: Record<string, string> = {
    ...flattenScale('brand', store.primaryScale),
    ...flattenScale('gray', store.grayLightScale),
    ...(Object.keys(store.errorScale).length
      ? flattenScale('error', store.errorScale)
      : {}),
    ...(Object.keys(store.warningScale).length
      ? flattenScale('warning', store.warningScale)
      : {}),
    ...(Object.keys(store.successScale).length
      ? flattenScale('success', store.successScale)
      : {}),
    ...(Object.keys(store.infoScale).length
      ? flattenScale('info', store.infoScale)
      : {}),
  }

  // Custom color families adopt the same prefixed structure (teal-1 … teal-12).
  store.customColors.forEach((c) => {
    Object.assign(primitive, flattenScale(c.key, c.scale))
  })

  return {
    project: store.projectName,
    colors: {
      primitive,
      // 'semantic'/'semanticDark' stay for Figma-plugin compatibility; 'themes'
      // carries the full multi-theme map (incl. user-added themes).
      semantic: store.themes.light ?? {},
      semanticDark: store.themes.dark ?? {},
      themes: store.themes,
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
