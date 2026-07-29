import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPONENT_KEYS } from '../lib/componentCatalogue'
import { FONT_SIZE_STANDARD, LINE_HEIGHT_STANDARD, FONT_WEIGHT_STANDARD } from '../lib/typographyStandard'
import type { ColorAlgorithm, ColorNaming } from '../lib/colorUtils'
import { accessibleSolidTone, generateFamilyDarkScale } from '../lib/colorUtils'
import {
  type GradientDef, type GradientAssignments,
  makeDefaultGradients, makeDefaultGradientAssignments,
  brandCoverStops, brandAvatarStops, stopsMatch, derivedStopsFor,
} from '../lib/gradients'
import { slugify } from '../lib/utils'
// Type-only: semanticArchitectures imports semanticRoles (which imports this
// store's constants), so a value import here would create a runtime cycle.
import type { SemanticArchitecture } from '../lib/semanticArchitectures'

interface ColorScale {
  [key: number]: string // 1–12 tones
}

// A user-defined color family: named, with an auto-generated 1–12 scale that
// adapts to the same structure as brand/error/warning/success/info.
export interface CustomColor {
  key: string // slug — unique, used as the token prefix (e.g. "teal" → teal-1…12)
  label: string // display name
  base: string // hex the scale derives from (tone 6)
  scale: ColorScale
  /** Dark-appearance twin, anchored to `darkBackground` (Radix ships every
   *  colour as two scales). Optional only for forward-compat with pre-v40
   *  snapshots — `useEnsureColorScales` backfills it. */
  darkScale?: ColorScale
}

// Family names reserved by the built-in scales — custom colors can't use them.
export const RESERVED_COLOR_KEYS = ['accent', 'neutral', 'error', 'warning', 'success', 'info']

// Per-theme primitive palette — a custom "style theme" carries its own 1–12
// scales (brand/neutral/semantic) instead of drawing from the global ones. The
// built-in light/dark themes have NO entry here and fall back to the globals.
/**
 * A theme's RESOLVED ramps — what `sourceScaleFor` reads. Always derived, never
 * persisted: see `ThemeSources`.
 */
export interface ThemePalette {
  brand: ColorScale
  gray: ColorScale
  error: ColorScale
  warning: ColorScale
  success: ColorScale
  info: ColorScale
}

/**
 * A theme's colour SOURCES — which primitive family each slot resolves through.
 * Values are family KEYS ('accent' | 'neutral' | 'error' | 'success' |
 * 'warning' | 'info' | a `customColors` key), never raw scales.
 *
 * This is the "a theme is a reading of the primitives" rule enforced at the data
 * model: a theme cannot hold a colour of its own, so it can't drift from the
 * family it points at — retint the family and every theme referencing it moves
 * with it. Creating a theme with a new colour therefore CREATES that family in
 * Primitives (see `AddThemeModal`), and a family in use can't be deleted.
 */
export interface ThemeSources {
  brand: string
  gray: string
  error: string
  warning: string
  success: string
  info: string
}

export const DEFAULT_THEME_SOURCES: ThemeSources = {
  brand: 'accent', gray: 'neutral', error: 'error',
  warning: 'warning', success: 'success', info: 'info',
}

interface TypographyTokens {
  fontFamily: string
  headingFontFamily: string
  sizes: Record<string, string>
  lineHeights: Record<string, string>
  weights: Record<string, number>
}

// ── Fixed neutral scales from the Figma design system ─────────────────────
export const GRAY_LIGHT_SCALE: ColorScale = {
  1: '#fdfdfd', 2: '#fafafa', 3: '#f5f5f5',  4: '#e9eaeb',
  5: '#d5d7da', 6: '#a4a7ae', 7: '#717680',  8: '#535862',
  9: '#414651', 10: '#252b37', 11: '#181d27', 12: '#0a0d12',
}

export const GRAY_DARK_SCALE: ColorScale = {
  1: '#fafafa', 2: '#f7f7f7', 3: '#f0f0f1',  4: '#ececed',
  5: '#cecfd2', 6: '#94979c', 7: '#85888e',  8: '#61656c',
  9: '#373a41', 10: '#22262f', 11: '#13161b', 12: '#0c0e12',
}
// ──────────────────────────────────────────────────────────────────────────

// Semantic role keys, seeded empty. Shared by the light (semanticTokens) and
// dark (darkSemanticTokens) maps so both stay in sync as roles are added.
// Old (v23) → new (v24) semantic-token key map. Single source of truth for the
// readable-taxonomy rename: the v23→v24 migration relabels persisted theme
// values without losing any user customisation. Append-only — never reorder.
export const SEMANTIC_KEY_RENAME: Record<string, string> = {
  // ── Surface (was bg-* neutral surfaces + states) ──
  'bg-primary': 'surface-0', 'bg-primary_alt': 'surface-0-alt', 'bg-primary_hover': 'surface-0-hover',
  'bg-secondary': 'surface-1', 'bg-secondary_alt': 'surface-1-alt', 'bg-secondary_hover': 'surface-1-hover',
  'bg-secondary_subtle': 'surface-1-subtle', 'bg-tertiary': 'surface-2', 'bg-quaternary': 'surface-3',
  'bg-active': 'surface-selected', 'bg-primary-solid': 'surface-inverse', 'bg-secondary-solid': 'surface-inverse-muted',
  'bg-overlay': 'surface-overlay',
  'bg-accent-primary': 'surface-brand-subtle', 'bg-accent-primary_alt': 'surface-brand-subtle-alt',
  'bg-accent-secondary': 'surface-brand-muted', 'bg-accent-section': 'surface-brand-strong',
  'bg-accent-section_subtle': 'surface-brand-strong-alt',
  // ── Action (was brand solid fills + disabled) ──
  'bg-accent-solid': 'action-primary', 'bg-accent-solid_hover': 'action-primary-hover',
  'bg-disabled': 'action-disabled', 'bg-disabled_subtle': 'action-disabled-subtle',
  // ── Status (was bg-{error,warning,success,info}-*) ──
  'bg-error-primary': 'status-error-subtle', 'bg-error-secondary': 'status-error-muted', 'bg-error-solid': 'status-error',
  'bg-warning-primary': 'status-warning-subtle', 'bg-warning-secondary': 'status-warning-muted', 'bg-warning-solid': 'status-warning',
  'bg-success-primary': 'status-success-subtle', 'bg-success-secondary': 'status-success-muted', 'bg-success-solid': 'status-success',
  'bg-info-primary': 'status-info-subtle', 'bg-info-secondary': 'status-info-muted', 'bg-info-solid': 'status-info',
  // ── Icon (was fg-*) ──
  'fg-primary': 'icon-primary', 'fg-secondary': 'icon-secondary', 'fg-secondary_hover': 'icon-secondary-hover',
  'fg-tertiary': 'icon-tertiary', 'fg-tertiary_hover': 'icon-tertiary-hover',
  'fg-quaternary': 'icon-quaternary', 'fg-quaternary_hover': 'icon-quaternary-hover',
  'fg-white': 'icon-on-inverse', 'fg-disabled': 'icon-disabled', 'fg-disabled_subtle': 'icon-disabled-subtle',
  'fg-accent-primary': 'icon-brand', 'fg-accent-primary_alt': 'icon-brand-alt',
  'fg-accent-secondary': 'icon-brand-secondary', 'fg-accent-secondary_alt': 'icon-brand-secondary-alt',
  'fg-error-primary': 'icon-error', 'fg-error-secondary': 'icon-error-secondary',
  'fg-warning-primary': 'icon-warning', 'fg-warning-secondary': 'icon-warning-secondary',
  'fg-success-primary': 'icon-success', 'fg-success-secondary': 'icon-success-secondary',
  'fg-info-primary': 'icon-info', 'fg-info-secondary': 'icon-info-secondary',
  // ── Text ──
  'text-secondary_hover': 'text-secondary-hover', 'text-tertiary_hover': 'text-tertiary-hover',
  'text-white': 'text-on-inverse', 'text-placeholder_subtle': 'text-placeholder-subtle',
  'text-primary_on-accent': 'text-on-brand', 'text-secondary_on-accent': 'text-on-brand-secondary',
  'text-tertiary_on-accent': 'text-on-brand-tertiary', 'text-quaternary_on-accent': 'text-on-brand-quaternary',
  'text-accent-primary': 'text-brand', 'text-accent-secondary': 'text-brand-secondary',
  'text-accent-secondary_hover': 'text-brand-secondary-hover', 'text-accent-tertiary': 'text-brand-tertiary',
  'text-accent-tertiary_alt': 'text-brand-tertiary-alt',
  'text-error-primary': 'text-error', 'text-warning-primary': 'text-warning',
  'text-success-primary': 'text-success', 'text-info-primary': 'text-info',
  // ── Border ──
  'border-primary': 'border-strong', 'border-secondary': 'border-default', 'border-secondary_alt': 'border-default-alt',
  'border-tertiary': 'border-subtle', 'border-disabled_subtle': 'border-disabled-subtle',
  'border-accent': 'border-brand', 'border-accent_alt': 'border-brand-alt', 'border-error_subtle': 'border-error-subtle',
  // (text-primary, text-secondary, text-tertiary, text-quaternary, text-disabled,
  //  text-placeholder, border-disabled, border-error — keys unchanged.)
}

/** Rename the keys of one semantic-token map old→new, preserving values. Idempotent. */
function renameSemanticKeys(map: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!map || typeof map !== 'object') return map
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) out[SEMANTIC_KEY_RENAME[k] ?? k] = v as string
  return out
}

const EMPTY_SEMANTIC: Record<string, string> = {
  // ── Surface ───────────────────────────────────────────────
  'surface-0': '', 'surface-0-alt': '', 'surface-0-hover': '',
  'surface-1': '', 'surface-1-alt': '', 'surface-1-hover': '', 'surface-1-subtle': '',
  'surface-2': '', 'surface-3': '',
  'surface-selected': '', 'surface-inverse': '', 'surface-inverse-muted': '', 'surface-overlay': '',
  'surface-brand-subtle': '', 'surface-brand-subtle-alt': '', 'surface-brand-muted': '',
  'surface-brand-strong': '', 'surface-brand-strong-alt': '',
  // ── Action ────────────────────────────────────────────────
  'action-primary': '', 'action-primary-hover': '',
  'action-disabled': '', 'action-disabled-subtle': '',
  // ── Status ────────────────────────────────────────────────
  'status-error-subtle': '', 'status-error-muted': '', 'status-error': '',
  'status-warning-subtle': '', 'status-warning-muted': '', 'status-warning': '',
  'status-success-subtle': '', 'status-success-muted': '', 'status-success': '',
  'status-info-subtle': '', 'status-info-muted': '', 'status-info': '',
  // ── Text ──────────────────────────────────────────────────
  'text-primary': '', 'text-on-brand': '',
  'text-secondary': '', 'text-secondary-hover': '', 'text-on-brand-secondary': '',
  'text-tertiary': '', 'text-tertiary-hover': '', 'text-on-brand-tertiary': '',
  'text-quaternary': '', 'text-on-brand-quaternary': '',
  'text-on-inverse': '', 'text-disabled': '',
  'text-placeholder': '', 'text-placeholder-subtle': '',
  'text-brand': '',
  'text-brand-secondary': '', 'text-brand-secondary-hover': '',
  'text-brand-tertiary': '', 'text-brand-tertiary-alt': '',
  'text-error': '', 'text-warning': '', 'text-success': '', 'text-info': '',
  // ── Icon ──────────────────────────────────────────────────
  'icon-primary': '',
  'icon-secondary': '', 'icon-secondary-hover': '',
  'icon-tertiary': '', 'icon-tertiary-hover': '',
  'icon-quaternary': '', 'icon-quaternary-hover': '',
  'icon-on-inverse': '', 'icon-disabled': '', 'icon-disabled-subtle': '',
  'icon-brand': '', 'icon-brand-alt': '',
  'icon-brand-secondary': '', 'icon-brand-secondary-alt': '',
  'icon-error': '', 'icon-error-secondary': '',
  'icon-warning': '', 'icon-warning-secondary': '',
  'icon-success': '', 'icon-success-secondary': '',
  'icon-info': '', 'icon-info-secondary': '',
  // ── Border ────────────────────────────────────────────────
  'border-strong': '',
  'border-default': '', 'border-default-alt': '',
  'border-subtle': '',
  'border-disabled': '', 'border-disabled-subtle': '',
  'border-brand': '', 'border-brand-alt': '',
  'border-error': '', 'border-error-subtle': '',
}

// ── Default token sets for the Opacity / Shadow / Grid / Sizes foundations ──
export const OPACITY_DEFAULT: Record<string, string> = {
  '0': '0%', '5': '5%', '10': '10%', '20': '20%',
  '40': '40%', '60': '60%', '80': '80%', '100': '100%',
}

export const SHADOW_DEFAULT: Record<string, string> = {
  xs: '0 1px 2px rgba(10,13,18,0.05)',
  sm: '0 1px 3px rgba(10,13,18,0.10), 0 1px 2px -1px rgba(10,13,18,0.10)',
  md: '0 4px 6px -1px rgba(10,13,18,0.10), 0 2px 4px -2px rgba(10,13,18,0.06)',
  lg: '0 12px 16px -4px rgba(10,13,18,0.08), 0 4px 6px -2px rgba(10,13,18,0.03)',
  xl: '0 20px 24px -4px rgba(10,13,18,0.08), 0 8px 8px -4px rgba(10,13,18,0.03)',
  '2xl': '0 24px 48px -12px rgba(10,13,18,0.18)',
}

export const GRID_DEFAULT: Record<string, string> = {
  columns: '12',
  gutter: '24px',
  margin: '32px',
  container: '1280px',
  'breakpoint-sm': '640px',
  'breakpoint-md': '768px',
  'breakpoint-lg': '1024px',
  'breakpoint-xl': '1280px',
  'breakpoint-2xl': '1536px',
}

export const SIZES_DEFAULT: Record<string, string> = {
  xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '56px', '2xl': '64px',
}

// Surface padding token — per-side inset for padded surfaces (cards, tiles,
// panels) in the live previews and the export.
export const PADDING_DEFAULT: Record<string, string> = {
  top: '20px', right: '20px', bottom: '20px', left: '20px',
}

// ── Multi design system ──────────────────────────────────────────────────────
// Everything needed to restore a design session. Excludes nav state,
// `projectCreated`, `savedSystems` itself, and the GitHub token (which lives
// only in localStorage 'sd-github-token' and must never enter a snapshot).
export interface DesignSnapshot {
  projectName: string
  projectDescription: string
  colorAlgorithm: ColorAlgorithm
  contrastShift: number
  colorNaming: ColorNaming
  // Page background primitive (Radix custom-palette input) — anchors tone 1 of
  // every generated ramp and is the compositing base for derived alpha ramps.
  pageBackground: string
  // Its dark-theme twin — anchors tone 12 of `grayDarkScale`, which dark themes
  // read as surface-0 (recDarkTone inverts the gray hierarchy). Kept separate
  // from `pageBackground` so a light page and a dark page can each be chosen.
  darkBackground: string
  primaryColor: string
  primaryScale: ColorScale
  // Dark-appearance twin of every COLOURED family — the Radix two-scale model.
  // A dark theme resolves brand/status tones from these, not from the light
  // ramps, so tints deepen onto the dark page instead of a light one.
  primaryDarkScale: ColorScale
  grayBaseColor: string
  grayLightScale: ColorScale
  // Dark-appearance neutral ramp, generated from `grayBaseColor` (itself derived
  // from the accent when linked) anchored to `darkBackground`. Gray roles in a
  // dark theme resolve from this instead of `grayLightScale`.
  grayDarkScale: ColorScale
  errorColor: string
  errorScale: ColorScale
  errorDarkScale: ColorScale
  warningColor: string
  warningScale: ColorScale
  warningDarkScale: ColorScale
  successColor: string
  successScale: ColorScale
  successDarkScale: ColorScale
  infoColor: string
  infoScale: ColorScale
  infoDarkScale: ColorScale
  customColors: CustomColor[]
  themes: Record<string, Record<string, string>>
  themeOrder: string[]
  themeKinds: Record<string, 'light' | 'dark'>
  themeSources: Record<string, ThemeSources>
  typography: TypographyTokens
  spacing: Record<string, string>
  radius: Record<string, string>
  opacity: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  sizes: Record<string, string>
  // Per-side surface padding (top/right/bottom/left) for padded surfaces.
  padding: Record<string, string>
  // Radix-style `panelBackground` — whether raised surfaces (surface-1: cards,
  // panels, sections) render solid, with alpha + backdrop blur, or reuse the
  // primitives page background (`pageBackground`).
  panelBackground: 'solid' | 'translucent' | 'page'
  // Which semantic token architecture the export projects the 89-role catalogue
  // into (Alias/Semantics picker). 'flat' = the classic shape; the others are
  // additive projections (see lib/semanticArchitectures.ts).
  semanticArchitecture: SemanticArchitecture
  /**
   * Per-architecture edits to the projected semantic tokens, as PRIMITIVE REFS
   * (`{accent.9}`) — never loose hex, so a non-flat architecture keeps the same
   * "resolve through a primitive" contract the flat matrix has. Keyed
   * architecture → `category.token` → mode. Absent = the projection's own value.
   */
  architectureOverrides: Record<string, Record<string, { light?: string; dark?: string }>>
  // Gradients foundation — named gradients + which one drives each preview
  // surface. Exported in tokens.json (`gradients`) / variables.css / README.
  gradients: GradientDef[]
  gradientAssignments: GradientAssignments
  // Scratch palette for the custom color picker's "Saved" swatches.
  savedColors: string[]
  selectedComponents: string[]
  completedFoundations: string[]
  iconLibrary: string
  customIcons: { name: string; svg: string }[]
  figmaLastPublishAt: string | null
  githubRepo: string | null
  githubLastPushAt: string | null
}

// A design system saved to the local registry. Saving requires a GitHub push,
// so `id` is the repo full_name — pushing twice to the same repo overwrites
// the entry, mirroring what happened to the repo's contents.
export interface SavedSystem {
  id: string
  name: string
  description: string
  repo: string
  savedAt: string // ISO of the last successful push
  snapshot: DesignSnapshot
  // How the entry got here — 'github' (push), 'local' (Save button), or
  // 'imported' (the Import-your-design-system flow). Optional: entries saved
  // before v35 are backfilled by the migration.
  source?: 'github' | 'local' | 'imported'
}

// Factory (not a const): every call returns fresh object references, so a
// reset never aliases a saved snapshot's nested objects.
export function makeDesignDefaults(): DesignSnapshot {
  return {
    projectName: 'Escala',
    projectDescription: '',
    colorAlgorithm: 'radix',
    contrastShift: 0,
    // Radix's own 1-12 numbering — every ramp is already stored this way
    // internally (see BASE_TONE), so this just makes new systems' on-screen
    // labels and export match it too. Existing persisted systems keep
    // whatever naming they already have; this only seeds fresh ones.
    colorNaming: 'numeric',
    pageBackground: '#ffffff',
    darkBackground: '#0c0e12',
    primaryColor: '#7f56d9',
    primaryScale: {},
    primaryDarkScale: {},
    grayBaseColor: '#6c737f',
    grayLightScale: { ...GRAY_LIGHT_SCALE },
    grayDarkScale: { ...GRAY_DARK_SCALE },
    errorColor: '#f04438',
    errorScale: {},
    errorDarkScale: {},
    warningColor: '#f79009',
    warningScale: {},
    warningDarkScale: {},
    successColor: '#17b26a',
    successScale: {},
    successDarkScale: {},
    infoColor: '#2e90fa',
    infoScale: {},
    infoDarkScale: {},
    customColors: [],
    themes: { light: { ...EMPTY_SEMANTIC }, dark: { ...EMPTY_SEMANTIC } },
    themeOrder: ['light', 'dark'],
    themeKinds: { light: 'light', dark: 'dark' },
    themeSources: {},
    typography: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      sizes: { ...FONT_SIZE_STANDARD },
      lineHeights: { ...LINE_HEIGHT_STANDARD },
      weights: { ...FONT_WEIGHT_STANDARD },
    },
    spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '6': '24px', '8': '32px' },
    radius: { none: '0px', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
    opacity: { ...OPACITY_DEFAULT },
    shadows: { ...SHADOW_DEFAULT },
    grid: { ...GRID_DEFAULT },
    sizes: { ...SIZES_DEFAULT },
    padding: { ...PADDING_DEFAULT },
    panelBackground: 'solid',
    semanticArchitecture: 'flat',
    architectureOverrides: {},
    gradients: makeDefaultGradients(),
    gradientAssignments: makeDefaultGradientAssignments(),
    savedColors: [],
    selectedComponents: [...COMPONENT_KEYS],
    completedFoundations: [],
    iconLibrary: 'lucide',
    customIcons: [],
    figmaLastPublishAt: null,
    githubRepo: null,
    githubLastPushAt: null,
  }
}

const SNAPSHOT_KEYS = Object.keys(makeDesignDefaults()) as (keyof DesignSnapshot)[]

// Deep clone matters on both capture and load: snapshots must be decoupled
// from live state or edits mutate the saved entry via shared nested objects.
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function captureSnapshot(state: DesignSnapshot): DesignSnapshot {
  return deepClone(
    Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, state[k]])) as unknown as DesignSnapshot
  )
}

interface DesignStore {
  // Home / onboarding
  projectName: string
  setProjectName: (name: string) => void
  projectDescription: string
  setProjectDescription: (d: string) => void
  // True once the user has confirmed the "New Design System" card on Home.
  // Gates Home between the onboarding card and the overview dashboard.
  projectCreated: boolean
  setProjectCreated: (v: boolean) => void

  // Connection status (shown on Home; written by the connect views)
  figmaLastPublishAt: string | null // ISO timestamp of the last successful POST to /api/tokens
  setFigmaLastPublishAt: (iso: string | null) => void
  githubRepo: string | null // "owner/repo" once connected (Fase GitHub)
  setGithubRepo: (repo: string | null) => void
  githubLastPushAt: string | null
  setGithubLastPushAt: (iso: string | null) => void
  // When on, the configurator re-publishes the token set to /api/tokens shortly
  // after every edit, so the Figma plugin's live sync always reads the current
  // state. A global preference (not per-system), driven by useAutoFigmaSync().
  autoSyncFigma: boolean
  setAutoSyncFigma: (v: boolean) => void

  // Color — scale generation algorithm + contrast shift (drive every 1–12 ramp)
  // and the token-naming scheme used in the export.
  colorAlgorithm: ColorAlgorithm
  contrastShift: number
  colorNaming: ColorNaming
  setColorAlgorithm: (a: ColorAlgorithm) => void
  setContrastShift: (n: number) => void
  setColorNaming: (n: ColorNaming) => void

  // Page background primitive — the surface every ramp is generated against
  // (tone-1 anchor) and the compositing base for the exported alpha ramps.
  pageBackground: string
  setPageBackground: (hex: string) => void

  // Dark-theme page background — anchors tone 12 of `grayDarkScale` (= surface-0
  // in dark). Its presets are derived from the accent, so the dark page carries
  // the brand's hue.
  darkBackground: string
  setDarkBackground: (hex: string) => void

  // Step 2 — Brand / accent color (user-defined, generates 12-tone scale)
  primaryColor: string
  primaryScale: ColorScale
  primaryDarkScale: ColorScale
  setPrimaryColor: (hex: string) => void
  setPrimaryScale: (scale: ColorScale) => void
  setPrimaryDarkScale: (scale: ColorScale) => void

  // Step 2 — Neutral gray (user-selectable flavor, generates light + dark scales)
  grayBaseColor: string
  grayLightScale: ColorScale
  grayDarkScale: ColorScale
  setGrayBaseColor: (hex: string) => void
  setGrayLightScale: (scale: ColorScale) => void
  setGrayDarkScale: (scale: ColorScale) => void

  // Step 2 — Semantic state scales (user-adjustable, default from Figma DS)
  errorColor: string
  errorScale: ColorScale
  errorDarkScale: ColorScale
  setErrorColor: (hex: string) => void
  setErrorScale: (scale: ColorScale) => void
  setErrorDarkScale: (scale: ColorScale) => void

  warningColor: string
  warningScale: ColorScale
  warningDarkScale: ColorScale
  setWarningColor: (hex: string) => void
  setWarningScale: (scale: ColorScale) => void
  setWarningDarkScale: (scale: ColorScale) => void

  successColor: string
  successScale: ColorScale
  successDarkScale: ColorScale
  setSuccessColor: (hex: string) => void
  setSuccessScale: (scale: ColorScale) => void
  setSuccessDarkScale: (scale: ColorScale) => void

  infoColor: string
  infoScale: ColorScale
  infoDarkScale: ColorScale
  setInfoColor: (hex: string) => void
  setInfoScale: (scale: ColorScale) => void
  setInfoDarkScale: (scale: ColorScale) => void

  // Step 2 — Custom color families (name + auto-generated 1–12 scale)
  customColors: CustomColor[]
  addCustomColor: (c: CustomColor) => void
  updateCustomColor: (key: string, updates: Partial<Omit<CustomColor, 'key'>>) => void
  removeCustomColor: (key: string) => void

  // Step 3 — Semantic tokens, one map per theme. 'light' and 'dark' always
  // exist (protected); the user can add more. Every theme shares the same role
  // keys. `themeKinds` records whether a theme reads as light or dark — it
  // drives the recommended tones and which gray ramp seeds it.
  themes: Record<string, Record<string, string>>
  themeOrder: string[]
  themeKinds: Record<string, 'light' | 'dark'>
  // Per-theme primitive palettes — only custom "style themes" have an entry;
  // light/dark fall back to the global scales.
  themeSources: Record<string, ThemeSources>
  setThemeToken: (theme: string, key: string, value: string) => void
  mergeThemeTokens: (theme: string, partial: Record<string, string>) => void
  addTheme: (key: string, kind: 'light' | 'dark', sources: ThemeSources) => void
  removeTheme: (key: string) => void
  // Reorder the theme columns (drag-to-reorder in the Semantic matrix).
  setThemeOrder: (order: string[]) => void
  // Rename a custom theme — re-keys its entry across themes/kinds/palettes and
  // preserves column order. No-op for the protected light/dark keys or on a
  // collision with an existing key.
  renameTheme: (oldKey: string, newKey: string) => void
  // Update a theme's mode + palette in place, keeping its token overrides. Works
  // for light/dark too — giving them a palette entry decouples them from the
  // global scales (they then read their own frozen ramps via sourceScaleFor).
  updateTheme: (key: string, kind: 'light' | 'dark', sources: ThemeSources) => void
  // Updates a custom theme's own palette (no-op for light/dark, which have no
  // palette entry and draw from the global scales instead).
  mergeThemeSources: (key: string, partial: Partial<ThemeSources>) => void

  // Step 4 — Typography
  typography: TypographyTokens
  setTypography: (t: TypographyTokens) => void

  // Foundations — Spacing & Radius (separate rail sections, shared store fields)
  spacing: Record<string, string>
  radius: Record<string, string>
  setSpacing: (s: Record<string, string>) => void
  setRadius: (r: Record<string, string>) => void

  // Foundations — Opacity / Shadow / Grid / Sizes token tables
  opacity: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  sizes: Record<string, string>
  setOpacity: (o: Record<string, string>) => void
  setShadows: (s: Record<string, string>) => void
  setGrid: (g: Record<string, string>) => void
  setSizes: (s: Record<string, string>) => void

  // Surface padding token (top/right/bottom/left)
  padding: Record<string, string>
  setPadding: (p: Record<string, string>) => void

  // Panel background — Radix-style treatment for raised surfaces (surface-1:
  // cards, panels, sections): solid, translucent, or the page background.
  panelBackground: 'solid' | 'translucent' | 'page'
  setPanelBackground: (v: 'solid' | 'translucent' | 'page') => void

  // Semantic token architecture — which shape the export projects the flat
  // role catalogue into (Alias/Semantics picker).
  semanticArchitecture: SemanticArchitecture
  setSemanticArchitecture: (v: SemanticArchitecture) => void
  // Edits to a non-flat architecture's projected tokens, stored as primitive
  // refs so they keep resolving through the ramps (see the snapshot field).
  architectureOverrides: Record<string, Record<string, { light?: string; dark?: string }>>
  setArchitectureOverride: (arch: string, tokenId: string, mode: 'light' | 'dark', ref: string | null) => void
  resetArchitectureOverrides: (arch: string) => void

  // Gradients — named gradients + per-surface assignment (covers, avatars)
  gradients: GradientDef[]
  gradientAssignments: GradientAssignments
  addGradient: (g: GradientDef) => void
  updateGradient: (id: string, patch: Partial<Omit<GradientDef, 'id'>>) => void
  removeGradient: (id: string) => void
  setGradientAssignment: (target: keyof GradientAssignments, id: string | null) => void

  // Custom color picker — user's saved swatch library
  savedColors: string[]
  addSavedColor: (hex: string) => void
  removeSavedColor: (hex: string) => void

  // Components — every component ships selected by default (toggle = remove)
  selectedComponents: string[]
  toggleComponent: (key: string) => void
  setSelectedComponents: (keys: string[]) => void

  // Foundations progress (gamification) — which foundation steps the user has
  // completed. Persisted so the progress bar survives reloads.
  completedFoundations: string[]
  markFoundationComplete: (key: string) => void
  resetFoundationsProgress: () => void

  // Icon Library — the icon set the system standardizes on (surfaced in export/MD)
  iconLibrary: string
  setIconLibrary: (key: string) => void

  // Custom icons — user-uploaded SVGs (sanitized before they reach the store)
  customIcons: { name: string; svg: string }[]
  addCustomIcon: (name: string, svg: string) => void
  removeCustomIcon: (name: string) => void

  // Multi design system — local registry backed by GitHub repos. An entry is
  // only created/updated by a successful push (GitHubConnectView).
  savedSystems: SavedSystem[]
  upsertSavedSystem: (entry: SavedSystem) => void
  removeSavedSystem: (id: string) => void // local-only; the repository is untouched
  loadSystem: (id: string) => void
  startNewSystem: () => void
  // Save the current token state into the local registry without a GitHub push.
  // Reuses the connected repo's id when present, else a slug of the project name.
  saveCurrentSystem: () => void
  // Adopt an imported snapshot as the active system AND register it in the
  // local registry with 'imported' provenance (Import your design system flow).
  applyImportedSystem: (snapshot: DesignSnapshot) => void
}

export const useDesignStore = create<DesignStore>()(
  persist(
    (set) => ({
      // All design data comes from the single defaults factory — the same
      // source startNewSystem() resets to.
      ...makeDesignDefaults(),

      setProjectName: (name) => set({ projectName: name }),
      setProjectDescription: (d) => set({ projectDescription: d }),
      // The system always exists with defaults — the workspace opens on Color, no
      // name-first onboarding gate. (Kept in the store for the multi-system flow.)
      projectCreated: true,
      setProjectCreated: (v) => set({ projectCreated: v }),

      setFigmaLastPublishAt: (iso) => set({ figmaLastPublishAt: iso }),
      setGithubRepo: (repo) => set({ githubRepo: repo }),
      setGithubLastPushAt: (iso) => set({ githubLastPushAt: iso }),
      autoSyncFigma: false,
      setAutoSyncFigma: (v) => set({ autoSyncFigma: v }),

      // Color scale generation
      setColorAlgorithm: (a) => set({ colorAlgorithm: a }),
      setContrastShift: (n) => set({ contrastShift: n }),
      setColorNaming: (n) => set({ colorNaming: n }),
      setPageBackground: (hex) => set({ pageBackground: hex }),
      setDarkBackground: (hex) => set({ darkBackground: hex }),

      // Brand
      setPrimaryColor: (hex) => set({ primaryColor: hex }),
      setPrimaryScale: (scale) => set({ primaryScale: scale }),
      setPrimaryDarkScale: (scale) => set({ primaryDarkScale: scale }),

      // Neutral gray (default: Gray Neutral — closest to Figma's neutral gray)
      setGrayBaseColor: (hex) => set({ grayBaseColor: hex }),
      setGrayLightScale: (scale) => set({ grayLightScale: scale }),
      setGrayDarkScale: (scale) => set({ grayDarkScale: scale }),

      // Semantic state scales (defaults from the Figma DS)
      setErrorColor: (hex) => set({ errorColor: hex }),
      setErrorScale: (scale) => set({ errorScale: scale }),
      setErrorDarkScale: (scale) => set({ errorDarkScale: scale }),
      setWarningColor: (hex) => set({ warningColor: hex }),
      setWarningScale: (scale) => set({ warningScale: scale }),
      setWarningDarkScale: (scale) => set({ warningDarkScale: scale }),
      setSuccessColor: (hex) => set({ successColor: hex }),
      setSuccessScale: (scale) => set({ successScale: scale }),
      setSuccessDarkScale: (scale) => set({ successDarkScale: scale }),
      setInfoColor: (hex) => set({ infoColor: hex }),
      setInfoScale: (scale) => set({ infoScale: scale }),
      setInfoDarkScale: (scale) => set({ infoDarkScale: scale }),

      addCustomColor: (c) =>
        set((state) =>
          state.customColors.some((x) => x.key === c.key)
            ? state
            : { customColors: [...state.customColors, c] }
        ),
      updateCustomColor: (key, updates) =>
        set((state) => ({
          customColors: state.customColors.map((c) =>
            c.key === key ? { ...c, ...updates } : c
          ),
        })),
      // Refuses while a theme still references the family: a theme resolves
      // THROUGH its families, so deleting one out from under it would leave a
      // dangling reference. Callers surface the blocked state (see the family
      // nav's "in use by N themes").
      removeCustomColor: (key) =>
        set((state) => {
          const used = Object.values(state.themeSources).some((refs) =>
            (['brand', 'gray', 'error', 'warning', 'success', 'info'] as const).some((s) => refs[s] === key),
          )
          if (used) return state
          return { customColors: state.customColors.filter((c) => c.key !== key) }
        }),

      setThemeToken: (theme, key, value) =>
        set((state) => ({
          themes: {
            ...state.themes,
            [theme]: { ...state.themes[theme], [key]: value },
          },
        })),
      mergeThemeTokens: (theme, partial) =>
        set((state) => ({
          themes: {
            ...state.themes,
            [theme]: { ...state.themes[theme], ...partial },
          },
        })),
      // Add a custom "style theme" with its own primitive palette. The token
      // map starts empty ({}) — Step3's auto-populate effect seeds every role
      // from the palette's recommended tones on the next render.
      addTheme: (key, kind, sources) =>
        set((state) => {
          if (state.themes[key]) return state
          return {
            themes: { ...state.themes, [key]: { ...EMPTY_SEMANTIC } },
            themeOrder: [...state.themeOrder, key],
            themeKinds: { ...state.themeKinds, [key]: kind },
            themeSources: { ...state.themeSources, [key]: sources },
          }
        }),
      mergeThemeSources: (key, partial) =>
        set((state) => {
          if (!state.themeSources[key]) return state
          return { themeSources: { ...state.themeSources, [key]: { ...state.themeSources[key], ...partial } } }
        }),
      removeTheme: (key) =>
        set((state) => {
          if (!state.themes[key]) return state
          // Keep at least one column — an empty matrix has nothing to edit or
          // export. Any single theme (including light/dark) may be removed.
          if (Object.keys(state.themes).length <= 1) return state
          const { [key]: _, ...themes } = state.themes
          const { [key]: __, ...themeKinds } = state.themeKinds
          const { [key]: ___, ...themeSources } = state.themeSources
          return {
            themes,
            themeKinds,
            themeSources,
            themeOrder: state.themeOrder.filter((t) => t !== key),
          }
        }),
      setThemeOrder: (order) =>
        set((state) => ({
          // Only reorder known themes; append any stragglers so nothing is lost.
          themeOrder: [
            ...order.filter((t) => state.themes[t]),
            ...state.themeOrder.filter((t) => state.themes[t] && !order.includes(t)),
          ],
        })),
      renameTheme: (oldKey, newKey) =>
        set((state) => {
          if (oldKey === 'light' || oldKey === 'dark') return state
          if (!state.themes[oldKey]) return state
          if (oldKey === newKey || !newKey) return state
          if (state.themes[newKey]) return state // collision — keep as-is
          const { [oldKey]: tokens, ...restThemes } = state.themes
          const { [oldKey]: kind, ...restKinds } = state.themeKinds
          const { [oldKey]: sources, ...restSources } = state.themeSources
          return {
            themes: { ...restThemes, [newKey]: tokens },
            themeKinds: { ...restKinds, [newKey]: kind },
            themeSources: sources
              ? { ...restSources, [newKey]: sources }
              : restSources,
            themeOrder: state.themeOrder.map((t) => (t === oldKey ? newKey : t)),
          }
        }),
      updateTheme: (key, kind, sources) =>
        set((state) => {
          if (!state.themes[key]) return state
          return {
            themeKinds: { ...state.themeKinds, [key]: kind },
            themeSources: { ...state.themeSources, [key]: sources },
          }
        }),

      setTypography: (t) => set({ typography: t }),

      setSpacing: (s) => set({ spacing: s }),
      setRadius: (r) => set({ radius: r }),

      setOpacity: (o) => set({ opacity: o }),
      setShadows: (s) => set({ shadows: s }),
      setPadding: (p) => set({ padding: p }),
      setGrid: (g) => set({ grid: g }),
      setSizes: (s) => set({ sizes: s }),

      setPanelBackground: (v) => set({ panelBackground: v }),
      setSemanticArchitecture: (v) => set({ semanticArchitecture: v }),
      // `ref === null` clears the edit, so the token falls back to the
      // projection's own value — the schema stays the source of truth.
      setArchitectureOverride: (arch, tokenId, mode, ref) =>
        set((state) => {
          const forArch = { ...(state.architectureOverrides[arch] ?? {}) }
          const entry = { ...(forArch[tokenId] ?? {}) }
          if (ref === null) delete entry[mode]
          else entry[mode] = ref
          if (Object.keys(entry).length) forArch[tokenId] = entry
          else delete forArch[tokenId]
          return { architectureOverrides: { ...state.architectureOverrides, [arch]: forArch } }
        }),
      resetArchitectureOverrides: (arch) =>
        set((state) => {
          const { [arch]: _drop, ...rest } = state.architectureOverrides
          return { architectureOverrides: rest }
        }),

      // Gradients — CRUD + per-surface assignment. Removing a gradient also
      // clears any assignment pointing at it, so covers/avatars never dangle.
      addGradient: (g) => set((state) => ({ gradients: [...state.gradients, g] })),
      updateGradient: (id, patch) =>
        set((state) => ({
          gradients: state.gradients.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGradient: (id) =>
        set((state) => ({
          gradients: state.gradients.filter((g) => g.id !== id),
          gradientAssignments: {
            cover: state.gradientAssignments.cover === id ? null : state.gradientAssignments.cover,
            avatar: state.gradientAssignments.avatar === id ? null : state.gradientAssignments.avatar,
          },
        })),
      setGradientAssignment: (target, id) =>
        set((state) => ({ gradientAssignments: { ...state.gradientAssignments, [target]: id } })),

      addSavedColor: (hex) =>
        set((state) =>
          state.savedColors.some((c) => c.toLowerCase() === hex.toLowerCase())
            ? state
            : { savedColors: [...state.savedColors, hex] }
        ),
      removeSavedColor: (hex) =>
        set((state) => ({ savedColors: state.savedColors.filter((c) => c.toLowerCase() !== hex.toLowerCase()) })),

      // Every component is included by default — the user removes what they don't want.
      toggleComponent: (key) =>
        set((state) => ({
          selectedComponents: state.selectedComponents.includes(key)
            ? state.selectedComponents.filter((k) => k !== key)
            : [...state.selectedComponents, key],
        })),
      setSelectedComponents: (keys) => set({ selectedComponents: keys }),

      // Foundations progress — idempotent add; reset clears it.
      markFoundationComplete: (key) =>
        set((state) =>
          state.completedFoundations.includes(key)
            ? state
            : { completedFoundations: [...state.completedFoundations, key] }
        ),
      resetFoundationsProgress: () => set({ completedFoundations: [] }),

      // Icon Library (default: Lucide — clean, ubiquitous line icons)
      setIconLibrary: (key) => set({ iconLibrary: key }),

      addCustomIcon: (name, svg) =>
        set((state) =>
          state.customIcons.some((i) => i.name === name)
            ? { customIcons: state.customIcons.map((i) => (i.name === name ? { name, svg } : i)) }
            : { customIcons: [...state.customIcons, { name, svg }] }
        ),
      removeCustomIcon: (name) =>
        set((state) => ({ customIcons: state.customIcons.filter((i) => i.name !== name) })),

      // ── Multi design system registry ──
      savedSystems: [],
      upsertSavedSystem: (entry) =>
        set((state) => ({
          savedSystems: state.savedSystems.some((s) => s.id === entry.id)
            ? state.savedSystems.map((s) => (s.id === entry.id ? entry : s))
            : [...state.savedSystems, entry],
        })),
      removeSavedSystem: (id) =>
        set((state) => ({ savedSystems: state.savedSystems.filter((s) => s.id !== id) })),
      loadSystem: (id) =>
        set((state) => {
          const sys = state.savedSystems.find((s) => s.id === id)
          if (!sys) return state
          // Clone so editing the loaded system never mutates the saved entry.
          return { ...deepClone(sys.snapshot), projectCreated: true }
        }),
      startNewSystem: () => set({ ...makeDesignDefaults(), projectCreated: true }),
      saveCurrentSystem: () =>
        set((state) => {
          const snapshot = captureSnapshot(state as unknown as DesignSnapshot)
          // A GitHub-backed system keeps its repo id so a local save updates the
          // same entry; an unconnected one gets a stable slug id.
          const id = state.githubRepo ?? `local:${slugify(state.projectName) || 'design-system'}`
          const entry: SavedSystem = {
            id,
            name: state.projectName,
            description: state.projectDescription,
            repo: state.githubRepo ?? '',
            savedAt: new Date().toISOString(),
            snapshot,
            source: state.githubRepo ? 'github' : 'local',
          }
          return {
            savedSystems: state.savedSystems.some((s) => s.id === id)
              ? state.savedSystems.map((s) => (s.id === id ? entry : s))
              : [...state.savedSystems, entry],
          }
        }),
      applyImportedSystem: (snapshot) =>
        set((state) => {
          const id = `imported:${slugify(snapshot.projectName) || 'imported-system'}`
          const entry: SavedSystem = {
            id,
            name: snapshot.projectName,
            description: snapshot.projectDescription,
            repo: '',
            savedAt: new Date().toISOString(),
            snapshot: deepClone(snapshot),
            source: 'imported',
          }
          // Clone again for the live state so edits never mutate the registry entry.
          return {
            ...deepClone(snapshot),
            projectCreated: true,
            savedSystems: state.savedSystems.some((s) => s.id === id)
              ? state.savedSystems.map((s) => (s.id === id ? entry : s))
              : [...state.savedSystems, entry],
          }
        }),
    }),
    {
      name: 'scalable-designs-store',
      version: 43,
      migrate: (persisted: any, version: number) => {
        if (persisted) {
          // v1→v2: remove styleDirection, rename selectedAtoms → selectedComponents
          delete persisted.styleDirection
          if (persisted.selectedAtoms && !persisted.selectedComponents) {
            persisted.selectedComponents = persisted.selectedAtoms
            delete persisted.selectedAtoms
          }
          // v2→v3: hub model — nav state is no longer persisted; the system now
          // ships with every component included by default.
          delete persisted.currentStep
          if (!persisted.projectName) persisted.projectName = 'DS.by.MD'
          if (!persisted.selectedComponents?.length) {
            persisted.selectedComponents = [...COMPONENT_KEYS]
          }
          // v3→v4: semantic tokens gained an independent dark-mode map. Seed it
          // empty; Step3 re-derives values from the scales on mount.
          if (!persisted.darkSemanticTokens) {
            persisted.darkSemanticTokens = { ...EMPTY_SEMANTIC }
          }
          // v4→v5: typography adopts the full Figma standard (11 sizes /
          // 11 line-heights / 4 weights). The old 6-size keys (base, 2xl…) don't
          // map cleanly, so reset the scale to the standard but keep font choices.
          if (persisted.typography) {
            const t = persisted.typography
            t.sizes = { ...FONT_SIZE_STANDARD }
            t.lineHeights = { ...LINE_HEIGHT_STANDARD }
            t.weights = { ...FONT_WEIGHT_STANDARD }
            if (!t.headingFontFamily) t.headingFontFamily = t.fontFamily ?? 'Inter'
          }
          // v5→v6: Foundations became a gamified stepper; seed the progress tracker.
          if (!persisted.completedFoundations) {
            persisted.completedFoundations = []
          }
          // v6→v7: Icon Library foundation added; seed the default set.
          if (!persisted.iconLibrary) {
            persisted.iconLibrary = 'lucide'
          }
          // v7→v8: rename default project name from "Apollo" to "DS.by.MD".
          if (persisted.projectName === 'Apollo') {
            persisted.projectName = 'DS.by.MD'
          }
          // v9→v10: Opacity / Shadow / Grid / Sizes foundations added; seed defaults.
          if (!persisted.opacity) persisted.opacity = { ...OPACITY_DEFAULT }
          if (!persisted.shadows) persisted.shadows = { ...SHADOW_DEFAULT }
          if (!persisted.grid) persisted.grid = { ...GRID_DEFAULT }
          if (!persisted.sizes) persisted.sizes = { ...SIZES_DEFAULT }
          // v10→v11: custom color families added; seed empty.
          if (!persisted.customColors) persisted.customColors = []
          // v11→v13: semanticTokens/darkSemanticTokens unified into the
          // multi-theme map. Legacy fields take precedence whenever they are
          // still present, so a partially-migrated state self-repairs.
          if (persisted.semanticTokens || persisted.darkSemanticTokens || !persisted.themes) {
            persisted.themes = {
              ...(persisted.themes ?? {}),
              light: persisted.semanticTokens ?? persisted.themes?.light ?? { ...EMPTY_SEMANTIC },
              dark: persisted.darkSemanticTokens ?? persisted.themes?.dark ?? { ...EMPTY_SEMANTIC },
            }
            delete persisted.semanticTokens
            delete persisted.darkSemanticTokens
          }
          if (!persisted.themeOrder) persisted.themeOrder = ['light', 'dark']
          if (!persisted.themeKinds) persisted.themeKinds = { light: 'light', dark: 'dark' }
          // v13→v14: Home/onboarding — description + connection status fields.
          if (persisted.projectDescription === undefined) persisted.projectDescription = ''
          if (persisted.figmaLastPublishAt === undefined) persisted.figmaLastPublishAt = null
          if (persisted.githubRepo === undefined) persisted.githubRepo = null
          if (persisted.githubLastPushAt === undefined) persisted.githubLastPushAt = null
          // v14→v15: custom uploaded icons; seed empty.
          if (!persisted.customIcons) persisted.customIcons = []
          // v15→v16: Home onboarding gained an explicit "project created" flag.
          // Grandfather existing users who clearly already worked on a system,
          // so they land on the dashboard instead of the onboarding card.
          if (persisted.projectCreated === undefined) {
            persisted.projectCreated =
              (!!persisted.projectName && persisted.projectName !== 'DS.by.MD') ||
              !!persisted.projectDescription ||
              !!persisted.figmaLastPublishAt ||
              !!persisted.githubRepo ||
              (persisted.completedFoundations?.length ?? 0) > 0
          }
          // v16→v17: multi design system registry. Grandfather: if the current
          // session was already pushed to a repo, seed the registry so "start
          // new" can't silently lose it. Merge over fresh defaults so the
          // snapshot shape is always complete even from old persisted shapes.
          if (!persisted.savedSystems) {
            persisted.savedSystems = []
            if (persisted.githubRepo && persisted.githubLastPushAt) {
              const defaults = makeDesignDefaults() as unknown as Record<string, unknown>
              const snapshot = Object.fromEntries(
                Object.keys(defaults).map((k) => [k, persisted[k] !== undefined ? persisted[k] : defaults[k]])
              )
              persisted.savedSystems = [{
                id: persisted.githubRepo,
                name: persisted.projectName ?? 'DS.by.MD',
                description: persisted.projectDescription ?? '',
                repo: persisted.githubRepo,
                savedAt: persisted.githubLastPushAt,
                snapshot,
              }]
            }
          }
          // v17→v18: per-theme primitive palettes for custom "style themes".
          // Built-in light/dark have no entry and use the global scales.
          if (!persisted.themePalettes) persisted.themePalettes = {}
          // v18→v19: color-scale algorithm + contrast shift. Default keeps the
          // legacy ramp so existing scales render identically until changed.
          if (!persisted.colorAlgorithm) persisted.colorAlgorithm = 'default'
          if (persisted.contrastShift === undefined) persisted.contrastShift = 0
          // v19→v20: token naming scheme for the export. Default numeric (1–12)
          // preserves existing token names.
          if (!persisted.colorNaming) persisted.colorNaming = 'numeric'
          // v20→v21: onboarding now opens straight on Color — the name-first gate
          // is gone, so every system is "created". Supersedes the v15→v16 heuristic.
          persisted.projectCreated = true
          // v21→v22: auto-publish to /api/tokens preference. Off by default so
          // existing sessions keep publishing only via the explicit Sync action.
          if (persisted.autoSyncFigma === undefined) persisted.autoSyncFigma = false
          // v22→v23: primitive families renamed brand→accent / gray→neutral.
          // Primitive scales persist by numeric tone (no prefix) so they need no
          // change; only the semantic token KEYS carry "brand"
          // (e.g. bg-brand-solid → bg-accent-solid). Rename those keys in place.
          const renameBrandKeys = (map: Record<string, string> | undefined) => {
            if (!map || typeof map !== 'object') return map
            const out: Record<string, string> = {}
            for (const [k, v] of Object.entries(map)) out[k.replace(/brand/g, 'accent')] = v as string
            return out
          }
          if (persisted.themes && typeof persisted.themes === 'object') {
            for (const t of Object.keys(persisted.themes)) {
              persisted.themes[t] = renameBrandKeys(persisted.themes[t])
            }
          }
          if (persisted.semanticTokens) persisted.semanticTokens = renameBrandKeys(persisted.semanticTokens)
          if (persisted.darkSemanticTokens) persisted.darkSemanticTokens = renameBrandKeys(persisted.darkSemanticTokens)
          // v23→v24: readable semantic taxonomy — rename every semantic-token KEY
          // (bg-primary → surface-0, bg-accent-solid → action-primary, fg-* → icon-*,
          //  text-*_on-accent → text-on-brand-*, …). Values are preserved, so user
          //  customisations survive. Also rewrite keys inside every saved-system
          //  snapshot so loading an older system doesn't reset to defaults.
          if (persisted.themes && typeof persisted.themes === 'object') {
            for (const t of Object.keys(persisted.themes)) {
              persisted.themes[t] = renameSemanticKeys(persisted.themes[t])
            }
          }
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) {
              const snap = sys?.snapshot
              if (snap?.themes && typeof snap.themes === 'object') {
                for (const t of Object.keys(snap.themes)) {
                  snap.themes[t] = renameSemanticKeys(snap.themes[t])
                }
              }
            }
          }
          // v24→v25: Radix-style panel background (solid/translucent) for raised
          // surfaces. Default 'solid' preserves the current look for every
          // existing session until they opt into translucent.
          if (!persisted.panelBackground) persisted.panelBackground = 'solid'
          // v25→v26: page background primitive (Radix custom-palette input) —
          // anchors tone 1 of every ramp + derives the alpha ramps. White is
          // the previous implicit background, so existing output is unchanged.
          if (!persisted.pageBackground) persisted.pageBackground = '#ffffff'
          // v26→v27: the catalogue grew from 16 to 58 components. New keys ship
          // included by default (same as a fresh system), so union them into the
          // existing selection — anything the user removed stays removed.
          if (Array.isArray(persisted.selectedComponents)) {
            const have = new Set(persisted.selectedComponents)
            // Only append keys that post-date the old 16-key catalogue.
            const legacy = new Set([
              'Button', 'Input', 'Select', 'Checkbox', 'Toggle', 'Badge', 'Progress', 'Spinner',
              'Avatar', 'Card', 'Divider', 'Modal', 'Tooltip', 'Toast', 'Tabs', 'Breadcrumb',
            ])
            for (const key of COMPONENT_KEYS) {
              if (!legacy.has(key) && !have.has(key)) persisted.selectedComponents.push(key)
            }
          }
          // v27→v28: per-side surface padding token; 20px matches the previous
          // hardcoded tile inset, so existing previews render identically.
          if (!persisted.padding) persisted.padding = { ...PADDING_DEFAULT }
          // v28→v29: dark-mode colored TEXT tokens now mirror onto the light
          // half of their ramp (recDarkTone: 12→6 · 11→7 · 10→8) — the old
          // seeds (tone−1) were dark-on-light tones, unreadable on dark
          // surfaces. Reseed values still on the old recommendation (or empty);
          // user-customised hexes are left untouched.
          const DARK_TEXT_RESEED: { key: string; scale: string; old: number; next: number }[] = [
            { key: 'text-brand',                 scale: 'brand',   old: 11, next: 6 },
            { key: 'text-brand-secondary',       scale: 'brand',   old: 10, next: 7 },
            { key: 'text-brand-secondary-hover', scale: 'brand',   old: 11, next: 6 },
            { key: 'text-brand-tertiary',        scale: 'brand',   old: 9,  next: 8 },
            { key: 'text-brand-tertiary-alt',    scale: 'brand',   old: 9,  next: 8 },
            { key: 'text-error',                 scale: 'error',   old: 10, next: 7 },
            { key: 'text-warning',               scale: 'warning', old: 10, next: 7 },
            { key: 'text-success',               scale: 'success', old: 10, next: 7 },
            { key: 'text-info',                  scale: 'info',    old: 10, next: 7 },
          ]
          const reseedDarkText = (state: any) => {
            if (!state?.themes || typeof state.themes !== 'object') return
            for (const t of Object.keys(state.themes)) {
              if ((state.themeKinds?.[t] ?? 'light') !== 'dark') continue
              const tokens = state.themes[t]
              if (!tokens || typeof tokens !== 'object') continue
              const pal = state.themePalettes?.[t]
              for (const e of DARK_TEXT_RESEED) {
                const ramp = pal?.[e.scale] ?? (e.scale === 'brand' ? state.primaryScale : state[`${e.scale}Scale`])
                const nextHex = ramp?.[e.next]
                if (!nextHex) continue
                const cur = tokens[e.key]
                const oldHex = ramp?.[e.old]
                if (!cur || (oldHex && cur.toLowerCase() === oldHex.toLowerCase())) tokens[e.key] = nextHex
              }
            }
          }
          reseedDarkText(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) reseedDarkText(sys?.snapshot)
          }
          // v29→v30: brand-mapped tokens were re-derived on every accent change
          // using the LIGHT tone for ALL themes (brandTokenUpdates ignored the
          // theme kind), so dark themes got dark-on-light brand text/icons/
          // borders — unreadable on dark surfaces. Reseed every dark theme's
          // brand token that still sits on its light-only tone (lt) onto the
          // recDarkTone tone (dt). Values matching neither are user choices.
          const DARK_BRAND_RESEED: { key: string; lt: number; dt: number }[] = [
            { key: 'surface-brand-subtle',       lt: 2,  dt: 11 },
            { key: 'surface-brand-subtle-alt',   lt: 2,  dt: 11 },
            { key: 'surface-brand-muted',        lt: 3,  dt: 12 },
            { key: 'text-brand',                 lt: 12, dt: 6 },
            { key: 'text-brand-secondary',       lt: 11, dt: 7 },
            { key: 'text-brand-secondary-hover', lt: 12, dt: 6 },
            { key: 'text-brand-tertiary',        lt: 10, dt: 8 },
            { key: 'text-brand-tertiary-alt',    lt: 10, dt: 8 },
            { key: 'icon-brand',                 lt: 9,  dt: 8 },
            { key: 'icon-brand-alt',             lt: 9,  dt: 8 },
            { key: 'icon-brand-secondary',       lt: 8,  dt: 7 },
            { key: 'icon-brand-secondary-alt',   lt: 8,  dt: 7 },
            { key: 'border-brand',               lt: 8,  dt: 7 },
            { key: 'border-brand-alt',           lt: 9,  dt: 8 },
          ]
          const reseedDarkBrand = (state: any) => {
            if (!state?.themes || typeof state.themes !== 'object') return
            for (const t of Object.keys(state.themes)) {
              if ((state.themeKinds?.[t] ?? 'light') !== 'dark') continue
              const tokens = state.themes[t]
              if (!tokens || typeof tokens !== 'object') continue
              const ramp = state.themePalettes?.[t]?.brand ?? state.primaryScale
              if (!ramp) continue
              for (const e of DARK_BRAND_RESEED) {
                const cur = tokens[e.key]
                const ltHex = ramp[e.lt]
                const dtHex = ramp[e.dt]
                if (!dtHex) continue
                if (!cur || (ltHex && cur.toLowerCase() === ltHex.toLowerCase())) tokens[e.key] = dtHex
              }
              // Solid brand fill: deepen to the accessible tone (like light mode)
              // so a bright accent's button label passes WCAG. Only touch values
              // still on the base tone 9/10 (or empty) — user picks are kept.
              const solid = accessibleSolidTone(ramp)
              const seedAction = (key: string, baseTone: number, tone: number) => {
                const hex = ramp[tone]
                const baseHex = ramp[baseTone]
                if (!hex) return
                const cur = tokens[key]
                if (!cur || (baseHex && cur.toLowerCase() === baseHex.toLowerCase())) tokens[key] = hex
              }
              seedAction('action-primary', 9, solid)
              seedAction('action-primary-hover', 10, Math.min(solid + 1, 12))
            }
          }
          reseedDarkBrand(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) reseedDarkBrand(sys?.snapshot)
          }
          // v30→v31: Gradients foundation. Seed the default gradient set +
          // assignments and an empty saved-colors library on any state (and every
          // saved snapshot) that predates the feature.
          const seedGradients = (state: any) => {
            if (!state || typeof state !== 'object') return
            if (!Array.isArray(state.gradients)) state.gradients = makeDefaultGradients()
            if (!state.gradientAssignments) state.gradientAssignments = makeDefaultGradientAssignments()
            if (!Array.isArray(state.savedColors)) state.savedColors = []
          }
          seedGradients(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) seedGradients(sys?.snapshot)
          }
          // v31→v32: dark themes gained their own page background + generated
          // neutral ramp (they used to read the fixed GRAY_DARK_SCALE constant).
          // Seed both with the legacy values so existing systems keep the exact
          // dark they already had; picking a dark background regenerates them.
          const seedDarkBackground = (state: any) => {
            if (!state || typeof state !== 'object') return
            if (!state.darkBackground) state.darkBackground = '#0c0e12'
            if (!state.grayDarkScale || typeof state.grayDarkScale !== 'object') {
              state.grayDarkScale = { ...GRAY_DARK_SCALE }
            }
          }
          seedDarkBackground(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) seedDarkBackground(sys?.snapshot)
          }
          // v32→v33: the Brand Cover / Aurora seed gradients now derive from the
          // accent so they match the chosen brand instead of the old hardcoded
          // violet→magenta. Only retint the untouched seeds — a hand-edited stop
          // set won't match the legacy signature and is left exactly as-is.
          const OLD_BRAND_COVER = [{ color: '#7f56d9', pos: 0 }, { color: '#432e73', pos: 100 }]
          const OLD_AURORA = [{ color: '#7f56d9', pos: 0 }, { color: '#d444f1', pos: 50 }, { color: '#f63d68', pos: 100 }]
          const retintBrandGradients = (state: any) => {
            if (!state || !Array.isArray(state.gradients)) return
            const accent = typeof state.primaryColor === 'string' && state.primaryColor ? state.primaryColor : '#7f56d9'
            state.gradients = state.gradients.map((g: any) => {
              if (g?.id === 'brand-cover' && Array.isArray(g.stops) && stopsMatch(g.stops, OLD_BRAND_COVER)) {
                return { ...g, stops: brandCoverStops(accent) }
              }
              if (g?.id === 'aurora' && Array.isArray(g.stops) && stopsMatch(g.stops, OLD_AURORA)) {
                return { ...g, stops: brandAvatarStops(accent) }
              }
              return g
            })
          }
          retintBrandGradients(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) retintBrandGradients(sys?.snapshot)
          }
          // v33→v34: rebrand — the app + default design-system name became
          // "Escala". Rename anyone still on the old "DS.by.MD" default (and any
          // saved system that kept it) so exports don't carry the stale brand.
          // A hand-picked project name never matched the default, so it's left
          // untouched.
          if (persisted.projectName === 'DS.by.MD') persisted.projectName = 'Escala'
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) {
              if (sys?.name === 'DS.by.MD') sys.name = 'Escala'
              if (sys?.snapshot?.projectName === 'DS.by.MD') sys.snapshot.projectName = 'Escala'
            }
          }
          // v34→v35: SavedSystem gained provenance ('github' | 'local' |
          // 'imported'). Backfill existing entries from whether they carry a repo.
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) {
              if (sys && sys.source === undefined) sys.source = sys.repo ? 'github' : 'local'
            }
          }
          // v35→v36: the accent link on the brand gradients became an explicit
          // per-gradient lock (`linked`). Backfill it from the old implicit rule:
          // stops that still match the accent-derived signature were linked,
          // hand-edited ones were not.
          const backfillGradientLinks = (state: any) => {
            if (!state || !Array.isArray(state.gradients)) return
            const accent = typeof state.primaryColor === 'string' && state.primaryColor ? state.primaryColor : '#7f56d9'
            state.gradients = state.gradients.map((g: any) => {
              if (!g || g.linked !== undefined) return g
              const derived = derivedStopsFor(g.id, accent)
              if (!derived) return g
              return { ...g, linked: Array.isArray(g.stops) && stopsMatch(g.stops, derived) }
            })
          }
          backfillGradientLinks(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) backfillGradientLinks(sys?.snapshot)
          }
          // v36→v37: semantic architecture picker (Alias/Semantics). 'flat' is
          // the shape every existing system already exports, so nothing changes
          // until the user picks a projection.
          if (!persisted.semanticArchitecture) persisted.semanticArchitecture = 'flat'
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) {
              if (sys?.snapshot && !sys.snapshot.semanticArchitecture) sys.snapshot.semanticArchitecture = 'flat'
            }
          }
          // v37→v38: the flat semantic layer was replaced by the Untitled-UI
          // canonical Content/Background/Border catalogue (surface-*/action-*/
          // text-*/icon-* → content-*/background-*/border-*). The old keys don't
          // map cleanly, so clear every theme's role map — Step3's auto-seed
          // repopulates the new roles from each theme's ramps on next render, and
          // the export fills any still-empty role with its recommended tone.
          const clearSemantics = (state: any) => {
            if (!state?.themes || typeof state.themes !== 'object') return
            for (const t of Object.keys(state.themes)) state.themes[t] = {}
          }
          clearSemantics(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) clearSemantics(sys?.snapshot)
          }
          // v37→v38 USED to force 'numeric' → 'hundreds' here, back when the
          // semantic references were written against the 50–950 labels. That
          // was reversed in v42 (below): Radix numeric 1–12 is the system's
          // naming now, and this line was actively converting people off it on
          // every upgrade — the exact opposite of the default. Left as a no-op
          // rather than deleted so the migration chain stays append-only and
          // the reversal is legible to whoever reads this next.
        }
        if (version < 39) {
          // v38→v39: a theme no longer OWNS ramps, it REFERENCES primitive
          // families (`themePalettes` scales → `themeSources` keys). Every ramp
          // a theme was hiding becomes a real family in Primitives, so the
          // connection the model now guarantees is visible where colour is
          // edited. Slots matching a global ramp reference it instead of
          // duplicating it.
          const toSources = (state: any) => {
            if (!state) return
            const palettes = state.themePalettes ?? {}
            const sources: Record<string, any> = {}
            state.customColors = Array.isArray(state.customColors) ? state.customColors : []
            const globals: Record<string, any> = {
              brand: state.primaryScale, gray: state.grayLightScale, error: state.errorScale,
              warning: state.warningScale, success: state.successScale, info: state.infoScale,
            }
            const globalKey: Record<string, string> = {
              brand: 'accent', gray: 'neutral', error: 'error',
              warning: 'warning', success: 'success', info: 'info',
            }
            const same = (a: any, b: any) =>
              a && b && (a[9] ?? '').toLowerCase() === (b[9] ?? '').toLowerCase()
            for (const [theme, pal] of Object.entries<any>(palettes)) {
              const refs: Record<string, string> = { ...DEFAULT_THEME_SOURCES }
              for (const slot of ['brand', 'gray', 'error', 'warning', 'success', 'info']) {
                const scale = pal?.[slot]
                if (!scale) continue
                if (same(scale, globals[slot])) { refs[slot] = globalKey[slot]; continue }
                // Reuse a family that already carries this ramp, else mint one.
                const base = scale[9] ?? scale[1]
                const hit = state.customColors.find((c: any) => (c.base ?? '').toLowerCase() === (base ?? '').toLowerCase())
                if (hit) { refs[slot] = hit.key; continue }
                const key = slot === 'brand' ? theme : `${theme}-${slot}`
                if (!RESERVED_COLOR_KEYS.includes(key) && !state.customColors.some((c: any) => c.key === key)) {
                  state.customColors.push({
                    key,
                    label: key.replace(/-/g, ' ').replace(/\b\w/g, (m: string) => m.toUpperCase()),
                    base,
                    scale,
                  })
                  refs[slot] = key
                }
              }
              sources[theme] = refs
            }
            state.themeSources = sources
            delete state.themePalettes
          }
          toSources(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) toSources(sys?.snapshot)
          }
        }
        if (version < 41) {
          // v40→v41: non-flat architectures became editable — projected tokens
          // can be re-pointed at another primitive, stored as refs.
          if (!persisted.architectureOverrides) persisted.architectureOverrides = {}
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) {
              if (sys?.snapshot && !sys.snapshot.architectureOverrides) sys.snapshot.architectureOverrides = {}
            }
          }
        }
        if (version < 40) {
          // v39→v40: every COLOURED family gains its own dark ramp (Radix ships
          // each colour as two scales). Until now only the neutral had one, so a
          // dark theme resolved brand/status tints from the LIGHT ramp — tones
          // eased toward a white page and then read on a dark one.
          //
          // Dark semantic values were authored against that approximation, so
          // they no longer correspond: clear the dark themes' role maps and let
          // Step3's auto-seed repopulate them from the new ramps (same approach
          // the v37→v38 catalogue swap took).
          const addDarkRamps = (state: any) => {
            if (!state) return
            const algo = state.colorAlgorithm ?? 'default'
            const shift = state.contrastShift ?? 0
            const darkBg = state.darkBackground
            const gen = (hex?: string) => {
              if (!hex) return {}
              try { return generateFamilyDarkScale(hex, algo, shift, darkBg) } catch { return {} }
            }
            state.primaryDarkScale = gen(state.primaryColor)
            state.errorDarkScale = gen(state.errorColor)
            state.warningDarkScale = gen(state.warningColor)
            state.successDarkScale = gen(state.successColor)
            state.infoDarkScale = gen(state.infoColor)
            if (Array.isArray(state.customColors)) {
              for (const c of state.customColors) c.darkScale = gen(c.base)
            }
            if (state.themes && typeof state.themes === 'object') {
              for (const t of Object.keys(state.themes)) {
                if ((state.themeKinds?.[t] ?? 'light') === 'dark') state.themes[t] = {}
              }
            }
          }
          addDarkRamps(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) addDarkRamps(sys?.snapshot)
          }
        }
        if (version < 42) {
          // v41→v42: Radix numeric 1–12 becomes THE naming, not just the default
          // for fresh systems. Every ramp was already stored 1–12 internally, so
          // this only relabels — but it relabels the EXPORT too (`colorNaming`
          // drives the swatch strip, the families table AND tokenGenerator /
          // exporters / sectionExport through `toneLabel`), which is the point:
          // the 12 steps are role positions in the Radix model, and 25–950
          // implied a Tailwind lightness ramp the scales no longer are.
          //
          // This IS a rename for anyone still on 'hundreds' — `accent-700`
          // becomes `accent-9` in tokens.json / variables.css. A Figma or JSON
          // integration pinned to the old names has to re-sync. That's accepted
          // deliberately: v38 had been force-converting people onto 'hundreds'
          // on every upgrade, so leaving both behaviours in place meant the
          // naming a system exported depended on which version it upgraded from.
          const toNumeric = (state: any) => {
            if (state) state.colorNaming = 'numeric'
          }
          toNumeric(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) toNumeric(sys?.snapshot)
          }
        }
        if (version < 43) {
          // v42→v43: ~30 of the 39 semantic roles carried a hardcoded `darkTone`
          // left over from a pre-Radix inversion scheme (25↔950-style mirroring)
          // that was never removed once per-appearance dark ramps + tone IDENTITY
          // became the real model (lib/semanticRoles.ts). Worst offender:
          // background-primary — the PAGE background — pinned to gray tone 12
          // (the ramp's lightest, near-white step) instead of identity tone 1
          // (the ramp's darkest step, which IS `darkBackground`). Any dark theme
          // ever opened in Alias/Semantics had this baked into its stored role
          // map, and auto-populate only overwrites a value that's no longer ANY
          // tone of the current ramp — tone 12 still is one, just the wrong
          // recommendation now, so it silently survives every future resync.
          //
          // Same fix as v38/v40: clear the DARK-kind themes' role maps so
          // Step3's auto-populate (and resolvePreviewTokens' same fallback)
          // re-seed them from the now-correct identity tones. Light-kind themes
          // are untouched — their roles were never wrong.
          const clearDarkSemantics = (state: any) => {
            if (!state?.themes || typeof state.themes !== 'object') return
            for (const t of Object.keys(state.themes)) {
              if ((state.themeKinds?.[t] ?? 'light') === 'dark') state.themes[t] = {}
            }
          }
          clearDarkSemantics(persisted)
          if (Array.isArray(persisted.savedSystems)) {
            for (const sys of persisted.savedSystems) clearDarkSemantics(sys?.snapshot)
          }
        }
        return persisted
      },
    }
  )
)
