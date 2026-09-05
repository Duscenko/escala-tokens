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
    roles?: Record<string, { desktop: TypeRoleAlias; mobile: TypeRoleAlias }>
  }
  spacing: Record<string, string>
  padding?: Record<string, string>
  radius: Record<string, string>
  sizes?: Record<string, string>
  selector?: Record<string, string>
  stroke?: Record<string, string>
  grid?: Record<string, string>
  shadows?: Record<string, string>
  /** Per-library-theme copies of the foundation maps. Root fields are the
   *  compatibility fallback — a theme that differs (Material radius vs the
   *  leftover root ramp) is the value consumers must resolve. */
  foundationsByTheme?: Record<string, {
    typography?: TokenJSON['typography']
    spacing?: Record<string, string>
    radius?: Record<string, string>
    sizes?: Record<string, string>
    selector?: Record<string, string>
    stroke?: Record<string, string>
    grid?: Record<string, string>
    shadows?: Record<string, string>
  }>
  gradients?: Record<string, string>
  gradientAssignments?: Record<string, string | null>
  icons?: {
    aiSource?: { key?: string; label?: string; repo?: string; npm?: string }
    custom?: { name?: string }[]
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
