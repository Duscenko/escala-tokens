/** Escala JSON as consumed by agent bundle builders — a structural subset of
 *  `generateTokenJSON()`. Extra fields on a live payload are ignored. This
 *  module must not import the store or `tokenGenerator`. */

/** The six slots a theme reads. Mirrors `ThemeSources` in the store — a mapped
 *  type, so the store's interface stays structurally assignable to it. */
export type ThemeSlot = 'brand' | 'gray' | 'error' | 'warning' | 'success' | 'info'

export interface TypeRoleAlias {
  family: string
  size: string
  weight: string
}

/** Three icon sizes (`small` 24px · `medium` 32px · `large` 40px).
 *  `viewports` repeats them per Desktop · Tablet · Mobile; they hold. */
export interface IconSizeBlock {
  scale?: Record<string, string>
  roles?: Record<string, string>
  viewports?: {
    desktop?: Record<string, string>
    tablet?: Record<string, string>
    mobile?: Record<string, string>
  }
  minWeight?: { belowPx?: number; weight?: string }
}

/** One named grid style, already resolved to px by `generateTokenJSON`. */
export interface GridStyleJSON {
  key: string
  label?: string
  viewport?: string
  columns?: number
  column?: number
  gutter?: number
  margin?: number
  width?: number
  sidebar?: number
}

/** Hand-set radius role values on Tablet / Mobile. Absent means "follow Desktop". */
export interface RadiusRoleViewportsJSON {
  tablet?: Record<string, string>
  mobile?: Record<string, string>
}

export interface TokenJSON {
  schemaVersion?: number
  project: string
  colors: {
    primitive?: Record<string, string>
    primitiveAlpha?: Record<string, string>
    themeOrder?: string[]
    themes?: Record<string, Record<string, string>>
    /** Theme key → slot (`brand`/`gray`/`error`/…) → the real family key its
     *  ramp lives under. A theme-minted family is named after the theme, so
     *  this is the ONLY thing tying `accent` to `material--elevation`. */
    themeSources?: Record<string, Record<ThemeSlot, string>>
    themeLabels?: Record<string, string>
    activeTheme?: string
    semanticArchitecture?: string
    architecture?: {
      kind?: string
      tokens?: Record<string, Record<string, Record<string, string>>>
    }
  }
  typography: {
    fontFamily: string
    headingFontFamily?: string
    sizes: Record<string, string>
    lineHeights?: Record<string, string>
    weights: Record<string, number>
    roles?: Record<string, { desktop: TypeRoleAlias; tablet?: TypeRoleAlias; mobile: TypeRoleAlias }>
  }
  spacing: Record<string, string>
  /** Desktop static step each spacing role resolves to. */
  spacingRoles?: Record<string, string>
  /** Role → responsive token (`gap-section` → `section-md`) or a static step. */
  spacingRoleRefs?: Record<string, string>
  /** Responsive spacing token → Desktop / Tablet / Mobile static step. */
  spacingResponsive?: Record<string, Record<string, string>>
  padding?: Record<string, string>
  radius: Record<string, string>
  radiusRoles?: Record<string, string>
  radiusRoleViewports?: RadiusRoleViewportsJSON
  /** Responsive radius step → the static step it reads per viewport. */
  radiusResponsive?: Record<string, Record<string, string>>
  sizes?: Record<string, string>
  sizeRoles?: Record<string, string>
  selector?: Record<string, string>
  selectorRoles?: Record<string, string>
  stroke?: Record<string, string>
  strokeRoles?: Record<string, string>
  grid?: Record<string, string>
  breakpointRoles?: Record<string, string>
  gridStyles?: GridStyleJSON[]
  shadows?: Record<string, string>
  /** Dark-appearance twin of `shadows`. Same keys. */
  shadowsDark?: Record<string, string>
  /** Per-library-theme copies of the foundation maps. Root fields are the
   *  compatibility fallback — a theme that differs (Material radius vs the
   *  leftover root ramp) is the value consumers must resolve. */
  foundationsByTheme?: Record<string, {
    typography?: TokenJSON['typography']
    spacing?: Record<string, string>
    spacingRoles?: Record<string, string>
    spacingRoleRefs?: Record<string, string>
    radius?: Record<string, string>
    radiusRoles?: Record<string, string>
    radiusRoleViewports?: RadiusRoleViewportsJSON
    sizes?: Record<string, string>
    sizeRoles?: Record<string, string>
    selector?: Record<string, string>
    selectorRoles?: Record<string, string>
    stroke?: Record<string, string>
    strokeRoles?: Record<string, string>
    grid?: Record<string, string>
    breakpointRoles?: Record<string, string>
    gridStyles?: GridStyleJSON[]
    shadows?: Record<string, string>
    iconWeight?: string
    iconSizes?: IconSizeBlock
    /** Category → step → `{dimension.N}` for this theme. */
    dimensionRefs?: Record<string, Record<string, string>>
  }>
  /** Dimension primitives: one global collection of lengths named by value. */
  dimensions?: Record<string, string>
  /** Category → step → `{dimension.N}` (root / fallback). */
  dimensionRefs?: Record<string, Record<string, string>>
  gradients?: Record<string, string>
  gradientAssignments?: Record<string, string | null>
  icons?: {
    library?: string
    aiSource?: { key?: string; label?: string; repo?: string; npm?: string }
    custom?: { name?: string }[]
    /** Phosphor weight the system renders (`regular`, `light`, `bold`, …). */
    weight?: string
    sizes?: IconSizeBlock
  }
  atoms?: string[]
}

export interface AgentBundleOptions {
  /** Used when `json.project` is empty. The store wrapper passes `projectName`. */
  projectFallback?: string
  /** Overrides `json.icons.aiSource.key`. The store wrapper passes `iconAiSource`. */
  iconKey?: string
}

export interface AgentBundleFile {
  path: string
  text: string
}

export interface SkillPackage {
  name: string
  /** SKILL.md — preview/copy payload. */
  skillMd: string
  zip: Uint8Array
}
