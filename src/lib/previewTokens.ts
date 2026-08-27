// Single source of truth for resolving the live-preview tokens from the store.
// Extracted from ComponentCatalogue so the right-hand PreviewPanel and the
// component docs render from the exact same resolved values. Fallbacks cover
// empty semantic tokens so previews never render with undefined colors.

import type { CSSProperties } from 'react'
import { useDesignStore, DEFAULT_GRAY_DARK_SCALE } from '../store/useDesignStore'
import type { PreviewTokens } from '../components/preview/ButtonPreview'
import { withAlpha, readableInk, darkShadowMap } from './colorUtils'
import { gradientToCss } from './gradients'
import { resolveThemePalette } from './themeSources'
import { ALL_ROLES, sourceScaleFor, normalizeThemeValue, type GlobalScales } from './semanticRoles'
import { buildArchitectureView } from './semanticArchitectures'
import { fontStack } from './fonts'
import { typeStyleCss } from './typeRoles'
import { resolveLayoutRole, extractBreakpoints, type LayoutFamily } from './layoutTokens'

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
  // live preview matches tokens.json. Falls back to the CURRENT dark ramp
  // (DEFAULT_GRAY_DARK_SCALE, identity model) rather than the light ramp —
  // which is why a dark theme reads as dark here, not white — and rather than
  // the legacy GRAY_DARK_SCALE, whose tones are inverted relative to what
  // every other dark ramp in the app now means.
  const grayDarkScale = store.grayDarkScale ?? DEFAULT_GRAY_DARK_SCALE
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
  const brandSolid = resolveRole('background-brand-solid') || brandFallback || '#9522e9'
  // Resolve the gradient assigned to each preview surface into a CSS string.
  // Resolved in the PREVIEWED appearance: a linked gradient carries a dark twin
  // (its stops are tone references), so previewing dark used to paint the light
  // hexes on the dark page — the same class of bug the dark ramps fixed for
  // solid colours.
  // ...and against the previewed THEME's own brand ramp, so a custom theme's
  // cover/avatar carry that theme's accent instead of the default one. `pal`
  // is already this theme's resolved palette, so `pal.brand` IS the ramp — no
  // second resolution path to drift from. Undefined for a theme with no
  // `themeSources` entry (the built-in light/dark), where the stops' cached
  // global-accent colours are the right answer anyway.
  const gradientCssFor = (id: string | null) => {
    const g = id ? store.gradients.find((x) => x.id === id) : null
    return g ? gradientToCss(g, kind === 'dark' ? 'dark' : 'light', pal?.brand) : undefined
  }
  const tokens: PreviewTokens = {
    // background-primary is base.white in light / gray tone 12 in dark
    // (semanticRoles) — fall back to pageBackground, never the light ramp
    // (which rendered dark themes white).
    surface: resolveRole('background-primary') || store.pageBackground || '#ffffff',
    brandSolid,
    brandText: resolveRole('content-brand') || brandFallback || '#9522e9',
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
    // No `errorInk`/`warningInk`/`successInk`: they only ever fed a preview-side
    // contrast repair in StatusSpecimen, and repairing a colour in ONE preview
    // is what made it disagree with every other one about the same token.
    semanticMap: semanticTokens,
    radius,
    spacing,
    padding: store.padding,
    typography,
    panelBackground,
    pageBackground: (store.themeKinds?.[themeKey] ?? 'light') === 'light' ? store.pageBackground : undefined,
    sizes: store.sizes,
    stroke: store.stroke,
    radiusRoles: store.radiusRoles,
    spacingRoles: store.spacingRoles,
    sizeRoles: store.sizeRoles,
    strokeRoles: store.strokeRoles,
    breakpointRoles: store.breakpointRoles,
    gridFrame: store.gridFrame,
    // Shadows are the one foundation that can't ship a single value for both
    // appearances: the ramp's near-black shadow colour IS the dark page, so in
    // dark every elevation composited to within 0.36 of one 8-bit level of the
    // background — invisible, not subtle. Derived here rather than at each call
    // site so EVERY specimen (Card, Modal, Toast, the collage) gets a readable
    // elevation in dark, not just the Shadow foundation's own preview.
    shadows: kind === 'dark' ? darkShadowMap(store.shadows) : store.shadows,
    grid: store.grid,
    opacity: store.opacity,
    iconPrefix: 'untitled',
    coverGradient: gradientCssFor(store.gradientAssignments?.cover ?? null),
    avatarGradient: gradientCssFor(store.gradientAssignments?.avatar ?? null),
  }

  // ── Architecture overlay ──────────────────────────────────────────────────
  // The preview renders the semantic system the user actually chose: a
  // non-flat architecture re-maps the resolved roles onto ITS scheme, so the
  // atoms (right panel, Home collage, docs) visibly follow the selection.
  const arch = store.semanticArchitecture ?? 'flat'
  const dark = kind === 'dark'
  tokens.architecture = arch

  // A non-flat architecture stores its edits as REFS in `architectureOverrides`,
  // never in `themes` — so everything resolved above (which reads `themes`) is
  // blind to them, and editing e.g. `action.primary` in Categorical repainted
  // NOTHING. Rebuild the same projection the table renders (overrides applied)
  // and hand the previewed mode's resolved colours to the atoms, so the preview
  // shows the architecture the user is actually editing.
  if (arch !== 'flat') {
    const view = buildArchitectureView(
      arch,
      {
        themes: store.themes,
        themeKinds: store.themeKinds ?? {},
        themePalettes: pal ? { [themeKey]: pal } : {},
        scales: globalScales,
        accent: primaryColor,
        pageBackground: store.pageBackground,
        darkBackground: store.darkBackground,
      },
      errorColor,
      store.architectureOverrides?.[arch] ?? {},
      // Only the previewed theme — Categorical resolves whatever keys it's
      // given, and the preview only ever needs the one it's rendering.
      // Vibrancy/Tonal ignore this param entirely (always light/dark).
      [themeKey],
    )
    if (view) {
      const flatMap: Record<string, string> = {}
      for (const cat of view.categories) {
        for (const tk of cat.tokens) {
          // Categorical resolves `themeKey` directly; Vibrancy/Tonal only ever
          // carry 'light'/'dark', so fall back to the kind for those.
          const v = tk.modes[themeKey] ?? tk.modes[dark ? 'dark' : 'light']
          if (v) flatMap[`${cat.key}.${tk.key}`] = v.css
        }
      }
      tokens.archTokens = flatMap
      // Only overwrite a field when the architecture actually defines that slot,
      // so a projection that omits one keeps the flat-resolved value instead of
      // blanking the atom out.
      const put = (field: keyof PreviewTokens, id: string) => {
        const css = flatMap[id]
        if (css) (tokens as unknown as Record<string, unknown>)[field] = css
      }
      if (arch === 'categorical') {
        put('surface', 'surface.page')
        put('neutralFill', 'surface.layer-1')
        put('brandSolid', 'action.primary.default')
        put('onBrand', 'content.on-action')
        put('brandText', 'content.accent')
        put('neutralText', 'content.primary')
        put('fgMuted', 'content.secondary')
        put('placeholderText', 'content.subtle')
        put('disabledBg', 'action.disabled')
        put('disabledText', 'content.disabled')
        // `PreviewTokens.border` is the component stroke (inputs, selects), so
        // it takes `border.default` — which IS the control boundary since the
        // border roles were split by job (WCAG 1.4.11 + APCA Lc 45). It used
        // to read `border.strong` back when `default` was a decorative tone-5
        // hairline; `strong` is now the heavier EMPHASIS step above the
        // boundary, which is not what a resting input should draw.
        put('border', 'border.default')
        put('borderDefault', 'border.subtle')
        put('errorColor', 'status.critical.content')
        put('warningColor', 'status.warning.content')
        put('successColor', 'status.success.content')
        put('infoColor', 'status.info.content')
      }
    }
  }
  // 'flat' and 'categorical' share the same underlying tone math — categorical
  // is a curated regrouping of it, resolved via the `put()` calls above, so the
  // render always matches the export.

  return tokens
}

/** Hook variant — re-renders whenever any token in the store changes. */
export function usePreviewTokens(themeKey = 'light'): PreviewTokens {
  const store = useDesignStore()
  return resolvePreviewTokens(store, themeKey)
}

// ── Small resolution helpers shared by the preview atoms ───────────────────

/** Resolved colour for one architecture token id, with a flat fallback. */
export function archTokenOf(t: PreviewTokens, id: string, fallback: string): string {
  return t.archTokens?.[id] ?? fallback
}

/** Form-field background — categorical `surface.input`, else page surface. */
export function inputSurfaceOf(t: PreviewTokens): string {
  return archTokenOf(t, 'surface.input', t.surface)
}

/** Focus ring / focused control stroke — categorical `border.focus`, else brand. */
export function focusBorderOf(t: PreviewTokens): string {
  return archTokenOf(t, 'border.focus', t.brandSolid)
}

/** Soft status badge/alert fill — categorical status surface, else tinted content. */
export function statusSoftFillOf(t: PreviewTokens, colorName: string, contentHex: string): string {
  const surfaces: Record<string, string> = {
    Error: 'status.critical.surface',
    Danger: 'status.critical.surface',
    Warning: 'status.warning.surface',
    Success: 'status.success.surface',
  }
  const surface = surfaces[colorName] ? archTokenOf(t, surfaces[colorName], '') : ''
  return surface || tintOf(t, contentHex, '10', 0.1)
}

export function radiusOf(t: PreviewTokens, key: string, fallback: string): string {
  return t.radius?.[key] || fallback
}
export function radiusRoleOf(t: PreviewTokens, role: string, fallback = ''): string {
  return resolveLayoutRole('radius', t.radiusRoles, t.radius ?? {}, role, fallback || radiusOf(t, 'md', '16px'))
}
export function spacingRoleOf(t: PreviewTokens, role: string, fallback = ''): string {
  return resolveLayoutRole('spacing', t.spacingRoles, t.spacing ?? {}, role, fallback)
}
export function sizeRoleOf(t: PreviewTokens, role: string, fallback = ''): string {
  return resolveLayoutRole('size', t.sizeRoles, t.sizes ?? {}, role, fallback)
}
export function strokeRoleOf(t: PreviewTokens, role: string, fallback = '1px'): string {
  return resolveLayoutRole('stroke', t.strokeRoles, t.stroke ?? {}, role, fallback)
}
export function layoutRoleOf(t: PreviewTokens, family: LayoutFamily, role: string, fallback = ''): string {
  const primitives = family === 'radius' ? t.radius
    : family === 'spacing' ? t.spacing
    : family === 'size' ? t.sizes
    : family === 'stroke' ? t.stroke
    : extractBreakpoints(t.grid)
  const roles = family === 'radius' ? t.radiusRoles
    : family === 'spacing' ? t.spacingRoles
    : family === 'size' ? t.sizeRoles
    : family === 'stroke' ? t.strokeRoles
    : t.breakpointRoles
  return resolveLayoutRole(family, roles, primitives ?? {}, role, fallback)
}
export function fontFamilyOf(t: PreviewTokens): string {
  return t.typography?.fontFamily || 'Inter, sans-serif'
}
export function weightOf(t: PreviewTokens, key: string, fallback: number): number {
  return t.typography?.weights?.[key] ?? fallback
}

/** CSS for a text role (`label`, `placeholder`, `button`, `heading-sm`, …).
 *  Docs and Components specimens bind type through this — same contract as
 *  `radiusOf` / semantic color roles — so a role edit retunes every preview. */
export function typeStyleOf(
  t: PreviewTokens,
  role: string,
  opts: { viewport?: 'desktop' | 'mobile'; leading?: boolean } = {},
): CSSProperties {
  const s = typeStyleCss(
    {
      fontFamily: t.typography?.fontFamily ?? 'Inter',
      headingFontFamily: t.typography?.headingFontFamily,
      sizes: t.typography?.sizes ?? {},
      lineHeights: t.typography?.lineHeights,
      weights: t.typography?.weights ?? {},
    },
    t.typography?.roles,
    role,
    opts,
  )
  const css: CSSProperties = {
    fontFamily: fontStack(s.family),
    fontSize: s.size,
    fontWeight: s.weight,
  }
  if (s.lineHeight !== undefined) css.lineHeight = s.lineHeight
  return css
}
/** CSS padding shorthand from the surface-padding token (top/right/bottom/left). */
export function paddingOf(t: PreviewTokens, fallback = '20px'): string {
  const fromRole = spacingRoleOf(t, 'inset-surface', '')
  if (fromRole) return fromRole
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
