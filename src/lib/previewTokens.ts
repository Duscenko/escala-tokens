// Single source of truth for resolving the live-preview tokens from the store.
// Extracted from ComponentCatalogue so the right-hand PreviewPanel and the
// component docs render from the exact same resolved values. Fallbacks cover
// empty semantic tokens so previews never render with undefined colors.

import { useDesignStore } from '../store/useDesignStore'
import type { PreviewTokens } from '../components/preview/ButtonPreview'

type StoreState = ReturnType<typeof useDesignStore.getState>

export function resolvePreviewTokens(store: StoreState, themeKey = 'light'): PreviewTokens {
  const { primaryColor, grayLightScale, errorColor, warningColor, successColor, infoColor, radius, spacing, typography } = store
  // Render the requested theme (driven by the Semantic table's eye toggle).
  // A custom "style theme" carries its own palette — use it for the fallbacks.
  const semanticTokens = store.themes[themeKey] ?? store.themes.light ?? {}
  const pal = store.themePalettes[themeKey]
  const brandFallback = pal?.brand?.[8] || primaryColor
  const grayScale = pal?.gray ?? grayLightScale
  return {
    surface: semanticTokens['bg-primary'] || '#ffffff',
    brandSolid: semanticTokens['bg-brand-solid'] || brandFallback || '#7f56d9',
    brandText: semanticTokens['text-brand-primary'] || brandFallback || '#7f56d9',
    onBrand: semanticTokens['text-white'] || '#ffffff',
    neutralFill: semanticTokens['bg-secondary'] || grayScale[3] || '#f5f5f5',
    neutralText: semanticTokens['text-primary'] || grayScale[11] || '#101828',
    errorColor: (pal?.error?.[8]) || errorColor || '#f04438',
    disabledBg: semanticTokens['bg-disabled'] || grayScale[3] || '#f5f5f5',
    disabledText: semanticTokens['text-disabled'] || grayScale[6] || '#a4a7ae',
    border: semanticTokens['border-primary'] || grayScale[5] || '#d0d5dd',
    fgMuted: semanticTokens['text-tertiary'] || grayScale[7] || '#717680',
    placeholderText: semanticTokens['text-placeholder'] || grayScale[6] || '#a4a7ae',
    successColor: (pal?.success?.[8]) || successColor || '#17b26a',
    warningColor: (pal?.warning?.[8]) || warningColor || '#f79009',
    infoColor: (pal?.info?.[8]) || infoColor || '#2e90fa',
    radius,
    spacing,
    typography,
  }
}

/** Hook variant — re-renders whenever any token in the store changes. */
export function usePreviewTokens(themeKey = 'light'): PreviewTokens {
  const store = useDesignStore()
  return resolvePreviewTokens(store, themeKey)
}

// ── Small resolution helpers shared by the preview atoms ───────────────────
export function radiusOf(t: PreviewTokens, key: string, fallback: string): string {
  return t.radius?.[key] || fallback
}
export function fontFamilyOf(t: PreviewTokens): string {
  return t.typography?.fontFamily || 'Inter, sans-serif'
}
export function weightOf(t: PreviewTokens, key: string, fallback: number): number {
  return t.typography?.weights?.[key] ?? fallback
}
