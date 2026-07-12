// Single source of truth for resolving the live-preview tokens from the store.
// Extracted from ComponentCatalogue so the right-hand PreviewPanel and the
// component docs render from the exact same resolved values. Fallbacks cover
// empty semantic tokens so previews never render with undefined colors.

import type { CSSProperties } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import type { PreviewTokens } from '../components/preview/ButtonPreview'
import { withAlpha } from './colorUtils'
import { getIconLibrary } from './iconLibraries'

type StoreState = ReturnType<typeof useDesignStore.getState>

export function resolvePreviewTokens(store: StoreState, themeKey = 'light'): PreviewTokens {
  const { primaryColor, grayLightScale, errorColor, warningColor, successColor, infoColor, radius, spacing, typography, panelBackground } = store
  // Render the requested theme (driven by the Semantic table's eye toggle).
  // A custom "style theme" carries its own palette — use it for the fallbacks.
  const semanticTokens = store.themes[themeKey] ?? store.themes.light ?? {}
  const pal = store.themePalettes[themeKey]
  // Fallback tones follow the Radix taxonomy (9 = solid, 6–8 borders, 11–12 text).
  const brandFallback = pal?.brand?.[9] || primaryColor
  const grayScale = pal?.gray ?? grayLightScale
  return {
    // surface-0's source is gray tone 1 (semanticRoles), itself anchored to
    // `pageBackground` — fall back down that same chain, never to bare white.
    surface: semanticTokens['surface-0'] || grayScale[1] || store.pageBackground || '#ffffff',
    brandSolid: semanticTokens['action-primary'] || brandFallback || '#7f56d9',
    brandText: semanticTokens['text-brand'] || brandFallback || '#7f56d9',
    onBrand: semanticTokens['text-on-inverse'] || '#ffffff',
    neutralFill: semanticTokens['surface-1'] || grayScale[3] || '#f5f5f5',
    neutralText: semanticTokens['text-primary'] || grayScale[12] || '#101828',
    errorColor: (pal?.error?.[9]) || errorColor || '#f04438',
    disabledBg: semanticTokens['action-disabled'] || grayScale[3] || '#f5f5f5',
    disabledText: semanticTokens['text-disabled'] || grayScale[8] || '#a4a7ae',
    border: semanticTokens['border-strong'] || grayScale[8] || '#d0d5dd',
    borderDefault: semanticTokens['border-default'] || grayScale[3] || '#e9eaeb',
    fgMuted: semanticTokens['text-tertiary'] || grayScale[10] || '#717680',
    placeholderText: semanticTokens['text-placeholder'] || grayScale[9] || '#a4a7ae',
    successColor: (pal?.success?.[9]) || successColor || '#17b26a',
    warningColor: (pal?.warning?.[9]) || warningColor || '#f79009',
    infoColor: (pal?.info?.[9]) || infoColor || '#2e90fa',
    semanticMap: semanticTokens,
    radius,
    spacing,
    padding: store.padding,
    typography,
    panelBackground,
    pageBackground: (store.themeKinds?.[themeKey] ?? 'light') === 'light' ? store.pageBackground : undefined,
    sizes: store.sizes,
    shadows: store.shadows,
    opacity: store.opacity,
    iconPrefix: getIconLibrary(store.iconLibrary)?.iconifyPrefix ?? store.iconLibrary,
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
/** CSS padding shorthand from the surface-padding token (top/right/bottom/left). */
export function paddingOf(t: PreviewTokens, fallback = '20px'): string {
  const p = t.padding
  if (!p) return fallback
  return `${p.top || fallback} ${p.right || fallback} ${p.bottom || fallback} ${p.left || fallback}`
}
/** Control height (px) from the Sizes foundation — xs–2xl component heights. */
export function sizeOf(t: PreviewTokens, key: string, fallback: number): number {
  const raw = t.sizes?.[key]
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}
/** Elevation from the Shadow foundation — xs–2xl, with a safe CSS fallback. */
export function shadowOf(t: PreviewTokens, key: string, fallback: string): string {
  return t.shadows?.[key] || fallback
}
/** Opacity step ('10' → 0.1) from the Opacity foundation, as a 0–1 alpha. */
export function alphaOf(t: PreviewTokens, step: string, fallback: number): number {
  const raw = t.opacity?.[step]
  if (!raw) return fallback
  const n = parseFloat(raw)
  return Number.isFinite(n) ? Math.min(Math.max(n / 100, 0), 1) : fallback
}
/** Soft tint of a hex — the color at an Opacity-foundation step (soft fills). */
export function tintOf(t: PreviewTokens, hex: string, step: string, fallback: number): string {
  return withAlpha(hex, alphaOf(t, step, fallback))
}

// Background + blur for a "panel" surface (surface-1: cards, panels, sections)
// — solid renders the flat token color; translucent adds alpha + backdrop blur
// so whatever sits behind subtly shows through (Radix `panelBackground`).
export function panelStyle(t: PreviewTokens, hex: string): CSSProperties {
  if (t.panelBackground === 'translucent') {
    return { background: withAlpha(hex, 0.7), backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
  }
  // 'page' — panels reuse the primitives page background (light themes only;
  // dark themes fall back to the token color since pageBackground is unset).
  if (t.panelBackground === 'page' && t.pageBackground) {
    return { background: t.pageBackground }
  }
  return { background: hex }
}
