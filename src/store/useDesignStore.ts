import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPONENT_KEYS } from '../lib/componentCatalogue'
import { FONT_SIZE_STANDARD, LINE_HEIGHT_STANDARD, FONT_WEIGHT_STANDARD } from '../lib/typographyStandard'
import type { ColorAlgorithm, ColorNaming } from '../lib/colorUtils'
import { slugify } from '../lib/utils'

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
}

// Family names reserved by the built-in scales — custom colors can't use them.
export const RESERVED_COLOR_KEYS = ['brand', 'gray', 'error', 'warning', 'success', 'info']

// Per-theme primitive palette — a custom "style theme" carries its own 1–12
// scales (brand/neutral/semantic) instead of drawing from the global ones. The
// built-in light/dark themes have NO entry here and fall back to the globals.
export interface ThemePalette {
  brand: ColorScale
  gray: ColorScale
  error: ColorScale
  warning: ColorScale
  success: ColorScale
  info: ColorScale
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
const EMPTY_SEMANTIC: Record<string, string> = {
  // ── Text ──────────────────────────────────────────────────
  'text-primary': '', 'text-primary_on-brand': '',
  'text-secondary': '', 'text-secondary_hover': '', 'text-secondary_on-brand': '',
  'text-tertiary': '', 'text-tertiary_hover': '', 'text-tertiary_on-brand': '',
  'text-quaternary': '', 'text-quaternary_on-brand': '',
  'text-white': '', 'text-disabled': '',
  'text-placeholder': '', 'text-placeholder_subtle': '',
  'text-brand-primary': '',
  'text-brand-secondary': '', 'text-brand-secondary_hover': '',
  'text-brand-tertiary': '', 'text-brand-tertiary_alt': '',
  'text-error-primary': '', 'text-warning-primary': '', 'text-success-primary': '', 'text-info-primary': '',
  // ── Border ────────────────────────────────────────────────
  'border-primary': '',
  'border-secondary': '', 'border-secondary_alt': '',
  'border-tertiary': '',
  'border-disabled': '', 'border-disabled_subtle': '',
  'border-brand': '', 'border-brand_alt': '',
  'border-error': '', 'border-error_subtle': '',
  // ── Foreground ────────────────────────────────────────────
  'fg-primary': '',
  'fg-secondary': '', 'fg-secondary_hover': '',
  'fg-tertiary': '', 'fg-tertiary_hover': '',
  'fg-quaternary': '', 'fg-quaternary_hover': '',
  'fg-white': '', 'fg-disabled': '', 'fg-disabled_subtle': '',
  'fg-brand-primary': '', 'fg-brand-primary_alt': '',
  'fg-brand-secondary': '', 'fg-brand-secondary_alt': '',
  'fg-error-primary': '', 'fg-error-secondary': '',
  'fg-warning-primary': '', 'fg-warning-secondary': '',
  'fg-success-primary': '', 'fg-success-secondary': '',
  'fg-info-primary': '', 'fg-info-secondary': '',
  // ── Background ────────────────────────────────────────────
  'bg-primary': '', 'bg-primary_alt': '', 'bg-primary_hover': '',
  'bg-primary-solid': '',
  'bg-secondary': '', 'bg-secondary_alt': '', 'bg-secondary_hover': '', 'bg-secondary_subtle': '',
  'bg-secondary-solid': '',
  'bg-tertiary': '', 'bg-quaternary': '',
  'bg-active': '', 'bg-disabled': '', 'bg-disabled_subtle': '', 'bg-overlay': '',
  'bg-brand-primary': '', 'bg-brand-primary_alt': '',
  'bg-brand-secondary': '',
  'bg-brand-solid': '', 'bg-brand-solid_hover': '',
  'bg-brand-section': '', 'bg-brand-section_subtle': '',
  'bg-error-primary': '', 'bg-error-secondary': '', 'bg-error-solid': '',
  'bg-warning-primary': '', 'bg-warning-secondary': '', 'bg-warning-solid': '',
  'bg-success-primary': '', 'bg-success-secondary': '', 'bg-success-solid': '',
  'bg-info-primary': '', 'bg-info-secondary': '', 'bg-info-solid': '',
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
  primaryColor: string
  primaryScale: ColorScale
  grayBaseColor: string
  grayLightScale: ColorScale
  errorColor: string
  errorScale: ColorScale
  warningColor: string
  warningScale: ColorScale
  successColor: string
  successScale: ColorScale
  infoColor: string
  infoScale: ColorScale
  customColors: CustomColor[]
  themes: Record<string, Record<string, string>>
  themeOrder: string[]
  themeKinds: Record<string, 'light' | 'dark'>
  themePalettes: Record<string, ThemePalette>
  typography: TypographyTokens
  spacing: Record<string, string>
  radius: Record<string, string>
  opacity: Record<string, string>
  shadows: Record<string, string>
  grid: Record<string, string>
  sizes: Record<string, string>
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
}

// Factory (not a const): every call returns fresh object references, so a
// reset never aliases a saved snapshot's nested objects.
export function makeDesignDefaults(): DesignSnapshot {
  return {
    projectName: 'DS.by.MD',
    projectDescription: '',
    colorAlgorithm: 'lightness',
    contrastShift: 0,
    colorNaming: 'numeric',
    primaryColor: '#7f56d9',
    primaryScale: {},
    grayBaseColor: '#6c737f',
    grayLightScale: { ...GRAY_LIGHT_SCALE },
    errorColor: '#f04438',
    errorScale: {},
    warningColor: '#f79009',
    warningScale: {},
    successColor: '#17b26a',
    successScale: {},
    infoColor: '#2e90fa',
    infoScale: {},
    customColors: [],
    themes: { light: { ...EMPTY_SEMANTIC }, dark: { ...EMPTY_SEMANTIC } },
    themeOrder: ['light', 'dark'],
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {},
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

  // Step 2 — Brand / accent color (user-defined, generates 12-tone scale)
  primaryColor: string
  primaryScale: ColorScale
  setPrimaryColor: (hex: string) => void
  setPrimaryScale: (scale: ColorScale) => void

  // Step 2 — Neutral gray (user-selectable flavor, generates light scale)
  grayBaseColor: string
  grayLightScale: ColorScale
  setGrayBaseColor: (hex: string) => void
  setGrayLightScale: (scale: ColorScale) => void

  // Step 2 — Semantic state scales (user-adjustable, default from Figma DS)
  errorColor: string
  errorScale: ColorScale
  setErrorColor: (hex: string) => void
  setErrorScale: (scale: ColorScale) => void

  warningColor: string
  warningScale: ColorScale
  setWarningColor: (hex: string) => void
  setWarningScale: (scale: ColorScale) => void

  successColor: string
  successScale: ColorScale
  setSuccessColor: (hex: string) => void
  setSuccessScale: (scale: ColorScale) => void

  infoColor: string
  infoScale: ColorScale
  setInfoColor: (hex: string) => void
  setInfoScale: (scale: ColorScale) => void

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
  themePalettes: Record<string, ThemePalette>
  setThemeToken: (theme: string, key: string, value: string) => void
  mergeThemeTokens: (theme: string, partial: Record<string, string>) => void
  addTheme: (key: string, kind: 'light' | 'dark', palette: ThemePalette) => void
  removeTheme: (key: string) => void

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

      // Brand
      setPrimaryColor: (hex) => set({ primaryColor: hex }),
      setPrimaryScale: (scale) => set({ primaryScale: scale }),

      // Neutral gray (default: Gray Neutral — closest to Figma's neutral gray)
      setGrayBaseColor: (hex) => set({ grayBaseColor: hex }),
      setGrayLightScale: (scale) => set({ grayLightScale: scale }),

      // Semantic state scales (defaults from the Figma DS)
      setErrorColor: (hex) => set({ errorColor: hex }),
      setErrorScale: (scale) => set({ errorScale: scale }),
      setWarningColor: (hex) => set({ warningColor: hex }),
      setWarningScale: (scale) => set({ warningScale: scale }),
      setSuccessColor: (hex) => set({ successColor: hex }),
      setSuccessScale: (scale) => set({ successScale: scale }),
      setInfoColor: (hex) => set({ infoColor: hex }),
      setInfoScale: (scale) => set({ infoScale: scale }),

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
      removeCustomColor: (key) =>
        set((state) => ({
          customColors: state.customColors.filter((c) => c.key !== key),
        })),

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
      addTheme: (key, kind, palette) =>
        set((state) => {
          if (state.themes[key]) return state
          return {
            themes: { ...state.themes, [key]: { ...EMPTY_SEMANTIC } },
            themeOrder: [...state.themeOrder, key],
            themeKinds: { ...state.themeKinds, [key]: kind },
            themePalettes: { ...state.themePalettes, [key]: palette },
          }
        }),
      removeTheme: (key) =>
        set((state) => {
          if (key === 'light' || key === 'dark' || !state.themes[key]) return state
          const { [key]: _, ...themes } = state.themes
          const { [key]: __, ...themeKinds } = state.themeKinds
          const { [key]: ___, ...themePalettes } = state.themePalettes
          return {
            themes,
            themeKinds,
            themePalettes,
            themeOrder: state.themeOrder.filter((t) => t !== key),
          }
        }),

      setTypography: (t) => set({ typography: t }),

      setSpacing: (s) => set({ spacing: s }),
      setRadius: (r) => set({ radius: r }),

      setOpacity: (o) => set({ opacity: o }),
      setShadows: (s) => set({ shadows: s }),
      setGrid: (g) => set({ grid: g }),
      setSizes: (s) => set({ sizes: s }),

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
          }
          return {
            savedSystems: state.savedSystems.some((s) => s.id === id)
              ? state.savedSystems.map((s) => (s.id === id ? entry : s))
              : [...state.savedSystems, entry],
          }
        }),
    }),
    {
      name: 'scalable-designs-store',
      version: 22,
      migrate: (persisted: any) => {
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
        }
        return persisted
      },
    }
  )
)
