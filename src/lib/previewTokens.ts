// Single source of truth for resolving the live-preview tokens from the store.
// Extracted from ComponentCatalogue so the right-hand PreviewPanel and the
// component docs render from the exact same resolved values. Fallbacks cover
// empty semantic tokens so previews never render with undefined colors.

import type { CSSProperties } from 'react'
import { useDesignStore, GRAY_DARK_SCALE } from '../store/useDesignStore'
import type { PreviewTokens } from '../components/preview/ButtonPreview'
import { withAlpha, readableInk } from './colorUtils'
import { getIconLibrary } from './iconLibraries'
import { gradientToCss } from './gradients'
import { resolveThemePalette } from './themeSources'
import { ALL_ROLES, sourceScaleFor, normalizeThemeValue, type GlobalScales } from './semanticRoles'
import { tonalPalettes } from './semanticArchitectures'

type StoreState = ReturnType<typeof useDesignStore.getState>

// Role lookup for the fallback resolver below.
const ROLE_BY_KEY: Record<string, (typeof ALL_ROLES)[number]> =
  Object.fromEntries(ALL_ROLES.map((r) => [r.key, r]))

export function resolvePreviewTokens(store: StoreState, themeKey = 'light'): PreviewTokens {
  const { primaryColor, grayLightScale, errorColor, warningColor, successColor, infoColor, radius, spacing, typography, panelBackground } = store
  // Render the requested theme (driven by the Semantic table's eye toggle).
  // A custom "style theme" carries its own palette — use it for the fallbacks.
  const semanticTokens = store.themes[themeKey] ?? store.themes.light ?? {}
  const kind = store.themeKinds?.[themeKey] ?? 'light'
  // A theme references primitive FAMILIES — resolve them now so the preview
  // tracks whatever those families currently are.
  const pal = resolveThemePalette(store.themeSources?.[themeKey], kind, store)
  // Fallback resolver — when a semantic token is empty (e.g. a dark theme the
  // user hasn't opened in the Semantic editor yet), resolve it against the same
  // source ramp + recommended tone the EXPORT uses (lib/semanticRoles), so the
  // live preview matches tokens.json. Critically this makes a built-in dark
  // theme fall back to GRAY_DARK_SCALE at inverted tones — never the light ramp,
  // which is why dark surfaces used to render white.
  const grayDarkScale = store.grayDarkScale ?? GRAY_DARK_SCALE
  const globalScales: GlobalScales = {
    gray: grayLightScale,
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
    brand: store.primaryScale,
    error: store.errorScale,
    warning: store.warningScale,
    success: store.successScale,
    info: store.infoScale,
  }
  // Resolves a semantic role's live hex, the same way Step3_SemanticTokens'
  // own auto-populate/reset does: the STORED value only counts if it's still a
  // tone of the role's CURRENT source scale (`normalizeThemeValue` +
  // `toneIndexOf`); otherwise it's stale (a ramp regenerated since, or the
  // theme's semantic map was never auto-populated for this role/kind — that
  // effect only runs while Alias/Semantics is mounted) and the recommended
  // tone is used instead. Blindly trusting `semanticTokens[key]` here — the
  // bug this replaced — is exactly how a dark theme could carry a light-ramp
  // hex left over from before a gray/base change and render the Components
  // preview's background near-white in dark mode.
  const resolveRole = (key: string): string => {
    const role = ROLE_BY_KEY[key]
    if (!role) return ''
    const scale = sourceScaleFor(role, kind, globalScales, pal)
    if (!scale || !Object.keys(scale).length) return ''
    return normalizeThemeValue(role, kind, scale, semanticTokens[key])
  }
  const brandFallback = pal?.brand?.[9] || primaryColor
  // Dark ink option for readableInk — darkest gray of the active theme's ramp.
  const grayScale = pal?.gray ?? (kind === 'dark' ? grayDarkScale : grayLightScale)
  const brandSolid = resolveRole('background-brand-solid') || brandFallback || '#7f56d9'
  // Resolve the gradient assigned to each preview surface into a CSS string.
  const gradientCssFor = (id: string | null) => {
    const g = id ? store.gradients.find((x) => x.id === id) : null
    return g ? gradientToCss(g) : undefined
  }
  const tokens: PreviewTokens = {
    // background-primary is base.white in light / gray tone 12 in dark
    // (semanticRoles) — fall back to pageBackground, never the light ramp
    // (which rendered dark themes white).
    surface: resolveRole('background-primary') || store.pageBackground || '#ffffff',
    brandSolid,
    brandText: resolveRole('content-brand') || brandFallback || '#7f56d9',
    // Label ink on the brand fill — contrast-driven so a bright accent (where
    // white text fails WCAG) gets dark ink, in every theme. content-inverse's
    // tone can invert wrongly in dark, so resolve it live against the fill.
    onBrand: readableInk(brandSolid, grayScale[12] || '#0a0d12', resolveRole('content-inverse') || '#ffffff'),
    neutralFill: resolveRole('background-secondary') || '#f5f5f5',
    neutralText: resolveRole('content-primary') || '#101828',
    errorColor: (pal?.error?.[9]) || errorColor || '#f04438',
    disabledBg: resolveRole('background-disabled') || '#f5f5f5',
    disabledText: resolveRole('content-disabled') || '#a4a7ae',
    border: resolveRole('border-primary') || '#d0d5dd',
    borderDefault: resolveRole('border-secondary') || '#e9eaeb',
    fgMuted: resolveRole('content-tertiary') || '#717680',
    placeholderText: resolveRole('content-quaternary') || '#a4a7ae',
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
    coverGradient: gradientCssFor(store.gradientAssignments?.cover ?? null),
    avatarGradient: gradientCssFor(store.gradientAssignments?.avatar ?? null),
  }

  // ── Architecture overlay ──────────────────────────────────────────────────
  // The preview renders the semantic system the user actually chose: a
  // non-flat architecture re-maps the resolved roles onto ITS scheme, so the
  // atoms (right panel, Home collage, docs) visibly follow the selection.
  const arch = store.semanticArchitecture ?? 'flat'
  const dark = kind === 'dark'

  if (arch === 'tonal') {
    // Material 3: the exact scheme the export ships — primary 40↔80 with paired
    // on-colors, neutral surfaces (98↔6) + containers, neutral-variant outlines.
    const pals = tonalPalettes(primaryColor, errorColor)
    const P = pals.primary, N = pals.neutral, NV = pals['neutral-variant'], E = pals.error
    tokens.surface = (dark ? N[6] : N[98]) ?? tokens.surface
    tokens.neutralFill = (dark ? N[12] : N[94]) ?? tokens.neutralFill        // surface-container
    tokens.brandSolid = (dark ? P[80] : P[40]) ?? tokens.brandSolid
    tokens.onBrand = (dark ? P[20] : P[100]) ?? tokens.onBrand               // on-primary
    tokens.brandText = (dark ? P[80] : P[40]) ?? tokens.brandText
    tokens.neutralText = (dark ? N[90] : N[10]) ?? tokens.neutralText        // on-surface
    tokens.fgMuted = (dark ? NV[80] : NV[30]) ?? tokens.fgMuted              // on-surface-variant
    tokens.placeholderText = (dark ? NV[60] : NV[50]) ?? tokens.placeholderText
    tokens.border = (dark ? NV[60] : NV[50]) ?? tokens.border                // outline
    tokens.borderDefault = (dark ? NV[30] : NV[80]) ?? tokens.borderDefault  // outline-variant
    tokens.errorColor = (dark ? E[80] : E[40]) ?? tokens.errorColor
    tokens.disabledBg = (dark ? N[17] : N[92]) ?? tokens.disabledBg
    tokens.disabledText = (dark ? N[60] : N[50]) ?? tokens.disabledText
  } else if (arch === 'vibrancy') {
    // Apple HIG: one ink at graded opacities instead of separate gray tones,
    // thin alpha fills for controls, hairline alpha separators.
    const ink = tokens.neutralText
    const sepBase = grayScale[6] ?? tokens.border
    const fillBase = grayScale[8] ?? tokens.border
    tokens.fgMuted = withAlpha(ink, 0.6)            // secondary label
    tokens.placeholderText = withAlpha(ink, 0.3)    // tertiary label
    tokens.disabledText = withAlpha(ink, 0.3)
    tokens.border = withAlpha(sepBase, 0.55)        // separator (strong)
    tokens.borderDefault = withAlpha(sepBase, 0.36) // separator
    tokens.neutralFill = withAlpha(fillBase, 0.12)  // tertiary fill
    tokens.disabledBg = withAlpha(fillBase, 0.08)   // quaternary fill
  }
  // 'flat' and 'categorical' share the same resolved values — categorical is a
  // curated regrouping of the identical tone math, so the render matches.

  return tokens
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
