import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPONENT_KEYS } from '../lib/componentCatalogue'

interface ColorScale {
  [key: number]: string // 1–12 tones
}

interface TypographyTokens {
  fontFamily: string
  headingFontFamily: string
  sizes: Record<string, string>
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

interface DesignStore {
  // Step 1
  projectName: string
  setProjectName: (name: string) => void

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

  // Step 3 — Semantic tokens (light mode = the default)
  semanticTokens: Record<string, string>
  setSemanticToken: (key: string, value: string) => void
  mergeSemanticTokens: (partial: Record<string, string>) => void

  // Step 3 — Semantic tokens (dark mode — same keys, independent values)
  darkSemanticTokens: Record<string, string>
  setDarkSemanticToken: (key: string, value: string) => void
  mergeDarkSemanticTokens: (partial: Record<string, string>) => void

  // Step 4 — Typography
  typography: TypographyTokens
  setTypography: (t: TypographyTokens) => void

  // Step 5 — Spacing & Radius
  spacing: Record<string, string>
  radius: Record<string, string>
  setSpacing: (s: Record<string, string>) => void
  setRadius: (r: Record<string, string>) => void

  // Components — every component ships selected by default (toggle = remove)
  selectedComponents: string[]
  toggleComponent: (key: string) => void
  setSelectedComponents: (keys: string[]) => void
}

export const useDesignStore = create<DesignStore>()(
  persist(
    (set) => ({
      projectName: 'Apollo',
      setProjectName: (name) => set({ projectName: name }),

      // Brand
      primaryColor: '#7f56d9',
      primaryScale: {},
      setPrimaryColor: (hex) => set({ primaryColor: hex }),
      setPrimaryScale: (scale) => set({ primaryScale: scale }),

      // Neutral gray (default: Gray Neutral — closest to Figma's neutral gray)
      grayBaseColor: '#6c737f',
      grayLightScale: GRAY_LIGHT_SCALE,
      setGrayBaseColor: (hex) => set({ grayBaseColor: hex }),
      setGrayLightScale: (scale) => set({ grayLightScale: scale }),

      // Error (Figma base: error-500 = #f04438)
      errorColor: '#f04438',
      errorScale: {},
      setErrorColor: (hex) => set({ errorColor: hex }),
      setErrorScale: (scale) => set({ errorScale: scale }),

      // Warning (Figma base: warning-500 = #f79009)
      warningColor: '#f79009',
      warningScale: {},
      setWarningColor: (hex) => set({ warningColor: hex }),
      setWarningScale: (scale) => set({ warningScale: scale }),

      // Success (Figma base: success-500 = #17b26a)
      successColor: '#17b26a',
      successScale: {},
      setSuccessColor: (hex) => set({ successColor: hex }),
      setSuccessScale: (scale) => set({ successScale: scale }),

      // Info (Figma base: blue-500 = #2e90fa)
      infoColor: '#2e90fa',
      infoScale: {},
      setInfoColor: (hex) => set({ infoColor: hex }),
      setInfoScale: (scale) => set({ infoScale: scale }),

      semanticTokens: { ...EMPTY_SEMANTIC },
      setSemanticToken: (key, value) =>
        set((state) => ({
          semanticTokens: { ...state.semanticTokens, [key]: value },
        })),
      mergeSemanticTokens: (partial) =>
        set((state) => ({
          semanticTokens: { ...state.semanticTokens, ...partial },
        })),

      darkSemanticTokens: { ...EMPTY_SEMANTIC },
      setDarkSemanticToken: (key, value) =>
        set((state) => ({
          darkSemanticTokens: { ...state.darkSemanticTokens, [key]: value },
        })),
      mergeDarkSemanticTokens: (partial) =>
        set((state) => ({
          darkSemanticTokens: { ...state.darkSemanticTokens, ...partial },
        })),

      typography: {
        fontFamily: 'Inter',
        headingFontFamily: 'Inter',
        sizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px' },
        weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
      },
      setTypography: (t) => set({ typography: t }),

      spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '6': '24px', '8': '32px' },
      radius: { none: '0px', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
      setSpacing: (s) => set({ spacing: s }),
      setRadius: (r) => set({ radius: r }),

      // Every component is included by default — the user removes what they don't want.
      selectedComponents: [...COMPONENT_KEYS],
      toggleComponent: (key) =>
        set((state) => ({
          selectedComponents: state.selectedComponents.includes(key)
            ? state.selectedComponents.filter((k) => k !== key)
            : [...state.selectedComponents, key],
        })),
      setSelectedComponents: (keys) => set({ selectedComponents: keys }),
    }),
    {
      name: 'scalable-designs-store',
      version: 4,
      migrate: (persisted: any) => {
        if (persisted) {
          // v1→v2: remove styleDirection, rename selectedAtoms → selectedComponents
          delete persisted.styleDirection
          if (persisted.selectedAtoms && !persisted.selectedComponents) {
            persisted.selectedComponents = persisted.selectedAtoms
            delete persisted.selectedAtoms
          }
          // v2→v3: hub model — nav state is no longer persisted; the system now
          // ships named "Apollo" with every component included by default.
          delete persisted.currentStep
          if (!persisted.projectName) persisted.projectName = 'Apollo'
          if (!persisted.selectedComponents?.length) {
            persisted.selectedComponents = [...COMPONENT_KEYS]
          }
          // v3→v4: semantic tokens gained an independent dark-mode map. Seed it
          // empty; Step3 re-derives values from the scales on mount.
          if (!persisted.darkSemanticTokens) {
            persisted.darkSemanticTokens = { ...EMPTY_SEMANTIC }
          }
        }
        return persisted
      },
    }
  )
)
