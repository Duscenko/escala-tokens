// Home of `PreviewTokens` — the resolved design-token bundle every live
// preview consumes (assembled in lib/previewTokens.ts from the store, with
// fallbacks for empty semantic tokens, so renderers never touch store shape).
//
// The component previews themselves live in the catalogue's SPECIMENS registry
// (configurator/docs/specimens.tsx) — the single source the Components
// playground, the Home collage AND the right-hand Components Preview all
// render from, so they can never drift apart. The old standalone ButtonPreview
// renderer was retired in favor of SPECIMENS.Button.

export interface PreviewTokens {
  surface: string // light canvas the buttons sit on (bg-primary ‖ #fff)
  brandSolid: string // accent fill (Primary)
  brandText: string // brand-coloured label (Tinted / Plain)
  onBrand: string // label on the accent fill (≈ white)
  neutralFill: string // Secondary fill
  neutralText: string // Secondary label
  errorColor: string // destructive accent
  disabledBg: string
  disabledText: string
  // Optional extras consumed by the richer preview atoms (Input, Badge, Card…).
  // Resolved in lib/previewTokens.ts; absent in older callers → fallbacks.
  border?: string // field / input border (border-strong)
  borderDefault?: string // general card / container border (border-default)
  fgMuted?: string // secondary copy (text-tertiary)
  placeholderText?: string // input placeholder (text-placeholder)
  successColor?: string
  warningColor?: string
  infoColor?: string
  // Full semantic map for the active preview theme — the per-category Semantic
  // specimens read token values from here so they track the selected theme
  // (light · dark · custom) instead of always reading themes.light.
  semanticMap?: Record<string, string>
  radius: Record<string, string>
  spacing: Record<string, string>
  // Per-side surface padding (top/right/bottom/left) for padded surfaces.
  padding?: Record<string, string>
  typography: { fontFamily: string; headingFontFamily?: string; sizes: Record<string, string>; weights: Record<string, number> }
  // Radix-style panel treatment for raised surfaces (surface-1: cards, panels).
  // 'page' reuses the primitives page background as the panel fill.
  panelBackground?: 'solid' | 'translucent' | 'page'
  // Primitives page background — the fill panels use in 'page' mode. Only set
  // for light-kind themes (a light page anchor makes no sense on dark panels).
  pageBackground?: string
  // Component heights from Foundations · Sizes (xs–2xl) — Size axes resolve
  // control heights from here so previews track that foundation live.
  sizes?: Record<string, string>
  // Elevation ramp from Foundations · Shadow (xs–2xl CSS box-shadows).
  shadows?: Record<string, string>
  // Transparency steps from Foundations · Opacity ('10' → '10%').
  opacity?: Record<string, string>
  // Iconify prefix of the Foundations · Icons library (drives content glyphs).
  iconPrefix?: string
  // Assigned gradients (CSS strings) from Foundations · Gradients — undefined
  // when no gradient is assigned to that surface, so callers fall back to solids.
  coverGradient?: string // card covers / brand hero strips
  avatarGradient?: string // solid avatars / specimens
}

/** Parse a px token from a map (e.g. spacing['4'] → 16), with a fallback. */
export function resolvePx(map: Record<string, string> | undefined, key: string, fallback: number): number {
  const raw = map?.[key]
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}
